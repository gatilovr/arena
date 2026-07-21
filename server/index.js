import express from 'express';
import http from 'http';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { RoomManager } from './RoomManager.js';
import { C, S, PROTOCOL_VERSION } from '../shared/protocol.js';
import { createLogger } from '../shared/logger.js';

const log = createLogger('server');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';
const SERVER_START = Date.now();

const app = express();
const server = http.createServer(app);

// В production раздаём собранный клиент из /dist
const distPath = path.join(__dirname, '..', 'dist');
if (IS_PROD && fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
} else {
  app.get('/', (req, res) =>
    res.send('🎮 Arena coop server работает. Клиент — через <code>npm run client</code> (dev) или соберите <code>npm run build</code>.'));
}

// Здоровье/статистика (пригодится для мониторинга и будущего интернета)
const manager = new RoomManager();
app.get('/api/status', (req, res) => {
  const roomBreakdown = { lobby: 0, playing: 0, over: 0 };
  let totalPlayers = 0;
  for (const room of manager.rooms.values()) {
    if (roomBreakdown[room.state] !== undefined) roomBreakdown[room.state]++;
    totalPlayers += room.players.size;
  }

  res.json({
    ok: true,
    uptime: Math.floor((Date.now() - SERVER_START) / 1000),
    memory: process.memoryUsage(),
    rooms: manager.rooms.size,
    roomBreakdown,
    totalPlayers,
    avgTickDuration: manager.avgTickDuration(),
  });
});

// --- WebSocket ---
const RATE_LIMIT = 20; // max messages per second per connection
const INPUT_RATE_LIMIT = 60; // max input messages per second per connection
const WS_MAX_PAYLOAD = 4096;
const MAX_NAME_LEN = 16;
const MAX_ROOM_LEN = 12;
const MAX_UPGRADE_CHOICE_LEN = 64;
const PI = Math.PI;

// Allowlist of accepted client message types — anything else is dropped silently
const VALID_MSG_TYPES = new Set(Object.values(C));
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: WS_MAX_PAYLOAD });

wss.on('connection', (ws) => {
  const conn = { ws, player: null, room: null };
  const rate = { count: 0, resetTime: Date.now() + 1000 };
  const inputRate = { count: 0, resetTime: Date.now() + 1000 };

  ws.on('message', (raw) => {
    const rawSize = typeof raw === 'string' ? raw.length : raw.byteLength;
    if (rawSize > WS_MAX_PAYLOAD) {
      try { ws.close(1009, 'Message too large'); } catch {}
      return;
    }

    let m;
    try { m = JSON.parse(raw); } catch { return; }

    // --- Input validation: m.t must exist and be a known type ---
    if (!m.t || typeof m.t !== 'string') return;
    if (!VALID_MSG_TYPES.has(m.t)) return;

    // INPUT — высокочастотный, ограничиваем отдельно от команд UI
    if (m.t === C.INPUT) {
      const now = Date.now();
      if (now >= inputRate.resetTime) {
        inputRate.count = 0;
        inputRate.resetTime = now + 1000;
      }
      if (++inputRate.count > INPUT_RATE_LIMIT) return;
      if (conn.room && conn.player) {
        m.mx = typeof m.mx === 'number' ? Math.max(-1, Math.min(1, m.mx)) : 0;
        m.mz = typeof m.mz === 'number' ? Math.max(-1, Math.min(1, m.mz)) : 0;
        if (typeof m.yaw === 'number') {
          // Normalize to [-PI, PI]
          m.yaw = ((m.yaw % (2 * PI)) + 3 * PI) % (2 * PI) - PI;
        } else {
          m.yaw = 0;
        }
        m.pitch = typeof m.pitch === 'number' ? Math.max(-1.5, Math.min(1.5, m.pitch)) : 0;
        conn.room.handleInput(conn.player, m);
      }
      return;
    }

    // --- Rate limiting (только для не-INPUT сообщений) ---
    const now = Date.now();
    if (now >= rate.resetTime) {
      rate.count = 0;
      rate.resetTime = now + 1000;
    }
    rate.count++;
    if (rate.count > RATE_LIMIT) {
      log.warn(`Rate limit exceeded, disconnecting`);
      try { ws.send(JSON.stringify({ t: S.ERROR, msg: 'Слишком много сообщений' })); } catch {}
      ws.close();
      return;
    }

    // Validate fields per message type
    if (m.t === C.EQUIP || m.t === C.UNEQUIP || m.t === C.SELL) {
      if (m.invIdx !== undefined) m.invIdx = Number.isInteger(m.invIdx) ? m.invIdx : -1;
      if (m.slot !== undefined && typeof m.slot !== 'string') return;
    }

    if (m.t === C.ASSIGN || m.t === C.UNASSIGN) {
      if (m.slot !== undefined) m.slot = Number.isInteger(m.slot) ? m.slot : -1;
      if (m.skillId !== undefined && typeof m.skillId !== 'string') m.skillId = null;
    }

    if (m.t === C.UPGRADE) {
      if (m.choice !== undefined && typeof m.choice !== 'string') return;
      if (typeof m.choice === 'string') m.choice = m.choice.slice(0, MAX_UPGRADE_CHOICE_LEN);
    }

    switch (m.t) {
      case C.JOIN: {
        if (conn.room && conn.player) cleanup(conn);
        // Session resume: if token provided, try to resume
        if (m.token) {
          const resume = manager.resumeSession(m.token, conn);
          if (resume) {
            const { room, player, sessionToken } = resume;
            log.info(`Player ${player.name} (${player.id}) resumed session in room ${room.code}`);
            ws.send(JSON.stringify({
              t: S.JOINED,
              protocolVersion: PROTOCOL_VERSION,
              id: player.id,
              room: room.code,
              host: room.host,
              state: room.state,
              sessionToken,
              players: room.playersArr().map(p => ({ id: p.id, name: p.name, slot: p.slot, color: p.color }))
            }));
            return;
          }
          // Token invalid or expired
          ws.send(JSON.stringify({ t: S.ERROR, msg: 'Сессия истекла. Войдите заново.' }));
          return;
        }
        // Normal join flow
        if (typeof m.name !== 'string') m.name = '';
        if (typeof m.room !== 'string') m.room = '';
        m.name = m.name.slice(0, MAX_NAME_LEN);
        m.room = m.room.slice(0, MAX_ROOM_LEN);
        log.info(`Player joining: "${m.name}" room="${m.room || ''}"`);
        const res = manager.join(conn, m.name, m.room);
        if (res.error) {
          ws.send(JSON.stringify({ t: S.ERROR, msg: res.error }));
          return;
        }
        const { room, player } = res;
        // Generate session token
        const sessionToken = manager.createSession(room.code, player);
        log.info(`Player ${player.name} (${player.id}) joined room ${room.code}, token: ${sessionToken}`);
        ws.send(JSON.stringify({
          t: S.JOINED,
          protocolVersion: PROTOCOL_VERSION,
          id: player.id,
          room: room.code,
          host: room.host,
          state: room.state,
          sessionToken,
          players: room.playersArr().map(p => ({ id: p.id, name: p.name, slot: p.slot, color: p.color }))
        }));
        break;
      }
      case C.START: {
        if (conn.room && conn.room.host === conn.player?.id) {
          log.info(`Game started in room ${conn.room.code}`);
          conn.room.start();
        }
        break;
      }
      case C.EQUIP:
      case C.UNEQUIP:
      case C.SELL:
      case C.ASSIGN:
      case C.UNASSIGN:
      case C.UPGRADE: {
        if (conn.room && conn.player) conn.room.handleMessage(conn.player, m);
        break;
      }
      case C.LEAVE: {
        log.info(`Player ${conn.player?.name || '?'} leaving room ${conn.room?.code || '?'}`);
        cleanup(conn);
        break;
      }
      case C.REVIVE: {
        if (conn.room && conn.player) conn.room.handleRevive(conn.player);
        break;
      }
      case C.PING: {
        ws.send(JSON.stringify({ t: S.PONG, t0: m.t0 }));
        break;
      }
    }
  });

  ws.on('close', () => cleanup(conn));
  ws.on('error', (err) => { log.warn(`WS error: ${err.message}`); cleanup(conn); });
});

function cleanup(conn) {
  if (conn.room && conn.player) {
    log.info(`Player ${conn.player.name} (${conn.player.id}) disconnected from room ${conn.room.code}`);
    // Soft disconnect: keep player in room for potential reconnect
    conn.room.disconnectPlayer(conn.player.id);
    // Store session token for reconnect
    const token = manager.createSession(conn.room.code, conn.player);
    log.info(`Session token created for ${conn.player.name}: ${token}`);
  }
  conn.room = null;
  conn.player = null;
}

// --- Определение LAN-IP для подключения по Wi-Fi ---
function lanIPs() {
  const nets = os.networkInterfaces();
  const out = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}

server.listen(PORT, '0.0.0.0', () => {
  const ips = lanIPs();
  log.info('ARENA COOP — игровой сервер запущен');
  log.info(`Локально:      http://localhost:${PORT}`);
  for (const ip of ips) {
    log.info(`По сети (LAN): http://${ip}:${PORT}   ← раздай этот адрес`);
  }
  log.info(`WebSocket:     ws://<адрес>:${PORT}/ws`);
  log.info('В dev клиент открывается на http://localhost:5173 (или http://<LAN-IP>:5173)');
});

// --- Graceful Shutdown ---
let isShuttingDown = false;

function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  log.info(`Received ${signal}, shutting down gracefully...`);

  // 1. Stop accepting new connections
  server.close(() => {
    log.info('HTTP server closed.');
  });

  // 2. Close all WebSocket connections
  for (const ws of wss.clients) {
    try {
      ws.close(1001, 'Server shutting down');
    } catch {}
  }
  wss.close(() => {
    log.info('WebSocket server closed.');
  });

  // 3. Clear room intervals
  if (typeof manager.destroy === 'function') {
    manager.destroy();
    log.info('RoomManager destroyed.');
  }

  // 4. Exit after a short grace period
  setTimeout(() => {
    log.info('Goodbye.');
    process.exit(0);
  }, 1000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
