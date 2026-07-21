import express from 'express';
import http from 'http';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { RoomManager } from './RoomManager.js';
import { C, S } from '../shared/protocol.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

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
app.get('/api/status', (req, res) => res.json({ ok: true, ...manager.stats() }));

// --- Server logging ---
function logTime() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}
function serverLog(msg) { console.log(`[${logTime()}] ${msg}`); }

// --- WebSocket ---
const RATE_LIMIT = 20; // max messages per second per connection
const INPUT_RATE_LIMIT = 60; // max input messages per second per connection
const WS_MAX_PAYLOAD = 4096;
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

    // --- Input validation: m.t must exist ---
    if (!m.t || typeof m.t !== 'string') return;

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
        m.yaw = typeof m.yaw === 'number' ? m.yaw : 0;
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
      serverLog(`Rate limit exceeded, disconnecting`);
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
    }

    switch (m.t) {
      case C.JOIN: {
        if (conn.room && conn.player) cleanup(conn);
        if (typeof m.name !== 'string') m.name = '';
        if (typeof m.room !== 'string') m.room = '';
        m.name = m.name.slice(0, 64);
        m.room = m.room.slice(0, 12);
        serverLog(`Player joining: "${m.name}" room="${m.room || ''}"`);
        const res = manager.join(conn, m.name, m.room);
        if (res.error) {
          ws.send(JSON.stringify({ t: S.ERROR, msg: res.error }));
          return;
        }
        const { room, player } = res;
        serverLog(`Player ${player.name} (${player.id}) joined room ${room.code}`);
        ws.send(JSON.stringify({
          t: S.JOINED,
          id: player.id,
          room: room.code,
          host: room.host,
          state: room.state,
          players: room.playersArr().map(p => ({ id: p.id, name: p.name, slot: p.slot, color: p.color }))
        }));
        break;
      }
      case C.START: {
        if (conn.room && conn.room.host === conn.player?.id) {
          serverLog(`Game started in room ${conn.room.code}`);
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
        serverLog(`Player ${conn.player?.name || '?'} leaving room ${conn.room?.code || '?'}`);
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
  ws.on('error', (err) => { serverLog(`WS error: ${err.message}`); cleanup(conn); });
});

function cleanup(conn) {
  if (conn.room && conn.player) {
    serverLog(`Removing player ${conn.player.name} (${conn.player.id}) from room ${conn.room.code}`);
    conn.room.removePlayer(conn.player.id);
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
  console.log('\n  🎮  ARENA COOP — игровой сервер запущен');
  console.log('  ─────────────────────────────────────────────');
  console.log(`  Локально:      http://localhost:${PORT}`);
  for (const ip of ips) {
    console.log(`  По сети (LAN): http://${ip}:${PORT}   ← раздай этот адрес`);
  }
  console.log('  ─────────────────────────────────────────────');
  console.log(`  WebSocket:     ws://<адрес>:${PORT}/ws`);
  console.log('  В dev клиент открывается на http://localhost:5173 (или http://<LAN-IP>:5173)\n');
});
