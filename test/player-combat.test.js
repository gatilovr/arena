import test from 'node:test';
import assert from 'node:assert/strict';
import { Player } from '../server/game/Player.js';
import { Enemy } from '../server/game/Enemy.js';
import { CombatSystem } from '../server/systems/CombatSystem.js';

function wsConn() {
  return { ws: { send() {} } };
}

test('player stats include item bonuses and reject unlearned skills', () => {
  const p = new Player(wsConn(), '<b>Tester</b>', 0);
  p.inv.push('r13', 'r14', 'r16', 'r17');

  assert.equal(p.equipItem(0, 'relic1'), true);
  assert.equal(p.stats.vamp, 0.08);
  assert.equal(p.equipItem(0, 'relic2'), true);
  assert.equal(p.stats.crit, 0.53);

  assert.equal(p.unequipItem('relic1'), true);
  assert.equal(p.equipItem(p.inv.indexOf('r16'), 'relic1'), true);
  assert.equal(p.stats.dodge, 0.15);

  assert.equal(p.assignSkill(0, 'fire'), false);
  assert.equal(p.learnSkill('fire'), true);
  assert.equal(p.assignSkill(0, 'fire'), true);
  assert.equal(p.assignSkill(0.5, 'fire'), false);

  assert.equal(p.unequipItem('relic2'), true);
  assert.equal(p.equipItem(p.inv.indexOf('r17'), 'relic2'), true);
  assert.equal(p.stats.dmgMult, 1.15);
});

test('ranged player projectiles damage enemies instead of allies', () => {
  const attacker = new Player(wsConn(), 'Archer', 0);
  attacker.equip.weapon = 'w9';
  attacker.recomputeStats();
  attacker.x = 0;
  attacker.z = 0;
  attacker.yaw = 0;

  const ally = new Player(wsConn(), 'Ally', 1);
  ally.x = 0;
  ally.z = -4;

  const enemy = new Enemy('normal', 0, -4, 1, false);
  enemy.spawnT = 0;
  const initialEnemyHp = enemy.hp;
  const initialAllyHp = ally.hp;

  const room = {
    enemies: [enemy],
    bullets: [],
    players: new Map([[attacker.id, attacker], [ally.id, ally]]),
    playersArr() { return [attacker, ally]; },
    sendEvent() {},
    loot: { rollDrop() {} },
  };
  room.combat = new CombatSystem(room);

  room.combat.rangedAttack(attacker);
  assert.equal(room.bullets.length, 1);
  assert.equal(room.bullets[0].side, 'player');
  assert.equal(room.bullets[0].c, 0xff3300);

  room.combat.updateBullets(0.1);

  assert.ok(enemy.hp < initialEnemyHp, 'enemy should take projectile damage');
  assert.equal(ally.hp, initialAllyHp, 'ally should not take player projectile damage');
  assert.equal(room.bullets.length, 0, 'projectile should be removed after impact');
});
