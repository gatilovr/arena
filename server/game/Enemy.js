import { ENEMY_TYPES, BOSS, ARENA, BOSS_PHASES, BOSS_ENRAGE, clamp } from '../../shared/constants.js';

let EID = 0;

// ============================================================================
// СЕРВЕРНЫЙ ВРАГ — ИИ и состояние считаются на сервере.
// Клиент получает только позиции и интерполирует (EnemyView).
// Боссы имеют полноценные state machines с 4 фазами, телеграфами,
// адаптивным ИИ, комбо-цепочками и тактическим поведением.
// ============================================================================
export class Enemy {
  constructor(type, x, z, wave, isBoss = false) {
    this.id = 'e' + (++EID);
    this.type = type;
    this.isBoss = isBoss;

    const base = isBoss ? BOSS[type] : ENEMY_TYPES[type];
    const hpMul = 1 + (wave - 1) * 0.13;
    const dmgMul = 1 + (wave - 1) * 0.045;
    const spMul = Math.min(1.3, 1 + wave * 0.012);

    this.maxHp = Math.round(base.hp * hpMul);
    this.hp = this.maxHp;
    this.speed = base.sp * (isBoss ? 1 : spMul);
    this.dmg = base.dmg * dmgMul;
    this.size = base.size;
    this.radius = base.r;
    this.xp = base.xp;
    this.score = base.sc;

    // x2 HP for all non-boss mobs
    if (!isBoss) {
      this.maxHp *= 2;
      this.hp = this.maxHp;
    }

    this.x = x; this.y = 0; this.z = z;
    this.yaw = 0;
    this.vx = 0; this.vz = 0;
    this.attackCd = Math.random();
    this.shootCd = 1 + Math.random();
    this.flash = 0;
    this.spawnT = 0.55;
    this.dying = false;
    this.deathT = 0;
    this.seed = Math.random() * 10;

    // exploder fuse
    this.fuse = -1;

    // эффекты скилов
    this.slowT = 0; this.slowF = 1;
    this.burnT = 0; this.burnDps = 0;
    this.stunT = 0;

    // --- БОСС: фазы и состояние ---
    this.phase = 1;
    this.phase2Triggered = false;
    this.phase3Triggered = false;
    this.phase4Triggered = false;
    this.bossState = 'idle';
    this.bossStateT = 0;
    this.spiralAngle = 0;
    this.bossCombatTime = 0; // время в бою для энрейджа
    this.enrageMult = 1.0;

    // --- БОСС: адаптивный ИИ ---
    this._targetId = null;
    this._targetSwitchCd = 0;
    this._lastPlayerPositions = []; // для определения кайтинга
    this._kitingScore = 0; // >0 = игроки кайтят
    this._clusterScore = 0; // >0 = игроки кучкуются
    this._comboChain = 0; // текущая комбо-цепочка
    this._comboTimer = 0;
    this._dodgeCd = 0;
    this._strafeDir = Math.random() > 0.5 ? 1 : -1;
    this._strafeTimer = 0;
    this._aggressionLevel = 0.5; // 0-1, адаптируется

    // --- МЯСНИК ---
    this.slamCd = 3.5;
    this.chargeCd = 6;
    this.minionCd = 10;
    this.chargeDirX = 0; this.chargeDirZ = 1;
    this.chargeHit = false;
    this.slamWavesLeft = 0;
    this.hookCd = 8;
    this.cleaveCd = 4;
    this.cleaveCombo = 0;
    this.bloodRageCd = 15;
    this.bloodRageT = 0;

    // --- НОВЫЕ МОБЫ: состояние ---
    this.shieldHp = 0;
    this.shieldMaxHp = 0;
    this.invisT = 0;
    this.invisCd = 0;
    this.isInvisible = false;
    this.summonCd = 0;
    this.wanderAngle = 0;
    this.erraticT = 0;
    this.groundSlamCd = 0;
    this.burnApplyCd = 0;
    this.debuffCd = 0;

    // Шутер: очередь выстрелов
    this.shooterBurstCount = 0;
    this.shooterBurstTimer = 0;
    this.shooterReloading = false;

    // Танк: разъярение и иммунитет
    this._tankEnraged = false;
    this._tankImmuneT = 0;

    // Спринтер: кулдаун заряда
    this.sprintChargeCd = 0;

    // Щитоносец: реген щита и уязвимость
    this.shieldRegenT = 0;
    this.shieldBrokenT = 0;

    // Голем: разъярение
    this.golemEnraged = false;

    // Взрыватель: взрыв при смерти
    this.deathExplode = false;

    // Ассассин: движение по кругу
    this.circlingAngle = 0;

    // Фантом: задержка видимости после стелса
    this._phantomVisibleT = 0;

    // Ледяной маг: второй снаряд
    this._frostSecondShot = 0;

    if (type === 'shielder' && !isBoss) {
      this.shieldMaxHp = 200;
      this.shieldHp = this.shieldMaxHp;
    }

    // --- НЕКРОМАНТ ---
    this.spiralCd = 3;
    this.necroTeleportCd = 0;
    this.necroShadowBoltCd = 5;
    this.necroRitualCd = 12;
    this.necroSoulDrainCd = 7;
    this.necroDeathNovaCd = 10;
    this.necroCurseSpreadCd = 9;
    this.necroMinionExplodeCd = 6;

    // --- КОРОЛЬ ГОЛЕМОВ ---
    this.gkShieldHp = 0; this.gkSlamCd = 3.5; this.gkSummonCd = 8;
    this.gkEnraged = false; this.gkShieldBroken = false;
    this.gkChargeCd = 0; this.gkEarthquakeCd = 0;
    this.gkChargeDirX = 0; this.gkChargeDirZ = 0;
    this.gkChargeHit = false;
    this.gkBoulderCd = 6;
    this.gkSeismicCd = 8;
    this.gkFortifyCd = 20;
    this.gkFortifyT = 0;
    this.gkEruptionCd = 12;

    // --- ПОВЕЛИТЕЛЬ ОГНЯ ---
    this.flFireballCd = 2.5; this.flFireWaveCd = 0; this.flMeteorCd = 0;
    this.flFireAuraTick = 0;
    this.flInfernoCd = 10;
    this.flPillarCd = 7;
    this.flPhoenixCd = 0;
    this.flPhoenixUsed = false;
    this.flHeatWaveCd = 12;

    // --- КОРОЛЬ ТЕНЕЙ ---
    this.skBackstabCd = 4; this.skCloneCd = 0; this.skVortexCd = 0;
    this.skTeleportCd = 0;
    this.skShadowStepCd = 5;
    this.skDarknessCd = 10;
    this.skSoulRipCd = 8;
    this.skMirrorCd = 12;

    // --- ЛЕДЯНАЯ КОРОЛЕВА ---
    this.fqIceShardCd = 2; this.fqFreezeCd = 8; this.fqBlizzardCd = 0;
    this.fqBlizzardT = 0; this.fqBlizzardActive = false;
    this.fqIceLanceCd = 4;
    this.fqFrozenGroundCd = 9;
    this.fqAbsoluteZeroCd = 15;
    this.fqIceBarrierCd = 12;
    this.fqIceBarrierHp = 0;

    // --- ЛОРД ДРАКОНОВ ---
    this.dlFireBreathCd = 4; this.dlTailSweepCd = 0; this.dlFlyCd = 8;
    this.isFlying = false; this.dlFlyTimer = 0;
    this.dlDiveBombCd = 10;
    this.dlFireStormCd = 12;
    this.dlRoarCd = 14;
    this.dlWingGustCd = 8;
    this.dlComboStep = 0;

    // инициализация боссов
    if (isBoss) {
      if (type === 'golemKing') {
        this.gkShieldHp = 800;
      }
      if (type === 'frostQueen') {
        this.fqIceBarrierHp = 0;
      }
    }
  }

  nearestPlayer(players) {
    let best = null, bd = Infinity;
    for (const p of players) {
      if (!p.alive) continue;
      const d = (p.x - this.x) ** 2 + (p.z - this.z) ** 2;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  // ========================================================================
  // АДАПТИВНЫЙ ВЫБОР ЦЕЛИ — босс выбирает цель на основе угрозы
  // ========================================================================
  _selectTarget(room) {
    const players = room.playersArr().filter(p => p.alive);
    if (!players.length) return null;

    this._targetSwitchCd -= 1 / 30;
    if (this._targetSwitchCd > 0 && this._targetId) {
      const current = players.find(p => p.id === this._targetId);
      if (current) return current;
    }

    // Оценка угрозы: низкое HP + близость + высокий урон
    let best = null, bestScore = -Infinity;
    for (const p of players) {
      const dist = Math.hypot(p.x - this.x, p.z - this.z);
      const hpFactor = 1 - (p.hp / p.maxHp); // низкое HP = выше приоритет
      const distFactor = 1 - Math.min(dist / 30, 1); // ближе = выше
      const comboFactor = (p.combo || 0) * 0.02; // высокий комбо = опасен
      const score = hpFactor * 0.3 + distFactor * 0.4 + comboFactor * 0.3;
      if (score > bestScore) { bestScore = score; best = p; }
    }

    if (best) {
      this._targetId = best.id;
      this._targetSwitchCd = 2.5 + Math.random() * 2; // не переключаем слишком часто
    }
    return best;
  }

  // ========================================================================
  // АНАЛИЗ ПОВЕДЕНИЯ ИГРОКОВ — адаптация стратегии
  // ========================================================================
  _analyzePlayerBehavior(room, dt) {
    const players = room.playersArr().filter(p => p.alive);
    if (!players.length) return;

    // Определяем кайтинг: игроки далеко и убегают
    let avgDist = 0;
    let movingAway = 0;
    for (const p of players) {
      const dist = Math.hypot(p.x - this.x, p.z - this.z);
      avgDist += dist;
      // Проверяем, двигается ли игрок от босса
      const dx = p.x - this.x, dz = p.z - this.z;
      const d = Math.hypot(dx, dz) || 1;
      const moveDot = (p.vx || 0) * (dx / d) + (p.vz || 0) * (dz / d);
      if (moveDot > 2) movingAway++;
    }
    avgDist /= players.length;

    // Кайтинг: далеко + убегают
    if (avgDist > 12 && movingAway > 0) {
      this._kitingScore = Math.min(1, this._kitingScore + dt * 0.5);
    } else {
      this._kitingScore = Math.max(0, this._kitingScore - dt * 0.3);
    }

    // Кластеризация: игроки близко друг к другу
    if (players.length > 1) {
      let clusterDist = 0;
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          clusterDist += Math.hypot(players[i].x - players[j].x, players[i].z - players[j].z);
        }
      }
      clusterDist /= (players.length * (players.length - 1) / 2);
      if (clusterDist < 5) {
        this._clusterScore = Math.min(1, this._clusterScore + dt * 0.4);
      } else {
        this._clusterScore = Math.max(0, this._clusterScore - dt * 0.3);
      }
    }

    // Адаптация агрессии
    const hpPct = this.hp / this.maxHp;
    if (hpPct < 0.3) this._aggressionLevel = Math.min(1, this._aggressionLevel + dt * 0.1);
    if (this._kitingScore > 0.5) this._aggressionLevel = Math.min(1, this._aggressionLevel + dt * 0.15);
    if (this._clusterScore > 0.5) this._aggressionLevel = Math.max(0.3, this._aggressionLevel - dt * 0.05);
  }

  // Возвращает true, если враг умер в этом тике
  update(dt, room) {
    if (this.dying) {
      this.deathT -= dt;
      if (this.deathT <= 0) {
        if (this.deathExplode && room) {
          const deathRadius = 2.0;
          for (const p of room.playersArr()) {
            if (!p.alive) continue;
            const pd = Math.hypot(p.x - this.x, p.z - this.z);
            if (pd < deathRadius) p.takeDamage(this.dmg * 0.6, room);
          }
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: deathRadius, color: 0xff5500 });
        }
        return true;
      }
      return false;
    }
    if (this.spawnT > 0) { this.spawnT -= dt; return false; }
    if (this.flash > 0) this.flash -= dt;

    // эффекты скилов
    if (this.slowT > 0) this.slowT -= dt;
    if (this.burnT > 0) {
      this.burnT -= dt;
      if (Math.random() < dt * 3) {
        this.hp -= this.burnDps * dt * 3;
        if (this.hp <= 0 && !this.dying) {
          this.kill();
          if (this.burnBy) room.combat.onKill(this, this.burnBy);
          return false;
        }
      }
    }
    if (this.stunT > 0) { this.stunT -= dt; return false; }

    const target = this.isBoss ? this._selectTarget(room) : this.nearestPlayer(room.playersArr());
    if (!target) return false;

    const dx = target.x - this.x, dz = target.z - this.z;
    const dist = Math.hypot(dx, dz) || 0.001;
    const dirX = dx / dist, dirZ = dz / dist;
    this.yaw = Math.atan2(dirX, dirZ);

    const attackRange = this.radius + 1.2;
    const sf = this.slowT > 0 ? this.slowF : 1;

    // --- БОСС AI ---
    if (this.isBoss) {
      this.bossCombatTime += dt;
      this._analyzePlayerBehavior(room, dt);
      // Мягкий энрейдж
      if (this.bossCombatTime > BOSS_ENRAGE.START_TIME) {
        const rampTime = this.bossCombatTime - BOSS_ENRAGE.START_TIME;
        this.enrageMult = Math.min(BOSS_ENRAGE.MAX_MULT, 1 + rampTime * BOSS_ENRAGE.RAMP_PER_SEC);
      }
      this._bossAI(dt, room, target, dist, dirX, dirZ, sf);
      return false;
    }

    // --- ОБЫЧНЫЕ ВРАГИ ---
    const hpPct = this.hp / this.maxHp;

    if (this.type === 'normal') {
      const berserk = hpPct < 0.3 ? 1.2 : 1.0;
      const strafe = Math.sin(room.time * 1.8 + this.seed) * this.speed * 0.1;
      if (dist > attackRange) {
        this.x += (dirX * this.speed * berserk * sf - dirZ * strafe) * dt;
        this.z += (dirZ * this.speed * berserk * sf + dirX * strafe) * dt;
      } else {
        this.attackCd -= dt;
        if (this.attackCd <= 0) { this.attackCd = 1.0; target.takeDamage(this.dmg, room); }
      }
    } else if (this.type === 'runner') {
      const spdMul = hpPct < 0.3 ? 1.3 : 1.0;
      const sine = Math.sin(room.time * 4 + this.seed) * this.speed * 0.5;
      if (this.erraticT > 0) {
        this.erraticT -= dt;
        this.x -= dirX * this.speed * spdMul * sf * dt;
        this.z -= dirZ * this.speed * spdMul * sf * dt;
      } else if (dist > attackRange) {
        this.x += (dirX * this.speed * spdMul * sf - dirZ * sine) * dt;
        this.z += (dirZ * this.speed * spdMul * sf + dirX * sine) * dt;
      } else {
        this.attackCd -= dt;
        if (this.attackCd <= 0) {
          this.attackCd = 0.8;
          target.takeDamage(this.dmg, room);
          this.erraticT = 0.8;
        }
      }
    } else if (this.type === 'tank') {
      this.groundSlamCd -= dt;
      if (this._tankImmuneT > 0) {
        this._tankImmuneT -= dt;
        if (this._tankImmuneT <= 0 && !this._tankEnraged) {
          this._tankEnraged = true;
          this.speed *= 1.2;
          this.dmg *= 1.3;
          room.sendEvent({ type: 'ann', text: 'ТАНК РАЗЪЯРЁН!', color: '#6d3fb8' });
        }
      } else {
        if (dist > attackRange) {
          this.x += dirX * this.speed * sf * dt;
          this.z += dirZ * this.speed * sf * dt;
        } else {
          this.attackCd -= dt;
          if (this.attackCd <= 0) { this.attackCd = 1.5; target.takeDamage(this.dmg, room); }
        }
        if (dist < 3.0 && this.groundSlamCd <= 0) {
          this.groundSlamCd = 5.0;
          for (const p of room.playersArr()) {
            if (!p.alive) continue;
            const pd = Math.hypot(p.x - this.x, p.z - this.z);
            if (pd < 2.5) p.takeDamage(this.dmg * 1.5, room);
          }
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 2.5, color: 0x6d3fb8 });
        }
        if (hpPct < 0.3 && !this._tankEnraged && this._tankImmuneT <= 0) {
          this._tankImmuneT = 1.5;
        }
      }
    } else if (this.type === 'exploder') {
      this.deathExplode = true;
      this.x += dirX * this.speed * sf * dt;
      this.z += dirZ * this.speed * sf * dt;
      if (dist < 2.8 && this.fuse < 0) { this.fuse = 0.6; }
      if (this.fuse > 0) {
        this.fuse -= dt;
        if (this.fuse <= 0) {
          const radius = 3.4;
          for (const p of room.playersArr()) {
            if (!p.alive) continue;
            if (Math.hypot(p.x - this.x, p.z - this.z) < radius) p.takeDamage(this.dmg, room);
          }
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius, color: 0xff7a1a });
          this.kill();
          return false;
        }
      }
    } else if (this.type === 'shooter') {
      if (dist > 14) { this.x += dirX * this.speed * sf * dt; this.z += dirZ * this.speed * sf * dt; }
      else if (dist < 7) { this.x -= dirX * this.speed * 0.8 * sf * dt; this.z -= dirZ * this.speed * 0.8 * sf * dt; }
      const strf = Math.sin(room.time * 1.6 + this.seed) * this.speed * 0.6 * sf;
      this.x += -dirZ * strf * dt; this.z += dirX * strf * dt;
      const burstReload = hpPct < 0.3 ? 1.5 : 2.5;
      if (this.shooterReloading) {
        this.shooterBurstTimer -= dt;
        if (this.shooterBurstTimer <= 0) { this.shooterReloading = false; this.shooterBurstCount = 0; }
      } else if (dist < 24) {
        this.shooterBurstTimer -= dt;
        if (this.shooterBurstTimer <= 0 && this.shooterBurstCount < 3) {
          room.spawnBullet(this.x, 1.2, this.z, target, this.dmg, 0x66ccff);
          this.shooterBurstCount++;
          this.shooterBurstTimer = 0.17;
          if (this.shooterBurstCount >= 3) {
            this.shooterReloading = true;
            this.shooterBurstTimer = burstReload;
          }
        }
      }
    } else if (this.type === 'assassin') {
      this.invisCd -= dt;
      if (this.isInvisible) {
        this.invisT -= dt;
        if (this.invisT <= 0) this.isInvisible = false;
        this.x += dirX * this.speed * 1.5 * sf * dt;
        this.z += dirZ * this.speed * 1.5 * sf * dt;
        if (dist < attackRange) {
          this.attackCd -= dt;
          if (this.attackCd <= 0) {
            this.attackCd = 0.7;
            target.takeDamage(this.dmg * 1.8, room);
            room.sendEvent({ type: 'skillfx', kind: 'text', text: 'BACKSTAB!', x: target.x, y: 2.5, z: target.z, color: 0xff0000 });
            this.isInvisible = false;
          }
        }
      } else {
        if (hpPct < 0.3 && this.invisCd <= 0) {
          this.isInvisible = true;
          this.invisT = 2.0;
          this.invisCd = 6.0;
        }
        if (dist > attackRange && dist < 6) {
          this.circlingAngle += dt * 2.5;
          const orbX = target.x + Math.cos(this.circlingAngle) * 2.5;
          const orbZ = target.z + Math.sin(this.circlingAngle) * 2.5;
          const cx = orbX - this.x, cz = orbZ - this.z;
          const cd = Math.hypot(cx, cz) || 1;
          this.x += (cx / cd) * this.speed * sf * dt;
          this.z += (cz / cd) * this.speed * sf * dt;
        } else if (dist >= 6) {
          this.x += dirX * this.speed * sf * dt;
          this.z += dirZ * this.speed * sf * dt;
        } else {
          this.attackCd -= dt;
          if (this.attackCd <= 0) {
            this.attackCd = 0.7;
            const dot = dirX * (-Math.sin(target.yaw)) + dirZ * (-Math.cos(target.yaw));
            const isBehind = dot < -0.3;
            target.takeDamage(isBehind ? this.dmg * 1.8 : this.dmg, room);
            if (isBehind) room.sendEvent({ type: 'skillfx', kind: 'text', text: 'BACKSTAB!', x: target.x, y: 2.5, z: target.z, color: 0xff0000 });
          }
        }
      }
    } else if (this.type === 'berserker') {
      let bDmgMul = 1.0, bSpdMul = 1.0, bAtkCd = 0.9;
      if (hpPct < 0.25) { bDmgMul = 1.8; bSpdMul = 1.6; bAtkCd = 0.5; }
      else if (hpPct < 0.5) { bDmgMul = 1.5; bSpdMul = 1.4; bAtkCd = 0.65; }
      if (dist > attackRange) {
        this.x += dirX * this.speed * bSpdMul * sf * dt;
        this.z += dirZ * this.speed * bSpdMul * sf * dt;
      } else {
        this.attackCd -= dt;
        if (this.attackCd <= 0) { this.attackCd = bAtkCd; target.takeDamage(this.dmg * bDmgMul, room); }
      }
    } else if (this.type === 'summoner') {
      this.summonCd -= dt;
      if (this.summonCd <= 0) {
        const aliveMinions = room.enemies.filter(e => e.isMinion && !e.dying).length;
        if (hpPct < 0.3) { if (aliveMinions < 6) this._spawnMinions(room, 3); }
        else { if (aliveMinions < 4) this._spawnMinions(room, 1); }
        this.summonCd = 8;
      }
      if (dist < 6) {
        this.x -= dirX * this.speed * 1.5 * sf * dt;
        this.z -= dirZ * this.speed * 1.5 * sf * dt;
      } else if (dist > 14) {
        this.x += dirX * this.speed * sf * dt;
        this.z += dirZ * this.speed * sf * dt;
      }
    } else if (this.type === 'shielder') {
      if (this.shieldBrokenT > 0) this.shieldBrokenT -= dt;
      if (this.shieldHp <= 0 && this.shieldBrokenT <= 0 && this.flash <= 0) {
        this.shieldRegenT += dt;
        if (this.shieldRegenT >= 1.0) {
          this.shieldHp = Math.min(this.shieldMaxHp, this.shieldHp + 20);
          this.shieldRegenT = 0;
        }
      } else { this.shieldRegenT = 0; }
      const spdMul = this.shieldBrokenT > 0 ? 1.3 : 1.0;
      if (dist > attackRange) {
        this.x += dirX * this.speed * spdMul * sf * dt;
        this.z += dirZ * this.speed * spdMul * sf * dt;
      } else {
        this.attackCd -= dt;
        if (this.attackCd <= 0) { this.attackCd = 1.2; target.takeDamage(this.dmg, room); }
      }
    } else if (this.type === 'sprinter') {
      const spdMul = hpPct < 0.5 ? 1.15 : 1.0;
      this.sprintChargeCd -= dt;
      this.erraticT -= dt;
      if (this.erraticT <= 0) {
        this.wanderAngle += (Math.random() - 0.5) * 2.5;
        this.erraticT = 0.3 + Math.random() * 0.5;
      }
      const wx = Math.sin(this.wanderAngle), wz = Math.cos(this.wanderAngle);
      const blendX = dirX * 0.3 + wx * 0.7;
      const blendZ = dirZ * 0.3 + wz * 0.7;
      const bd = Math.hypot(blendX, blendZ) || 1;
      this.x += (blendX / bd) * this.speed * spdMul * sf * dt;
      this.z += (blendZ / bd) * this.speed * spdMul * sf * dt;
      if (dist < attackRange && this.sprintChargeCd <= 0) {
        target.takeDamage(this.dmg, room);
        this.sprintChargeCd = 2.0;
        this.erraticT = 0;
        this.wanderAngle = Math.atan2(-dirX, -dirZ);
      }
    } else if (this.type === 'phantom') {
      this.invisCd -= dt;
      if (this.isInvisible) {
        this.invisT -= dt;
        if (this.invisT <= 0) { this.isInvisible = false; this._phantomVisibleT = 1.0; }
        this.x += dirX * this.speed * sf * dt;
        this.z += dirZ * this.speed * sf * dt;
        if (dist < attackRange) {
          this.attackCd -= dt;
          if (this.attackCd <= 0) { this.attackCd = 1.0; target.takeDamage(this.dmg * 1.8, room); }
        }
      } else if (this._phantomVisibleT > 0) {
        this._phantomVisibleT -= dt;
        if (dist > attackRange) {
          this.x += dirX * this.speed * sf * dt;
          this.z += dirZ * this.speed * sf * dt;
        } else {
          this.attackCd -= dt;
          if (this.attackCd <= 0) { this.attackCd = 1.0; target.takeDamage(this.dmg, room); }
        }
      } else {
        if (this.invisCd <= 0 && dist < 12) { this.isInvisible = true; this.invisT = 3.0; this.invisCd = 8.0; }
        if (dist > attackRange) {
          this.x += dirX * this.speed * sf * dt;
          this.z += dirZ * this.speed * sf * dt;
        } else {
          this.attackCd -= dt;
          if (this.attackCd <= 0) { this.attackCd = 1.0; target.takeDamage(this.dmg, room); }
        }
      }
    } else if (this.type === 'golem') {
      const golemSpd = hpPct < 0.4 ? 2.5 : this.speed;
      const slamCd = hpPct < 0.4 ? 3.0 : 6.0;
      this.groundSlamCd -= dt;
      if (dist > attackRange) {
        this.x += dirX * golemSpd * sf * dt;
        this.z += dirZ * golemSpd * sf * dt;
      } else if (this.groundSlamCd <= 0) {
        this.groundSlamCd = slamCd;
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          const pd = Math.hypot(p.x - this.x, p.z - this.z);
          if (pd < 3.0) {
            p.takeDamage(40, room);
            const kdx = p.x - this.x, kdz = p.z - this.z;
            const kd = Math.hypot(kdx, kdz) || 1;
            p.vx = (kdx / kd) * 12; p.vz = (kdz / kd) * 12;
          }
        }
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 3.0, color: 0x888888 });
      } else {
        this.attackCd -= dt;
        if (this.attackCd <= 0) { this.attackCd = 1.5; target.takeDamage(this.dmg, room); }
      }
    } else if (this.type === 'firestarter') {
      if (dist > attackRange) {
        this.x += dirX * this.speed * sf * dt;
        this.z += dirZ * this.speed * sf * dt;
        if (hpPct < 0.3) {
          for (const p of room.playersArr()) {
            if (!p.alive) continue;
            if (Math.hypot(p.x - this.x, p.z - this.z) < 1.2) p.takeDamage(3, room);
          }
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 0.8, color: 0xff4400 });
        }
      } else {
        this.attackCd -= dt;
        if (this.attackCd <= 0) {
          this.attackCd = 1.0;
          target.takeDamage(this.dmg, room);
          target.enemyBurnT = 3.0; target.enemyBurnDps = 6;
          room.sendEvent({ type: 'skillfx', kind: 'text', text: 'BURN', x: target.x, y: 2.5, z: target.z, color: 0xff4400 });
        }
      }
    } else if (this.type === 'frost_mage') {
      if (dist > 10) {
        this.x += dirX * this.speed * sf * dt;
        this.z += dirZ * this.speed * sf * dt;
      } else if (dist < 6) {
        this.x -= dirX * this.speed * 0.9 * sf * dt;
        this.z -= dirZ * this.speed * 0.9 * sf * dt;
      }
      const strf = Math.sin(room.time * 1.4 + this.seed) * this.speed * 0.5 * sf;
      this.x += -dirZ * strf * dt; this.z += dirX * strf * dt;
      this.shootCd -= dt;
      if (this.shootCd <= 0 && dist < 22) {
        this.shootCd = 2.0;
        room.spawnBullet(this.x, 1.2, this.z, target, this.dmg, 0x4488ff);
        target.enemySlowT = 2.0; target.enemySlowF = 0.6;
        if (hpPct < 0.3) {
          room.spawnBullet(this.x + 0.3, 1.2, this.z + 0.3, target, this.dmg, 0x66aaff);
        }
      }
    } else if (this.type === 'cursed') {
      this.debuffCd -= dt;
      if (dist > attackRange) {
        this.x += dirX * this.speed * sf * dt;
        this.z += dirZ * this.speed * sf * dt;
      } else if (dist < 5) {
        this.x -= dirX * this.speed * 0.7 * sf * dt;
        this.z -= dirZ * this.speed * 0.7 * sf * dt;
      }
      this.attackCd -= dt;
      if (this.attackCd <= 0 && dist < attackRange) {
        this.attackCd = 1.0;
        target.takeDamage(this.dmg, room);
        const roll = Math.random();
        if (roll < 0.33) { target.enemySlowT = 2.0; target.enemySlowF = 0.6; room.sendEvent({ type: 'skillfx', kind: 'text', text: 'SLOW', x: target.x, y: 2.5, z: target.z, color: 0x8844aa }); }
        else if (roll < 0.66) { target.damageAmpT = 3.0; target.damageAmpF = 1.2; room.sendEvent({ type: 'skillfx', kind: 'text', text: 'AMP', x: target.x, y: 2.5, z: target.z, color: 0xff4444 }); }
        else { room.sendEvent({ type: 'skillfx', kind: 'text', text: 'BLUR', x: target.x, y: 2.5, z: target.z, color: 0xaa44aa }); }
      }
      if (hpPct < 0.3 && this.debuffCd <= 0) {
        this.debuffCd = 6.0;
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - this.x, p.z - this.z) < 5.0) {
            p.enemySlowT = 2.0; p.enemySlowF = 0.6;
            p.damageAmpT = 3.0; p.damageAmpF = 1.2;
          }
        }
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 5.0, color: 0x8844aa });
        room.sendEvent({ type: 'ann', text: 'ПРОКЛЯТИЕ!', color: '#8844aa' });
      }
    } else if (dist > attackRange) {
      this.x += dirX * this.speed * sf * dt;
      this.z += dirZ * this.speed * sf * dt;
    } else {
      this.attackCd -= dt;
      if (this.attackCd <= 0) { this.attackCd = 1.0; target.takeDamage(this.dmg, room); }
    }

    // knockback
    this.x += this.vx * dt; this.z += this.vz * dt;
    this.vx *= Math.pow(0.25, dt); this.vz *= Math.pow(0.25, dt);

    this.x = clamp(this.x, -ARENA.LIMIT, ARENA.LIMIT);
    this.z = clamp(this.z, -ARENA.LIMIT, ARENA.LIMIT);
    return false;
  }

  // ========================================================================
  // БОСС AI — 4 фазы, адаптивное поведение, комбо-цепочки
  // ========================================================================
  _bossAI(dt, room, target, dist, dirX, dirZ, sf) {
    const hpPct = this.hp / this.maxHp;
    const em = this.enrageMult;

    // Phase transitions (4 phases)
    if (!this.phase2Triggered && hpPct <= BOSS_PHASES.p2) {
      this.phase2Triggered = true; this.phase = 2;
      this._onPhaseChange(room, 2);
    }
    if (!this.phase3Triggered && hpPct <= BOSS_PHASES.p3) {
      this.phase3Triggered = true; this.phase = 3;
      this._onPhaseChange(room, 3);
    }
    if (!this.phase4Triggered && hpPct <= BOSS_PHASES.p4) {
      this.phase4Triggered = true; this.phase = 4;
      this._onPhaseChange(room, 4);
    }

    // Strafe behavior (all bosses)
    this._strafeTimer -= dt;
    if (this._strafeTimer <= 0) {
      this._strafeDir *= -1;
      this._strafeTimer = 1.5 + Math.random() * 2;
    }

    // Combo timer
    if (this._comboTimer > 0) {
      this._comboTimer -= dt;
      if (this._comboTimer <= 0) this._comboChain = 0;
    }

    // Route to boss AI
    switch (this.type) {
      case 'butcher': this._butcherAI(dt, room, target, dist, dirX, dirZ, sf, em); break;
      case 'necro': this._necroAI(dt, room, target, dist, dirX, dirZ, sf, em); break;
      case 'golemKing': this._golemKingAI(dt, room, target, dist, dirX, dirZ, sf, em); break;
      case 'firelord': this._firelordAI(dt, room, target, dist, dirX, dirZ, sf, em); break;
      case 'shadowKing': this._shadowKingAI(dt, room, target, dist, dirX, dirZ, sf, em); break;
      case 'frostQueen': this._frostQueenAI(dt, room, target, dist, dirX, dirZ, sf, em); break;
      case 'dragonLord': this._dragonLordAI(dt, room, target, dist, dirX, dirZ, sf, em); break;
    }
  }

  _onPhaseChange(room, phase) {
    const names = {
      butcher: ['МЯСНИК ЯРОСТЕН!', 'БЕЗУМИЕ!', 'КРОВАВАЯ ЖАТВА!'],
      necro: ['ТЁМНАЯ МАГИЯ!', 'ТЁМНЫЙ РИТУАЛ!', 'ДУШИ ПОГЛОЩЕНЫ!'],
      golemKing: ['ГОЛЕМ БЕШЕН!', 'ЗЕМЛЕТРЯСЕНИЕ!', 'ТЕКТОНИЧЕСКИЙ РАЗЛОМ!'],
      firelord: ['ВОЛНА ОГНЯ!', 'ОГНЕННАЯ АУРА!', 'ФЕНИКС ПРОБУЖДАЕТСЯ!'],
      shadowKing: ['ТЕНИ ОЖИВАЮТ!', 'ТЁМНЫЙ ВИХРЬ!', 'АБСОЛЮТНАЯ ТЬМА!'],
      frostQueen: ['ЛЕДЯНОЙ ЩИТ!', 'МЕТЕЛЬ!', 'АБСОЛЮТНЫЙ НОЛЬ!'],
      dragonLord: ['ХВОСТ ДРАКОНА!', 'В ПОЛЁТ!', 'ДРАКОНЬЯ ЯРОСТЬ!']
    };
    const colors = {
      butcher: ['#ff2d3f', '#ff0000', '#880000'],
      necro: ['#7722cc', '#5500aa', '#330066'],
      golemKing: ['#ffaa00', '#885522', '#553300'],
      firelord: ['#ff4400', '#ff2200', '#ff6600'],
      shadowKing: ['#222222', '#440066', '#110022'],
      frostQueen: ['#4488ff', '#88ccff', '#00ffff'],
      dragonLord: ['#ff4400', '#ff6600', '#ff0000']
    };
    const idx = phase - 2;
    const name = names[this.type]?.[idx] || 'ЯРОСТЬ!';
    const color = colors[this.type]?.[idx] || '#ff0000';

    room.sendEvent({ type: 'ann', text: name, color });
    room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 4 + phase, color: parseInt(color.replace('#', '0x')) });

    // Phase 4: berserk buff
    if (phase === 4) {
      this.speed *= 1.4;
      this.dmg *= 1.3;
    } else if (phase === 3) {
      this.speed *= 1.2;
      this.dmg *= 1.15;
    } else if (phase === 2) {
      this.speed *= 1.1;
      this.dmg *= 1.1;
    }
  }

  // ========================================================================
  // МЯСНИК: ближний бой, крюк, комбо-удары, заряд, кровавая ярость
  // ========================================================================
  _butcherAI(dt, room, target, dist, dirX, dirZ, sf, em) {
    this.bossStateT -= dt;
    this.slamCd -= dt;
    this.chargeCd -= dt;
    this.minionCd -= dt;
    this.hookCd -= dt;
    this.cleaveCd -= dt;
    this.bloodRageCd -= dt;

    // Кровавая ярость (фаза 3+): бафф урона на 5с
    if (this.bloodRageT > 0) {
      this.bloodRageT -= dt;
    }
    const rageDmgMul = this.bloodRageT > 0 ? 1.5 : 1;

    switch (this.bossState) {
      case 'idle': {
        // Адаптивное движение: если кайтят — агрессивнее
        const chaseSpeed = this.speed * sf * em * (this._kitingScore > 0.5 ? 1.3 : 1);
        if (dist > 2.5) {
          // Strafe while approaching
          const strafeAmt = this._strafeDir * this.speed * 0.3 * sf;
          this.x += (dirX * chaseSpeed - dirZ * strafeAmt) * dt;
          this.z += (dirZ * chaseSpeed + dirX * strafeAmt) * dt;
        }

        // Priority-based ability selection
        // 1. Hook if player is far (gap closer)
        if (dist > 8 && this.hookCd <= 0 && this.phase >= 2) {
          this.bossState = 'hookTele';
          this.bossStateT = 0.5;
          this.hookCd = this.phase >= 4 ? 4 : 8;
          room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: target.x, z: target.z, r: 1.5, dur: 0.5, color: 0xff4444 });
        }
        // 2. Charge if mid-range
        else if (dist > 5 && this.chargeCd <= 0) {
          this.bossState = 'chargeTele';
          this.bossStateT = 0.6;
          this.chargeDirX = dirX; this.chargeDirZ = dirZ;
          this.chargeHit = false;
          this.chargeCd = this.phase >= 4 ? 2.5 : (this.phase >= 3 ? 3.5 : 6);
          room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: this.x, z: this.z, r: 2, dur: 0.6, color: 0xff4444 });
        }
        // 3. Cleave combo if in melee
        else if (dist < 4 && this.cleaveCd <= 0) {
          this.bossState = 'cleaveCombo';
          this.bossStateT = 0.3;
          this.cleaveCombo = 0;
          this.cleaveCd = this.phase >= 3 ? 2.5 : 4;
        }
        // 4. Slam if in range
        else if (dist < 5 && this.slamCd <= 0) {
          this.bossState = 'slamTele';
          this.bossStateT = 0.6;
          this.slamWavesLeft = this.phase >= 3 ? 3 : (this.phase >= 2 ? 2 : 1);
          this.slamCd = this.phase >= 4 ? 1.5 : (this.phase >= 3 ? 2 : 3.5);
          room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: this.x, z: this.z, r: 4, dur: 0.6, color: 0xff2d3f });
        }

        // Blood rage (phase 3+)
        if (this.phase >= 3 && this.bloodRageCd <= 0 && this.bloodRageT <= 0) {
          this.bloodRageT = 5;
          this.bloodRageCd = 15;
          room.sendEvent({ type: 'ann', text: 'КРОВАВАЯ ЯРОСТЬ!', color: '#ff0000' });
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 3, color: 0xff0000 });
        }

        // Spawn minions
        if (this.minionCd <= 0) {
          this._spawnMinions(room, this.phase >= 4 ? 4 : (this.phase >= 3 ? 3 : 2));
          this.minionCd = this.phase >= 4 ? 4 : (this.phase >= 3 ? 6 : 10);
        }
        break;
      }
      case 'hookTele': {
        if (this.bossStateT <= 0) {
          // Pull target toward boss
          const pullDist = Math.max(0, dist - 3);
          target.x -= dirX * pullDist * 0.8;
          target.z -= dirZ * pullDist * 0.8;
          target.takeDamage(this.dmg * 0.5 * em, room);
          room.sendEvent({ type: 'skillfx', kind: 'beam', x: this.x, y: 1.5, z: this.z, x2: target.x, y2: 1.2, z2: target.z, color: 0xff4444 });
          room.sendEvent({ type: 'skillfx', kind: 'text', text: 'HOOK!', x: target.x, y: 2.5, z: target.z, color: 0xff4444 });
          this.bossState = 'idle';
          // Combo into cleave
          this._comboChain = 1;
          this._comboTimer = 1.5;
        }
        break;
      }
      case 'cleaveCombo': {
        if (this.bossStateT <= 0) {
          this.cleaveCombo++;
          const comboDmg = [1.0, 1.2, 1.8][Math.min(this.cleaveCombo - 1, 2)] * rageDmgMul * em;
          const comboRange = [3.5, 4.0, 5.0][Math.min(this.cleaveCombo - 1, 2)];
          for (const p of room.playersArr()) {
            if (!p.alive) continue;
            if (Math.hypot(p.x - this.x, p.z - this.z) < comboRange) {
              p.takeDamage(this.dmg * comboDmg, room);
            }
          }
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: comboRange, color: 0xff2d3f });

          const maxCombo = this.phase >= 4 ? 4 : (this.phase >= 2 ? 3 : 2);
          if (this.cleaveCombo < maxCombo) {
            this.bossStateT = 0.35;
          } else {
            this.bossState = 'idle';
          }
        }
        break;
      }
      case 'slamTele': {
        if (this.bossStateT <= 0) {
          this.slamWavesLeft--;
          this.bossState = 'slamHit';
          this.bossStateT = 0.12;
          for (const p of room.playersArr()) {
            if (!p.alive) continue;
            if (Math.hypot(p.x - this.x, p.z - this.z) < 4) {
              p.takeDamage(this.dmg * 1.4 * em * rageDmgMul, room);
              const kdx = p.x - this.x, kdz = p.z - this.z;
              const kd = Math.hypot(kdx, kdz) || 1;
              p.vx += (kdx / kd) * 8; p.vz += (kdz / kd) * 8;
            }
          }
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 4, color: 0xff2d3f });
        }
        break;
      }
      case 'slamHit': {
        if (this.bossStateT <= 0) {
          if (this.slamWavesLeft > 0) {
            this.bossState = 'slamTele';
            this.bossStateT = 0.4;
            room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: this.x, z: this.z, r: 4.5, dur: 0.4, color: 0xff0000 });
          } else {
            this.bossState = 'idle';
          }
        }
        break;
      }
      case 'chargeTele': {
        if (this.bossStateT <= 0) {
          this.bossState = 'charging';
          this.bossStateT = 0.5;
        }
        break;
      }
      case 'charging': {
        this.x += this.chargeDirX * 28 * em * dt;
        this.z += this.chargeDirZ * 28 * em * dt;
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - this.x, p.z - this.z) < 2.5 && !this.chargeHit) {
            this.chargeHit = true;
            p.takeDamage(this.dmg * 1.3 * em * rageDmgMul, room);
            p.stunT = 0.8;
            room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 2.5, color: 0xff4444 });
          }
        }
        if (this.phase >= 3) {
          for (const p of room.playersArr()) {
            if (!p.alive) continue;
            if (Math.hypot(p.x - this.x, p.z - this.z) < 3) p.takeDamage(this.dmg * 0.4 * em, room);
          }
        }
        if (Math.abs(this.x) > ARENA.LIMIT - 2 || Math.abs(this.z) > ARENA.LIMIT - 2) {
          this.bossState = 'stun'; this.bossStateT = 0.5;
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 3, color: 0xffaa00 });
        } else if (this.bossStateT <= 0) {
          this.bossState = 'idle';
        }
        break;
      }
      case 'stun': {
        if (this.bossStateT <= 0) this.bossState = 'idle';
        break;
      }
    }
    this.y = Math.abs(Math.sin(room.time * 5)) * 0.08;
  }

  // ========================================================================
  // НЕКРОМАНТ: дальний бой, спираль, телепорт, ритуал, drain, nova, curse
  // ========================================================================
  _necroAI(dt, room, target, dist, dirX, dirZ, sf, em) {
    this.bossStateT -= dt;
    this.spiralCd -= dt;
    this.minionCd -= dt;
    this.necroShadowBoltCd -= dt;
    this.necroSoulDrainCd -= dt;
    this.necroDeathNovaCd -= dt;
    this.necroCurseSpreadCd -= dt;
    this.necroRitualCd -= dt;
    this.necroTeleportCd -= dt;

    // Phase 3+: dark ritual channeling
    if (this.phase >= 3 && this.bossState === 'ritual') {
      this.bossStateT -= dt;
      if (this.bossStateT <= 0) {
        this.bossState = 'idle';
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          p.takeDamage(this.dmg * 2.0 * em, room);
          p.enemySlowT = 3; p.enemySlowF = 0.4;
        }
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 14, color: 0x5500aa });
        room.sendEvent({ type: 'ann', text: 'РИТУАЛ ЗАВЕРШЁН!', color: '#5500aa' });
      }
      return;
    }

    // Maintain distance 8-14m (adaptive: if kiting, close faster)
    const preferredDist = this._kitingScore > 0.5 ? 10 : 12;
    if (dist > preferredDist + 2) {
      this.x += dirX * this.speed * sf * em * dt;
      this.z += dirZ * this.speed * sf * em * dt;
    } else if (dist < preferredDist - 3) {
      this.x -= dirX * this.speed * 0.9 * sf * dt;
      this.z -= dirZ * this.speed * 0.9 * sf * dt;
    }

    // Strafe
    const sx = -dirZ * this._strafeDir * this.speed * 0.5 * sf;
    const sz = dirX * this._strafeDir * this.speed * 0.5 * sf;
    this.x += sx * dt; this.z += sz * dt;

    // Spiral bullets
    if (this.spiralCd <= 0) {
      const n = this.phase >= 3 ? 16 : (this.phase >= 2 ? 12 : 8);
      this._fireSpiral(room, n);
      this.spiralCd = this.phase >= 4 ? 1.5 : (this.phase >= 2 ? 2.2 : 3);
    }

    // Summon minions
    if (this.minionCd <= 0) {
      const aliveMinions = room.enemies.filter(e => e.isMinion && !e.dying).length;
      const maxM = this.phase >= 4 ? 10 : (this.phase >= 3 ? 8 : 5);
      if (aliveMinions < maxM) this._spawnMinions(room, this.phase >= 3 ? 4 : 2);
      this.minionCd = this.phase >= 4 ? 4 : (this.phase >= 3 ? 5 : 8);
    }

    // Shadow bolt (targeted, slow)
    if (this.phase >= 2 && this.necroShadowBoltCd <= 0 && dist < 20) {
      this.necroShadowBoltCd = this.phase >= 4 ? 2.5 : 4;
      room.spawnBullet(this.x, 1.8, this.z, target, this.dmg * 1.3 * em, 0x8800cc);
      target.enemySlowT = 3; target.enemySlowF = 0.5;
    }

    // Soul drain (phase 2+): channel 2s, heal self, damage target
    if (this.phase >= 2 && this.necroSoulDrainCd <= 0 && dist < 12) {
      this.necroSoulDrainCd = this.phase >= 4 ? 5 : 7;
      const drainDmg = this.dmg * 0.8 * em;
      target.takeDamage(drainDmg, room);
      this.hp = Math.min(this.maxHp, this.hp + drainDmg * 0.5);
      room.sendEvent({ type: 'skillfx', kind: 'beam', x: this.x, y: 1.8, z: this.z, x2: target.x, y2: 1.2, z2: target.z, color: 0x44ff44 });
      room.sendEvent({ type: 'skillfx', kind: 'text', text: 'DRAIN', x: target.x, y: 2.5, z: target.z, color: 0x44ff44 });
    }

    // Death nova (phase 3+): AoE around boss
    if (this.phase >= 3 && this.necroDeathNovaCd <= 0 && dist < 8) {
      this.necroDeathNovaCd = this.phase >= 4 ? 6 : 10;
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - this.x, p.z - this.z) < 7) {
          p.takeDamage(this.dmg * 1.2 * em, room);
          const kdx = p.x - this.x, kdz = p.z - this.z;
          const kd = Math.hypot(kdx, kdz) || 1;
          p.vx += (kdx / kd) * 10; p.vz += (kdz / kd) * 10;
        }
      }
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 7, color: 0x7722cc });
    }

    // Curse spread (phase 3+): debuff all players
    if (this.phase >= 3 && this.necroCurseSpreadCd <= 0) {
      this.necroCurseSpreadCd = this.phase >= 4 ? 6 : 9;
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        p.enemySlowT = 2; p.enemySlowF = 0.6;
        p.damageAmpT = 3; p.damageAmpF = 1.25;
      }
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 20, color: 0x5500aa });
      room.sendEvent({ type: 'ann', text: 'ПРОКЛЯТИЕ РАСПРОСТРАНЯЕТСЯ!', color: '#5500aa' });
    }

    // Dark ritual (phase 3+)
    if (this.phase >= 3 && this.necroRitualCd <= 0 && dist < 16) {
      this.bossState = 'ritual';
      this.bossStateT = 2.5;
      this.necroRitualCd = this.phase >= 4 ? 10 : 15;
      room.sendEvent({ type: 'ann', text: 'РИТУАЛ НАЧИНАЕТСЯ!', color: '#5500aa' });
      room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: this.x, z: this.z, r: 14, dur: 2.5, color: 0x5500aa });
    }

    // Teleport when player gets too close
    if (dist < 5 && this.bossState !== 'ritual' && this.necroTeleportCd <= 0) {
      this.necroTeleportCd = this.phase >= 4 ? 2 : (this.phase >= 3 ? 3 : 5);
      const a = Math.random() * Math.PI * 2;
      const d = 11 + Math.random() * 4;
      this.x = clamp(target.x + Math.cos(a) * d, -ARENA.LIMIT + 2, ARENA.LIMIT - 2);
      this.z = clamp(target.z + Math.sin(a) * d, -ARENA.LIMIT + 2, ARENA.LIMIT - 2);
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 2, color: 0x7722cc });
    }

    this.y = Math.sin(room.time * 2 + this.seed) * 0.1;
  }

  // ========================================================================
  // КОРОЛЬ ГОЛЕМОВ: щит, удары, charge, earthquake, boulder, seismic, fortify
  // ========================================================================
  _golemKingAI(dt, room, target, dist, dirX, dirZ, sf, em) {
    this.gkSlamCd -= dt;
    this.gkChargeCd -= dt;
    this.gkEarthquakeCd -= dt;
    this.gkBoulderCd -= dt;
    this.gkSeismicCd -= dt;
    this.gkFortifyCd -= dt;
    this.gkEruptionCd -= dt;

    // Fortify active
    if (this.gkFortifyT > 0) {
      this.gkFortifyT -= dt;
    }

    // Shield broken event
    if (this.gkShieldBroken) {
      this.gkShieldBroken = false;
      room.sendEvent({ type: 'ann', text: 'ЩИТ РАЗБИТ!', color: '#00aaff' });
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 4, color: 0x2f5080 });
    }

    // State machine for charge
    if (this.bossState === 'gkChargeTele') {
      this.bossStateT -= dt;
      if (this.bossStateT <= 0) {
        this.bossState = 'gkCharging';
        this.bossStateT = 0.6;
      }
      return;
    }
    if (this.bossState === 'gkCharging') {
      this.bossStateT -= dt;
      this.x += this.gkChargeDirX * 24 * em * dt;
      this.z += this.gkChargeDirZ * 24 * em * dt;
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - this.x, p.z - this.z) < 2.5 && !this.gkChargeHit) {
          this.gkChargeHit = true;
          p.takeDamage(this.dmg * 1.5 * em, room);
          p.stunT = 1.0;
        }
      }
      if (Math.abs(this.x) > ARENA.LIMIT - 2 || Math.abs(this.z) > ARENA.LIMIT - 2 || this.bossStateT <= 0) {
        this.bossState = 'idle';
        // Seismic wave on wall hit (phase 3+)
        if (this.phase >= 3) {
          for (const p of room.playersArr()) {
            if (!p.alive) continue;
            if (Math.hypot(p.x - this.x, p.z - this.z) < 6) {
              p.takeDamage(this.dmg * 0.8 * em, room);
            }
          }
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 6, color: 0x885522 });
        }
      }
      return;
    }

    // Slam telegraph
    if (this.bossState === 'gkSlamTele') {
      this.bossStateT -= dt;
      if (this.bossStateT <= 0) {
        this.bossState = 'idle';
        const slamDmg = this.dmg * (this.phase >= 4 ? 1.8 : (this.phase >= 3 ? 1.5 : 1.2)) * em;
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - this.x, p.z - this.z) < 5) {
            p.takeDamage(slamDmg, room);
            const kdx = p.x - this.x, kdz = p.z - this.z;
            const kd = Math.hypot(kdx, kdz) || 1;
            p.vx += (kdx / kd) * 10; p.vz += (kdz / kd) * 10;
          }
        }
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 5, color: 0x555555 });
      }
      return;
    }

    // Chase player (adaptive speed)
    const chaseSpd = this.speed * sf * em * (this._kitingScore > 0.5 ? 1.2 : 1);
    if (dist > 2.5) {
      this.x += dirX * chaseSpd * dt;
      this.z += dirZ * chaseSpd * dt;
    }

    // Boulder throw (phase 2+, ranged attack)
    if (this.phase >= 2 && this.gkBoulderCd <= 0 && dist > 8) {
      this.gkBoulderCd = this.phase >= 4 ? 3 : 6;
      room.spawnBullet(this.x, 2.5, this.z, target, this.dmg * 1.2 * em, 0x888888);
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 1.5, color: 0x888888 });
    }

    // Charge (phase 2+)
    if (this.phase >= 2 && this.gkChargeCd <= 0 && dist > 5 && dist < 20) {
      this.bossState = 'gkChargeTele';
      this.bossStateT = 0.7;
      this.gkChargeDirX = dirX; this.gkChargeDirZ = dirZ;
      this.gkChargeHit = false;
      this.gkChargeCd = this.phase >= 4 ? 3 : 5;
      room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: this.x, z: this.z, r: 2.5, dur: 0.7, color: 0xffaa00 });
    }

    // Ground Slam
    if (dist < 5 && this.gkSlamCd <= 0) {
      this.bossState = 'gkSlamTele';
      this.bossStateT = 0.7;
      this.gkSlamCd = this.phase >= 4 ? 1.5 : (this.phase >= 2 ? 2.5 : 3.5);
      room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: this.x, z: this.z, r: 5, dur: 0.7, color: 0x555555 });
    }

    // Seismic waves (phase 3+): line of damage toward target
    if (this.phase >= 3 && this.gkSeismicCd <= 0 && dist < 15) {
      this.gkSeismicCd = this.phase >= 4 ? 5 : 8;
      for (let i = 1; i <= 5; i++) {
        const sx = this.x + dirX * i * 3;
        const sz = this.z + dirZ * i * 3;
        room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: sx, z: sz, r: 2, dur: 0.3 + i * 0.15, color: 0x885522 });
        setTimeout(() => {
          for (const p of room.playersArr()) {
            if (!p.alive) continue;
            if (Math.hypot(p.x - sx, p.z - sz) < 2) p.takeDamage(this.dmg * 0.7 * em, room);
          }
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: sx, z: sz, radius: 2, color: 0x885522 });
        }, (300 + i * 150));
      }
    }

    // Fortify (phase 3+): temporary damage reduction
    if (this.phase >= 3 && this.gkFortifyCd <= 0 && this.hp / this.maxHp < 0.5) {
      this.gkFortifyCd = 20;
      this.gkFortifyT = 4;
      room.sendEvent({ type: 'ann', text: 'КАМЕННАЯ КОЖА!', color: '#888888' });
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 2, color: 0x888888 });
    }

    // Earthquake (phase 3+)
    if (this.phase >= 3 && this.gkEarthquakeCd <= 0) {
      this.gkEarthquakeCd = this.phase >= 4 ? 5 : 7;
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - this.x, p.z - this.z) < 6) {
          p.takeDamage(this.dmg * 1.3 * em, room);
          const kdx = p.x - this.x, kdz = p.z - this.z;
          const kd = Math.hypot(kdx, kdz) || 1;
          p.vx = (kdx / kd) * 14; p.vz = (kdz / kd) * 14;
        }
      }
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 6, color: 0x885522 });
      this._spawnMinions(room, this.phase >= 4 ? 4 : 3);
    }

    // Eruption (phase 4): multiple random AoEs
    if (this.phase >= 4 && this.gkEruptionCd <= 0) {
      this.gkEruptionCd = 8;
      for (let i = 0; i < 4; i++) {
        const ex = target.x + (Math.random() - 0.5) * 10;
        const ez = target.z + (Math.random() - 0.5) * 10;
        room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: ex, z: ez, r: 2.5, dur: 1.0, color: 0xff4400 });
        setTimeout(() => {
          for (const p of room.playersArr()) {
            if (!p.alive) continue;
            if (Math.hypot(p.x - ex, p.z - ez) < 2.5) p.takeDamage(this.dmg * 1.0 * em, room);
          }
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: ex, z: ez, radius: 2.5, color: 0xff4400 });
        }, 1000);
      }
    }

    this.y = Math.abs(Math.sin(room.time * 4)) * 0.06;
  }

  // ========================================================================
  // ПОВЕЛИТЕЛЬ ОГНЯ: fireballs, wave, meteor, aura, inferno, pillars, phoenix
  // ========================================================================
  _firelordAI(dt, room, target, dist, dirX, dirZ, sf, em) {
    this.flFireballCd -= dt;
    this.flFireWaveCd -= dt;
    this.flMeteorCd -= dt;
    this.flInfernoCd -= dt;
    this.flPillarCd -= dt;
    this.flHeatWaveCd -= dt;

    // Phoenix rebirth (once, at 15% HP)
    if (this.phase >= 4 && !this.flPhoenixUsed && this.hp / this.maxHp < 0.15) {
      this.flPhoenixUsed = true;
      this.hp = Math.round(this.maxHp * 0.25);
      room.sendEvent({ type: 'ann', text: 'ФЕНИКС ВОЗРОЖДАЕТСЯ!', color: '#ff6600' });
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 8, color: 0xff6600 });
      // Damage all nearby
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - this.x, p.z - this.z) < 8) {
          p.takeDamage(this.dmg * 1.5 * em, room);
          p.enemyBurnT = 4; p.enemyBurnDps = 10;
        }
      }
    }

    // Fire aura (phase 3+)
    if (this.phase >= 3) {
      this.flFireAuraTick -= dt;
      if (this.flFireAuraTick <= 0) {
        this.flFireAuraTick = 0.5;
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - this.x, p.z - this.z) < 3.5) {
            p.takeDamage(this.dmg * 0.12 * em, room);
          }
        }
      }
    }

    // Maintain distance (adaptive)
    const prefDist = this._kitingScore > 0.5 ? 8 : 10;
    if (dist > prefDist + 3) {
      this.x += dirX * this.speed * sf * em * dt;
      this.z += dirZ * this.speed * sf * em * dt;
    } else if (dist < prefDist - 3) {
      this.x -= dirX * this.speed * 0.8 * sf * dt;
      this.z -= dirZ * this.speed * 0.8 * sf * dt;
    }

    // Strafe
    const sx = -dirZ * this._strafeDir * this.speed * 0.5 * sf;
    const sz = dirX * this._strafeDir * this.speed * 0.5 * sf;
    this.x += sx * dt; this.z += sz * dt;

    // Fireballs
    if (this.flFireballCd <= 0 && dist < 22) {
      this.flFireballCd = this.phase >= 4 ? 1.5 : 2.5;
      const count = this.phase >= 3 ? 5 : 3;
      for (let i = 0; i < count; i++) {
        room.spawnBullet(this.x, 1.5, this.z, target, this.dmg * 0.8 * em, 0xff4400);
      }
    }

    // Fire wave (phase 2+)
    if (this.phase >= 2 && this.flFireWaveCd <= 0 && dist < 12) {
      this.flFireWaveCd = this.phase >= 4 ? 3 : 5;
      const baseAngle = Math.atan2(dirX, dirZ);
      const coneHalf = (120 * Math.PI / 180) / 2;
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        const pd = Math.hypot(p.x - this.x, p.z - this.z);
        if (pd > 8) continue;
        const pAngle = Math.atan2(p.x - this.x, p.z - this.z);
        let diff = pAngle - baseAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) < coneHalf) {
          p.takeDamage(this.dmg * 1.2 * em, room);
          p.enemyBurnT = 3; p.enemyBurnDps = 8;
        }
      }
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 8, color: 0xff6600 });
    }

    // Fire pillars (phase 2+): telegraphed line of fire
    if (this.phase >= 2 && this.flPillarCd <= 0 && dist < 16) {
      this.flPillarCd = this.phase >= 4 ? 4 : 7;
      for (let i = 0; i < 3; i++) {
        const px = target.x + (Math.random() - 0.5) * 6;
        const pz = target.z + (Math.random() - 0.5) * 6;
        room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: px, z: pz, r: 1.5, dur: 1.0, color: 0xff4400 });
        setTimeout(() => {
          for (const p of room.playersArr()) {
            if (!p.alive) continue;
            if (Math.hypot(p.x - px, p.z - pz) < 1.5) {
              p.takeDamage(this.dmg * 1.0 * em, room);
              p.enemyBurnT = 2; p.enemyBurnDps = 6;
            }
          }
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: px, z: pz, radius: 1.5, color: 0xff4400 });
        }, 1000);
      }
    }

    // Meteor rain (phase 3+)
    if (this.phase >= 3 && this.flMeteorCd <= 0) {
      this.flMeteorCd = this.phase >= 4 ? 5 : 7;
      const count = this.phase >= 4 ? 7 : 5;
      for (let i = 0; i < count; i++) {
        const mx = target.x + (Math.random() - 0.5) * 10;
        const mz = target.z + (Math.random() - 0.5) * 10;
        room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: mx, z: mz, r: 2, dur: 1.2, color: 0xff2200 });
        setTimeout(() => {
          for (const p of room.playersArr()) {
            if (!p.alive) continue;
            if (Math.hypot(p.x - mx, p.z - mz) < 2) p.takeDamage(this.dmg * 1.5 * em, room);
          }
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: mx, z: mz, radius: 2, color: 0xff2200 });
        }, 1200);
      }
      room.sendEvent({ type: 'ann', text: 'МЕТЕОРЫ!', color: '#ff4400' });
    }

    // Heat wave (phase 4): full-screen slow + burn
    if (this.phase >= 4 && this.flHeatWaveCd <= 0) {
      this.flHeatWaveCd = 12;
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        p.enemySlowT = 3; p.enemySlowF = 0.6;
        p.enemyBurnT = 4; p.enemyBurnDps = 5;
      }
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 30, color: 0xff6600 });
      room.sendEvent({ type: 'ann', text: 'ВОЛНА ЖАРА!', color: '#ff6600' });
    }

    this.y = Math.sin(room.time * 2) * 0.08;
  }

  // ========================================================================
  // КОРОЛЬ ТЕНЕЙ: teleport, backstab, clones, vortex, shadow step, darkness
  // ========================================================================
  _shadowKingAI(dt, room, target, dist, dirX, dirZ, sf, em) {
    this.skTeleportCd -= dt;
    this.skBackstabCd -= dt;
    this.skCloneCd -= dt;
    this.skVortexCd -= dt;
    this.skShadowStepCd -= dt;
    this.skDarknessCd -= dt;
    this.skSoulRipCd -= dt;
    this.skMirrorCd -= dt;

    // Shadow vortex (phase 3+)
    if (this.phase >= 3 && this.skVortexCd <= 0 && dist < 16) {
      this.skVortexCd = this.phase >= 4 ? 4 : 6;
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        const pd = Math.hypot(p.x - this.x, p.z - this.z);
        if (pd < 10) {
          const pullStr = Math.max(0, 8 - pd) * 1.5;
          const pullX = (this.x - p.x) / (pd || 1);
          const pullZ = (this.z - p.z) / (pd || 1);
          p.vx += pullX * pullStr; p.vz += pullZ * pullStr;
          p.takeDamage(this.dmg * 1.0 * em, room);
        }
      }
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 10, color: 0x440066 });
      room.sendEvent({ type: 'ann', text: 'ТЁМНЫЙ ВИХРЬ!', color: '#440066' });
    }

    // Darkness zone (phase 3+): AoE that blinds (slows + damage over time)
    if (this.phase >= 3 && this.skDarknessCd <= 0) {
      this.skDarknessCd = this.phase >= 4 ? 7 : 10;
      const dzx = target.x, dzz = target.z;
      room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: dzx, z: dzz, r: 6, dur: 1.0, color: 0x110022 });
      setTimeout(() => {
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - dzx, p.z - dzz) < 6) {
            p.takeDamage(this.dmg * 1.2 * em, room);
            p.enemySlowT = 3; p.enemySlowF = 0.4;
          }
        }
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: dzx, z: dzz, radius: 6, color: 0x220044 });
      }, 1000);
    }

    // Shadow clones (phase 2+)
    if (this.phase >= 2 && this.skCloneCd <= 0) {
      this.skCloneCd = this.phase >= 4 ? 5 : 8;
      const cloneCount = this.phase >= 4 ? 3 : 2;
      for (let i = 0; i < cloneCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const cx = clamp(this.x + Math.cos(a) * 3, -ARENA.LIMIT + 2, ARENA.LIMIT - 2);
        const cz = clamp(this.z + Math.sin(a) * 3, -ARENA.LIMIT + 2, ARENA.LIMIT - 2);
        const clone = new Enemy('phantom', cx, cz, 1, false);
        clone.isMinion = true;
        clone.maxHp = Math.round(clone.maxHp * 0.4);
        clone.hp = clone.maxHp;
        clone.dmg = this.dmg * 0.6;
        clone.size *= 0.7;
        clone.score = 25;
        clone.xp = 6;
        room.enemies.push(clone);
      }
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 2.5, color: 0x222222 });
    }

    // Soul rip (phase 2+): targeted high damage + heal
    if (this.phase >= 2 && this.skSoulRipCd <= 0 && dist < 4) {
      this.skSoulRipCd = this.phase >= 4 ? 5 : 8;
      target.takeDamage(this.dmg * 1.6 * em, room);
      this.hp = Math.min(this.maxHp, this.hp + this.dmg * 0.8);
      room.sendEvent({ type: 'skillfx', kind: 'beam', x: this.x, y: 1.5, z: this.z, x2: target.x, y2: 1.2, z2: target.z, color: 0xaa00ff });
      room.sendEvent({ type: 'skillfx', kind: 'text', text: 'SOUL RIP!', x: target.x, y: 2.5, z: target.z, color: 0xaa00ff });
    }

    // Teleport + backstab (adaptive: more frequent when kiting)
    const tpCd = this.phase >= 4 ? 1.5 : (this.phase >= 3 ? 2 : (this._kitingScore > 0.5 ? 2.5 : 4));
    if (this.skTeleportCd <= 0 && (dist < 6 || this._kitingScore > 0.7)) {
      const angle = Math.atan2(target.x - this.x, target.z - this.z);
      const tpDist = 2.0;
      this.x = target.x + Math.sin(angle) * tpDist;
      this.z = target.z + Math.cos(angle) * tpDist;
      this.x = clamp(this.x, -ARENA.LIMIT + 2, ARENA.LIMIT - 2);
      this.z = clamp(this.z, -ARENA.LIMIT + 2, ARENA.LIMIT - 2);
      this.skTeleportCd = tpCd;
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 2, color: 0x333333 });
      const newDist = Math.hypot(target.x - this.x, target.z - this.z);
      if (newDist < 3.5) {
        target.takeDamage(this.dmg * 1.8 * em, room);
        room.sendEvent({ type: 'skillfx', kind: 'text', text: 'BACKSTAB!', x: target.x, y: 2.5, z: target.z, color: 0xff0000 });
      }
    } else if (dist > this.radius + 1.2) {
      // Chase with strafe
      const strafeAmt = this._strafeDir * this.speed * 0.4 * sf;
      this.x += (dirX * this.speed * sf * em - dirZ * strafeAmt) * dt;
      this.z += (dirZ * this.speed * sf * em + dirX * strafeAmt) * dt;
    } else {
      this.attackCd -= dt;
      if (this.attackCd <= 0) {
        this.attackCd = 0.7;
        target.takeDamage(this.dmg * em, room);
      }
    }

    this.y = Math.sin(room.time * 3 + this.seed) * 0.08;
  }

  // ========================================================================
  // ЛЕДЯНАЯ КОРОЛЕВА: ice shards, freeze, blizzard, lance, frozen ground, absolute zero
  // ========================================================================
  _frostQueenAI(dt, room, target, dist, dirX, dirZ, sf, em) {
    this.fqIceShardCd -= dt;
    this.fqFreezeCd -= dt;
    this.fqBlizzardCd -= dt;
    this.fqIceLanceCd -= dt;
    this.fqFrozenGroundCd -= dt;
    this.fqAbsoluteZeroCd -= dt;
    this.fqIceBarrierCd -= dt;

    // Blizzard active
    if (this.fqBlizzardActive) {
      this.fqBlizzardT -= dt;
      if (this.fqBlizzardT <= 0) {
        this.fqBlizzardActive = false;
      } else if (Math.random() < dt * 2) {
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - this.x, p.z - this.z) < 8) {
            p.takeDamage(this.dmg * 0.8 * em, room);
            p.enemySlowT = 2; p.enemySlowF = 0.3;
          }
        }
      }
    }

    // Ice barrier (phase 2+): absorb shield
    if (this.phase >= 2 && this.fqIceBarrierCd <= 0 && this.fqIceBarrierHp <= 0) {
      this.fqIceBarrierCd = this.phase >= 4 ? 8 : 12;
      this.fqIceBarrierHp = this.maxHp * 0.1;
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 2, color: 0x88ccff });
      room.sendEvent({ type: 'ann', text: 'ЛЕДЯНОЙ БАРЬЕР!', color: '#88ccff' });
    }

    // Maintain distance
    const prefDist = this._kitingScore > 0.5 ? 8 : 10;
    if (dist > prefDist + 2) {
      this.x += dirX * this.speed * sf * em * dt;
      this.z += dirZ * this.speed * sf * em * dt;
    } else if (dist < prefDist - 3) {
      this.x -= dirX * this.speed * 0.9 * sf * dt;
      this.z -= dirZ * this.speed * 0.9 * sf * dt;
    }

    // Strafe
    const sx = -dirZ * this._strafeDir * this.speed * 0.6 * sf;
    const sz = dirX * this._strafeDir * this.speed * 0.6 * sf;
    this.x += sx * dt; this.z += sz * dt;

    // Ice shards
    if (this.fqIceShardCd <= 0 && dist < 20) {
      this.fqIceShardCd = this.phase >= 4 ? 1.0 : (this.phase >= 2 ? 1.5 : 2);
      room.spawnBullet(this.x, 1.5, this.z, target, this.dmg * 0.85 * em, 0x88ccff);
      target.enemySlowT = 3; target.enemySlowF = 0.5;
    }

    // Ice lance (phase 2+): high damage targeted
    if (this.phase >= 2 && this.fqIceLanceCd <= 0 && dist < 16) {
      this.fqIceLanceCd = this.phase >= 4 ? 3 : 5;
      room.spawnBullet(this.x, 1.5, this.z, target, this.dmg * 1.5 * em, 0x4488ff);
      target.enemySlowT = 4; target.enemySlowF = 0.3;
      room.sendEvent({ type: 'skillfx', kind: 'text', text: 'ICE LANCE', x: target.x, y: 2.5, z: target.z, color: 0x4488ff });
    }

    // Freeze (phase 2+)
    if (this.phase >= 2 && this.fqFreezeCd <= 0 && dist < 14) {
      this.fqFreezeCd = this.phase >= 4 ? 5 : 8;
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - this.x, p.z - this.z) < 6) {
          p.stunT = 2;
          p.takeDamage(this.dmg * 0.5 * em, room);
        }
      }
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 6, color: 0x4488ff });
      room.sendEvent({ type: 'ann', text: 'ЗАМОРОЗКА!', color: '#4488ff' });
    }

    // Frozen ground (phase 3+): zone that slows
    if (this.phase >= 3 && this.fqFrozenGroundCd <= 0) {
      this.fqFrozenGroundCd = this.phase >= 4 ? 6 : 9;
      const fgx = target.x, fgz = target.z;
      room.sendEvent({ type: 'skillfx', kind: 'zone', x: fgx, z: fgz, r: 5, dur: 5, color: 0x88ccff });
      // Create a persistent slow zone (simplified: just apply slow to nearby)
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - fgx, p.z - fgz) < 5) {
          p.enemySlowT = 4; p.enemySlowF = 0.4;
        }
      }
    }

    // Ice wall (phase 2+)
    if (this.phase >= 2) {
      this._fqIceWallCd = (this._fqIceWallCd || 0) - dt;
      if (this._fqIceWallCd <= 0 && dist < 14) {
        this._fqIceWallCd = this.phase >= 4 ? 4 : 6;
        const baseAngle = Math.atan2(dirX, dirZ);
        for (let i = -3; i <= 3; i++) {
          const a = baseAngle + i * 0.3;
          room.bullets.push({
            id: 'b' + (++room._fbId),
            x: this.x + Math.sin(a) * 3, y: 1.5, z: this.z + Math.cos(a) * 3,
            vx: Math.sin(a) * 7, vy: 0, vz: Math.cos(a) * 7,
            dmg: this.dmg * 0.5 * em, r: 0.25, life: 3, c: 0x4488ff,
          });
        }
      }
    }

    // Blizzard (phase 3+)
    if (this.phase >= 3 && this.fqBlizzardCd <= 0 && !this.fqBlizzardActive) {
      this.fqBlizzardCd = this.phase >= 4 ? 7 : 10;
      this.fqBlizzardActive = true;
      this.fqBlizzardT = 5;
      room.sendEvent({ type: 'ann', text: 'МЕТЕЛЬ!', color: '#88ccff' });
      room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: this.x, z: this.z, r: 8, dur: 1.5, color: 0x88ccff });
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - this.x, p.z - this.z) < 8) {
          p.takeDamage(this.dmg * em, room);
          p.enemySlowT = 5; p.enemySlowF = 0.3;
        }
      }
    }

    // Absolute zero (phase 4): massive freeze + damage
    if (this.phase >= 4 && this.fqAbsoluteZeroCd <= 0) {
      this.fqAbsoluteZeroCd = 15;
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        const pd = Math.hypot(p.x - this.x, p.z - this.z);
        if (pd < 12) {
          p.takeDamage(this.dmg * 1.8 * em, room);
          p.stunT = 2.5;
          p.enemySlowT = 5; p.enemySlowF = 0.2;
        }
      }
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 12, color: 0x00ffff });
      room.sendEvent({ type: 'ann', text: 'АБСОЛЮТНЫЙ НОЛЬ!', color: '#00ffff' });
    }

    this.y = Math.sin(room.time * 2.5 + this.seed) * 0.1;
  }

  // ========================================================================
  // ЛОРД ДРАКОНОВ: fire breath, tail sweep, flight, dive bomb, fire storm, roar
  // ========================================================================
  _dragonLordAI(dt, room, target, dist, dirX, dirZ, sf, em) {
    this.dlFireBreathCd -= dt;
    this.dlTailSweepCd -= dt;
    this.dlFlyCd -= dt;
    this.dlDiveBombCd -= dt;
    this.dlFireStormCd -= dt;
    this.dlRoarCd -= dt;
    this.dlWingGustCd -= dt;

    if (this.isFlying) {
      this.y = 3.5;
      this.x += dirX * this.speed * 1.5 * sf * em * dt;
      this.z += dirZ * this.speed * 1.5 * sf * em * dt;
      this.dlFlyTimer -= dt;

      // Rain fire
      if (this.dlFlyTimer <= 0) {
        this.dlFlyTimer = 0.35;
        for (let i = 0; i < 4; i++) {
          const fx = this.x + (Math.random() - 0.5) * 8;
          const fz = this.z + (Math.random() - 0.5) * 8;
          room.bullets.push({
            id: 'b' + (++room._fbId),
            x: fx, y: this.y, z: fz,
            vx: 0, vy: -10, vz: 0,
            dmg: this.dmg * 0.7 * em, r: 0.3, life: 2, c: 0xff3300,
          });
        }
      }

      // Dive bomb (phase 3+)
      if (this.phase >= 3 && this.dlDiveBombCd <= 0 && this.dlFlyTimer < 1) {
        this.dlDiveBombCd = 8;
        this.isFlying = false;
        this.y = 0;
        // Dive toward target
        this.bossState = 'dlDive';
        this.bossStateT = 0.5;
        this.chargeDirX = dirX; this.chargeDirZ = dirZ;
        room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: target.x, z: target.z, r: 3, dur: 0.5, color: 0xff4400 });
        return;
      }

      if (this.dlFlyTimer <= -2.5) {
        this.isFlying = false;
        this.y = 0;
        this.dlFlyCd = this.phase >= 4 ? 6 : 10;
        this.bossState = 'idle';
      }
    } else if (this.bossState === 'dlDive') {
      this.bossStateT -= dt;
      this.x += this.chargeDirX * 30 * em * dt;
      this.z += this.chargeDirZ * 30 * em * dt;
      this.y = Math.max(0, this.bossStateT * 6);
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - this.x, p.z - this.z) < 3) {
          p.takeDamage(this.dmg * 1.8 * em, room);
          p.stunT = 1.0;
        }
      }
      if (this.bossStateT <= 0) {
        this.bossState = 'idle';
        this.y = 0;
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 4, color: 0xff4400 });
      }
    } else {
      // Ground phase
      this.y = Math.abs(Math.sin(room.time * 4)) * 0.06;
      const chaseSpd = this.speed * sf * em * (this._kitingScore > 0.5 ? 1.2 : 1);
      if (dist > 3) {
        this.x += dirX * chaseSpd * dt;
        this.z += dirZ * chaseSpd * dt;
      }

      // Fire breath (cone)
      if (this.dlFireBreathCd <= 0 && dist < 16) {
        this.dlFireBreathCd = this.phase >= 4 ? 2 : (this.phase >= 2 ? 3 : 4);
        const baseAngle = Math.atan2(dirX, dirZ);
        const coneHalf = (90 * Math.PI / 180) / 2;
        for (let i = 0; i < 10; i++) {
          const a = baseAngle + (i - 4.5) * (coneHalf / 4.5);
          room.bullets.push({
            id: 'b' + (++room._fbId),
            x: this.x, y: 1.8, z: this.z,
            vx: Math.sin(a) * 12, vy: 0, vz: Math.cos(a) * 12,
            dmg: this.dmg * 0.45 * em, r: 0.22, life: 3, c: 0xff4400,
          });
        }
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          const pd = Math.hypot(p.x - this.x, p.z - this.z);
          if (pd > 10) continue;
          const pAngle = Math.atan2(p.x - this.x, p.z - this.z);
          let diff = pAngle - baseAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          if (Math.abs(diff) < coneHalf) {
            p.takeDamage(this.dmg * 1.0 * em, room);
            p.enemyBurnT = 3; p.enemyBurnDps = 8;
          }
        }
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 3, color: 0xff4400 });
      }

      // Tail sweep (phase 2+)
      if (this.phase >= 2 && this.dlTailSweepCd <= 0 && dist < 6) {
        this.dlTailSweepCd = this.phase >= 4 ? 3 : 5;
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - this.x, p.z - this.z) < 5) {
            p.takeDamage(this.dmg * 0.9 * em, room);
            const kdx = p.x - this.x, kdz = p.z - this.z;
            const kd = Math.hypot(kdx, kdz) || 1;
            p.vx += (kdx / kd) * 12; p.vz += (kdz / kd) * 12;
          }
        }
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 5, color: 0xcc4400 });
        this._spawnMinions(room, this.phase >= 4 ? 4 : 2);
      }

      // Wing gust (phase 2+): knockback cone
      if (this.phase >= 2 && this.dlWingGustCd <= 0 && dist < 8) {
        this.dlWingGustCd = this.phase >= 4 ? 5 : 8;
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - this.x, p.z - this.z) < 7) {
            const kdx = p.x - this.x, kdz = p.z - this.z;
            const kd = Math.hypot(kdx, kdz) || 1;
            p.vx += (kdx / kd) * 18; p.vz += (kdz / kd) * 18;
            p.takeDamage(this.dmg * 0.5 * em, room);
          }
        }
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 7, color: 0xff8800 });
      }

      // Dragon roar (phase 3+): AoE stun
      if (this.phase >= 3 && this.dlRoarCd <= 0 && dist < 10) {
        this.dlRoarCd = this.phase >= 4 ? 8 : 14;
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - this.x, p.z - this.z) < 8) {
            p.stunT = 1.5;
            p.takeDamage(this.dmg * 0.6 * em, room);
          }
        }
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 8, color: 0xff6600 });
        room.sendEvent({ type: 'ann', text: 'РЁВ ДРАКОНА!', color: '#ff6600' });
      }

      // Fire storm (phase 3+): multiple fire zones
      if (this.phase >= 3 && this.dlFireStormCd <= 0) {
        this.dlFireStormCd = this.phase >= 4 ? 8 : 12;
        for (let i = 0; i < 6; i++) {
          const fx = target.x + (Math.random() - 0.5) * 12;
          const fz = target.z + (Math.random() - 0.5) * 12;
          room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: fx, z: fz, r: 2.5, dur: 1.2, color: 0xff3300 });
          setTimeout(() => {
            for (const p of room.playersArr()) {
              if (!p.alive) continue;
              if (Math.hypot(p.x - fx, p.z - fz) < 2.5) {
                p.takeDamage(this.dmg * 1.2 * em, room);
                p.enemyBurnT = 3; p.enemyBurnDps = 8;
              }
            }
            room.sendEvent({ type: 'skillfx', kind: 'nova', x: fx, z: fz, radius: 2.5, color: 0xff3300 });
          }, 1200);
        }
        room.sendEvent({ type: 'ann', text: 'ОГНЕННЫЙ ШТОРМ!', color: '#ff3300' });
      }

      // Take flight (phase 3+)
      if (this.phase >= 3 && this.dlFlyCd <= 0) {
        this.isFlying = true;
        this.dlFlyTimer = 2.5;
        this.dlFlyCd = this.phase >= 4 ? 6 : 8;
        room.sendEvent({ type: 'ann', text: 'В ПОЛЁТ!', color: '#ff6600' });
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 3, color: 0xff6600 });
      }
    }

    this.x = clamp(this.x, -ARENA.LIMIT, ARENA.LIMIT);
    this.z = clamp(this.z, -ARENA.LIMIT, ARENA.LIMIT);
  }

  // --- Спираль пуль ---
  _fireSpiral(room, count) {
    const n = count || 8;
    this.spiralAngle += 0.5;
    const color = this.type === 'necro' ? 0xb44dff : 0xff6a00;
    const speed = this.phase >= 3 ? 12 : (this.phase >= 2 ? 11 : 9);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.spiralAngle;
      room.bullets.push({
        id: 'b' + (++room._fbId),
        x: this.x, y: 2.2, z: this.z,
        vx: Math.cos(a) * speed, vy: 0, vz: Math.sin(a) * speed,
        dmg: this.dmg * 0.45, r: 0.18, life: 4, c: color,
      });
    }
  }

  // --- Спавн миньонов ---
  _spawnMinions(room, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const x = clamp(this.x + Math.cos(a) * 2.5, -ARENA.LIMIT + 2, ARENA.LIMIT - 2);
      const z = clamp(this.z + Math.sin(a) * 2.5, -ARENA.LIMIT + 2, ARENA.LIMIT - 2);
      let minionType = 'normal';
      if (this.type === 'golemKing') minionType = 'golem';
      else if (this.type === 'dragonLord') minionType = 'berserker';
      else if (this.type === 'frostQueen') minionType = 'frost_mage';
      else if (this.type === 'shadowKing') minionType = 'phantom';
      else if (this.type === 'necro') minionType = 'cursed';
      else if (this.type === 'firelord') minionType = 'firestarter';
      const minion = new Enemy(minionType, x, z, 1, false);
      minion.isMinion = true;
      minion.maxHp = Math.round(minion.maxHp * 0.5);
      minion.hp = minion.maxHp;
      minion.size *= 0.72;
      minion.score = 30;
      minion.xp = 8;
      room.enemies.push(minion);
    }
  }

  // Разделение врагов
  static separate(list) {
    const CELL = 4;
    const grid = new Map();

    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.dying) continue;
      const cx = Math.floor(e.x / CELL);
      const cz = Math.floor(e.z / CELL);
      const key = cx + ',' + cz;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(e);
    }

    for (const [key, cell] of grid) {
      const [cx, cz] = key.split(',').map(Number);

      for (let ai = 0; ai < cell.length; ai++) {
        for (let bi = ai + 1; bi < cell.length; bi++) {
          const a = cell[ai], b = cell[bi];
          if (a.dying || b.dying) continue;
          const dx = b.x - a.x, dz = b.z - a.z;
          const d = Math.hypot(dx, dz);
          const min = (a.radius + b.radius) * 0.9;
          if (d < min && d > 0.001) {
            const push = (min - d) * 0.5;
            a.x -= dx / d * push; a.z -= dz / d * push;
            b.x += dx / d * push; b.z += dz / d * push;
          }
        }
      }

      const offsets = [[1,0],[0,1],[1,1],[-1,1]];
      for (const [ox, oz] of offsets) {
        const neighbor = grid.get((cx + ox) + ',' + (cz + oz));
        if (!neighbor) continue;
        for (const a of cell) {
          for (const b of neighbor) {
            if (a.dying || b.dying) continue;
            const dx = b.x - a.x, dz = b.z - a.z;
            const d = Math.hypot(dx, dz);
            const min = (a.radius + b.radius) * 0.9;
            if (d < min && d > 0.001) {
              const push = (min - d) * 0.5;
              a.x -= dx / d * push; a.z -= dz / d * push;
              b.x += dx / d * push; b.z += dz / d * push;
            }
          }
        }
      }
    }
  }

  hurt(amount, fromX, fromZ, kb = 6) {
    // Golem King fortify: 60% damage reduction
    if (this.type === 'golemKing' && this.gkFortifyT > 0) {
      amount *= 0.4;
    }
    // Frost Queen ice barrier
    if (this.type === 'frostQueen' && this.fqIceBarrierHp > 0) {
      const absorbed = Math.min(this.fqIceBarrierHp, amount);
      this.fqIceBarrierHp -= absorbed;
      amount -= absorbed;
      if (amount <= 0) { this.flash = 0.1; return false; }
    }
    // golem: 20% less damage from skills
    if (this.type === 'golem') {
      amount *= 0.8;
    }
    // shielder shield absorbs damage first
    if (this.shieldHp > 0) {
      const absorbed = Math.min(this.shieldHp, amount);
      this.shieldHp -= absorbed;
      amount -= absorbed;
      if (this.shieldHp <= 0 && this.shieldMaxHp > 0 && this.shieldBrokenT <= 0) {
        this.shieldBrokenT = 3.0;
        this.shieldRegenT = 0;
      }
      if (amount <= 0) { this.flash = 0.1; return false; }
    }
    // shielder vulnerability
    if (this.type === 'shielder' && this.shieldBrokenT > 0) {
      amount *= 1.5;
    }
    // golemKing boss shield
    if (this.type === 'golemKing' && this.gkShieldHp > 0) {
      const absorbed = Math.min(this.gkShieldHp, amount);
      this.gkShieldHp -= absorbed;
      amount -= absorbed;
      if (this.gkShieldHp <= 0 && !this.gkEnraged) {
        this.gkEnraged = true;
        this.gkShieldBroken = true;
        this.speed *= 1.5;
        this.dmg *= 1.3;
      }
      if (amount <= 0) { this.flash = 0.1; return false; }
    }
    this.hp -= amount;
    this.flash = 0.1;
    const dx = this.x - fromX, dz = this.z - fromZ;
    const d = Math.hypot(dx, dz) || 1;
    // Bosses take less knockback
    const kbMul = this.isBoss ? 0.3 : 1;
    this.vx += dx / d * kb * kbMul;
    this.vz += dz / d * kb * kbMul;
    return this.hp <= 0;
  }

  kill() {
    this.dying = true;
    this.deathT = 0.6;
  }

  snap() {
    return {
      id: this.id, t: this.type, b: this.isBoss,
      x: +this.x.toFixed(3), y: +this.y.toFixed(3), z: +this.z.toFixed(3),
      yaw: +this.yaw.toFixed(3),
      hp: Math.ceil(this.hp), mhp: this.maxHp, sz: this.size,
      f: this.flash > 0 ? 1 : 0, sp: this.spawnT > 0 ? 1 : 0,
      dy: this.dying ? 1 : 0,
      mn: this.isMinion ? 1 : 0,
      inv: this.isInvisible ? 1 : 0,
      sh: this.shieldHp > 0 || (this.type === 'golemKing' && this.gkShieldHp > 0) || (this.type === 'frostQueen' && this.fqIceBarrierHp > 0) ? 1 : 0,
      ph: this.phase,
    };
  }
}
