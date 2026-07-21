import test from 'node:test';
import assert from 'node:assert/strict';
import { Player } from '../server/game/Player.js';
import { Enemy } from '../server/game/Enemy.js';
import { CombatSystem } from '../server/systems/CombatSystem.js';
import { PLAYER } from '../shared/constants.js';

function wsConn() {
  return { ws: { send() {} } };
}

function makeMockRoom() {
  const room = {
    enemies: [],
    bullets: [],
    players: new Map(),
    playersArr() { return [...this.players.values()]; },
    sendEvent() {},
    time: 0,
    _fbId: 0,
    loot: { rollDrop() {} },
    wave: { wave: 1 },
  };
  room.combat = new CombatSystem(room);
  return room;
}

function addPlayer(room, name, slot) {
  const p = new Player(wsConn(), name, slot);
  room.players.set(p.id, p);
  return p;
}

function addEnemy(room, type, x, z, wave = 1) {
  const e = new Enemy(type, x, z, wave, false);
  e.spawnT = 0; // skip spawn animation
  room.enemies.push(e);
  return e;
}

// --- comboMult ---

test('comboMult returns 1.0 at combo 0', () => {
  const room = makeMockRoom();
  const p = addPlayer(room, 'P1', 0);
  assert.equal(room.combat.comboMult(p), 1.0);
});

test('comboMult increases with combo (max 25)', () => {
  const room = makeMockRoom();
  const p = addPlayer(room, 'P1', 0);
  p.combo = 10;
  assert.equal(room.combat.comboMult(p), 1 + 10 * 0.04);
});

test('comboMult caps at combo 25', () => {
  const room = makeMockRoom();
  const p = addPlayer(room, 'P1', 0);
  p.combo = 50;
  assert.equal(room.combat.comboMult(p), 1 + 25 * 0.04);
});

// --- damageEnemy ---

test('damageEnemy reduces enemy HP', () => {
  const room = makeMockRoom();
  const attacker = addPlayer(room, 'P1', 0);
  const enemy = addEnemy(room, 'normal', 0, -2);
  const initialHp = enemy.hp;

  room.combat.damageEnemy(enemy, 50, attacker, false);
  assert.ok(enemy.hp < initialHp);
});

test('damageEnemy kills enemy when HP drops to 0', () => {
  const room = makeMockRoom();
  const attacker = addPlayer(room, 'P1', 0);
  const enemy = addEnemy(room, 'normal', 0, -2);

  room.combat.damageEnemy(enemy, 9999, attacker, false);
  assert.equal(enemy.dying, true);
  assert.equal(attacker.kills, 1);
});

test('damageEnemy applies vampirism healing to attacker', () => {
  const room = makeMockRoom();
  const attacker = addPlayer(room, 'P1', 0);
  attacker.equip.weapon = 'w6'; // w6: vamp=0.12
  attacker.recomputeStats();
  const enemy = addEnemy(room, 'normal', 0, -2);

  attacker.hp = 50;
  room.combat.damageEnemy(enemy, 100, attacker, false);
  // vamp = 0.12, so heal = 100 * 0.12 = 12
  assert.ok(attacker.hp > 50);
});

test('damageEnemy does not heal when vamp is 0', () => {
  const room = makeMockRoom();
  const attacker = addPlayer(room, 'P1', 0);
  const enemy = addEnemy(room, 'normal', 0, -2);

  attacker.hp = 50;
  const prevHp = attacker.hp;
  room.combat.damageEnemy(enemy, 100, attacker, false);
  assert.equal(attacker.hp, prevHp);
});

test('damageEnemy crit multiplies damage by critDmg', () => {
  const room = makeMockRoom();
  const attacker = addPlayer(room, 'P1', 0);
  attacker.stats.crit = 1.0; // guaranteed crit
  attacker.stats.critDmg = 3.0;
  const enemy = addEnemy(room, 'normal', 0, -2);

  room.combat.damageEnemy(enemy, 100, attacker, false);
  // 100 * 3.0 = 300 damage
  assert.ok(enemy.hp < enemy.maxHp - 200);
});

test('damageEnemy on kill triggers onKill', () => {
  const room = makeMockRoom();
  const attacker = addPlayer(room, 'P1', 0);
  const enemy = addEnemy(room, 'normal', 0, -2);
  enemy.hp = 10; // low HP

  room.combat.damageEnemy(enemy, 100, attacker, false);
  assert.equal(attacker.kills, 1);
  assert.equal(attacker.combo, 1);
  assert.ok(attacker.score > 0);
});

// --- attack (melee) ---

test('melee attack damages enemies in cone', () => {
  const room = makeMockRoom();
  const attacker = addPlayer(room, 'P1', 0);
  attacker.x = 0; attacker.z = 0; attacker.yaw = 0;
  // enemy is in front (negative Z is forward since yaw=0 => forward = {x: 0, z: -1})
  const enemy = addEnemy(room, 'normal', 0, -2);

  room.combat.attack(attacker);
  assert.ok(enemy.hp < enemy.maxHp);
  assert.equal(attacker.attackCd > 0, true);
});

test('melee attack does not hit enemies behind', () => {
  const room = makeMockRoom();
  const attacker = addPlayer(room, 'P1', 0);
  attacker.x = 0; attacker.z = 0; attacker.yaw = 0;
  const enemy = addEnemy(room, 'normal', 0, 2); // behind

  room.combat.attack(attacker);
  assert.equal(enemy.hp, enemy.maxHp); // unchanged
});

test('melee attack respects cooldown', () => {
  const room = makeMockRoom();
  const attacker = addPlayer(room, 'P1', 0);
  attacker.x = 0; attacker.z = 0; attacker.yaw = 0;
  addEnemy(room, 'normal', 0, -2);

  room.combat.attack(attacker);
  const cdAfter = attacker.attackCd;
  room.combat.attack(attacker); // should be blocked by cd
  assert.equal(attacker.attackCd, cdAfter);
});

test('attack does nothing when player is dead', () => {
  const room = makeMockRoom();
  const attacker = addPlayer(room, 'P1', 0);
  attacker.alive = false;
  const enemy = addEnemy(room, 'normal', 0, -2);

  room.combat.attack(attacker);
  assert.equal(enemy.hp, enemy.maxHp);
});

// --- ranged attack ---

test('ranged attack creates projectile', () => {
  const room = makeMockRoom();
  const attacker = addPlayer(room, 'P1', 0);
  attacker.equip.weapon = 'w9'; // ranged weapon
  attacker.recomputeStats();
  attacker.x = 0; attacker.z = 0; attacker.yaw = 0;
  addEnemy(room, 'normal', 0, -4);

  room.combat.attack(attacker);
  // attack() for ranged delegates to rangedAttack()
  assert.equal(room.bullets.length, 1);
  assert.equal(room.bullets[0].side, 'player');
});

test('ranged projectile damages enemy on collision', () => {
  const room = makeMockRoom();
  const attacker = addPlayer(room, 'P1', 0);
  attacker.equip.weapon = 'w9'; // ranged weapon
  attacker.recomputeStats();
  attacker.x = 0; attacker.z = 0; attacker.yaw = 0;

  const enemy = addEnemy(room, 'normal', 0, -1);
  const initialHp = enemy.hp;

  room.combat.rangedAttack(attacker);
  assert.equal(room.bullets.length, 1);

  // advance bullet in small steps (bullet speed=28, need small dt to not overshoot)
  for (let i = 0; i < 10 && room.bullets.length > 0; i++) {
    room.combat.updateBullets(0.01);
  }
  assert.ok(enemy.hp < initialHp, 'enemy took projectile damage');
  assert.equal(room.bullets.length, 0, 'bullet removed after impact');
});

test('ranged player projectile does not damage allies', () => {
  const room = makeMockRoom();
  const attacker = addPlayer(room, 'Archer', 0);
  attacker.equip.weapon = 'w9';
  attacker.recomputeStats();
  attacker.x = 0; attacker.z = 0; attacker.yaw = 0;

  const ally = addPlayer(room, 'Ally', 1);
  ally.x = 0; ally.z = -4;

  const enemy = addEnemy(room, 'normal', 0, -4);
  const initialAllyHp = ally.hp;
  const initialEnemyHp = enemy.hp;

  room.combat.rangedAttack(attacker);
  assert.equal(room.bullets[0].side, 'player');

  room.combat.updateBullets(0.1);
  assert.ok(enemy.hp < initialEnemyHp, 'enemy takes projectile damage');
  assert.equal(ally.hp, initialAllyHp, 'ally takes no player projectile damage');
});

// --- enemy bullets hitting players ---

test('enemy bullet damages player on collision', () => {
  const room = makeMockRoom();
  const p = addPlayer(room, 'P1', 0);
  p.x = 0; p.z = -2;

  // spawn enemy bullet heading toward player
  room.bullets.push({
    id: 'b_test',
    x: 0, y: 1.2, z: 0,
    vx: 0, vy: 0, vz: -13, // heading toward player at z=-2
    dmg: 15, r: 0.16, life: 4, c: 0xff0000, side: 'enemy',
  });

  const initialHp = p.hp;
  room.combat.updateBullets(0.2);
  assert.ok(p.hp < initialHp);
  assert.equal(room.bullets.length, 0, 'enemy bullet removed after impact');
});

// --- bullet lifetime ---

test('bullets are removed when life expires', () => {
  const room = makeMockRoom();
  room.bullets.push({
    id: 'b_expire',
    x: 0, y: 1, z: 0,
    vx: 0, vy: 0, vz: 0,
    dmg: 10, r: 0.16, life: 0.1, c: 0xff0000, side: 'player',
  });

  room.combat.updateBullets(0.2);
  assert.equal(room.bullets.length, 0);
});

// --- combo bump on kill ---

test('killing enemy bumps combo', () => {
  const room = makeMockRoom();
  const attacker = addPlayer(room, 'P1', 0);
  const enemy = addEnemy(room, 'normal', 0, -2);
  enemy.hp = 1;

  assert.equal(attacker.combo, 0);
  room.combat.damageEnemy(enemy, 100, attacker, false);
  assert.equal(attacker.combo, 1);
});

// --- ult ---

test('ult only fires when ultCharge >= 100', () => {
  const room = makeMockRoom();
  const p = addPlayer(room, 'P1', 0);
  const enemy = addEnemy(room, 'normal', 0, -3);
  const initialHp = enemy.hp;

  // ultCharge too low
  p.ultCharge = 50;
  room.combat.ult(p);
  assert.equal(enemy.hp, initialHp);

  // ultCharge at threshold — ult fires and kills enemy (170 dmg > 104 hp)
  p.ultCharge = 100;
  room.combat.ult(p);
  assert.ok(enemy.hp < initialHp);
  // ultCharge was reset to 0, but onKill awards 20 for a normal kill
  assert.equal(p.ultCharge, 20);
});
