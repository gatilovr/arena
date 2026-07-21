import { BUFFS, ITEMS } from '../../shared/gameData.js';
import { ARENA } from '../../shared/constants.js';

// ============================================================================
// ARENA SYSTEM — solo regen, random buff spawns, arena-specific mechanics.
// ============================================================================

const ARENA_CONFIG = {
  // Solo player regen: 1-1.5 HP/sec when alone
  SOLO_REGEN_MIN: 1,
  SOLO_REGEN_MAX: 1.5,
  SOLO_REGEN_INTERVAL: 1,

  // Random buff spawns
  BUFF_SPAWN_INTERVAL: 20,
  BUFF_SPAWN_MIN_DIST: 5,
  BUFF_SPAWN_MAX_DIST: 30,

  // Buff pool
  BUFF_POOL: ['power', 'haste', 'barrier', 'fury', 'luck', 'magnet'],
};

export class ArenaSystem {
  constructor(room) {
    this.room = room;
    this._soloRegenTimer = 0;
    this._buffSpawnTimer = ARENA_CONFIG.BUFF_SPAWN_INTERVAL;
  }

  update(dt) {
    this._updateSoloRegen(dt);
    this._updateBuffSpawns(dt);
  }

  reset() {
    this._soloRegenTimer = 0;
    this._buffSpawnTimer = ARENA_CONFIG.BUFF_SPAWN_INTERVAL;
  }

  // --- Solo player HP regeneration ---
  _updateSoloRegen(dt) {
    const players = this.room.playersArr();
    if (players.length !== 1) return; // only solo

    this._soloRegenTimer += dt;
    if (this._soloRegenTimer < ARENA_CONFIG.SOLO_REGEN_INTERVAL) return;

    this._soloRegenTimer -= ARENA_CONFIG.SOLO_REGEN_INTERVAL;

    const p = players[0];
    if (!p.alive) return;
    if (p.hp >= p.maxHp) return; // full HP

    const regen = ARENA_CONFIG.SOLO_REGEN_MIN +
      Math.random() * (ARENA_CONFIG.SOLO_REGEN_MAX - ARENA_CONFIG.SOLO_REGEN_MIN);
    p.heal(regen);
  }

  // --- Random buff spawns ---
  _updateBuffSpawns(dt) {
    // Only during gameplay
    if (this.room.state !== 'playing') return;

    this._buffSpawnTimer -= dt;
    if (this._buffSpawnTimer > 0) return;

    this._buffSpawnTimer = ARENA_CONFIG.BUFF_SPAWN_INTERVAL;
    this._spawnRandomBuff();
  }

  _spawnRandomBuff() {
    const pool = ARENA_CONFIG.BUFF_POOL;
    const type = pool[Math.floor(Math.random() * pool.length)];

    // Spawn between center and nearest player
    const players = this.room.playersArr().filter(p => p.alive);
    let targetX = 0, targetZ = 0;
    if (players.length > 0) {
      const p = players[Math.floor(Math.random() * players.length)];
      targetX = p.x;
      targetZ = p.z;
    }

    // Random point along line from center to player
    const t = ARENA_CONFIG.BUFF_SPAWN_MIN_DIST +
      Math.random() * (ARENA_CONFIG.BUFF_SPAWN_MAX_DIST - ARENA_CONFIG.BUFF_SPAWN_MIN_DIST);
    const playerDist = Math.hypot(targetX, targetZ) || 1;
    const ratio = Math.min(t / playerDist, 1);
    const x = targetX * ratio + (Math.random() - 0.5) * 4;
    const z = targetZ * ratio + (Math.random() - 0.5) * 4;

    // Clamp to arena bounds
    const clampedX = Math.max(-ARENA.LIMIT, Math.min(ARENA.LIMIT, x));
    const clampedZ = Math.max(-ARENA.LIMIT, Math.min(ARENA.LIMIT, z));

    // Create buff drop with specific type
    this.room.loot._spawnBuffWithType(clampedX, clampedZ, type);

    // Announce to players
    const buffDef = BUFFS[type];
    if (buffDef) {
      this.room.sendEvent({
        type: 'ann',
        text: `${buffDef.icon} ${buffDef.name} появился на арене!`,
        color: buffDef.color,
      });
    }
  }
}
