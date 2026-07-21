import { ARENA, clamp } from '../../shared/constants.js';
import { ENEMY_TYPES, BOSS, BOSS_PHASES, BOSS_ENRAGE } from '../../shared/server-constants.js';
import { BOSS_ABILITIES, getAbilityCd } from '../../shared/bossConfig.js';

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
      const bossCfg = BOSS_ABILITIES[type];
      if (bossCfg) {
        // Initialize cooldowns from config
        for (const ab of bossCfg.abilities) {
          const cd = ab.baseCd || 0;
          switch (ab.id) {
            case 'slam': this.slamCd = cd; this.gkSlamCd = cd; break;
            case 'charge': this.chargeCd = cd; this.gkChargeCd = cd; break;
            case 'hook': this.hookCd = cd; break;
            case 'cleave': this.cleaveCd = cd; break;
            case 'minionSpawn': this.minionCd = cd; this.gkSummonCd = cd; break;
            case 'bloodRage': this.bloodRageCd = cd; break;
            case 'spiral': this.spiralCd = cd; break;
            case 'shadowBolt': this.necroShadowBoltCd = cd; break;
            case 'soulDrain': this.necroSoulDrainCd = cd; break;
            case 'deathNova': this.necroDeathNovaCd = cd; break;
            case 'curseSpread': this.necroCurseSpreadCd = cd; break;
            case 'ritual': this.necroRitualCd = cd; break;
            case 'teleport': this.necroTeleportCd = cd; this.skTeleportCd = cd; break;
            case 'boulder': this.gkBoulderCd = cd; break;
            case 'seismic': this.gkSeismicCd = cd; break;
            case 'fortify': this.gkFortifyCd = cd; break;
            case 'earthquake': this.gkEarthquakeCd = cd; break;
            case 'eruption': this.gkEruptionCd = cd; break;
            case 'fireball': this.flFireballCd = cd; break;
            case 'fireWave': this.flFireWaveCd = cd; break;
            case 'firePillars': this.flPillarCd = cd; break;
            case 'meteorRain': this.flMeteorCd = cd; break;
            case 'heatWave': this.flHeatWaveCd = cd; break;
            case 'fireBreath': this.dlFireBreathCd = cd; break;
            case 'tailSweep': this.dlTailSweepCd = cd; break;
            case 'wingGust': this.dlWingGustCd = cd; break;
            case 'dragonRoar': this.dlRoarCd = cd; break;
            case 'fireStorm': this.dlFireStormCd = cd; break;
            case 'flight': this.dlFlyCd = cd; break;
            case 'diveBomb': this.dlDiveBombCd = cd; break;
            case 'iceShard': this.fqIceShardCd = cd; break;
            case 'iceLance': this.fqIceLanceCd = cd; break;
            case 'freeze': this.fqFreezeCd = cd; break;
            case 'blizzard': this.fqBlizzardCd = cd; break;
            case 'frozenGround': this.fqFrozenGroundCd = cd; break;
            case 'absoluteZero': this.fqAbsoluteZeroCd = cd; break;
            case 'iceBarrier': this.fqIceBarrierCd = cd; break;
            case 'backstab': this.skBackstabCd = cd; break;
            case 'clone': this.skCloneCd = cd; break;
            case 'vortex': this.skVortexCd = cd; break;
            case 'darkness': this.skDarknessCd = cd; break;
            case 'soulRip': this.skSoulRipCd = cd; break;
            case 'shadowStep': this.skShadowStepCd = cd; break;
          }
        }
        if (bossCfg.shieldHp) {
          this.gkShieldHp = bossCfg.shieldHp;
        }
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
    const bossCfg = BOSS_ABILITIES[this.type];
    const ann = bossCfg?.announcements?.[phase];
    const name = ann?.text || 'ЯРОСТЬ!';
    const color = ann?.color || '#ff0000';

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
    const cfg = BOSS_ABILITIES.butcher;
    const slamCfg = cfg.abilities.find(a => a.id === 'slam');
    const chargeCfg = cfg.abilities.find(a => a.id === 'charge');
    const hookCfg = cfg.abilities.find(a => a.id === 'hook');
    const cleaveCfg = cfg.abilities.find(a => a.id === 'cleave');
    const rageCfg = cfg.abilities.find(a => a.id === 'bloodRage');
    const minionCfg = cfg.abilities.find(a => a.id === 'minionSpawn');

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
    const rageDmgMul = this.bloodRageT > 0 ? rageCfg.dmgMul : 1;

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
        if (dist > 8 && this.hookCd <= 0 && this.phase >= hookCfg.minPhase) {
          this.bossState = 'hookTele';
          this.bossStateT = 0.5;
          this.hookCd = getAbilityCd(hookCfg, this.phase);
          room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: target.x, z: target.z, r: hookCfg.teleRadius, dur: hookCfg.teleDur, color: hookCfg.color });
        }
        // 2. Charge if mid-range
        else if (dist > 5 && this.chargeCd <= 0) {
          this.bossState = 'chargeTele';
          this.bossStateT = 0.6;
          this.chargeDirX = dirX; this.chargeDirZ = dirZ;
          this.chargeHit = false;
          this.chargeCd = getAbilityCd(chargeCfg, this.phase);
          room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: this.x, z: this.z, r: 2, dur: 0.6, color: chargeCfg.teleColor });
        }
        // 3. Cleave combo if in melee
        else if (dist < 4 && this.cleaveCd <= 0) {
          this.bossState = 'cleaveCombo';
          this.bossStateT = 0.3;
          this.cleaveCombo = 0;
          this.cleaveCd = getAbilityCd(cleaveCfg, this.phase);
        }
        // 4. Slam if in range
        else if (dist < 5 && this.slamCd <= 0) {
          this.bossState = 'slamTele';
          this.bossStateT = 0.6;
          this.slamWavesLeft = slamCfg.wavesByPhase[this.phase] || slamCfg.wavesByPhase[1];
          this.slamCd = getAbilityCd(slamCfg, this.phase);
          room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: this.x, z: this.z, r: slamCfg.radius, dur: 0.6, color: slamCfg.teleColor });
        }

        // Blood rage (phase 3+)
        if (this.phase >= rageCfg.minPhase && this.bloodRageCd <= 0 && this.bloodRageT <= 0) {
          this.bloodRageT = rageCfg.duration;
          this.bloodRageCd = rageCfg.baseCd;
          room.sendEvent({ type: 'ann', text: rageCfg.text, color: rageCfg.textColor });
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: rageCfg.novaRadius, color: rageCfg.novaColor });
        }

        // Spawn minions
        if (this.minionCd <= 0) {
          const minionCount = minionCfg.countsByPhase[this.phase] || minionCfg.countsByPhase[1];
          this._spawnMinions(room, minionCount);
          this.minionCd = getAbilityCd(minionCfg, this.phase);
        }
        break;
      }
      case 'hookTele': {
        if (this.bossStateT <= 0) {
          // Pull target toward boss
          const pullDist = Math.max(0, dist - 3);
          target.x -= dirX * pullDist * hookCfg.pullFactor;
          target.z -= dirZ * pullDist * hookCfg.pullFactor;
          target.takeDamage(this.dmg * hookCfg.dmgMul * em, room);
          room.sendEvent({ type: 'skillfx', kind: 'beam', x: this.x, y: 1.5, z: this.z, x2: target.x, y2: 1.2, z2: target.z, color: hookCfg.color });
          room.sendEvent({ type: 'skillfx', kind: 'text', text: 'HOOK!', x: target.x, y: 2.5, z: target.z, color: hookCfg.color });
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
          const comboIdx = Math.min(this.cleaveCombo - 1, cleaveCfg.dmgMuls.length - 1);
          const comboDmg = cleaveCfg.dmgMuls[comboIdx] * rageDmgMul * em;
          const comboRange = cleaveCfg.ranges[comboIdx];
          for (const p of room.playersArr()) {
            if (!p.alive) continue;
            if (Math.hypot(p.x - this.x, p.z - this.z) < comboRange) {
              p.takeDamage(this.dmg * comboDmg, room);
            }
          }
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: comboRange, color: cleaveCfg.color });

          const maxCombo = cleaveCfg.maxCombosByPhase[this.phase] || cleaveCfg.maxCombosByPhase[1];
          if (this.cleaveCombo < maxCombo) {
            this.bossStateT = cleaveCfg.comboDelay;
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
            if (Math.hypot(p.x - this.x, p.z - this.z) < slamCfg.radius) {
              p.takeDamage(this.dmg * slamCfg.dmgMul * em * rageDmgMul, room);
              const kdx = p.x - this.x, kdz = p.z - this.z;
              const kd = Math.hypot(kdx, kdz) || 1;
              p.vx += (kdx / kd) * slamCfg.knockback; p.vz += (kdz / kd) * slamCfg.knockback;
            }
          }
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: slamCfg.radius, color: slamCfg.hitColor });
        }
        break;
      }
      case 'slamHit': {
        if (this.bossStateT <= 0) {
          if (this.slamWavesLeft > 0) {
            this.bossState = 'slamTele';
            this.bossStateT = 0.4;
            room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: this.x, z: this.z, r: slamCfg.radius + 0.5, dur: 0.4, color: 0xff0000 });
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
        this.x += this.chargeDirX * chargeCfg.speed * em * dt;
        this.z += this.chargeDirZ * chargeCfg.speed * em * dt;
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - this.x, p.z - this.z) < chargeCfg.hitRadius && !this.chargeHit) {
            this.chargeHit = true;
            p.takeDamage(this.dmg * chargeCfg.dmgMul * em * rageDmgMul, room);
            p.stunT = chargeCfg.stunDur;
            room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: chargeCfg.hitRadius, color: chargeCfg.hitColor });
          }
        }
        if (this.phase >= 3) {
          for (const p of room.playersArr()) {
            if (!p.alive) continue;
            if (Math.hypot(p.x - this.x, p.z - this.z) < chargeCfg.aoeRadius) p.takeDamage(this.dmg * chargeCfg.aoeDmgMul * em, room);
          }
        }
        if (Math.abs(this.x) > ARENA.LIMIT - 2 || Math.abs(this.z) > ARENA.LIMIT - 2) {
          this.bossState = 'stun'; this.bossStateT = chargeCfg.wallStunDur;
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: chargeCfg.hitRadius + 0.5, color: chargeCfg.wallHitColor });
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
    const cfg = BOSS_ABILITIES.necro;
    const spiralCfg = cfg.abilities.find(a => a.id === 'spiral');
    const minionCfg = cfg.abilities.find(a => a.id === 'minionSpawn');
    const boltCfg = cfg.abilities.find(a => a.id === 'shadowBolt');
    const drainCfg = cfg.abilities.find(a => a.id === 'soulDrain');
    const novaCfg = cfg.abilities.find(a => a.id === 'deathNova');
    const curseCfg = cfg.abilities.find(a => a.id === 'curseSpread');
    const ritualCfg = cfg.abilities.find(a => a.id === 'ritual');
    const tpCfg = cfg.abilities.find(a => a.id === 'teleport');

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
    if (this.phase >= ritualCfg.minPhase && this.bossState === 'ritual') {
      this.bossStateT -= dt;
      if (this.bossStateT <= 0) {
        this.bossState = 'idle';
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          p.takeDamage(this.dmg * ritualCfg.dmgMul * em, room);
          p.enemySlowT = ritualCfg.slowDur; p.enemySlowF = ritualCfg.slowFactor;
        }
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: ritualCfg.radius, color: ritualCfg.hitColor });
        room.sendEvent({ type: 'ann', text: ritualCfg.completeText, color: ritualCfg.textColor });
      }
      return;
    }

    // Maintain distance 8-14m (adaptive: if kiting, close faster)
    const preferredDist = this._kitingScore > 0.5 ? cfg.preferredDistKiting : cfg.preferredDist;
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
      const n = spiralCfg.bulletCountsByPhase[this.phase] || spiralCfg.bulletCountsByPhase[1];
      this._fireSpiral(room, n);
      this.spiralCd = getAbilityCd(spiralCfg, this.phase);
    }

    // Summon minions
    if (this.minionCd <= 0) {
      const aliveMinions = room.enemies.filter(e => e.isMinion && !e.dying).length;
      const maxM = minionCfg.maxMinionsByPhase[this.phase] || minionCfg.maxMinionsByPhase[1];
      const spawnCount = minionCfg.countsByPhase[this.phase] || minionCfg.countsByPhase[1];
      if (aliveMinions < maxM) this._spawnMinions(room, spawnCount);
      this.minionCd = getAbilityCd(minionCfg, this.phase);
    }

    // Shadow bolt (targeted, slow)
    if (this.phase >= boltCfg.minPhase && this.necroShadowBoltCd <= 0 && dist < boltCfg.maxRange) {
      this.necroShadowBoltCd = getAbilityCd(boltCfg, this.phase);
      room.spawnBullet(this.x, 1.8, this.z, target, this.dmg * boltCfg.dmgMul * em, boltCfg.bulletColor);
      target.enemySlowT = boltCfg.slowDur; target.enemySlowF = boltCfg.slowFactor;
    }

    // Soul drain (phase 2+): channel 2s, heal self, damage target
    if (this.phase >= drainCfg.minPhase && this.necroSoulDrainCd <= 0 && dist < drainCfg.maxRange) {
      this.necroSoulDrainCd = getAbilityCd(drainCfg, this.phase);
      const drainDmg = this.dmg * drainCfg.dmgMul * em;
      target.takeDamage(drainDmg, room);
      this.hp = Math.min(this.maxHp, this.hp + drainDmg * drainCfg.healFactor);
      room.sendEvent({ type: 'skillfx', kind: 'beam', x: this.x, y: 1.8, z: this.z, x2: target.x, y2: 1.2, z2: target.z, color: drainCfg.beamColor });
      room.sendEvent({ type: 'skillfx', kind: 'text', text: 'DRAIN', x: target.x, y: 2.5, z: target.z, color: drainCfg.beamColor });
    }

    // Death nova (phase 3+): AoE around boss
    if (this.phase >= novaCfg.minPhase && this.necroDeathNovaCd <= 0 && dist < novaCfg.maxRange) {
      this.necroDeathNovaCd = getAbilityCd(novaCfg, this.phase);
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - this.x, p.z - this.z) < novaCfg.radius) {
          p.takeDamage(this.dmg * novaCfg.dmgMul * em, room);
          const kdx = p.x - this.x, kdz = p.z - this.z;
          const kd = Math.hypot(kdx, kdz) || 1;
          p.vx += (kdx / kd) * novaCfg.knockback; p.vz += (kdz / kd) * novaCfg.knockback;
        }
      }
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: novaCfg.radius, color: novaCfg.color });
    }

    // Curse spread (phase 3+): debuff all players
    if (this.phase >= curseCfg.minPhase && this.necroCurseSpreadCd <= 0) {
      this.necroCurseSpreadCd = getAbilityCd(curseCfg, this.phase);
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        p.enemySlowT = curseCfg.slowDur; p.enemySlowF = curseCfg.slowFactor;
        p.damageAmpT = curseCfg.ampDur; p.damageAmpF = curseCfg.ampFactor;
      }
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: curseCfg.novaRadius, color: curseCfg.novaColor });
      room.sendEvent({ type: 'ann', text: curseCfg.text, color: curseCfg.textColor });
    }

    // Dark ritual (phase 3+)
    if (this.phase >= ritualCfg.minPhase && this.necroRitualCd <= 0 && dist < ritualCfg.radius) {
      this.bossState = 'ritual';
      this.bossStateT = ritualCfg.channelDur;
      this.necroRitualCd = getAbilityCd(ritualCfg, this.phase);
      room.sendEvent({ type: 'ann', text: ritualCfg.text, color: ritualCfg.textColor });
      room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: this.x, z: this.z, r: ritualCfg.radius, dur: ritualCfg.channelDur, color: ritualCfg.teleColor });
    }

    // Teleport when player gets too close
    if (dist < tpCfg.triggerRange && this.bossState !== 'ritual' && this.necroTeleportCd <= 0) {
      this.necroTeleportCd = getAbilityCd(tpCfg, this.phase);
      const a = Math.random() * Math.PI * 2;
      const d = tpCfg.teleportDist + Math.random() * tpCfg.teleportRandom;
      this.x = clamp(target.x + Math.cos(a) * d, -ARENA.LIMIT + 2, ARENA.LIMIT - 2);
      this.z = clamp(target.z + Math.sin(a) * d, -ARENA.LIMIT + 2, ARENA.LIMIT - 2);
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 2, color: tpCfg.color });
    }

    this.y = Math.sin(room.time * 2 + this.seed) * 0.1;
  }

  // ========================================================================
  // КОРОЛЬ ГОЛЕМОВ: щит, удары, charge, earthquake, boulder, seismic, fortify
  // ========================================================================
  _golemKingAI(dt, room, target, dist, dirX, dirZ, sf, em) {
    const cfg = BOSS_ABILITIES.golemKing;
    const slamCfg = cfg.abilities.find(a => a.id === 'slam');
    const chargeCfg = cfg.abilities.find(a => a.id === 'charge');
    const boulderCfg = cfg.abilities.find(a => a.id === 'boulder');
    const seismicCfg = cfg.abilities.find(a => a.id === 'seismic');
    const fortifyCfg = cfg.abilities.find(a => a.id === 'fortify');
    const earthquakeCfg = cfg.abilities.find(a => a.id === 'earthquake');
    const eruptionCfg = cfg.abilities.find(a => a.id === 'eruption');
    const minionCfg = cfg.abilities.find(a => a.id === 'minionSpawn');

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
      this.x += this.gkChargeDirX * chargeCfg.speed * em * dt;
      this.z += this.gkChargeDirZ * chargeCfg.speed * em * dt;
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - this.x, p.z - this.z) < chargeCfg.hitRadius && !this.gkChargeHit) {
          this.gkChargeHit = true;
          p.takeDamage(this.dmg * chargeCfg.dmgMul * em, room);
          p.stunT = chargeCfg.stunDur;
        }
      }
      if (Math.abs(this.x) > ARENA.LIMIT - 2 || Math.abs(this.z) > ARENA.LIMIT - 2 || this.bossStateT <= 0) {
        this.bossState = 'idle';
        // Seismic wave on wall hit (phase 3+)
        if (this.phase >= 3) {
          for (const p of room.playersArr()) {
            if (!p.alive) continue;
            if (Math.hypot(p.x - this.x, p.z - this.z) < chargeCfg.seismicWallRadius) {
              p.takeDamage(this.dmg * chargeCfg.seismicWallDmgMul * em, room);
            }
          }
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: chargeCfg.seismicWallRadius, color: 0x885522 });
        }
      }
      return;
    }

    // Slam telegraph
    if (this.bossState === 'gkSlamTele') {
      this.bossStateT -= dt;
      if (this.bossStateT <= 0) {
        this.bossState = 'idle';
        const slamDmgMul = slamCfg.dmgMulsByPhase[this.phase] || slamCfg.dmgMulsByPhase[1];
        const slamDmg = this.dmg * slamDmgMul * em;
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - this.x, p.z - this.z) < slamCfg.radius) {
            p.takeDamage(slamDmg, room);
            const kdx = p.x - this.x, kdz = p.z - this.z;
            const kd = Math.hypot(kdx, kdz) || 1;
            p.vx += (kdx / kd) * slamCfg.knockback; p.vz += (kdz / kd) * slamCfg.knockback;
          }
        }
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: slamCfg.radius, color: slamCfg.hitColor });
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
    if (this.phase >= boulderCfg.minPhase && this.gkBoulderCd <= 0 && dist > boulderCfg.minRange) {
      this.gkBoulderCd = getAbilityCd(boulderCfg, this.phase);
      room.spawnBullet(this.x, boulderCfg.bulletY, this.z, target, this.dmg * boulderCfg.dmgMul * em, boulderCfg.bulletColor);
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 1.5, color: boulderCfg.bulletColor });
    }

    // Charge (phase 2+)
    if (this.phase >= chargeCfg.minPhase && this.gkChargeCd <= 0 && dist > 5 && dist < 20) {
      this.bossState = 'gkChargeTele';
      this.bossStateT = chargeCfg.teleDur;
      this.gkChargeDirX = dirX; this.gkChargeDirZ = dirZ;
      this.gkChargeHit = false;
      this.gkChargeCd = getAbilityCd(chargeCfg, this.phase);
      room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: this.x, z: this.z, r: chargeCfg.hitRadius, dur: chargeCfg.teleDur, color: chargeCfg.teleColor });
    }

    // Ground Slam
    if (dist < slamCfg.radius && this.gkSlamCd <= 0) {
      this.bossState = 'gkSlamTele';
      this.bossStateT = 0.7;
      this.gkSlamCd = getAbilityCd(slamCfg, this.phase);
      room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: this.x, z: this.z, r: slamCfg.radius, dur: 0.7, color: slamCfg.teleColor });
    }

    // Seismic waves (phase 3+): line of damage toward target
    if (this.phase >= seismicCfg.minPhase && this.gkSeismicCd <= 0 && dist < 15) {
      this.gkSeismicCd = getAbilityCd(seismicCfg, this.phase);
      for (let i = 1; i <= seismicCfg.waveCount; i++) {
        const sx = this.x + dirX * i * seismicCfg.waveSpacing;
        const sz = this.z + dirZ * i * seismicCfg.waveSpacing;
        room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: sx, z: sz, r: seismicCfg.waveRadius, dur: 0.3 + i * 0.15, color: seismicCfg.color });
        setTimeout(() => {
          for (const p of room.playersArr()) {
            if (!p.alive) continue;
            if (Math.hypot(p.x - sx, p.z - sz) < seismicCfg.waveRadius) p.takeDamage(this.dmg * seismicCfg.dmgMul * em, room);
          }
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: sx, z: sz, radius: seismicCfg.waveRadius, color: seismicCfg.color });
        }, (300 + i * 150));
      }
    }

    // Fortify (phase 3+): temporary damage reduction
    if (this.phase >= fortifyCfg.minPhase && this.gkFortifyCd <= 0 && this.hp / this.maxHp < fortifyCfg.hpThreshold) {
      this.gkFortifyCd = fortifyCfg.baseCd;
      this.gkFortifyT = fortifyCfg.duration;
      room.sendEvent({ type: 'ann', text: fortifyCfg.text, color: fortifyCfg.textColor });
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 2, color: fortifyCfg.color });
    }

    // Earthquake (phase 3+)
    if (this.phase >= earthquakeCfg.minPhase && this.gkEarthquakeCd <= 0) {
      this.gkEarthquakeCd = getAbilityCd(earthquakeCfg, this.phase);
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - this.x, p.z - this.z) < earthquakeCfg.radius) {
          p.takeDamage(this.dmg * earthquakeCfg.dmgMul * em, room);
          const kdx = p.x - this.x, kdz = p.z - this.z;
          const kd = Math.hypot(kdx, kdz) || 1;
          p.vx = (kdx / kd) * earthquakeCfg.knockback; p.vz = (kdz / kd) * earthquakeCfg.knockback;
        }
      }
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: earthquakeCfg.radius, color: earthquakeCfg.color });
      const eqMinionCount = earthquakeCfg.spawnMinionsByPhase[this.phase] || earthquakeCfg.spawnMinionsByPhase[1];
      this._spawnMinions(room, eqMinionCount);
    }

    // Eruption (phase 4): multiple random AoEs
    if (this.phase >= eruptionCfg.minPhase && this.gkEruptionCd <= 0) {
      this.gkEruptionCd = eruptionCfg.baseCd;
      for (let i = 0; i < eruptionCfg.count; i++) {
        const ex = target.x + (Math.random() - 0.5) * eruptionCfg.spread;
        const ez = target.z + (Math.random() - 0.5) * eruptionCfg.spread;
        room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: ex, z: ez, r: eruptionCfg.radius, dur: eruptionCfg.teleDur, color: eruptionCfg.teleColor });
        setTimeout(() => {
          for (const p of room.playersArr()) {
            if (!p.alive) continue;
            if (Math.hypot(p.x - ex, p.z - ez) < eruptionCfg.radius) p.takeDamage(this.dmg * eruptionCfg.dmgMul * em, room);
          }
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: ex, z: ez, radius: eruptionCfg.radius, color: eruptionCfg.hitColor });
        }, 1000);
      }
    }

    this.y = Math.abs(Math.sin(room.time * 4)) * 0.06;
  }

  // ========================================================================
  // ПОВЕЛИТЕЛЬ ОГНЯ: fireballs, wave, meteor, aura, inferno, pillars, phoenix
  // ========================================================================
  _firelordAI(dt, room, target, dist, dirX, dirZ, sf, em) {
    const cfg = BOSS_ABILITIES.firelord;
    const fbCfg = cfg.abilities.find(a => a.id === 'fireball');
    const waveCfg = cfg.abilities.find(a => a.id === 'fireWave');
    const pillarCfg = cfg.abilities.find(a => a.id === 'firePillars');
    const meteorCfg = cfg.abilities.find(a => a.id === 'meteorRain');
    const auraCfg = cfg.abilities.find(a => a.id === 'fireAura');
    const heatCfg = cfg.abilities.find(a => a.id === 'heatWave');
    const phoenixCfg = cfg.abilities.find(a => a.id === 'phoenix');
    const minionCfg = cfg.abilities.find(a => a.id === 'minionSpawn');

    this.flFireballCd -= dt;
    this.flFireWaveCd -= dt;
    this.flMeteorCd -= dt;
    this.flInfernoCd -= dt;
    this.flPillarCd -= dt;
    this.flHeatWaveCd -= dt;

    // Phoenix rebirth (once, at threshold HP)
    if (this.phase >= phoenixCfg.minPhase && !this.flPhoenixUsed && this.hp / this.maxHp < phoenixCfg.triggerHpPct) {
      this.flPhoenixUsed = true;
      this.hp = Math.round(this.maxHp * phoenixCfg.reviveHpPct);
      room.sendEvent({ type: 'ann', text: phoenixCfg.text, color: phoenixCfg.textColor });
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: phoenixCfg.reviveRadius, color: phoenixCfg.reviveColor });
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - this.x, p.z - this.z) < phoenixCfg.reviveRadius) {
          p.takeDamage(this.dmg * phoenixCfg.reviveDmgMul * em, room);
          p.enemyBurnT = phoenixCfg.reviveBurnDur; p.enemyBurnDps = phoenixCfg.reviveBurnDps;
        }
      }
    }

    // Fire aura (phase 3+)
    if (this.phase >= auraCfg.minPhase) {
      this.flFireAuraTick -= dt;
      if (this.flFireAuraTick <= 0) {
        this.flFireAuraTick = auraCfg.tickInterval;
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - this.x, p.z - this.z) < auraCfg.radius) {
            p.takeDamage(this.dmg * auraCfg.dmgMul * em, room);
          }
        }
      }
    }

    // Maintain distance (adaptive)
    const prefDist = this._kitingScore > 0.5 ? cfg.preferredDistKiting : cfg.preferredDist;
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
    if (this.flFireballCd <= 0 && dist < fbCfg.maxRange) {
      this.flFireballCd = getAbilityCd(fbCfg, this.phase);
      const count = fbCfg.countByPhase[this.phase] || fbCfg.countByPhase[1];
      for (let i = 0; i < count; i++) {
        room.spawnBullet(this.x, fbCfg.bulletY, this.z, target, this.dmg * fbCfg.dmgMul * em, fbCfg.bulletColor);
      }
    }

    // Fire wave (phase 2+)
    if (this.phase >= waveCfg.minPhase && this.flFireWaveCd <= 0 && dist < 12) {
      this.flFireWaveCd = getAbilityCd(waveCfg, this.phase);
      const baseAngle = Math.atan2(dirX, dirZ);
      const coneHalf = (waveCfg.coneAngle * Math.PI / 180) / 2;
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        const pd = Math.hypot(p.x - this.x, p.z - this.z);
        if (pd > waveCfg.maxRange) continue;
        const pAngle = Math.atan2(p.x - this.x, p.z - this.z);
        let diff = pAngle - baseAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) < coneHalf) {
          p.takeDamage(this.dmg * waveCfg.dmgMul * em, room);
          p.enemyBurnT = waveCfg.burnDur; p.enemyBurnDps = waveCfg.burnDps;
        }
      }
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: waveCfg.maxRange, color: 0xff6600 });
    }

    // Fire pillars (phase 2+): telegraphed line of fire
    if (this.phase >= pillarCfg.minPhase && this.flPillarCd <= 0 && dist < 16) {
      this.flPillarCd = getAbilityCd(pillarCfg, this.phase);
      for (let i = 0; i < pillarCfg.count; i++) {
        const px = target.x + (Math.random() - 0.5) * pillarCfg.spread;
        const pz = target.z + (Math.random() - 0.5) * pillarCfg.spread;
        room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: px, z: pz, r: pillarCfg.radius, dur: pillarCfg.teleDur, color: pillarCfg.teleColor });
        setTimeout(() => {
          for (const p of room.playersArr()) {
            if (!p.alive) continue;
            if (Math.hypot(p.x - px, p.z - pz) < pillarCfg.radius) {
              p.takeDamage(this.dmg * pillarCfg.dmgMul * em, room);
              p.enemyBurnT = pillarCfg.burnDur; p.enemyBurnDps = pillarCfg.burnDps;
            }
          }
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: px, z: pz, radius: pillarCfg.radius, color: pillarCfg.hitColor });
        }, 1000);
      }
    }

    // Meteor rain (phase 3+)
    if (this.phase >= meteorCfg.minPhase && this.flMeteorCd <= 0) {
      this.flMeteorCd = getAbilityCd(meteorCfg, this.phase);
      const count = meteorCfg.countByPhase[this.phase] || meteorCfg.countByPhase[1];
      for (let i = 0; i < count; i++) {
        const mx = target.x + (Math.random() - 0.5) * meteorCfg.spread;
        const mz = target.z + (Math.random() - 0.5) * meteorCfg.spread;
        room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: mx, z: mz, r: meteorCfg.radius, dur: meteorCfg.teleDur, color: meteorCfg.teleColor });
        setTimeout(() => {
          for (const p of room.playersArr()) {
            if (!p.alive) continue;
            if (Math.hypot(p.x - mx, p.z - mz) < meteorCfg.radius) p.takeDamage(this.dmg * meteorCfg.dmgMul * em, room);
          }
          room.sendEvent({ type: 'skillfx', kind: 'nova', x: mx, z: mz, radius: meteorCfg.radius, color: meteorCfg.hitColor });
        }, 1200);
      }
      room.sendEvent({ type: 'ann', text: meteorCfg.text, color: meteorCfg.textColor });
    }

    // Heat wave (phase 4): full-screen slow + burn
    if (this.phase >= heatCfg.minPhase && this.flHeatWaveCd <= 0) {
      this.flHeatWaveCd = heatCfg.baseCd;
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        p.enemySlowT = heatCfg.slowDur; p.enemySlowF = heatCfg.slowFactor;
        p.enemyBurnT = heatCfg.burnDur; p.enemyBurnDps = heatCfg.burnDps;
      }
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: heatCfg.novaRadius, color: heatCfg.novaColor });
      room.sendEvent({ type: 'ann', text: heatCfg.text, color: heatCfg.textColor });
    }

    this.y = Math.sin(room.time * 2) * 0.08;
  }

  // ========================================================================
  // КОРОЛЬ ТЕНЕЙ: teleport, backstab, clones, vortex, shadow step, darkness
  // ========================================================================
  _shadowKingAI(dt, room, target, dist, dirX, dirZ, sf, em) {
    const cfg = BOSS_ABILITIES.shadowKing;
    const bsCfg = cfg.abilities.find(a => a.id === 'backstab');
    const cloneCfg = cfg.abilities.find(a => a.id === 'clone');
    const vortexCfg = cfg.abilities.find(a => a.id === 'vortex');
    const darkCfg = cfg.abilities.find(a => a.id === 'darkness');
    const ripCfg = cfg.abilities.find(a => a.id === 'soulRip');
    const stepCfg = cfg.abilities.find(a => a.id === 'shadowStep');
    const minionCfg = cfg.abilities.find(a => a.id === 'minionSpawn');

    this.skTeleportCd -= dt;
    this.skBackstabCd -= dt;
    this.skCloneCd -= dt;
    this.skVortexCd -= dt;
    this.skShadowStepCd -= dt;
    this.skDarknessCd -= dt;
    this.skSoulRipCd -= dt;
    this.skMirrorCd -= dt;

    // Shadow vortex (phase 3+)
    if (this.phase >= vortexCfg.minPhase && this.skVortexCd <= 0 && dist < 16) {
      this.skVortexCd = getAbilityCd(vortexCfg, this.phase);
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        const pd = Math.hypot(p.x - this.x, p.z - this.z);
        if (pd < vortexCfg.pullRadius) {
          const pullStr = Math.max(0, vortexCfg.pullStrengthBase - pd) * vortexCfg.pullStrengthMul;
          const pullX = (this.x - p.x) / (pd || 1);
          const pullZ = (this.z - p.z) / (pd || 1);
          p.vx += pullX * pullStr; p.vz += pullZ * pullStr;
          p.takeDamage(this.dmg * vortexCfg.dmgMul * em, room);
        }
      }
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: vortexCfg.novaRadius, color: vortexCfg.novaColor });
      room.sendEvent({ type: 'ann', text: vortexCfg.text, color: vortexCfg.textColor });
    }

    // Darkness zone (phase 3+): AoE that blinds (slows + damage over time)
    if (this.phase >= darkCfg.minPhase && this.skDarknessCd <= 0) {
      this.skDarknessCd = getAbilityCd(darkCfg, this.phase);
      const dzx = target.x, dzz = target.z;
      room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: dzx, z: dzz, r: darkCfg.radius, dur: darkCfg.teleDur, color: darkCfg.teleColor });
      setTimeout(() => {
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - dzx, p.z - dzz) < darkCfg.radius) {
            p.takeDamage(this.dmg * darkCfg.dmgMul * em, room);
            p.enemySlowT = darkCfg.slowDur; p.enemySlowF = darkCfg.slowFactor;
          }
        }
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: dzx, z: dzz, radius: darkCfg.radius, color: darkCfg.hitColor });
      }, 1000);
    }

    // Shadow clones (phase 2+)
    if (this.phase >= cloneCfg.minPhase && this.skCloneCd <= 0) {
      this.skCloneCd = getAbilityCd(cloneCfg, this.phase);
      const cloneCount = cloneCfg.countByPhase[this.phase] || cloneCfg.countByPhase[1];
      for (let i = 0; i < cloneCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const cx = clamp(this.x + Math.cos(a) * cloneCfg.spawnRadius, -ARENA.LIMIT + 2, ARENA.LIMIT - 2);
        const cz = clamp(this.z + Math.sin(a) * cloneCfg.spawnRadius, -ARENA.LIMIT + 2, ARENA.LIMIT - 2);
        const clone = new Enemy(cloneCfg.cloneType, cx, cz, 1, false);
        clone.isMinion = true;
        clone.maxHp = Math.round(clone.maxHp * cloneCfg.cloneHpMul);
        clone.hp = clone.maxHp;
        clone.dmg = this.dmg * cloneCfg.cloneDmgMul;
        clone.size *= cloneCfg.cloneSizeMul;
        clone.score = cloneCfg.cloneScore;
        clone.xp = cloneCfg.cloneXp;
        room.enemies.push(clone);
      }
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 2.5, color: cloneCfg.novaColor });
    }

    // Soul rip (phase 2+): targeted high damage + heal
    if (this.phase >= ripCfg.minPhase && this.skSoulRipCd <= 0 && dist < ripCfg.maxRange) {
      this.skSoulRipCd = getAbilityCd(ripCfg, this.phase);
      target.takeDamage(this.dmg * ripCfg.dmgMul * em, room);
      this.hp = Math.min(this.maxHp, this.hp + this.dmg * ripCfg.healFactor);
      room.sendEvent({ type: 'skillfx', kind: 'beam', x: this.x, y: 1.5, z: this.z, x2: target.x, y2: 1.2, z2: target.z, color: ripCfg.beamColor });
      room.sendEvent({ type: 'skillfx', kind: 'text', text: ripCfg.text, x: target.x, y: 2.5, z: target.z, color: ripCfg.textColor });
    }

    // Teleport + backstab (adaptive: more frequent when kiting)
    const tpCd = getAbilityCd(stepCfg, this.phase);
    if (this.skTeleportCd <= 0 && (dist < 6 || this._kitingScore > 0.7)) {
      const angle = Math.atan2(target.x - this.x, target.z - this.z);
      this.x = target.x + Math.sin(angle) * stepCfg.teleportDist;
      this.z = target.z + Math.cos(angle) * stepCfg.teleportDist;
      this.x = clamp(this.x, -ARENA.LIMIT + 2, ARENA.LIMIT - 2);
      this.z = clamp(this.z, -ARENA.LIMIT + 2, ARENA.LIMIT - 2);
      this.skTeleportCd = tpCd;
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 2, color: stepCfg.novaColor });
      const newDist = Math.hypot(target.x - this.x, target.z - this.z);
      if (newDist < stepCfg.backstabRange) {
        target.takeDamage(this.dmg * stepCfg.backstabDmgMul * em, room);
        room.sendEvent({ type: 'skillfx', kind: 'text', text: stepCfg.backstabText, x: target.x, y: 2.5, z: target.z, color: stepCfg.backstabTextColor });
      }
    } else if (dist > this.radius + 1.2) {
      // Chase with strafe
      const strafeAmt = this._strafeDir * this.speed * 0.4 * sf;
      this.x += (dirX * this.speed * sf * em - dirZ * strafeAmt) * dt;
      this.z += (dirZ * this.speed * sf * em + dirX * strafeAmt) * dt;
    } else {
      this.attackCd -= dt;
      if (this.attackCd <= 0) {
        this.attackCd = bsCfg.attackCd;
        target.takeDamage(this.dmg * em, room);
      }
    }

    this.y = Math.sin(room.time * 3 + this.seed) * 0.08;
  }

  // ========================================================================
  // ЛЕДЯНАЯ КОРОЛЕВА: ice shards, freeze, blizzard, lance, frozen ground, absolute zero
  // ========================================================================
  _frostQueenAI(dt, room, target, dist, dirX, dirZ, sf, em) {
    const cfg = BOSS_ABILITIES.frostQueen;
    const shardCfg = cfg.abilities.find(a => a.id === 'iceShard');
    const lanceCfg = cfg.abilities.find(a => a.id === 'iceLance');
    const freezeCfg = cfg.abilities.find(a => a.id === 'freeze');
    const wallCfg = cfg.abilities.find(a => a.id === 'iceWall');
    const groundCfg = cfg.abilities.find(a => a.id === 'frozenGround');
    const blizzardCfg = cfg.abilities.find(a => a.id === 'blizzard');
    const absZeroCfg = cfg.abilities.find(a => a.id === 'absoluteZero');
    const barrierCfg = cfg.abilities.find(a => a.id === 'iceBarrier');

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
      } else if (Math.random() < dt * blizzardCfg.tickChance) {
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - this.x, p.z - this.z) < blizzardCfg.radius) {
            p.takeDamage(this.dmg * blizzardCfg.dmgMul * em, room);
            p.enemySlowT = blizzardCfg.slowDur; p.enemySlowF = blizzardCfg.slowFactor;
          }
        }
      }
    }

    // Ice barrier (phase 2+): absorb shield
    if (this.phase >= barrierCfg.minPhase && this.fqIceBarrierCd <= 0 && this.fqIceBarrierHp <= 0) {
      this.fqIceBarrierCd = getAbilityCd(barrierCfg, this.phase);
      this.fqIceBarrierHp = this.maxHp * barrierCfg.hpPct;
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 2, color: barrierCfg.novaColor });
      room.sendEvent({ type: 'ann', text: barrierCfg.text, color: barrierCfg.textColor });
    }

    // Maintain distance
    const prefDist = this._kitingScore > 0.5 ? cfg.preferredDistKiting : cfg.preferredDist;
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
    if (this.fqIceShardCd <= 0 && dist < shardCfg.maxRange) {
      this.fqIceShardCd = getAbilityCd(shardCfg, this.phase);
      room.spawnBullet(this.x, shardCfg.bulletY, this.z, target, this.dmg * shardCfg.dmgMul * em, shardCfg.bulletColor);
      target.enemySlowT = shardCfg.slowDur; target.enemySlowF = shardCfg.slowFactor;
    }

    // Ice lance (phase 2+): high damage targeted
    if (this.phase >= lanceCfg.minPhase && this.fqIceLanceCd <= 0 && dist < lanceCfg.maxRange) {
      this.fqIceLanceCd = getAbilityCd(lanceCfg, this.phase);
      room.spawnBullet(this.x, lanceCfg.bulletY, this.z, target, this.dmg * lanceCfg.dmgMul * em, lanceCfg.bulletColor);
      target.enemySlowT = lanceCfg.slowDur; target.enemySlowF = lanceCfg.slowFactor;
      room.sendEvent({ type: 'skillfx', kind: 'text', text: lanceCfg.text, x: target.x, y: 2.5, z: target.z, color: lanceCfg.textColor });
    }

    // Freeze (phase 2+)
    if (this.phase >= freezeCfg.minPhase && this.fqFreezeCd <= 0 && dist < freezeCfg.maxRange) {
      this.fqFreezeCd = getAbilityCd(freezeCfg, this.phase);
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - this.x, p.z - this.z) < freezeCfg.radius) {
          p.stunT = freezeCfg.stunDur;
          p.takeDamage(this.dmg * freezeCfg.dmgMul * em, room);
        }
      }
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: freezeCfg.radius, color: 0x4488ff });
      room.sendEvent({ type: 'ann', text: freezeCfg.text, color: freezeCfg.textColor });
    }

    // Frozen ground (phase 3+): zone that slows
    if (this.phase >= groundCfg.minPhase && this.fqFrozenGroundCd <= 0) {
      this.fqFrozenGroundCd = getAbilityCd(groundCfg, this.phase);
      const fgx = target.x, fgz = target.z;
      room.sendEvent({ type: 'skillfx', kind: 'zone', x: fgx, z: fgz, r: groundCfg.radius, dur: groundCfg.duration, color: groundCfg.zoneColor });
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - fgx, p.z - fgz) < groundCfg.radius) {
          p.enemySlowT = groundCfg.slowDur; p.enemySlowF = groundCfg.slowFactor;
        }
      }
    }

    // Ice wall (phase 2+)
    if (this.phase >= wallCfg.minPhase) {
      this._fqIceWallCd = (this._fqIceWallCd || 0) - dt;
      if (this._fqIceWallCd <= 0 && dist < wallCfg.maxRange) {
        this._fqIceWallCd = getAbilityCd(wallCfg, this.phase);
        const baseAngle = Math.atan2(dirX, dirZ);
        for (let i = -(wallCfg.bulletCount - 1) / 2; i <= (wallCfg.bulletCount - 1) / 2; i++) {
          const a = baseAngle + i * wallCfg.bulletSpread;
          room.bullets.push({
            id: 'b' + (++room._fbId),
            x: this.x + Math.sin(a) * 3, y: wallCfg.bulletY || 1.5, z: this.z + Math.cos(a) * 3,
            vx: Math.sin(a) * wallCfg.bulletSpeed, vy: 0, vz: Math.cos(a) * wallCfg.bulletSpeed,
            dmg: this.dmg * wallCfg.dmgMul * em, r: wallCfg.bulletRadius, life: wallCfg.bulletLife, c: wallCfg.bulletColor,
          });
        }
      }
    }

    // Blizzard (phase 3+)
    if (this.phase >= blizzardCfg.minPhase && this.fqBlizzardCd <= 0 && !this.fqBlizzardActive) {
      this.fqBlizzardCd = getAbilityCd(blizzardCfg, this.phase);
      this.fqBlizzardActive = true;
      this.fqBlizzardT = blizzardCfg.duration;
      room.sendEvent({ type: 'ann', text: blizzardCfg.text, color: blizzardCfg.textColor });
      room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: this.x, z: this.z, r: blizzardCfg.radius, dur: blizzardCfg.teleDur, color: blizzardCfg.teleColor });
      if (blizzardCfg.initialDmg) {
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - this.x, p.z - this.z) < blizzardCfg.radius) {
            p.takeDamage(this.dmg * blizzardCfg.dmgMul * em, room);
            p.enemySlowT = blizzardCfg.slowDur; p.enemySlowF = blizzardCfg.slowFactor;
          }
        }
      }
    }

    // Absolute zero (phase 4): massive freeze + damage
    if (this.phase >= absZeroCfg.minPhase && this.fqAbsoluteZeroCd <= 0) {
      this.fqAbsoluteZeroCd = absZeroCfg.baseCd;
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        const pd = Math.hypot(p.x - this.x, p.z - this.z);
        if (pd < absZeroCfg.radius) {
          p.takeDamage(this.dmg * absZeroCfg.dmgMul * em, room);
          p.stunT = absZeroCfg.stunDur;
          p.enemySlowT = absZeroCfg.slowDur; p.enemySlowF = absZeroCfg.slowFactor;
        }
      }
      room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: absZeroCfg.radius, color: absZeroCfg.novaColor });
      room.sendEvent({ type: 'ann', text: absZeroCfg.text, color: absZeroCfg.textColor });
    }

    this.y = Math.sin(room.time * 2.5 + this.seed) * 0.1;
  }

  // ========================================================================
  // ЛОРД ДРАКОНОВ: fire breath, tail sweep, flight, dive bomb, fire storm, roar
  // ========================================================================
  _dragonLordAI(dt, room, target, dist, dirX, dirZ, sf, em) {
    const cfg = BOSS_ABILITIES.dragonLord;
    const breathCfg = cfg.abilities.find(a => a.id === 'fireBreath');
    const tailCfg = cfg.abilities.find(a => a.id === 'tailSweep');
    const gustCfg = cfg.abilities.find(a => a.id === 'wingGust');
    const roarCfg = cfg.abilities.find(a => a.id === 'dragonRoar');
    const stormCfg = cfg.abilities.find(a => a.id === 'fireStorm');
    const flightCfg = cfg.abilities.find(a => a.id === 'flight');
    const diveCfg = cfg.abilities.find(a => a.id === 'diveBomb');
    const minionCfg = cfg.abilities.find(a => a.id === 'minionSpawn');

    this.dlFireBreathCd -= dt;
    this.dlTailSweepCd -= dt;
    this.dlFlyCd -= dt;
    this.dlDiveBombCd -= dt;
    this.dlFireStormCd -= dt;
    this.dlRoarCd -= dt;
    this.dlWingGustCd -= dt;

    if (this.isFlying) {
      this.y = flightCfg.flyHeight;
      this.x += dirX * this.speed * flightCfg.flySpeedMul * sf * em * dt;
      this.z += dirZ * this.speed * flightCfg.flySpeedMul * sf * em * dt;
      this.dlFlyTimer -= dt;

      // Rain fire
      if (this.dlFlyTimer <= 0) {
        this.dlFlyTimer = flightCfg.rainInterval;
        for (let i = 0; i < flightCfg.rainCount; i++) {
          const fx = this.x + (Math.random() - 0.5) * flightCfg.rainSpread;
          const fz = this.z + (Math.random() - 0.5) * flightCfg.rainSpread;
          room.bullets.push({
            id: 'b' + (++room._fbId),
            x: fx, y: this.y, z: fz,
            vx: 0, vy: -10, vz: 0,
            dmg: this.dmg * flightCfg.rainDmgMul * em, r: flightCfg.rainBulletRadius, life: flightCfg.rainBulletLife, c: flightCfg.rainBulletColor,
          });
        }
      }

      // Dive bomb (phase 3+)
      if (this.phase >= diveCfg.minPhase && this.dlDiveBombCd <= 0 && this.dlFlyTimer < 1) {
        this.dlDiveBombCd = diveCfg.baseCd;
        this.isFlying = false;
        this.y = 0;
        this.bossState = 'dlDive';
        this.bossStateT = diveCfg.teleDur;
        this.chargeDirX = dirX; this.chargeDirZ = dirZ;
        room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: target.x, z: target.z, r: diveCfg.hitRadius, dur: diveCfg.teleDur, color: diveCfg.teleColor });
        return;
      }

      if (this.dlFlyTimer <= -2.5) {
        this.isFlying = false;
        this.y = 0;
        this.dlFlyCd = getAbilityCd(flightCfg, this.phase);
        this.bossState = 'idle';
      }
    } else if (this.bossState === 'dlDive') {
      this.bossStateT -= dt;
      this.x += this.chargeDirX * diveCfg.speed * em * dt;
      this.z += this.chargeDirZ * diveCfg.speed * em * dt;
      this.y = Math.max(0, this.bossStateT * 6);
      for (const p of room.playersArr()) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - this.x, p.z - this.z) < diveCfg.hitRadius) {
          p.takeDamage(this.dmg * diveCfg.dmgMul * em, room);
          p.stunT = diveCfg.stunDur;
        }
      }
      if (this.bossStateT <= 0) {
        this.bossState = 'idle';
        this.y = 0;
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: diveCfg.radius, color: diveCfg.hitColor });
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
      if (this.dlFireBreathCd <= 0 && dist < breathCfg.maxRange) {
        this.dlFireBreathCd = getAbilityCd(breathCfg, this.phase);
        const baseAngle = Math.atan2(dirX, dirZ);
        const coneHalf = (breathCfg.coneAngle * Math.PI / 180) / 2;
        for (let i = 0; i < breathCfg.bulletCount; i++) {
          const a = baseAngle + (i - (breathCfg.bulletCount - 1) / 2) * (coneHalf / ((breathCfg.bulletCount - 1) / 2));
          room.bullets.push({
            id: 'b' + (++room._fbId),
            x: this.x, y: 1.8, z: this.z,
            vx: Math.sin(a) * breathCfg.bulletSpeed, vy: 0, vz: Math.cos(a) * breathCfg.bulletSpeed,
            dmg: this.dmg * breathCfg.bulletDmgMul * em, r: breathCfg.bulletRadius, life: breathCfg.bulletLife, c: breathCfg.bulletColor,
          });
        }
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          const pd = Math.hypot(p.x - this.x, p.z - this.z);
          if (pd > breathCfg.coneMaxRange) continue;
          const pAngle = Math.atan2(p.x - this.x, p.z - this.z);
          let diff = pAngle - baseAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          if (Math.abs(diff) < coneHalf) {
            p.takeDamage(this.dmg * breathCfg.coneDmgMul * em, room);
            p.enemyBurnT = breathCfg.burnDur; p.enemyBurnDps = breathCfg.burnDps;
          }
        }
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 3, color: breathCfg.color });
      }

      // Tail sweep (phase 2+)
      if (this.phase >= tailCfg.minPhase && this.dlTailSweepCd <= 0 && dist < tailCfg.maxRange) {
        this.dlTailSweepCd = getAbilityCd(tailCfg, this.phase);
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - this.x, p.z - this.z) < tailCfg.radius) {
            p.takeDamage(this.dmg * tailCfg.dmgMul * em, room);
            const kdx = p.x - this.x, kdz = p.z - this.z;
            const kd = Math.hypot(kdx, kdz) || 1;
            p.vx += (kdx / kd) * tailCfg.knockback; p.vz += (kdz / kd) * tailCfg.knockback;
          }
        }
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: tailCfg.radius, color: tailCfg.color });
        const tailMinionCount = tailCfg.spawnMinionsByPhase[this.phase] || tailCfg.spawnMinionsByPhase[1];
        this._spawnMinions(room, tailMinionCount);
      }

      // Wing gust (phase 2+): knockback cone
      if (this.phase >= gustCfg.minPhase && this.dlWingGustCd <= 0 && dist < gustCfg.maxRange) {
        this.dlWingGustCd = getAbilityCd(gustCfg, this.phase);
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - this.x, p.z - this.z) < gustCfg.radius) {
            const kdx = p.x - this.x, kdz = p.z - this.z;
            const kd = Math.hypot(kdx, kdz) || 1;
            p.vx += (kdx / kd) * gustCfg.knockback; p.vz += (kdz / kd) * gustCfg.knockback;
            p.takeDamage(this.dmg * gustCfg.dmgMul * em, room);
          }
        }
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: gustCfg.radius, color: gustCfg.color });
      }

      // Dragon roar (phase 3+): AoE stun
      if (this.phase >= roarCfg.minPhase && this.dlRoarCd <= 0 && dist < roarCfg.maxRange) {
        this.dlRoarCd = getAbilityCd(roarCfg, this.phase);
        for (const p of room.playersArr()) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - this.x, p.z - this.z) < roarCfg.radius) {
            p.stunT = roarCfg.stunDur;
            p.takeDamage(this.dmg * roarCfg.dmgMul * em, room);
          }
        }
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: roarCfg.radius, color: roarCfg.color });
        room.sendEvent({ type: 'ann', text: roarCfg.text, color: roarCfg.textColor });
      }

      // Fire storm (phase 3+): multiple fire zones
      if (this.phase >= stormCfg.minPhase && this.dlFireStormCd <= 0) {
        this.dlFireStormCd = getAbilityCd(stormCfg, this.phase);
        for (let i = 0; i < stormCfg.count; i++) {
          const fx = target.x + (Math.random() - 0.5) * stormCfg.spread;
          const fz = target.z + (Math.random() - 0.5) * stormCfg.spread;
          room.sendEvent({ type: 'skillfx', kind: 'telegraph', x: fx, z: fz, r: stormCfg.radius, dur: stormCfg.teleDur, color: stormCfg.teleColor });
          setTimeout(() => {
            for (const p of room.playersArr()) {
              if (!p.alive) continue;
              if (Math.hypot(p.x - fx, p.z - fz) < stormCfg.radius) {
                p.takeDamage(this.dmg * stormCfg.dmgMul * em, room);
                p.enemyBurnT = stormCfg.burnDur; p.enemyBurnDps = stormCfg.burnDps;
              }
            }
            room.sendEvent({ type: 'skillfx', kind: 'nova', x: fx, z: fz, radius: stormCfg.radius, color: stormCfg.hitColor });
          }, 1200);
        }
        room.sendEvent({ type: 'ann', text: stormCfg.text, color: stormCfg.textColor });
      }

      // Take flight (phase 3+)
      if (this.phase >= flightCfg.minPhase && this.dlFlyCd <= 0) {
        this.isFlying = true;
        this.dlFlyTimer = flightCfg.duration;
        this.dlFlyCd = getAbilityCd(flightCfg, this.phase);
        room.sendEvent({ type: 'ann', text: flightCfg.text, color: flightCfg.textColor });
        room.sendEvent({ type: 'skillfx', kind: 'nova', x: this.x, z: this.z, radius: 3, color: flightCfg.color });
      }
    }

    this.x = clamp(this.x, -ARENA.LIMIT, ARENA.LIMIT);
    this.z = clamp(this.z, -ARENA.LIMIT, ARENA.LIMIT);
  }

  // --- Спираль пуль ---
  _fireSpiral(room, count) {
    const n = count || 8;
    this.spiralAngle += 0.5;
    const bossCfg = BOSS_ABILITIES[this.type];
    const spiralCfg = bossCfg?.abilities.find(a => a.id === 'spiral');
    const color = spiralCfg?.bulletColor || 0xff6a00;
    const speed = spiralCfg?.bulletSpeedByPhase?.[this.phase] || 9;
    const dmgMul = spiralCfg?.bulletDmgMul || 0.45;
    const bulletR = spiralCfg?.bulletRadius || 0.18;
    const bulletLife = spiralCfg?.bulletLife || 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.spiralAngle;
      room.bullets.push({
        id: 'b' + (++room._fbId),
        x: this.x, y: 2.2, z: this.z,
        vx: Math.cos(a) * speed, vy: 0, vz: Math.sin(a) * speed,
        dmg: this.dmg * dmgMul, r: bulletR, life: bulletLife, c: color,
      });
    }
  }

  // --- Спавн миньонов ---
  _spawnMinions(room, count) {
    const bossCfg = BOSS_ABILITIES[this.type];
    const minionType = bossCfg?.minionType || 'normal';
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const x = clamp(this.x + Math.cos(a) * 2.5, -ARENA.LIMIT + 2, ARENA.LIMIT - 2);
      const z = clamp(this.z + Math.sin(a) * 2.5, -ARENA.LIMIT + 2, ARENA.LIMIT - 2);
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
    // Golem King fortify: damage reduction
    if (this.type === 'golemKing' && this.gkFortifyT > 0) {
      const fortCfg = BOSS_ABILITIES.golemKing?.abilities.find(a => a.id === 'fortify');
      amount *= (1 - (fortCfg?.damageReduction || 0.6));
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
      const gkCfg = BOSS_ABILITIES.golemKing;
      const absorbed = Math.min(this.gkShieldHp, amount);
      this.gkShieldHp -= absorbed;
      amount -= absorbed;
      if (this.gkShieldHp <= 0 && !this.gkEnraged) {
        this.gkEnraged = true;
        this.gkShieldBroken = true;
        this.speed *= gkCfg.shieldBreakSpeedMul;
        this.dmg *= gkCfg.shieldBreakDmgMul;
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
