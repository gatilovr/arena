import { PLAYER, ENEMY_TYPES, BOSS, ARENA, clamp } from '../../shared/constants.js';

// ============================================================================
// СИСТЕМА БОЯ — серверная валидация ударов, урон по врагам, пули, ульта.
// Использует stats игрока (рассчитанные из экипировки/скилов/бафов).
// ============================================================================
export class CombatSystem {
  constructor(room) {
    this.room = room;
  }

  comboMult(p) {
    return 1 + Math.min(p.combo, 25) * 0.04;
  }

  // Игрок нажал атаку
  attack(p) {
    if (!p.alive || p.attackCd > 0) return;
    p.attackCd = PLAYER.ATTACK_COOLDOWN / p.stats.atkSpd;
    p.atkStep = (p.atkAnim > 0 && p.atkStep < 2) ? p.atkStep + 1 : 0;
    p.atkAnim = p.atkStep === 2 ? 0.26 : 0.16;

    // ranged weapons fire a projectile instead of melee swing
    if (p.stats.weaponType === 'ranged') {
      this.rangedAttack(p);
      return;
    }

    const spin = p.atkStep === 2;
    const range = PLAYER.ATTACK_RANGE * p.stats.range * (spin ? 1.3 : 1);
    const baseDmg = p.stats.meleeDmg * this.comboMult(p) * [1, 1.15, 1.7][p.atkStep];
    const f = p.forward();

    let hitAny = false;
    for (const e of this.room.enemies) {
      if (e.dying || e.spawnT > 0) continue;
      const dx = e.x - p.x, dz = e.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > range + e.radius) continue;
      if (!spin) {
        const dot = (dx * f.x + dz * f.z) / (d || 1);
        if (dot < PLAYER.ATTACK_CONE) continue;
      }
      this.damageEnemy(e, baseDmg, p, spin);
      hitAny = true;
      // ядовитый клинок: следующая атака наносит яд
      if (p.poisonBlade) {
        e.burnT = 3;
        e.burnDps = p.stats.meleeDmg * 0.25;
        e.burnBy = p;
        e.slowT = 2;
        e.slowF = 0.7;
      }
    }
    if (hitAny && p.poisonBlade) {
      p.poisonBlade = false;
    }
    if (hitAny) this.room.sendEvent({ type: 'hitfx', x: p.x, z: p.z });

    // Элементальный урон оружия (поджог/замедление/молния)
    if (hitAny && p.stats.el !== 'none') {
      this._applyElement(p);
    }
  }

  _applyElement(p) {
    const el = p.stats.el;
    for (const e of this.room.enemies) {
      if (e.dying || e.spawnT > 0) continue;
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (d > PLAYER.ATTACK_RANGE * p.stats.range + e.radius) continue;

      if (el === 'fire') {
        e.burnT = 3;
        e.burnDps = p.stats.meleeDmg * 0.25;
        e.burnBy = p;
      } else if (el === 'frost') {
        e.slowT = 2;
        e.slowF = 0.5;
      } else if (el === 'volt') {
        // бьёт до 2 ближайших рядом
        const others = this.room.enemies.filter(o =>
          !o.dying && o.spawnT <= 0 && o !== e && Math.hypot(o.x - e.x, o.z - e.z) < 5
        ).slice(0, 2);
        for (const o of others) {
          const dmg = p.stats.meleeDmg * 0.35;
          o.hurt(dmg, e.x, e.z, 4);
          this.room.sendEvent({
            type: 'skillfx', kind: 'beam',
            x: e.x, y: 1.2, z: e.z,
            x2: o.x, y2: o.size * 0.6, z2: o.z,
            color: 0xffe14d,
          });
        }
      }
    }
  }

  rangedAttack(p) {
    const range = p.stats.atkRange || PLAYER.ATTACK_RANGE;
    const baseDmg = p.stats.meleeDmg * this.comboMult(p);

    // find nearest enemy within range
    let target = null, bestDist = range + 1;
    for (const e of this.room.enemies) {
      if (e.dying || e.spawnT > 0) continue;
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (d < bestDist) { bestDist = d; target = e; }
    }

    // direction: toward nearest enemy, or forward if none
    const f = p.forward();
    let dx, dz;
    if (target) {
      const d = Math.hypot(target.x - p.x, target.z - p.z) || 1;
      dx = (target.x - p.x) / d;
      dz = (target.z - p.z) / d;
    } else {
      dx = f.x; dz = f.z;
    }

    // spawn projectile
    const speed = 28;
    const elColors = { fire: 0xff6a00, frost: 0x35e0ff, volt: 0xffe14d };
    this.room.bullets.push({
      x: p.x + dx * 1.2, y: 1.2, z: p.z + dz * 1.2,
      vx: dx * speed, vz: dz * speed, vy: 0,
      dmg: baseDmg, r: 0.2,
      life: range / speed + 0.1,
      owner: p.id,
      color: elColors[p.stats.el] || 0xff3300,
    });
    if (p.poisonBlade) p.poisonBlade = false;
    this.room.sendEvent({ type: 'hitfx', x: p.x, z: p.z });
  }

  // Ульта — nova вокруг игрока
  ult(p) {
    if (!p.alive || (p.ultCharge | 0) < 100) return;
    p.ultCharge = 0;
    const R = 9;
    const dmg = 170 * p.stats.dmgMult * p.stats.ultMult;

    for (const e of this.room.enemies) {
      if (e.dying || e.spawnT > 0) continue;
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (d < R + e.radius) {
        const dx = (e.x - p.x) / (d || 1);
        const dz = (e.z - p.z) / (d || 1);
        e.vx += dx * 16;
        e.vz += dz * 16;
        e.stunT = 0.6;
        this.damageEnemy(e, dmg, p, true);
      }
    }
    this.room.sendEvent({ type: 'ult', pid: p.id, x: p.x, z: p.z });
  }

  damageEnemy(e, amount, attacker, heavy) {
    const crit = Math.random() < attacker.stats.crit;
    const execKill = attacker.stats.exec && e.hp < e.maxHp * 0.12 && !e.isBoss;
    let dmg = execKill ? e.hp + 999 : amount * (crit ? attacker.stats.critDmg : 1);

    // сет-бонус шторма: +15% по замороженным
    if (attacker.stats.setFlags.storm && e.slowT > 0) dmg *= 1.15;

    const dead = e.hurt(dmg, attacker.x, attacker.z, heavy ? 13 : 6);

    this.room.sendEvent({
      type: 'hit', eid: e.id, dmg: Math.round(dmg), crit,
      x: e.x, y: e.size * 1.2, z: e.z, by: attacker.id,
    });

    // вампиризм
    if (attacker.stats.vamp > 0) {
      attacker.heal(dmg * attacker.stats.vamp);
    }

    if (dead && !e.dying) {
      e.kill();
      this.onKill(e, attacker);
    }
  }

  onKill(e, attacker) {
    attacker.kills++;
    attacker.bumpCombo();
    attacker.score += Math.floor(e.score * this.comboMult(attacker));
    attacker.addXP(e.xp, this.room);
    attacker.ultCharge = Math.min(100, (attacker.ultCharge | 0) + (e.isBoss ? 60 : 20));

    this.room.sendEvent({
      type: 'kill', eid: e.id, by: attacker.id, t: e.type, boss: e.isBoss,
      x: e.x, z: e.z, combo: attacker.combo,
    });

    this.room.loot.rollDrop(e);
  }

  // Обновление пуль
  updateBullets(dt) {
    const bullets = this.room.bullets;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.life -= dt;
      b.x += b.vx * dt; b.y += (b.vy || 0) * dt; b.z += b.vz * dt;
      let remove = b.life <= 0 || Math.abs(b.x) > 46 || Math.abs(b.z) > 46;
      if (!remove) {
        for (const p of this.room.playersArr()) {
          if (!p.alive || p.id === b.owner) continue;
          const d = Math.hypot(b.x - p.x, b.y - (p.y || 1.2), b.z - p.z);
          if (d < 0.75 + (b.r || 0.16)) {
            p.takeDamage(b.dmg, this.room);
            remove = true;
            break;
          }
        }
      }
      if (remove) bullets.splice(i, 1);
    }
  }
}
