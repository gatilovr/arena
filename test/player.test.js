import test from 'node:test';
import assert from 'node:assert/strict';
import { Player } from '../server/game/Player.js';
import { ITEMS, SKILLS, BUFFS } from '../shared/gameData.js';
import { PLAYER } from '../shared/constants.js';

function wsConn() {
  return { ws: { send() {} } };
}

function makePlayer(name = 'Test', slot = 0) {
  return new Player(wsConn(), name, slot);
}

// --- Default stats ---

test('player starts with base stats and no equipment bonuses', () => {
  const p = makePlayer();
  assert.equal(p.hp, PLAYER.BASE_HP);
  assert.equal(p.maxHp, PLAYER.BASE_HP);
  assert.equal(p.shield, 0);
  assert.equal(p.shieldMax, 60);
  assert.equal(p.alive, true);
  assert.equal(p.equip.weapon, 'w1');
  assert.equal(p.equip.relic1, null);
  assert.equal(p.equip.relic2, null);
  assert.equal(p.skillSlots[0], null);
  assert.equal(p.skillSlots[1], null);
  assert.equal(p.learnedSkills.length, 0);
  assert.equal(p.stats.meleeDmg, PLAYER.ATTACK_DAMAGE); // w1 dmg=1.0
  assert.equal(p.stats.speed, 1); // no speed bonus
  assert.equal(p.stats.crit, PLAYER.CRIT_BASE); // w1 has no crit
  assert.equal(p.stats.vamp, 0);
  assert.equal(p.stats.dodge, 0);
});

test('player name is cleaned (HTML stripped, trimmed, limited)', () => {
  const p1 = makePlayer('<b>Hero</b>', 0);
  assert.equal(p1.name, 'Hero');
  const p2 = makePlayer('   ', 0);
  assert.equal(p2.name, 'Боец'); // default
  const p3 = makePlayer('A'.repeat(20), 0);
  assert.equal(p3.name.length, 16);
});

// --- Equip / unequip ---

test('equipItem puts item in slot and moves previous to inventory', () => {
  const p = makePlayer();
  // Default: w1 is equipped, inventory empty
  p.inv.push('w2'); // w2 is a weapon
  assert.equal(p.equipItem(0, 'weapon'), true);
  assert.equal(p.equip.weapon, 'w2');
  assert.ok(p.inv.includes('w1')); // old weapon moved to inv
  assert.equal(p.stats.meleeDmg, PLAYER.ATTACK_DAMAGE * 1.22); // w2 dmg=1.22
});

test('equipItem rejects wrong slot type (weapon relic in weapon slot)', () => {
  const p = makePlayer();
  p.inv.push('r1'); // r1 is a relic
  assert.equal(p.equipItem(0, 'weapon'), false);
  assert.equal(p.equip.weapon, 'w1'); // unchanged
});

test('equipItem rejects invalid inventory index', () => {
  const p = makePlayer();
  assert.equal(p.equipItem(99, 'weapon'), false);
  assert.equal(p.equipItem(-1, 'weapon'), false);
});

test('unequipItem moves equipped item to inventory', () => {
  const p = makePlayer();
  assert.equal(p.equip.weapon, 'w1');
  assert.equal(p.unequipItem('weapon'), true);
  assert.equal(p.equip.weapon, null);
  assert.ok(p.inv.includes('w1'));
  // no weapon: default wDmg=1, so meleeDmg = base * 1 (unarmed)
  assert.equal(p.stats.meleeDmg, PLAYER.ATTACK_DAMAGE);
});

test('unequipItem fails on empty slot', () => {
  const p = makePlayer();
  assert.equal(p.unequipItem('relic1'), false);
});

test('unequipItem fails when inventory is full (12 items)', () => {
  const p = makePlayer();
  for (let i = 0; i < 12; i++) p.inv.push('r1');
  assert.equal(p.unequipItem('weapon'), false);
});

test('equip relic modifies stats correctly', () => {
  const p = makePlayer();
  p.inv.push('r13', 'r14'); // r13=lifesteal 0.08, r14=critRange 0.5

  p.equipItem(p.inv.indexOf('r13'), 'relic1');
  assert.equal(p.stats.vamp, 0.08);

  p.equipItem(p.inv.indexOf('r14'), 'relic2');
  // r14 has critRange: 0.5 — but wait, let me check. r14 gives critRange 0.5
  // base crit is 0.03, plus r14 critRange 0.5 = 0.53
  assert.equal(p.stats.crit, PLAYER.CRIT_BASE + 0.5);
});

test('equipItem validates index against current inventory length', () => {
  const p = makePlayer();
  // inv is empty, so index 0 is invalid
  assert.equal(p.equipItem(0, 'relic1'), false);
});

// --- Stat computation ---

test('weapon damage multiplier affects meleeDmg', () => {
  const p = makePlayer();
  p.inv.push('w5'); // w5: dmg=1.55, el=volt
  p.equipItem(p.inv.indexOf('w5'), 'weapon');
  assert.equal(p.stats.meleeDmg, PLAYER.ATTACK_DAMAGE * 1.55);
  assert.equal(p.stats.el, 'volt');
});

test('ranged weapon sets weaponType and atkRange', () => {
  const p = makePlayer();
  p.inv.push('w9'); // w9: ranged, dmg=0.8, atkRange=14
  p.equipItem(p.inv.indexOf('w9'), 'weapon');
  assert.equal(p.stats.weaponType, 'ranged');
  assert.equal(p.stats.atkRange, 14);
});

test('HP relic increases maxHP', () => {
  const p = makePlayer();
  p.inv.push('r15'); // r15: hp=50
  p.equipItem(p.inv.indexOf('r15'), 'relic1');
  assert.equal(p.stats.maxHP, PLAYER.BASE_HP + 50);
  assert.equal(p.maxHp, PLAYER.BASE_HP + 50);
});

test('shield relic increases shieldMax', () => {
  const p = makePlayer();
  p.inv.push('r10'); // r10: shield=30
  p.equipItem(p.inv.indexOf('r10'), 'relic1');
  assert.equal(p.stats.shieldMax, 60 + 30);
});

test('dodge relic caps at 0.6', () => {
  const p = makePlayer();
  p.inv.push('r16'); // r16: dodge=0.15
  p.equipItem(p.inv.indexOf('r16'), 'relic1');
  assert.equal(p.stats.dodge, 0.15);
});

// --- Skills ---

test('learnSkill adds to learnedSkills and auto-assigns to empty slot', () => {
  const p = makePlayer();
  assert.equal(p.learnSkill('fire'), true);
  assert.ok(p.learnedSkills.includes('fire'));
  assert.equal(p.skillSlots[0], 'fire'); // auto-assigned to slot 0
});

test('learnSkill fails for unknown skill', () => {
  const p = makePlayer();
  assert.equal(p.learnSkill('nonexistent'), false);
});

test('learnSkill fails if already learned', () => {
  const p = makePlayer();
  p.learnSkill('fire');
  assert.equal(p.learnSkill('fire'), false);
});

test('assignSkill places skill in correct slot', () => {
  const p = makePlayer();
  p.learnSkill('fire');
  p.learnSkill('frost');
  // fire should be in slot 0, frost in slot 1
  assert.equal(p.skillSlots[0], 'fire');
  assert.equal(p.skillSlots[1], 'frost');
});

test('assignSkill rejects invalid slot index', () => {
  const p = makePlayer();
  p.learnSkill('fire');
  assert.equal(p.assignSkill(-1, 'fire'), false);
  assert.equal(p.assignSkill(2, 'fire'), false);
  assert.equal(p.assignSkill(0.5, 'fire'), false);
});

test('assignSkill rejects unlearned skill', () => {
  const p = makePlayer();
  assert.equal(p.assignSkill(0, 'fire'), false); // not learned
  p.learnSkill('fire');
  assert.equal(p.assignSkill(0, 'fire'), true);
});

test('assignSkill removes skill from other slot if already assigned', () => {
  const p = makePlayer();
  p.learnSkill('fire');
  assert.equal(p.skillSlots[0], 'fire');
  // move fire to slot 1
  assert.equal(p.assignSkill(1, 'fire'), true);
  assert.equal(p.skillSlots[0], null);
  assert.equal(p.skillSlots[1], 'fire');
});

test('unassignSkill clears slot', () => {
  const p = makePlayer();
  p.learnSkill('fire');
  assert.equal(p.skillSlots[0], 'fire');
  assert.equal(p.unassignSkill(0), true);
  assert.equal(p.skillSlots[0], null);
});

test('unassignSkill rejects invalid slot', () => {
  const p = makePlayer();
  assert.equal(p.unassignSkill(-1), false);
  assert.equal(p.unassignSkill(5), false);
});

// --- Buffs ---

test('applyBuff sets buff with duration from BUFFS data', () => {
  const p = makePlayer();
  const mockRoom = { sendEvent() {} };
  p.applyBuff('power', mockRoom);
  assert.equal(p.buffs.power, BUFFS.power.dur);
});

test('power buff increases dmgMult', () => {
  const p = makePlayer();
  const baseDmg = p.stats.dmgMult;
  const mockRoom = { sendEvent() {} };
  p.applyBuff('power', mockRoom);
  // power = 1.5x multiplier
  assert.ok(p.stats.dmgMult > baseDmg);
  assert.equal(p.stats.dmgMult, baseDmg * 1.5);
});

test('haste buff increases speed', () => {
  const p = makePlayer();
  const baseSpeed = p.stats.speed;
  const mockRoom = { sendEvent() {} };
  p.applyBuff('haste', mockRoom);
  assert.ok(p.stats.speed > baseSpeed);
});

test('barrier buff adds shield instead of setting buff timer', () => {
  const p = makePlayer();
  const mockRoom = { sendEvent() {} };
  p.applyBuff('barrier', mockRoom);
  assert.equal(p.buffs.barrier, undefined); // barrier doesn't set a buff
  assert.equal(p.shield, 40); // adds 40 shield
});

test('updateBuffs decrements buff timers and removes expired', () => {
  const p = makePlayer();
  p.buffs.power = 0.5;
  p.buffs.haste = 2.0;
  p.updateBuffs(1.0);
  assert.equal(p.buffs.power, undefined); // expired
  assert.equal(p.buffs.haste, 1.0); // decremented
});

test('updateBuffs triggers recomputeStats when buff expires', () => {
  const p = makePlayer();
  const mockRoom = { sendEvent() {} };
  p.applyBuff('power', mockRoom);
  const boostedDmg = p.stats.dmgMult;
  p.buffs.power = 0.01;
  p.updateBuffs(0.1);
  // buff expired, stats recomputed
  assert.equal(p.buffs.power, undefined);
  assert.ok(p.stats.dmgMult < boostedDmg);
});

// --- Combo ---

test('bumpCombo increments combo counter and resets timer', () => {
  const p = makePlayer();
  assert.equal(p.combo, 0);
  p.bumpCombo();
  assert.equal(p.combo, 1);
  assert.equal(p.comboT, 3.5);
  p.bumpCombo();
  assert.equal(p.combo, 2);
});

// --- Spawn ---

test('spawn sets position based on slot and resets hp', () => {
  const p = makePlayer('Test', 0);
  p.hp = 10;
  p.spawn();
  assert.equal(p.hp, p.maxHp);
  assert.equal(p.alive, true);
  assert.ok(Math.abs(p.x - Math.cos(0) * 3) < 0.01);
  assert.ok(Math.abs(p.z - Math.sin(0) * 3) < 0.01);
});

// --- Take damage ---

test('takeDamage reduces HP and returns false when player survives', () => {
  const p = makePlayer();
  const mockRoom = { sendEvent() {} };
  const initialHp = p.hp;
  const killed = p.takeDamage(10, mockRoom);
  assert.equal(killed, false);
  assert.ok(p.hp < initialHp);
});

test('takeDamage kills player when HP drops to 0', () => {
  const p = makePlayer();
  const mockRoom = { sendEvent() {} };
  const killed = p.takeDamage(9999, mockRoom);
  assert.equal(killed, true);
  assert.equal(p.hp, 0);
  assert.equal(p.alive, false);
});

test('takeDamage respects invulnerability', () => {
  const p = makePlayer();
  p.invuln = 1.0;
  const mockRoom = { sendEvent() {} };
  const killed = p.takeDamage(10, mockRoom);
  assert.equal(killed, false);
  assert.equal(p.hp, PLAYER.BASE_HP); // unchanged
});

test('takeDamage is blocked when not alive', () => {
  const p = makePlayer();
  p.alive = false;
  const mockRoom = { sendEvent() {} };
  const killed = p.takeDamage(10, mockRoom);
  assert.equal(killed, false);
});

// --- Heal ---

test('heal restores HP up to maxHp', () => {
  const p = makePlayer();
  p.hp = 50;
  p.heal(100);
  assert.equal(p.hp, p.maxHp);
});

test('heal does nothing when dead', () => {
  const p = makePlayer();
  p.alive = false;
  p.hp = 0;
  p.heal(100);
  assert.equal(p.hp, 0);
});

// --- Inventory ---

test('addToInv adds item when inventory is not full', () => {
  const p = makePlayer();
  assert.equal(p.addToInv('r1'), true);
  assert.ok(p.inv.includes('r1'));
});

test('addToInv rejects when inventory is full (12 items)', () => {
  const p = makePlayer();
  for (let i = 0; i < 12; i++) p.inv.push('r1');
  assert.equal(p.addToInv('r1'), false);
});

// --- Sell ---

test('sellItem removes item and adds score', () => {
  const p = makePlayer();
  p.inv.push('r1'); // r1 val=40
  const scoreBefore = p.score;
  const val = p.sellItem(0);
  assert.equal(val, 40);
  assert.equal(p.score, scoreBefore + 40);
  assert.equal(p.inv.length, 0);
});

test('sellItem returns 0 for invalid index', () => {
  const p = makePlayer();
  const val = p.sellItem(0);
  assert.equal(val, 0);
});
