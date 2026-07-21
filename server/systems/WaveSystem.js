import { Enemy } from '../game/Enemy.js';
import { WAVE, ARENA } from '../../shared/constants.js';

// ============================================================================
// СИСТЕМА ВОЛН — спавн врагов, детект зачистки, переход дальше, боссы.
// ============================================================================
export class WaveSystem {
  constructor(room) {
    this.room = room;
    this.wave = 0;
    this.active = false;
    this.count = 0;
    this.spawned = 0;
    this.spawnTimer = 0;
    this.restTimer = 0;
    this.bossPending = 0;
    this.bossType = '';
  }

  reset() {
    this.wave = 0;
    this.active = false;
    this.restTimer = 1.5;
  }

  startWave() {
    this.wave++;
    this.active = true;
    this.spawned = 0;
    this.spawnTimer = 1.2;
    const isBoss = this.wave % WAVE.BOSS_EVERY === 0;
    if (isBoss) {
      this.count = 0;
      const bossIndex = Math.floor(this.wave / WAVE.BOSS_EVERY) - 1;
      const bossPool = ['butcher', 'necro', 'golemKing', 'firelord', 'shadowKing', 'frostQueen', 'dragonLord'];
      this.bossType = bossPool[Math.min(bossIndex, bossPool.length - 1)];
      this.bossPending = 1.5; // Больше времени на подготовку к боссу
      this.room.sendEvent({ type: 'wave', num: this.wave, boss: true, bossType: this.bossType });
      this.room.sendEvent({ type: 'ann', text: '⚠️ БОСС ПРИБЛИЖАЕТСЯ!', color: '#ff2d3f' });
    } else {
      this.count = Math.min(WAVE.BASE_COUNT + this.wave * WAVE.PER_WAVE, WAVE.MAX_COUNT);
      this.room.sendEvent({ type: 'wave', num: this.wave, boss: false });
    }
  }

  rollType() {
    const w = this.wave;
    const pool = ['normal'];
    if (w >= 1) pool.push('runner');
    if (w >= 2) pool.push('sprinter');
    if (w >= 3) pool.push('shooter', 'assassin');
    if (w >= 4) pool.push('exploder', 'berserker');
    if (w >= 5) pool.push('tank', 'summoner');
    if (w >= 6) pool.push('shielder', 'firestarter');
    if (w >= 7) pool.push('phantom', 'frost_mage', 'cursed');
    if (w >= 8) pool.push('golem');
    return pool[Math.floor(Math.random() * pool.length)];
  }

  spawnAt(type, isBoss = false) {
    const a = Math.random() * Math.PI * 2;
    const d = 18 + Math.random() * 8;
    const x = Math.max(-ARENA.LIMIT, Math.min(ARENA.LIMIT, Math.cos(a) * d));
    const z = Math.max(-ARENA.LIMIT, Math.min(ARENA.LIMIT, Math.sin(a) * d));
    const enemy = new Enemy(type, x, z, this.wave, isBoss);
    // масштабирование по числу игроков
    const playerCount = this.room.players.size;
    if (playerCount > 1) {
      const scaleFactor = 1 + 0.2 * (playerCount - 1);
      enemy.maxHp = Math.round(enemy.maxHp * scaleFactor);
      enemy.hp = enemy.maxHp;
      enemy.dmg = Math.round(enemy.dmg * scaleFactor);
    }
    this.room.enemies.push(enemy);
  }

  update(dt) {
    // отдых между волнами
    if (!this.active) {
      this.restTimer -= dt;
      if (this.restTimer <= 0) this.startWave();
      return;
    }

    // спавн босса
    if (this.bossPending > 0) {
      this.bossPending -= dt;
      if (this.bossPending <= 0) {
        this.spawnAt(this.bossType, true);
        // Больше миньонов для эпичного боя
        const minionCount = 3 + Math.floor(this.wave / 6);
        for (let i = 0; i < minionCount; i++) this.spawnAt(this.rollType());
      }
    }

    // постепенный спавн обычных врагов
    if (this.count > 0 && this.spawned < this.count) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnAt(this.rollType());
        this.spawned++;
        this.spawnTimer = Math.max(0.38, 1.5 - this.wave * 0.07);
      }
    }

    // проверка зачистки
    const allSpawned = this.spawned >= this.count && this.bossPending <= 0;
    const anyAlive = this.room.enemies.some(e => !e.dying);
    if (allSpawned && !anyAlive) {
      this.active = false;
      this.restTimer = WAVE.REST_TIME;
      this.room.onWaveCleared(this.wave);
    }
  }
}
