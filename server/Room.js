import { Player } from './game/Player.js';
import { Enemy } from './game/Enemy.js';
import { WaveSystem } from './systems/WaveSystem.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { LootSystem } from './systems/LootSystem.js';
import { SkillSystem } from './systems/SkillSystem.js';
import { NET, PLAYER } from '../shared/constants.js';
import { MAX_PLAYERS } from '../shared/server-constants.js';
import { S, ROOM_STATE } from '../shared/protocol.js';


// ============================================================================
// КОМНАТА — одна игровая сессия (1-4 игрока). Владеет состоянием мира,
// запускает авторитарный тик-цикл и рассылает снапшоты 20 Гц.
// ============================================================================
export class Room {
  constructor(code, manager) {
    this.code = code;
    this.manager = manager;
    this.state = ROOM_STATE.LOBBY;
    this.players = new Map();
    this.host = null;
    this.enemies = [];
    this.bullets = [];
    this.fireballs = [];
    this.whirls = [];
    this.zones = [];
    this.traps = [];
    this.telegraphHits = [];
    this.minions = [];
    this.time = 0;
    this.tick = 0;
    this._fbId = 0;

    // seedable PRNG (mulberry32) — deterministic randomness for reproducible bugs
    this._rngState = 0 | (Date.now() ^ (Math.random() * 0xFFFFFFFF));

    this.wave = new WaveSystem(this);
    this.combat = new CombatSystem(this);
    this.loot = new LootSystem(this);
    this.skills = new SkillSystem(this);

    this.lastActivity = Date.now();
    this._timer = setInterval(() => this.update(), NET.TICK_MS);
  }

  playersArr() { return [...this.players.values()]; }

  touch() { this.lastActivity = Date.now(); }

  /** Mulberry32 PRNG — returns [0, 1). Seed via this._rngState = <int>. */
  rng() {
    let t = (this._rngState += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // --- управление составом ---
  addPlayer(conn, name) {
    this.touch();
    if (this.players.size >= MAX_PLAYERS) return null;
    const slot = this.freeSlot();
    const p = new Player(conn, name, slot);
    this.players.set(p.id, p);
    conn.player = p;
    if (!this.host) this.host = p.id;
    if (this.state === ROOM_STATE.PLAYING) {
      p.spawn();
      try { conn.ws.send(JSON.stringify({ t: S.START })); } catch (e) {}
      // отправляем полный стейт для позднего входа
      this._sendFullState(p);
    }
    this.broadcastLobby();
    return p;
  }

  freeSlot() {
    const used = new Set(this.playersArr().map(p => p.slot));
    for (let i = 0; i < MAX_PLAYERS; i++) if (!used.has(i)) return i;
    return 0;
  }

  removePlayer(id) {
    this.players.delete(id);
    if (this.host === id) {
      const rest = this.playersArr();
      this.host = rest.length ? rest[0].id : null;
    }
    if (this.players.size === 0) {
      this.destroy();
      return;
    }
    this.broadcastLobby();
  }

  // Soft disconnect: keep player in room for potential reconnect
  disconnectPlayer(id) {
    const player = this.players.get(id);
    if (!player) return;
    player._disconnected = true;
    // Transfer host to another connected player if needed
    if (this.host === id) {
      const connected = this.playersArr().filter(p => !p._disconnected && p.id !== id);
      if (connected.length) this.host = connected[0].id;
    }
    this.broadcastLobby();
  }

  // Re-attach a disconnected player to a new connection
  rejoinPlayer(conn, id) {
    const player = this.players.get(id);
    if (!player) return null;
    player._disconnected = false;
    player.conn = conn;
    conn.player = player;
    conn.room = this;
    this.touch();
    if (this.state === ROOM_STATE.PLAYING) {
      player.spawn();
      try { conn.ws.send(JSON.stringify({ t: S.START })); } catch (e) {}
      this._sendFullState(player);
    }
    this.broadcastLobby();
    return player;
  }

  destroy() {
    clearInterval(this._timer);
    this.manager.delete(this.code);
  }

  // --- запуск игры (только хост) ---
  start() {
    if (this.state === ROOM_STATE.PLAYING) return;
    this.state = ROOM_STATE.PLAYING;
    this.enemies = [];
    this.bullets = [];
    this.fireballs = [];
    this.whirls = [];
    this.zones = [];
    this.traps = [];
    this.telegraphHits = [];
    this.minions = [];
    this.time = 0;
    this.loot.reset();
    this.wave.reset();
    for (const p of this.playersArr()) {
      p.reviveUsed = false;
      p.spawn();
    }
    this.broadcast({ t: S.START });
  }

  // --- ввод от клиента ---
  handleInput(p, m) {
    if (this.state !== ROOM_STATE.PLAYING) return;
    this.touch();
    p.setInput(m.mx || 0, m.mz || 0, m.yaw || 0, m.pitch || 0);
    if (m.jump) p.tryJump();
    if (m.dash) p.tryDash();
    if (m.atk) this.combat.attack(p);
    if (m.ult) this.combat.ult(p);
    if (m.sk0) this.skills.cast(p, 0);
    if (m.sk1) this.skills.cast(p, 1);
  }

  // --- обработка сообщений от клиента ---
  handleMessage(player, m) {
    this.touch();
    switch (m.t) {
      case 'equip': {
        // Validate invIdx is valid index and slot is valid
        if (typeof m.invIdx !== 'number' || m.invIdx < 0 || m.invIdx >= player.inv.length) break;
        if (m.slot !== 'weapon' && m.slot !== 'relic1' && m.slot !== 'relic2') break;
        // Player.equipItem validates item existence and slot compatibility
        const ok = player.equipItem(m.invIdx, m.slot);
        if (ok) this._broadcastPlayerState(player);
        break;
      }
      case 'unequip': {
        const ok = player.unequipItem(m.slot);
        if (ok) this._broadcastPlayerState(player);
        break;
      }
      case 'sell': {
        if (typeof m.invIdx !== 'number' || m.invIdx < 0 || m.invIdx >= player.inv.length) break;
        const val = player.sellItem(m.invIdx);
        if (val > 0) {
          this._broadcastPlayerState(player);
          this.sendEvent({ type: 'ann', text: `💰 Продано: +${val}`, color: '#ffc233', pid: player.id });
        }
        break;
      }
      case 'assign': {
        const ok = player.assignSkill(m.slot, m.skillId);
        if (ok) this._broadcastPlayerState(player);
        break;
      }
      case 'unassign': {
        const ok = player.unassignSkill(m.slot);
        if (ok) this._broadcastPlayerState(player);
        break;
      }
      case 'upgrade': {
        const ok = player.applyUpgrade(m.choice, this);
        if (ok) this._broadcastPlayerState(player);
        break;
      }
    }
  }

  _broadcastPlayerState(player) {
    const data = player.fullSnap();
    try { player.conn.ws.send(JSON.stringify({ t: S.PLAYER_STATE, ...data })); } catch (e) {}
  }

  _sendFullState(player) {
    // 1) отправляем данные самого игрока (инвентарь, скилы, экипировка)
    const pData = player.fullSnap();
    try { player.conn.ws.send(JSON.stringify({ t: S.PLAYER_STATE, ...pData })); } catch (e) {}
    // 2) отправляем состояние комнаты (список игроков, хост)
    const rData = {
      t: S.ROOM_STATE,
      players: this.playersArr().map(p => p.fullSnap()),
      host: this.host,
    };
    try { player.conn.ws.send(JSON.stringify(rData)); } catch (e) {}
  }

  // --- главный цикл ---
  update() {
    if (this.state !== ROOM_STATE.PLAYING) return;
    const t0 = performance.now();
    const dt = NET.TICK_MS / 1000;
    this.time += dt;
    this.tick++;

    // игроки
    for (const p of this.playersArr()) {
      p.integrate(dt);
      if (!p.alive && p.respawnT <= 0) {
        p.spawn();
        this.sendEvent({ type: 'respawn', pid: p.id });
      }
      // таймаут апгрейда
      if (p.pendingUpgrade) {
        p.pendingUpgrade.timer -= dt;
        if (p.pendingUpgrade.timer <= 0) p.pendingUpgrade = null;
      }
    }

    // враги
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const remove = this.enemies[i].update(dt, this);
      if (remove) this.enemies.splice(i, 1);
    }
    if (this.enemies.length) Enemy.separate(this.enemies);

    // системы
    this.combat.updateBullets(dt);
    this.skills.update(dt);
    this.loot.update(dt);
    this.wave.update(dt);

    // призванные прислужники
    this._updateMinions(dt);

    this.broadcastSnap();
    this.checkGameOver();
    this.manager.recordTickDuration(performance.now() - t0);
  }

  handleRevive(player) {
    if (!player.alive && player.stats.revive && !player.reviveUsed) {
      player.reviveUsed = true;
      player.hp = Math.round(player.maxHp * 0.5);
      player.alive = true;
      player.invuln = 1.5;
      player.respawnT = 0;
      player.recomputeStats();
      this.sendEvent({ type: 'respawn', pid: player.id });
      this.sendEvent({ type: 'ann', text: 'ВОЗРОЖДЕНИЕ!', color: '#35e0ff', pid: player.id });
    }
  }

  checkGameOver() {
    const players = this.playersArr();
    if (!players.length) return;
    const anyAlive = players.some(p => p.alive);
    const anyCanRevive = players.some(p => !p.alive && p.stats.revive && !p.reviveUsed);
    if (!anyAlive && !anyCanRevive) {
      const totalKills = players.reduce((s, p) => s + p.kills, 0);
      const totalScore = players.reduce((s, p) => s + p.score, 0);
      this.broadcast({
        t: S.GAMEOVER,
        stats: {
          wave: this.wave.wave,
          kills: totalKills,
          score: Math.floor(totalScore),
          time: Math.floor(this.time),
          players: players.map(p => ({ name: p.name, kills: p.kills, score: Math.floor(p.score), level: p.level })),
        },
      });
      this.state = ROOM_STATE.OVER;
    }
  }

  onWaveCleared(num) {
    this.sendEvent({ type: 'ann', text: 'ВОЛНА ЗАЧИЩЕНА', color: '#3dff6a' });
    for (const p of this.playersArr()) {
      p.score += num * 60;
      p.heal(10);
    }
  }

  spawnBullet(x, y, z, target, dmg, color) {
    const dx = target.x - x, dy = target.y - y, dz = target.z - z;
    const d = Math.hypot(dx, dy, dz) || 1;
    const speed = 13;
    this.bullets.push({
      id: 'b' + (++this._fbId),
      x, y, z,
      vx: dx / d * speed, vy: dy / d * speed, vz: dz / d * speed,
      dmg, r: 0.16, life: 4, c: color, side: 'enemy'
    });
  }

  // --- рассылка ---
  broadcastSnap() {
    const snap = {
      t: S.SNAP,
      tick: this.tick,
      time: +this.time.toFixed(3),
      wave: this.wave.wave,
      wstate: this.wave.active ? 1 : 0,
      left: this.enemies.filter(e => !e.dying).length + Math.max(0, this.wave.count - this.wave.spawned),
      players: this.playersArr().map(p => p.snap()),
      enemies: this.enemies.map(e => e.snap()),
      bullets: this.bullets.map(b => ({ id: b.id, x: +b.x.toFixed(2), y: +b.y.toFixed(2), z: +b.z.toFixed(2), c: b.c })),
      drops: this.loot.snap(),
    };
    this.broadcast(snap);
  }

  broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const p of this.playersArr()) {
      try { p.conn.ws.send(data); } catch (e) {}
    }
  }

  sendEvent(ev) {
    this.broadcast({ t: S.EVENT, ev });
  }

  _updateMinions(dt) {
    for (let i = this.minions.length - 1; i >= 0; i--) {
      const m = this.minions[i];
      m.life -= dt;
      if (m.life <= 0 || !m.owner.alive) {
        this.minions.splice(i, 1);
        continue;
      }
      // следуют за владельцем
      const dx = m.owner.x - m.x;
      const dz = m.owner.z - m.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.5) {
        const spd = 5.5 * dt;
        m.x += (dx / d) * spd;
        m.z += (dz / d) * spd;
      }
      // ищут ближайшего врага и атакуют
      m.atkCd -= dt;
      if (m.atkCd <= 0) {
        let target = null, bestDist = 5;
        for (const e of this.enemies) {
          if (e.dying || e.spawnT > 0) continue;
          const ed = Math.hypot(e.x - m.x, e.z - m.z);
          if (ed < bestDist) { bestDist = ed; target = e; }
        }
        if (target) {
          let dmg = m.dmg;
          // ТЁМНЫЕ ИСКУССТВА: +40% урона призывов
          if (m.owner.stats.setFlags['dark-art']) dmg *= 1.4;
          const dead = target.hurt(dmg, m.x, m.z, 5);
          this.sendEvent({
            type: 'skillfx', kind: 'beam',
            x: m.x, y: 1, z: m.z,
            x2: target.x, y2: target.size * 0.5, z2: target.z,
            color: 0xb44dff,
          });
          if (dead && !target.dying) {
            target.kill();
            this.combat.onKill(target, m.owner);
          }
          // ТЁМНЫЕ ИСКУССТВА: прислужник наносит яд
          if (m.owner.stats.setFlags['dark-art'] && m.owner.poisonBlade) {
            target.burnT = 3;
            target.burnDps = m.dmg * 0.5;
            target.burnBy = m.owner;
          }
          m.atkCd = 1.2;
        } else {
          m.atkCd = 0.5;
        }
      }
      m.x = Math.max(-44, Math.min(44, m.x));
      m.z = Math.max(-44, Math.min(44, m.z));
    }
  }

  broadcastLobby() {
    this.broadcast({
      t: S.LOBBY,
      state: this.state,
      host: this.host,
      players: this.playersArr().map(p => ({ id: p.id, name: p.name, slot: p.slot, color: p.color }))
    });
  }
}
