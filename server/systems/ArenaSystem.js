import { BUFFS, ITEMS } from '../../shared/gameData.js';
import { ARENA } from '../../shared/constants.js';

// ============================================================================
// ARENA SYSTEM — solo regen, random buff spawns, arena-specific mechanics.
// ============================================================================

const ARENA_CONFIG = {
  // Solo player regen: 2-5 HP/sec when alone
  SOLO_REGEN_MIN: 2,
  SOLO_REGEN_MAX: 5,
  SOLO_REGEN_INTERVAL: 1, // apply regen every N seconds

  // Random buff spawns
  BUFF_SPAWN_INTERVAL: 20, // seconds between random buff spawns
  BUFF_SPAWN_RADIUS: 35,   // max distance from center to spawn

  // Buff pool for arena spawns (subset of BUFFS)
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

    // Random position within arena bounds
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * ARENA_CONFIG.BUFF_SPAWN_RADIUS;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    // Clamp to arena bounds
    const clampedX = Math.max(-ARENA.LIMIT, Math.min(ARENA.LIMIT, x));
    const clampedZ = Math.max(-ARENA.LIMIT, Math.min(ARENA.LIMIT, z));

    // Create buff drop through loot system
    this.room.loot._spawnBuff(clampedX, clampedZ);

    // Announce to players
    const buffDef = BUFFS[type];
    if (buffDef) {
      this.room.sendEvent({
        type: 'ann',
        text: `✨ ${buffDef.icon} ${buffDef.name} появился на арене!`,
        color: buffDef.color,
      });
    }
  }
}
