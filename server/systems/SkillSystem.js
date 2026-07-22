import { SKILLS, SETS, ELEMENT_COLORS } from '../../shared/gameData.js';

// ============================================================================
// СИСТЕМА СКИЛОВ — серверная валидация и исполнение кастов.
// Клиент шлёт sk0/sk1 в INPUT. Сервер проверяет КД, рассчитывает урон,
// применяет эффекты и рассылает события.
// ============================================================================
export class SkillSystem {
  constructor(room) {
    this.room = room;
  }

  // Вызывается из handleInput при sk0/sk1
  cast(player, slotIdx) {
    const skillId = player.skillSlots[slotIdx];
    if (!skillId) return;
    if (player.skillCd[slotIdx] > 0) return;
    if (!player.alive) return;

    const sk = SKILLS[skillId];
    if (!sk) return;

    // КД с учётом CDR
    player.skillCd[slotIdx] = sk.cd * (1 - player.stats.cdr);

    const dmgMult = player.stats.dmgMult * player.stats.skillDmg;
    const pp = { x: player.x, y: player.y, z: player.z };
    const fwd = player.forward();

    // Уведомляем клиентов о касте (для визуала)
    this.room.sendEvent({
      type: 'skill', pid: player.id, skillId,
      x: pp.x, z: pp.z, yaw: player.yaw,
    });

    switch (skillId) {
      case 'fire':    this._castFire(player, fwd, dmgMult); break;
      case 'frost':   this._castFrost(player, dmgMult); break;
      case 'chain':   this._castChain(player, dmgMult); break;
      case 'whirl':   this._castWhirl(player, dmgMult); break;
      case 'blood':   this._castBlood(player, dmgMult); break;
      case 'holy':    this._castHoly(player, dmgMult); break;
      case 'meteor':  this._castMeteor(player, dmgMult); break;
      case 'poison':    this._castPoison(player, dmgMult); break;
      case 'lightning': this._castLightning(player, dmgMult); break;
      case 'shadow':    this._castShadow(player, dmgMult); break;
      case 'heal':      this._castHeal(player, dmgMult); break;
      case 'trap':      this._castTrap(player, dmgMult); break;
      case 'whirlwind': this._castWhirlwind(player, dmgMult); break;
      case 'chainHeal': this._castChainHeal(player, dmgMult); break;
      case 'blade':     this._castBlade(player, dmgMult); break;
      case 'shield':    this._castShield(player, dmgMult); break;
      case 'berserk':   this._castBerserk(player, dmgMult); break;
      case 'blink':     this._castBlink(player, dmgMult); break;
      case 'slam':      this._castSlam(player, dmgMult); break;
      case 'poisonBlade': this._castPoisonBlade(player, dmgMult); break;
      case 'summon':    this._castSummon(player, dmgMult); break;
      case 'storm':     this._castStorm(player, dmgMult); break;
      case 'rage':      this._castRage(player, dmgMult); break;
      case 'fortify':   this._castFortify(player, dmgMult); break;
    }
  }

  _castFire(player, fwd, dmgMult) {
    const dmg = 65 * dmgMult;
    const aoe = 2.8;
    const speed = 18;
    const maxDist = 26;

    // Создаём летящий снаряд на сервере (пуль)
    const sx = player.x + fwd.x * 0.9;
    const sz = player.z + fwd.z * 0.9;
    const sy = 1.3;

    this.room.fireballs = this.room.fireballs || [];
    this.room.fireballs.push({
      id: 'fb' + (++this.room._fbId),
      x: sx, y: sy, z: sz,
      vx: fwd.x * speed, vy: 0, vz: fwd.z * speed,
      dmg, aoe, life: maxDist / speed, el: 'fire',
      by: player.id,
    });

    this.room.sendEvent({
      type: 'skillfx', kind: 'fireball',
      x: sx, y: sy, z: sz, vx: fwd.x * speed, vz: fwd.z * speed,
      color: ELEMENT_COLORS.fire,
    });
  }

  _castFrost(player, dmgMult) {
    const radius = 5.5;
    const dmg = 45 * dmgMult;
    let hits = 0;

    for (const e of this.room.enemies) {
      if (e.dying || e.spawnT > 0) continue;
      const d = Math.hypot(e.x - player.x, e.z - player.z);
      if (d < radius + e.radius) {
        const dirX = (e.x - player.x) / (d || 1);
        const dirZ = (e.z - player.z) / (d || 1);
        const dead = e.hurt(dmg, player.x, player.z, 6);
        e.slowT = 2.5; e.slowF = 0.45;
        if (dead && !e.dying) { e.kill(); this.room.combat.onKill(e, player); }
        hits++;
      }
    }

    this.room.sendEvent({
      type: 'skillfx', kind: 'nova',
      x: player.x, z: player.z, radius, color: ELEMENT_COLORS.frost,
    });
  }

  _castChain(player, dmgMult) {
    const maxTargets = 4;
    const baseDmg = 55 * dmgMult;
    const range = 13;
    const setFlags = player.stats.setFlags;

    let fromX = player.x, fromZ = player.z;
    const hit = new Set();

    for (let i = 0; i < maxTargets; i++) {
      let best = null, bestDist = Infinity;
      for (const e of this.room.enemies) {
        if (e.dying || e.spawnT > 0 || hit.has(e)) continue;
        const d = Math.hypot(e.x - fromX, e.z - fromZ);
        if (d < (i === 0 ? range : 6.5) && d < bestDist) {
          bestDist = d; best = e;
        }
      }
      if (!best) break;
      hit.add(best);

      let mult = Math.pow(0.82, i);
      if (setFlags.storm && best.slowT > 0) mult *= 1.5;

      const dead = best.hurt(baseDmg * mult, fromX, fromZ, 6);
      this.room.sendEvent({
        type: 'skillfx', kind: 'beam',
        x: fromX, y: 1.2, z: fromZ,
        x2: best.x, y2: best.size * 0.6, z2: best.z,
        color: ELEMENT_COLORS.volt,
      });

      if (dead && !best.dying) { best.kill(); this.room.combat.onKill(best, player); }

      fromX = best.x; fromZ = best.z;
    }
  }

  _castWhirl(player, dmgMult) {
    // Вихрь — сервер обрабатывает как периодический урон в течении 1.3с
    this.room.whirls = this.room.whirls || [];
    this.room.whirls.push({
      pid: player.id,
      x: player.x, z: player.z,
      dmg: player.stats.meleeDmg * 0.55 * dmgMult,
      range: 3.4 * player.stats.range,
      life: 1.3, tick: 0, tickRate: 0.18,
      setFlags: player.stats.setFlags,
    });

    this.room.sendEvent({
      type: 'skillfx', kind: 'whirl',
      x: player.x, z: player.z,
      color: 0x9fd8ff,
    });
  }

  _castBlood(player, dmgMult) {
    const cost = Math.max(4, player.maxHp * 0.08);
    if (player.hp <= cost + 1) return;

    player.hp -= cost;
    this.room.sendEvent({
      type: 'skillfx', kind: 'float',
      x: player.x, y: 1.6, z: player.z,
      text: '-' + Math.floor(cost), color: '#ff4444', size: 15,
    });

    const radius = 5;
    const dmg = 85 * dmgMult;
    let hits = 0;

    for (const e of this.room.enemies) {
      if (e.dying || e.spawnT > 0) continue;
      const d = Math.hypot(e.x - player.x, e.z - player.z);
      if (d < radius + e.radius) {
        const dead = e.hurt(dmg, player.x, player.z, 13);
        if (dead && !e.dying) { e.kill(); this.room.combat.onKill(e, player); }
        hits++;
      }
    }

    const heal = hits * 12 * (player.stats.setFlags.reaper ? 1.3 : 1);
    if (heal > 0) {
      player.heal(heal);
      this.room.sendEvent({
        type: 'skillfx', kind: 'float',
        x: player.x, y: 1.9, z: player.z,
        text: '+' + Math.floor(heal), color: '#3dff6a', size: 18,
      });
    }

    this.room.sendEvent({
      type: 'skillfx', kind: 'nova',
      x: player.x, z: player.z, radius, color: ELEMENT_COLORS.vamp,
    });
  }

  _castHoly(player, dmgMult) {
    const heal = player.maxHp * 0.3;
    player.heal(heal);

    this.room.sendEvent({
      type: 'skillfx', kind: 'float',
      x: player.x, y: 2, z: player.z,
      text: '+' + Math.floor(heal), color: '#ffd76a', size: 22,
    });

    const radius = 4;
    const dmg = 40 * dmgMult;
    for (const e of this.room.enemies) {
      if (e.dying || e.spawnT > 0) continue;
      const d = Math.hypot(e.x - player.x, e.z - player.z);
      if (d < radius + e.radius) {
        const dead = e.hurt(dmg, player.x, player.z, 6);
        if (dead && !e.dying) { e.kill(); this.room.combat.onKill(e, player); }
      }
    }

    this.room.sendEvent({
      type: 'skillfx', kind: 'nova',
      x: player.x, z: player.z, radius: 3.5, color: 0xffd76a,
    });
  }

  _castMeteor(player, dmgMult) {
    // Метеор — телеграф 0.9с, затем удар
    const alive = this.room.enemies.filter(e => !e.dying && e.spawnT <= 0);
    let targetX, targetZ;
    if (alive.length) {
      const t = alive[Math.floor(Math.random() * alive.length)];
      targetX = t.x; targetZ = t.z;
    } else {
      const fwd = player.forward();
      targetX = player.x + fwd.x * 7;
      targetZ = player.z + fwd.z * 7;
    }

    this.room.telegraphHits = this.room.telegraphHits || [];
    this.room.telegraphHits.push({
      x: targetX, z: targetZ,
      r: 4, life: 0.9,
      onHit: () => {
        const dmg = 135 * dmgMult;
        for (const e of this.room.enemies) {
          if (e.dying || e.spawnT > 0) continue;
          const d = Math.hypot(e.x - targetX, e.z - targetZ);
          if (d < 4 + e.radius) {
            const dead = e.hurt(dmg, targetX, targetZ, 13);
            if (dead && !e.dying) { e.kill(); this.room.combat.onKill(e, player); }
          }
        }
        this.room.sendEvent({
          type: 'skillfx', kind: 'nova',
          x: targetX, z: targetZ, radius: 4, color: ELEMENT_COLORS.fire,
        });
      },
    });

    this.room.sendEvent({
      type: 'skillfx', kind: 'telegraph',
      x: targetX, z: targetZ, r: 4, dur: 0.9, color: 0xff7a1a,
    });
  }

  _castPoison(player, dmgMult) {
    const fwd = player.forward();
    const px = player.x + fwd.x * 4.5;
    const pz = player.z + fwd.z * 4.5;

    this.room.zones = this.room.zones || [];
    this.room.zones.push({
      x: px, z: pz, r: 3.6,
      dmg: 16 * dmgMult, tickRate: 0.5,
      life: 4, tick: 0, by: player,
    });

    this.room.sendEvent({
      type: 'skillfx', kind: 'zone',
      x: px, z: pz, r: 3.6, dur: 4, color: 0x7dff4d,
    });
  }

  _castLightning(player, dmgMult) {
    const range = 14;
    const dmg = 70 * dmgMult;
    const setFlags = player.stats.setFlags;
    const maxTargets = setFlags.arcane ? 6 : 1;

    const hit = new Set();
    let fromX = player.x, fromZ = player.z;

    for (let i = 0; i < maxTargets; i++) {
      let best = null, bestDist = Infinity;
      for (const e of this.room.enemies) {
        if (e.dying || e.spawnT > 0 || hit.has(e)) continue;
        const d = Math.hypot(e.x - fromX, e.z - fromZ);
        if (d < (i === 0 ? range : 7) && d < bestDist) {
          bestDist = d; best = e;
        }
      }
      if (!best) break;
      hit.add(best);

      const dead = best.hurt(dmg, fromX, fromZ, 8);
      this.room.sendEvent({
        type: 'skillfx', kind: 'beam',
        x: fromX, y: 1.5, z: fromZ,
        x2: best.x, y2: best.size * 0.6, z2: best.z,
        color: 0xffe14d,
      });

      if (dead && !best.dying) { best.kill(); this.room.combat.onKill(best, player); }

      fromX = best.x; fromZ = best.z;
    }
  }

  _castShadow(player, dmgMult) {
    const range = 12;
    const dmg = 60 * dmgMult;
    const setFlags = player.stats.setFlags;

    let best = null, bestDist = Infinity;
    for (const e of this.room.enemies) {
      if (e.dying || e.spawnT > 0) continue;
      const d = Math.hypot(e.x - player.x, e.z - player.z);
      if (d < range && d < bestDist) {
        bestDist = d; best = e;
      }
    }
    if (!best) return;

    // Телепорт за спину врага (противоположная сторона, 2 юнита)
    const dx = best.x - player.x;
    const dz = best.z - player.z;
    const len = Math.hypot(dx, dz) || 1;
    player.x = best.x + (dx / len) * 2;
    player.z = best.z + (dz / len) * 2;

    const dead = best.hurt(dmg, player.x, player.z, 10);
    if (dead && !best.dying) { best.kill(); this.room.combat.onKill(best, player); }

    // ТЕНЬ И КОЗЫРЬ: телепорт активирует ближайшую ловушку +30% урона
    if (setFlags['shadow-blade']) {
      for (const tr of (this.room.traps || [])) {
        if (tr.by !== player) continue;
        const d = Math.hypot(tr.x - player.x, tr.z - player.z);
        if (d < tr.r + 3) {
          // усиленный урон ловушки
          for (const e of this.room.enemies) {
            if (e.dying || e.spawnT > 0) continue;
            const ed = Math.hypot(e.x - tr.x, e.z - tr.z);
            if (ed < tr.r + e.radius) {
              const trapDmg = (tr.dmg || 25) * 1.3;
              e.stunT = Math.max(e.stunT, tr.stunDur);
              const dead2 = e.hurt(trapDmg, tr.x, tr.z, 8);
              if (dead2 && !e.dying) { e.kill(); this.room.combat.onKill(e, player); }
            }
          }
          this.room.sendEvent({ type: 'skillfx', kind: 'nova', x: tr.x, z: tr.z, radius: tr.r, color: 0x6a2dff });
          break;
        }
      }
    }

    if (setFlags.arcane) {
      const healAmt = player.maxHp * 0.15;
      player.heal(healAmt);
      this.room.sendEvent({
        type: 'skillfx', kind: 'float',
        x: player.x, y: 1.9, z: player.z,
        text: '+' + Math.floor(healAmt), color: '#3dff6a', size: 16,
      });
    }

    this.room.sendEvent({
      type: 'skillfx', kind: 'nova',
      x: player.x, z: player.z, radius: 3, color: 0xb44dff,
    });
  }

  _castHeal(player, dmgMult) {
    const setFlags = player.stats.setFlags;
    const tps = player.maxHp * 0.02 * (setFlags.guardian ? 1.5 : 1);
    player.healRegen = tps;
    player.healRegenDur = 8;
    player._regenTimer = 0;

    this.room.sendEvent({
      type: 'skillfx', kind: 'float',
      x: player.x, y: 1.9, z: player.z,
      text: '+' + Math.floor(tps * 8), color: '#3dff6a', size: 18,
    });

    this.room.sendEvent({
      type: 'skillfx', kind: 'nova',
      x: player.x, z: player.z, radius: 2.5, color: 0x3dff6a,
    });
  }

  _castTrap(player, dmgMult) {
    const fwd = player.forward();
    const tx = player.x + fwd.x * 4;
    const tz = player.z + fwd.z * 4;

    this.room.traps = this.room.traps || [];
    this.room.traps.push({
      x: tx, z: tz, r: 2.5,
      life: 15, tick: 0, tickRate: 0.5, stunDur: 2.0,
      dmg: 25 * dmgMult, by: player,
    });

    this.room.sendEvent({
      type: 'skillfx', kind: 'zone',
      x: tx, z: tz, r: 2.5, dur: 15, color: 0xaab2bd,
    });
  }

  _castWhirlwind(player, dmgMult) {
    // Вихревой щит — вращающийся щит который отражает пули и бьёт врагов
    this.room.whirls = this.room.whirls || [];
    this.room.whirls.push({
      pid: player.id,
      x: player.x, z: player.z,
      dmg: player.stats.meleeDmg * 0.45 * dmgMult,
      range: 3.5 * player.stats.range,
      life: 2.0, tick: 0, tickRate: 0.2,
      setFlags: player.stats.setFlags,
      reflect: true,
    });

    // Кратковременная неуязвимость при активации
    player.invuln = Math.max(player.invuln, 0.5);

    this.room.sendEvent({
      type: 'skillfx', kind: 'whirl',
      x: player.x, z: player.z,
      color: 0x6ad4ff,
    });
  }

  _castChainHeal(player, dmgMult) {
    // Цепное исцеление — лечит ближайших союзников
    const setFlags = player.stats.setFlags;
    const baseHeal = player.maxHp * 0.10 * (setFlags['life-binder'] ? (player.hp < player.maxHp * 0.3 ? 1.5 : 1) : 1);
    const maxTargets = 3;
    const range = 8;

    const players = this.room.playersArr().filter(p => p.alive);
    const sorted = players.sort((a, b) => {
      const da = Math.hypot(a.x - player.x, a.z - player.z);
      const db = Math.hypot(b.x - player.x, b.z - player.z);
      return da - db;
    });

    let healed = 0;
    for (let i = 0; i < Math.min(maxTargets, sorted.length); i++) {
      const t = sorted[i];
      const d = Math.hypot(t.x - player.x, t.z - player.z);
      if (d > range && i > 0) break;
      const mult = Math.pow(0.85, i);
      const amount = baseHeal * mult;
      t.heal(amount);
      healed++;
      this.room.sendEvent({
        type: 'skillfx', kind: 'float',
        x: t.x, y: 1.9, z: t.z,
        text: '+' + Math.floor(amount), color: '#3dff6a', size: 16,
      });
    }

    this.room.sendEvent({
      type: 'skillfx', kind: 'nova',
      x: player.x, z: player.z, radius: 3, color: 0x3dff6a,
    });
  }

  // === Клинок ветра — веер клинков перед игроком ===
  _castBlade(player, dmgMult) {
    const setFlags = player.stats.setFlags;
    const dmg = 40 * dmgMult * (setFlags['wind-blade'] ? 1.2 : 1);
    const radius = 3;
    const f = player.forward();
    let hits = 0;

    for (const e of this.room.enemies) {
      if (e.dying || e.spawnT > 0) continue;
      const dx = e.x - player.x, dz = e.z - player.z;
      const d = Math.hypot(dx, dz);
      if (d < radius + e.radius) {
        const dot = (dx * f.x + dz * f.z) / (d || 1);
        if (dot < 0.2) continue;
        const dead = e.hurt(dmg, player.x, player.z, 8);
        if (dead && !e.dying) { e.kill(); this.room.combat.onKill(e, player); }
        hits++;
      }
    }

    this.room.sendEvent({
      type: 'skillfx', kind: 'nova',
      x: player.x, z: player.z, radius: 2.5, color: 0xaaddff,
    });
  }

  // === Магический щит ===
  _castShield(player, dmgMult) {
    player.shield = Math.min(player.shieldMax, player.shield + 50);
    this.room.sendEvent({
      type: 'skillfx', kind: 'float',
      x: player.x, y: 1.9, z: player.z,
      text: '🛡️ +50', color: '#35e0ff', size: 18,
    });
    this.room.sendEvent({
      type: 'skillfx', kind: 'nova',
      x: player.x, z: player.z, radius: 2, color: 0x35e0ff,
    });
  }

  // === Ярость — +100% урона и скорости на 5с ===
  _castBerserk(player, dmgMult) {
    player.buffs.berserk = 5;
    player.recomputeStats();
    this.room.sendEvent({
      type: 'skillfx', kind: 'float',
      x: player.x, y: 1.9, z: player.z,
      text: '😤 ЯРОСТЬ!', color: '#ff2d3f', size: 20,
    });
    this.room.sendEvent({
      type: 'buff', pid: player.id, buff: 'berserk', dur: 5,
    });
  }

  // === Скачок — телепорт 8м вперёд ===
  _castBlink(player, dmgMult) {
    const f = player.forward();
    const dist = 8;
    const newX = player.x + f.x * dist;
    const newZ = player.z + f.z * dist;
    // ограничение ареной
    player.x = Math.max(-44, Math.min(44, newX));
    player.z = Math.max(-44, Math.min(44, newZ));

    // ВЕТРЯНОЙ КЛИНОК: скачок восстанавливает КД клинка на 2с
    const setFlags = player.stats.setFlags;
    if (setFlags['wind-blade']) {
      for (let i = 0; i < 2; i++) {
        if (player.skillCd[i] > 0) {
          player.skillCd[i] = Math.max(0, player.skillCd[i] - 2);
        }
      }
    }

    this.room.sendEvent({
      type: 'skillfx', kind: 'nova',
      x: player.x, z: player.z, radius: 1.5, color: 0xffd76a,
    });
  }

  // === Удар о землю — AoE knockback ===
  _castSlam(player, dmgMult) {
    const setFlags = player.stats.setFlags;
    const isBerserk = player.buffs.berserk > 0;
    const dmg = 80 * dmgMult * (isBerserk && setFlags['war-cry'] ? 1.5 : 1);
    const kb = 12 * (setFlags['war-cry'] ? 1.3 : 1);
    const radius = 4;

    // телеграф
    this.room.telegraphHits = this.room.telegraphHits || [];
    this.room.telegraphHits.push({
      x: player.x, z: player.z,
      r: radius, life: 0.35,
      onHit: () => {
        for (const e of this.room.enemies) {
          if (e.dying || e.spawnT > 0) continue;
          const d = Math.hypot(e.x - player.x, e.z - player.z);
          if (d < radius + e.radius) {
            const dx = (e.x - player.x) / (d || 1);
            const dz = (e.z - player.z) / (d || 1);
            e.vx += dx * kb;
            e.vz += dz * kb;
            e.stunT = 0.4;
            const dead = e.hurt(dmg, player.x, player.z, kb);
            if (dead && !e.dying) { e.kill(); this.room.combat.onKill(e, player); }
          }
        }
        this.room.sendEvent({
          type: 'skillfx', kind: 'nova',
          x: player.x, z: player.z, radius, color: 0xff7a1a,
        });
      },
    });

    this.room.sendEvent({
      type: 'skillfx', kind: 'telegraph',
      x: player.x, z: player.z, r: radius, dur: 0.35, color: 0xff7a1a,
    });
  }

  // === Ядовитый клинок ===
  _castPoisonBlade(player, dmgMult) {
    player.poisonBlade = true;
    this.room.sendEvent({
      type: 'skillfx', kind: 'float',
      x: player.x, y: 1.9, z: player.z,
      text: '🗡️ ЯД', color: '#7dff4d', size: 16,
    });
    this.room.sendEvent({
      type: 'skillfx', kind: 'nova',
      x: player.x, z: player.z, radius: 1.2, color: 0x7dff4d,
    });
  }

  // === Призыв прислужника ===
  _castSummon(player, dmgMult) {
    const setFlags = player.stats.setFlags;
    const minionDmg = 15 * (setFlags['dark-art'] ? 1.4 : 1);
    const a = Math.random() * Math.PI * 2;
    const x = player.x + Math.cos(a) * 2;
    const z = player.z + Math.sin(a) * 2;

    this.room.minions.push({
      x, z,
      dmg: minionDmg,
      life: 15,
      atkCd: 0,
      owner: player,
    });

    this.room.sendEvent({
      type: 'skillfx', kind: 'nova',
      x, z, radius: 1.5, color: 0xb44dff,
    });
  }

  // === Шторм — несколько молний по случайным врагам ===
  _castStorm(player, dmgMult) {
    const setFlags = player.stats.setFlags;
    const dmg = 35 * dmgMult * (setFlags['thunder-god'] ? 1.4 : 1);
    const range = 16;
    const boltCount = 5;

    const candidates = this.room.enemies.filter(e => {
      if (e.dying || e.spawnT > 0) return false;
      return Math.hypot(e.x - player.x, e.z - player.z) < range;
    });

    // БОГ ГРОМА: молнии бьют 7 целей
    const maxBolts = setFlags['thunder-god'] ? 7 : boltCount;

    const hit = new Set();
    for (let i = 0; i < Math.min(maxBolts, candidates.length); i++) {
      const idx = Math.floor(Math.random() * candidates.length);
      const target = candidates[idx];
      if (hit.has(target)) { i--; continue; }
      hit.add(target);

      const dead = target.hurt(dmg, player.x, player.z, 6);
      this.room.sendEvent({
        type: 'skillfx', kind: 'beam',
        x: player.x, y: 3, z: player.z,
        x2: target.x, y2: target.size * 0.6, z2: target.z,
        color: 0xffe14d,
      });
      if (dead && !target.dying) { target.kill(); this.room.combat.onKill(target, player); }
    }
  }

  // === Кровавая ярость ===
  _castRage(player, dmgMult) {
    const setFlags = player.stats.setFlags;
    const cost = player.maxHp * 0.15;
    if (player.hp <= cost + 1) return;

    player.hp -= cost;

    // КРОВЯНАЯ КЛЯТВА: лечит на 30% стоимости
    if (setFlags['blood-oath']) {
      const healAmt = cost * 0.3;
      player.heal(healAmt);
      this.room.sendEvent({
        type: 'skillfx', kind: 'float',
        x: player.x, y: 1.9, z: player.z,
        text: '+' + Math.floor(healAmt), color: '#3dff6a', size: 16,
      });
    }

    // +2% вампиризма навсегда (через _bonusVamp)
    player._bonusVamp = (player._bonusVamp || 0) + 0.02;
    player.recomputeStats();

    this.room.sendEvent({
      type: 'skillfx', kind: 'float',
      x: player.x, y: 1.6, z: player.z,
      text: '-' + Math.floor(cost), color: '#ff4444', size: 15,
    });
    this.room.sendEvent({
      type: 'skillfx', kind: 'float',
      x: player.x, y: 2.1, z: player.z,
      text: '🩸 +2% вампиризм', color: '#ff2d3f', size: 14,
    });
    this.room.sendEvent({
      type: 'skillfx', kind: 'nova',
      x: player.x, z: player.z, radius: 2.5, color: 0xff2d3f,
    });
  }

  // === Укрепление ===
  _castFortify(player, dmgMult) {
    player.buffs.fortify = 8;
    player.recomputeStats();
    this.room.sendEvent({
      type: 'skillfx', kind: 'float',
      x: player.x, y: 1.9, z: player.z,
      text: '🏰 +50% HP!', color: '#35e0ff', size: 20,
    });
    this.room.sendEvent({
      type: 'buff', pid: player.id, buff: 'fortify', dur: 8,
    });
    this.room.sendEvent({
      type: 'skillfx', kind: 'nova',
      x: player.x, z: player.z, radius: 2.5, color: 0x35e0ff,
    });
  }

  // Обновление серверных эффектов (вызывается в тике Room)
  update(dt) {
    // вихри
    if (this.room.whirls) {
      for (let i = this.room.whirls.length - 1; i >= 0; i--) {
        const w = this.room.whirls[i];
        w.life -= dt;
        w.tick -= dt;
        // вихрь следует за кастером
        const caster = this.room.players.get(w.pid);
        if (caster && caster.alive) { w.x = caster.x; w.z = caster.z; }
        if (w.tick <= 0) {
          w.tick = w.tickRate;
          for (const e of this.room.enemies) {
            if (e.dying || e.spawnT > 0) continue;
            const d = Math.hypot(e.x - w.x, e.z - w.z);
            if (d < w.range + e.radius) {
              const dead = e.hurt(w.dmg, w.x, w.z, 6);
              if (dead && !e.dying) {
                const player = this.room.players.get(w.pid);
                if (player) { e.kill(); this.room.combat.onKill(e, player); }
              }
            }
          }
          // отражение пуль (вихревой щит)
          if (w.reflect) {
            for (let bi = this.room.bullets.length - 1; bi >= 0; bi--) {
              const b = this.room.bullets[bi];
              if (b.owner) continue; // пули игроков не отражаем
              const d = Math.hypot(b.x - w.x, b.z - w.z);
              if (d < w.range) {
                this.room.bullets.splice(bi, 1);
                this.room.sendEvent({ type: 'skillfx', kind: 'float', x: b.x, y: 1.5, z: b.z, text: '↺', color: '#6ad4ff', size: 14 });
              }
            }
          }
        }
        if (w.life <= 0) this.room.whirls.splice(i, 1);
      }
    }

    // огненные шары
    if (this.room.fireballs) {
      for (let i = this.room.fireballs.length - 1; i >= 0; i--) {
        const fb = this.room.fireballs[i];
        fb.life -= dt;
        fb.x += fb.vx * dt;
        fb.z += fb.vz * dt;

        let boom = fb.life <= 0;
        for (const e of this.room.enemies) {
          if (e.dying || e.spawnT > 0) continue;
          if (Math.hypot(e.x - fb.x, e.z - fb.z) < e.radius + 0.7) { boom = true; break; }
        }

        if (boom) {
          // AoE урон
          for (const e of this.room.enemies) {
            if (e.dying || e.spawnT > 0) continue;
            const d = Math.hypot(e.x - fb.x, e.z - fb.z);
            if (d < fb.aoe + e.radius) {
              const dead = e.hurt(fb.dmg, fb.x, fb.z, 8);
              if (dead && !e.dying) {
                const player = this.room.players.get(fb.by);
                if (player) { e.kill(); this.room.combat.onKill(e, player); }
              }
            }
          }
          this.room.sendEvent({
            type: 'skillfx', kind: 'nova',
            x: fb.x, z: fb.z, radius: fb.aoe, color: ELEMENT_COLORS.fire,
          });
          this.room.fireballs.splice(i, 1);
        }
      }
    }

    // зоны яда (только зоны игроков, не зоны босса)
    if (this.room.zones) {
      for (let i = this.room.zones.length - 1; i >= 0; i--) {
        const z = this.room.zones[i];
        // Пропускаем зоны босса (обрабатываются в Room._updateZones)
        if (z.owner) continue;
        z.life -= dt;
        z.tick -= dt;
        if (z.tick <= 0) {
          z.tick = z.tickRate;
          for (const e of this.room.enemies) {
            if (e.dying || e.spawnT > 0) continue;
            const d = Math.hypot(e.x - z.x, e.z - z.z);
            if (d < z.r + e.radius) {
              const dead = e.hurt(z.dmg, z.x, z.z, 2);
              e.slowT = 1; e.slowF = 0.7;
              if (dead && !e.dying) { e.kill(); this.room.combat.onKill(e, z.by); }
            }
          }
        }
        if (z.life <= 0) this.room.zones.splice(i, 1);
      }
    }

    // телеграфы (метеор)
    if (this.room.telegraphHits) {
      for (let i = this.room.telegraphHits.length - 1; i >= 0; i--) {
        const t = this.room.telegraphHits[i];
        t.life -= dt;
        if (t.life <= 0) {
          if (t.onHit) t.onHit();
          this.room.telegraphHits.splice(i, 1);
        }
      }
    }

    // ловушки
    if (this.room.traps) {
      for (let i = this.room.traps.length - 1; i >= 0; i--) {
        const tr = this.room.traps[i];
        tr.life -= dt;
        tr.tick -= dt;
        if (tr.tick <= 0) {
          tr.tick = tr.tickRate;
          for (const e of this.room.enemies) {
            if (e.dying || e.spawnT > 0) continue;
            const d = Math.hypot(e.x - tr.x, e.z - tr.z);
            if (d < tr.r + e.radius) {
              e.stunT = Math.max(e.stunT, tr.stunDur);
              if (tr.dmg > 0) {
                const dead = e.hurt(tr.dmg, tr.x, tr.z, 4);
                if (dead && !e.dying) {
                  e.kill(); this.room.combat.onKill(e, tr.by);
                }
              }
              this.room.sendEvent({
                type: 'skillfx', kind: 'float',
                x: e.x, y: e.size * 1.2, z: e.z,
                text: 'STUN', color: '#aab2bd', size: 14,
              });
            }
          }
        }
        if (tr.life <= 0) this.room.traps.splice(i, 1);
      }
    }
  }
}
