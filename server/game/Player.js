import { PLAYER, ARENA, clamp } from '../../shared/constants.js';
import { ITEMS, SKILLS, SETS, BUFFS, RARITY, UPGRADES, computeActiveSets } from '../../shared/gameData.js';
import { integrateMovement } from '../../shared/physics.js';

let PID = 0;
export const PLAYER_COLORS = [0x3a7bff, 0x35e07a, 0xffb03a, 0xe05aff];

const MAX_INV = 12;
const MAX_SKILL_SLOTS = 2;

// ============================================================================
// СЕРВЕРНЫЙ ИГРОК — авторитарное состояние. Движение здесь считается истиной,
// клиент лишь предсказывает и сверяется (reconciliation).
// ============================================================================
export class Player {
  constructor(conn, name, slot) {
    this.id = 'p' + (++PID) + Math.random().toString(36).slice(2, 6);
    this.conn = conn;
    // Name validation: trim, strip HTML tags, limit 16 chars, default to 'Боец'
    let cleanName = (name || '').trim().replace(/<[^>]*>/g, '').slice(0, 16);
    this.name = cleanName || 'Боец';
    this.slot = slot;
    this.color = PLAYER_COLORS[slot % PLAYER_COLORS.length];

    // позиция/физика
    this.x = 0; this.y = PLAYER.HEIGHT; this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = 0; this.pitch = 0.12;
    this.grounded = true;
    this.jumpsLeft = 2;

    // бой
    this.hp = PLAYER.BASE_HP;
    this.maxHp = PLAYER.BASE_HP;
    this.shield = 0;
    this.shieldMax = 60;
    this.alive = true;
    this.respawnT = 0;
    this.invuln = 0;
    this.attackCd = 0;
    this.atkAnim = 0;
    this.atkStep = 0;
    this.dashCd = 0;
    this.dashT = 0;
    this.dashing = false;
    this.dashDX = 0; this.dashDZ = 1;
    this.ultCharge = 0;

    // прогресс
    this.score = 0;
    this.kills = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNext = 100;
    this.combo = 0;
    this.comboT = 0;

    // инвентарь и экипировка
    this.inv = [];                 // IDs предметов в инвентаре
    this.equip = { weapon: 'w1', relic1: null, relic2: null };

    // скилы
    this.skillSlots = [null, null]; // IDs скилов на панели (0 и 1)
    this.skillCd = [0, 0];         // кулдауны
    this.learnedSkills = [];       // все изученные скилы

    // бафы
    this.buffs = {};               // type → оставшееся время
    this.poisonBlade = false;      // ядовитый клинок: следующая атака наносит яд

    // дебаффы от врагов
    this.enemySlowT = 0; this.enemySlowF = 1;    // замедление от врагов
    this.damageAmpT = 0; this.damageAmpF = 1;    // усиление урона (получаемый урон)
    this.enemyBurnT = 0; this.enemyBurnDps = 0;  // горение от врагов

    // статы (пересчитываются при смене экипировки/бафов)
    this.stats = this._computeStats();

    // регенерация
    this.healRegen = null;
    this.healRegenDur = 0;
    this._regenTimer = 0;

    // воскрешение
    this.reviveUsed = false;

    // апгрейды при левел-апе
    this.pendingUpgrade = null;
    this.upgradeHistory = [];
    this._levelHP = 0;  // бонус HP от уровней (не пересчитывается)

    // текущий непрерывный инпут
    this.input = { mx: 0, mz: 0 };
    this.ping = 0;
  }

  // --- статы ---
  _computeStats() {
    let wDmg = 1, wSpd = 1, wRange = 1, el = 'none', exec = false, wVamp = 0, wCrit = 0, wHP = 0;
    let weaponType = 'melee', atkRange = PLAYER.ATTACK_RANGE;
    let eqSpd = 0, eqCrit = 0, eqCritDmg = 0, eqVamp = 0, eqHP = 0, eqShield = 0;
    let eqCdr = 0, eqScore = 0, eqPull = 0, eqSkillDmg = 0, revive = 0;

    for (const slot of ['weapon', 'relic1', 'relic2']) {
      const id = this.equip[slot];
      if (!id) continue;
      const it = ITEMS[id];
      if (!it) continue;
      if (it.slot === 'weapon') {
        wDmg = it.dmg; wSpd = it.spd || 1; el = it.el || 'none';
        exec = !!it.exec; wVamp = it.vamp || 0; wCrit = it.crit || 0; wHP = it.hp || 0;
        weaponType = it.weaponType || 'melee';
        if (it.weaponType === 'ranged' && it.atkRange) atkRange = it.atkRange;
      } else {
        eqSpd += it.spd || 0; eqCrit += it.crit || 0; eqCritDmg += it.critDmg || 0;
        eqVamp += it.vamp || 0; eqHP += it.hp || 0; eqShield += it.shield || 0;
        eqCdr += it.cdr || 0; eqScore += it.score || 0;
        eqPull += it.pull || 0; revive += it.revive || 0;
        eqSkillDmg += it.skillDmg || 0;
      }
    }

    // сет-бонусы
    const activeSets = computeActiveSets(this.skillSlots);
    const setFlags = {};
    for (const s of activeSets) setFlags[s.id] = true;

    const bPower = this.buffs.power ? 1.5 : 1;
    const bHaste = this.buffs.haste ? 1.4 : 1;
    const bFury = this.buffs.fury ? 1.8 : 1;
    const bBerserk = this.buffs.berserk ? 2 : 1;
    const bBerserkSpd = this.buffs.berserk ? 1.4 : 1;
    const bFortify = this.buffs.fortify;

    const baseMaxHP = PLAYER.BASE_HP + eqHP + wHP + (this._bonusHP || 0) + this._levelHP;
    const finalMaxHP = bFortify ? Math.round(baseMaxHP * 1.5) : baseMaxHP;

    return {
      dmgMult: (1 + (this._bonusDmg || 0)) * bPower * bBerserk,
      meleeDmg: PLAYER.ATTACK_DAMAGE * wDmg * bPower * (1 + (this._bonusDmg || 0)) * bBerserk,
      atkSpd: wSpd * bFury * (1 + (this._bonusAtkSpd || 0)),
      speed: (1 + eqSpd + (this._bonusSpd || 0)) * bHaste * bBerserkSpd,
      crit: PLAYER.CRIT_BASE + wCrit + eqCrit + (this._bonusCrit || 0),
      critDmg: PLAYER.CRIT_DMG + eqCritDmg,
      vamp: wVamp + eqVamp + (setFlags.reaper ? 0.1 : 0) + (setFlags['blood-oath'] ? 0.2 : 0) + (this._bonusVamp || 0),
      range: wRange * (1 + (this._bonusRange || 0)),
      maxHP: finalMaxHP,
      shieldMax: 60 + eqShield + (setFlags.guardian ? 30 : 0) + (this._bonusShield || 0),
      cdr: Math.min(0.5, eqCdr),
      scoreMult: 1 + eqScore,
      pull: 6 + eqPull + (this.buffs.magnet ? 9 : 0),
      ultMult: 1 + (this._bonusUlt || 0),
      taken: 1,
      exec,
      revive: revive > 0 && !this.reviveUsed,
      el,
      luck: this.buffs.luck ? 2 : 1,
      skillDmg: (setFlags.inferno ? 1.25 : 1) + eqSkillDmg,
      setFlags,
      activeSets,
      weaponType,
      atkRange,
      _fortifyShieldBonus: bFortify ? Math.round(finalMaxHP * 0.3) : 0,
    };
  }

  recomputeStats() {
    const oldMaxHP = this.stats.maxHP;
    this.stats = this._computeStats();
    // при росте макс. HP — восстанавливаем разницу
    if (this.stats.maxHP > oldMaxHP && this.alive) {
      this.hp += this.stats.maxHP - oldMaxHP;
    }
    this.maxHp = this.stats.maxHP;
    this.shieldMax = this.stats.shieldMax;
    // щит от укрепления
    if (this.stats._fortifyShieldBonus > 0) {
      this.shield = Math.max(this.shield, this.stats._fortifyShieldBonus);
    }
    if (this.hp > this.maxHp) this.hp = this.maxHp;
    if (this.shield > this.shieldMax) this.shield = this.shieldMax;
  }

  // --- инвентарь ---
  addToInv(defId) {
    if (this.inv.length >= MAX_INV) return false;
    this.inv.push(defId);
    return true;
  }

  equipItem(invIdx, slot) {
    const defId = this.inv[invIdx];
    if (!defId) return false;
    const it = ITEMS[defId];
    if (!it) return false;
    // проверка слота
    if (slot === 'weapon' && it.slot !== 'weapon') return false;
    if ((slot === 'relic1' || slot === 'relic2') && it.slot !== 'relic') return false;

    const prev = this.equip[slot];
    this.inv.splice(invIdx, 1);
    if (prev) this.inv.push(prev);
    this.equip[slot] = defId;
    this.recomputeStats();
    return true;
  }

  unequipItem(slot) {
    if (!this.equip[slot]) return false;
    if (this.inv.length >= MAX_INV) return false;
    this.inv.push(this.equip[slot]);
    this.equip[slot] = null;
    this.recomputeStats();
    return true;
  }

  sellItem(invIdx) {
    const defId = this.inv[invIdx];
    if (!defId) return 0;
    const val = ITEMS[defId]?.val || 0;
    this.inv.splice(invIdx, 1);
    this.score += val;
    return val;
  }

  // --- скилы ---
  assignSkill(slot, skillId) {
    if (slot < 0 || slot >= MAX_SKILL_SLOTS) return false;
    if (skillId && !SKILLS[skillId]) return false;
    // снимаем скил с другого слота, если уже там
    if (skillId) {
      for (let i = 0; i < MAX_SKILL_SLOTS; i++) {
        if (this.skillSlots[i] === skillId) this.skillSlots[i] = null;
      }
    }
    this.skillSlots[slot] = skillId;
    this.recomputeStats();
    return true;
  }

  unassignSkill(slot) {
    if (slot < 0 || slot >= MAX_SKILL_SLOTS) return false;
    this.skillSlots[slot] = null;
    this.recomputeStats();
    return true;
  }

  learnSkill(skillId) {
    if (!SKILLS[skillId]) return false;
    if (this.learnedSkills.includes(skillId)) return false;
    this.learnedSkills.push(skillId);
    // автоматически назначаем на пустой слот
    for (let i = 0; i < MAX_SKILL_SLOTS; i++) {
      if (this.skillSlots[i] === null) { this.skillSlots[i] = skillId; break; }
    }
    this.recomputeStats();
    return true;
  }

  // --- бафы ---
  applyBuff(type, room) {
    const b = BUFFS[type];
    if (!b) return;
    if (type === 'barrier') {
      this.shield = Math.min(this.shieldMax, this.shield + 40);
    } else {
      this.buffs[type] = b.dur;
    }
    this.recomputeStats();
    room.sendEvent({ type: 'buff', pid: this.id, buff: type, dur: b.dur });
  }

  updateBuffs(dt) {
    let changed = false;
    for (const k in this.buffs) {
      this.buffs[k] -= dt;
      if (this.buffs[k] <= 0) { delete this.buffs[k]; changed = true; }
    }
    if (changed) this.recomputeStats();
  }

  // --- спавн ---
  spawn() {
    const a = (this.slot / 4) * Math.PI * 2;
    this.x = Math.cos(a) * 3;
    this.z = Math.sin(a) * 3;
    this.y = PLAYER.HEIGHT;
    this.vx = this.vy = this.vz = 0;
    this.hp = this.maxHp;
    this.alive = true;
    this.invuln = 1.5;
    this.healRegen = null;
    this.healRegenDur = 0;
    this._regenTimer = 0;
  }

  setInput(mx, mz, yaw, pitch) {
    this.input.mx = clamp(mx, -1, 1);
    this.input.mz = clamp(mz, -1, 1);
    this.yaw = yaw;
    this.pitch = clamp(pitch, -1.25, 1.25);
  }

  tryJump() {
    if (!this.alive) return false;
    const maxJumps = 2;
    if (this.jumpsLeft > 0) {
      this.vy = PLAYER.JUMP * (this.jumpsLeft < maxJumps ? 0.92 : 1);
      this.jumpsLeft--;
      this.grounded = false;
      return true;
    }
    return false;
  }

  tryDash() {
    if (!this.alive || this.dashCd > 0 || this.dashing) return false;
    const f = this.forward();
    const rx = -f.z, rz = f.x;
    let dx = rx * this.input.mx + f.x * (-this.input.mz);
    let dz = rz * this.input.mx + f.z * (-this.input.mz);
    if (Math.hypot(dx, dz) < 0.1) { dx = f.x; dz = f.z; }
    const len = Math.hypot(dx, dz) || 1;
    this.dashDX = dx / len; this.dashDZ = dz / len;
    this.dashing = true;
    this.dashT = PLAYER.DASH_DUR;
    this.dashCd = PLAYER.DASH_CD;
    this.invuln = Math.max(this.invuln, PLAYER.DASH_DUR + 0.08);
    return true;
  }

  forward() {
    return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
  }

  integrate(dt) {
    if (!this.alive) { this.respawnT -= dt; return; }
    if (this.invuln > 0) this.invuln -= dt;
    if (this.attackCd > 0) this.attackCd -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.atkAnim > 0) this.atkAnim -= dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    if (this.shield < 0) this.shield = 0;

    // кулдауны скилов
    for (let i = 0; i < MAX_SKILL_SLOTS; i++) {
      if (this.skillCd[i] > 0) this.skillCd[i] -= dt;
    }

    this.updateBuffs(dt);

    // дебаффы от врагов
    if (this.enemySlowT > 0) this.enemySlowT -= dt;
    if (this.damageAmpT > 0) this.damageAmpT -= dt;
    if (this.enemyBurnT > 0) {
      this.enemyBurnT -= dt;
      this.hp -= this.enemyBurnDps * dt;
      if (this.hp < 1) this.hp = 1;
    }

    // heal-over-time regen (0.5s intervals)
    if (this.healRegen) {
      this._regenTimer += dt;
      if (this._regenTimer >= 0.5) {
        let regenAmt = this.healRegen * 0.5;
        // УЗЫ ЖИЗНИ: усиление лечения при низком HP
        if (this.stats.setFlags['life-binder'] && this.hp < this.maxHp * 0.3) {
          regenAmt *= 1.5;
        }
        this.heal(regenAmt);
        this._regenTimer -= 0.5;
      }
      this.healRegenDur -= dt;
      if (this.healRegenDur <= 0) {
        this.healRegen = null;
        this.healRegenDur = 0;
        this._regenTimer = 0;
      }
    }

    if (this.stunT > 0) { this.stunT -= dt; return; }
    const moveSpeed = this.enemySlowT > 0 ? this.stats.speed * this.enemySlowF : this.stats.speed;
    integrateMovement(this, this.input, dt, moveSpeed);
  }

  takeDamage(amount, room) {
    if (!this.alive || this.invuln > 0) return false;
    // уклонение
    if (this.stats.dodge > 0 && Math.random() < this.stats.dodge) {
      room.sendEvent({ type: 'skillfx', kind: 'float', x: this.x, y: 1.9, z: this.z, text: 'MISS', color: '#aab2bd', size: 14 });
      return false;
    }
    amount *= this.stats.taken;
    if (this.damageAmpT > 0) amount *= this.damageAmpF;

    // щит поглощает часть урона
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, amount);
      this.shield -= absorbed;
      amount -= absorbed;
      if (amount <= 0) return false;
    }

    this.hp -= amount;
    room.sendEvent({ type: 'dmg', pid: this.id, amount: Math.round(amount) });
    if (this.hp <= 0) {
      // проверка воскрешения (крыло феникса)
      if (this.stats.revive && !this.reviveUsed) {
        this.reviveUsed = true;
        this.hp = this.maxHp * 0.5;
        this.invuln = 1.5;
        room.sendEvent({ type: 'ann', text: 'КРЫЛО ФЕНИКСА!', color: '#ffc233', pid: this.id });
        return false;
      }
      this.hp = 0; this.alive = false;
      this.respawnT = PLAYER.RESPAWN_TIME;
      room.sendEvent({ type: 'death', pid: this.id });
      return true;
    }
    return false;
  }

  heal(amount) {
    if (!this.alive) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  addXP(amount, room) {
    this.xp += amount;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = Math.floor(this.xpNext * 1.28 + 20);
      this._levelHP += 10;
      this.recomputeStats();
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.1);
      room.sendEvent({ type: 'lvl', pid: this.id, level: this.level });

      // предложить выбор улучшений
      const options = this._pickUpgradeOptions(3);
      this.pendingUpgrade = { options, timer: 15 };
      room.sendEvent({ type: 'upgrade', pid: this.id, options: options.map(o => ({ id: o.id, icon: o.icon, name: o.name, desc: o.desc })) });
    }
  }

  _pickUpgradeOptions(count) {
    const available = UPGRADES.filter(u => !this.upgradeHistory.includes(u.id) || this.upgradeHistory.filter(id => id === u.id).length < 3);
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  applyUpgrade(upgradeId, room) {
    if (!this.pendingUpgrade) return false;
    const option = this.pendingUpgrade.options.find(o => o.id === upgradeId);
    if (!option) return false;
    option.apply(this);
    this.upgradeHistory.push(upgradeId);
    this.pendingUpgrade = null;
    this.recomputeStats();
    room.sendEvent({ type: 'ann', text: `${option.icon} ${option.name} — ${option.desc}`, color: '#35e0ff', pid: this.id });
    return true;
  }

  bumpCombo() {
    this.combo++;
    this.comboT = 3.5;
  }

  // Сериализация в снапшот (20 Гц — компактный)
  snap() {
    return {
      id: this.id, n: this.name, s: this.slot, c: this.color,
      x: +this.x.toFixed(3), y: +this.y.toFixed(3), z: +this.z.toFixed(3),
      yaw: +this.yaw.toFixed(3),
      hp: Math.ceil(this.hp), mhp: this.maxHp, alive: this.alive,
      score: Math.floor(this.score), kills: this.kills, level: this.level,
      xp: this.xp, xpn: this.xpNext, combo: this.combo,
      atk: this.atkAnim > 0 ? this.atkStep + 1 : 0,
      dash: this.dashing, rt: Math.ceil(this.respawnT),
      scd: this.skillCd.map(c => +c.toFixed(2)),
      ult: Math.floor(this.ultCharge),
      atkSpd: +this.stats.atkSpd.toFixed(3),
      wid: this.equip.weapon || null,
      sk: this.skillSlots,
      sets: this.stats.activeSets?.map(s => s.id) || [],
      buffs: this.buffs,
      meleeDmg: +this.stats.meleeDmg.toFixed(2),
      crit: +this.stats.crit.toFixed(4),
      spd: +this.stats.speed.toFixed(4),
      vamp: +this.stats.vamp.toFixed(4),
      pb: this.poisonBlade ? 1 : 0,
    };
  }

  // Полный снапшот (для STATE — поздний вход)
  fullSnap() {
    return {
      ...this.snap(),
      inv: this.inv,
      equip: { ...this.equip },
      skills: [...this.skillSlots],
      learned: [...this.learnedSkills],
      buffs: { ...this.buffs },
    };
  }
}
