import { ITEMS, SKILLS, BUFFS, RARITY, SETS } from '../../shared/gameData.js';

// ============================================================================
// СИСТЕМА ЛУТА — дропы с врагов: предметы, бафы, страницы гримуара.
// Сервер авторитарно определяет что и когда дропается, клиент лишь рендерит.
// ============================================================================

const PICKUP_RADIUS = 1.5;
const DROP_LIFE = 22;
const BUFF_LIFE = 14;
const TOME_LIFE = 16;

export class LootSystem {
  constructor(room) {
    this.room = room;
    this.drops = [];       // предметы на земле { id, defId, x, z, life }
    this.buffDrops = [];   // бафы на земле { id, type, x, z, life }
    this.tomeDrops = [];   // страницы гримуара { id, x, z, life }
    this.nextId = 1;
  }

  reset() {
    this.drops = [];
    this.buffDrops = [];
    this.tomeDrops = [];
  }

  rollDrop(enemy) {
    const players = this.room.playersArr();
    if (!players.length) return;

    // Ближайший игрок для определения " владелеца" (для падения предметов)
    let nearest = players[0], nd = Infinity;
    for (const p of players) {
      const d = Math.hypot(p.x - enemy.x, p.z - enemy.z);
      if (d < nd) { nd = d; nearest = p; }
    }

    const luck = nearest ? nearest.stats.luck : 1;

    // Предметы (оружие/реликвии)
    if (enemy.isBoss) {
      // Босс всегда дропит предмет + баф
      this._spawnItem(enemy.x, enemy.z, true);
      this._spawnBuff(enemy.x + 1.2, enemy.z);
    } else {
      const itemChance = (0.13 + this.room.wave.wave * 0.004) * luck;
      if (Math.random() < itemChance) this._spawnItem(enemy.x, enemy.z, false);

      const buffChance = 0.11 * luck;
      if (Math.random() < buffChance) this._spawnBuff(enemy.x, enemy.z);

      const tomeChance = 0.03 * luck;
      if (Math.random() < tomeChance) this._spawnTome(enemy.x, enemy.z);
    }
  }

  _spawnItem(x, z, boss) {
    const rar = this._rollRarity(boss);
    const pool = Object.keys(ITEMS).filter(k => ITEMS[k].rar === rar);
    if (!pool.length) return;
    const defId = pool[Math.floor(Math.random() * pool.length)];

    const drop = {
      id: 'd' + (this.nextId++),
      kind: 'item',
      defId,
      x, z,
      life: DROP_LIFE,
    };
    this.drops.push(drop);
    this.room.sendEvent({ type: 'drop', ...drop });
  }

  _spawnBuff(x, z) {
    const keys = Object.keys(BUFFS);
    const type = keys[Math.floor(Math.random() * keys.length)];

    const drop = {
      id: 'bd' + (this.nextId++),
      kind: 'buff',
      buffType: type,
      x: x + (Math.random() - 0.5) * 1.2,
      z: z + (Math.random() - 0.5) * 1.2,
      life: BUFF_LIFE,
    };
    this.buffDrops.push(drop);
    this.room.sendEvent({ type: 'drop', ...drop });
  }

  _spawnTome(x, z) {
    const unlearned = Object.keys(SKILLS).filter(k => {
      // том дропнется, если ХОТЯ БЫ ОДИН игрок не знает скил
      return this.room.playersArr().some(p => !p.learnedSkills.includes(k));
    });
    if (!unlearned.length) {
      // все скилы изучены — даём очки
      this._spawnItem(x, z, false);
      return;
    }

    const drop = {
      id: 'td' + (this.nextId++),
      kind: 'tome',
      x, z,
      life: TOME_LIFE,
    };
    this.tomeDrops.push(drop);
    this.room.sendEvent({ type: 'drop', ...drop });
  }

  _rollRarity(boss) {
    const r = Math.random();
    if (boss) return r < 0.5 ? 2 : 3;
    if (r < 0.55) return 0;
    if (r < 0.85) return 1;
    if (r < 0.97) return 2;
    return 3;
  }

  update(dt) {
    const players = this.room.playersArr();

    // Предметы
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.life -= dt;
      if (d.life <= 0) { this.drops.splice(i, 1); continue; }

      for (const p of players) {
        if (!p.alive) continue;
        if (Math.hypot(d.x - p.x, d.z - p.z) < PICKUP_RADIUS) {
          const it = ITEMS[d.defId];
          if (it) {
            if (p.addToInv(d.defId)) {
              this.room.sendEvent({
                type: 'pickup', pid: p.id, dropId: d.id,
                kind: 'item', defId: d.defId,
              });
              // отправляем обновлённый инвентарь игроку
              this.room._broadcastPlayerState(p);
            } else {
              // инвентарь полон — монеты
              p.score += it.val;
              this.room.sendEvent({
                type: 'pickup', pid: p.id, dropId: d.id,
                kind: 'coin', value: it.val,
              });
            }
          }
          this.drops.splice(i, 1);
          break;
        }
      }
    }

    // Бафы
    for (let i = this.buffDrops.length - 1; i >= 0; i--) {
      const d = this.buffDrops[i];
      d.life -= dt;
      if (d.life <= 0) { this.buffDrops.splice(i, 1); continue; }

      for (const p of players) {
        if (!p.alive) continue;
        if (Math.hypot(d.x - p.x, d.z - p.z) < PICKUP_RADIUS) {
          p.applyBuff(d.buffType, this.room);
          this.room.sendEvent({
            type: 'pickup', pid: p.id, dropId: d.id,
            kind: 'buff', buffType: d.buffType,
          });
          this.buffDrops.splice(i, 1);
          break;
        }
      }
    }

    // Страницы гримуара
    for (let i = this.tomeDrops.length - 1; i >= 0; i--) {
      const d = this.tomeDrops[i];
      d.life -= dt;
      if (d.life <= 0) { this.tomeDrops.splice(i, 1); continue; }

      for (const p of players) {
        if (!p.alive) continue;
        if (Math.hypot(d.x - p.x, d.z - p.z) < PICKUP_RADIUS) {
          const unlearned = Object.keys(SKILLS).filter(k => !p.learnedSkills.includes(k));
          if (unlearned.length) {
            const skillId = unlearned[Math.floor(Math.random() * unlearned.length)];
            p.learnSkill(skillId);
            this.room.sendEvent({
              type: 'pickup', pid: p.id, dropId: d.id,
              kind: 'tome', skillId,
            });
            // отправляем обновлённый набор скилов игроку
            this.room._broadcastPlayerState(p);
          } else {
            p.score += 500;
            this.room.sendEvent({
              type: 'pickup', pid: p.id, dropId: d.id,
              kind: 'coin', value: 500,
            });
          }
          this.tomeDrops.splice(i, 1);
          break;
        }
      }
    }
  }

  snap() {
    return [
      ...this.drops.map(d => ({ id: d.id, k: 'item', di: d.defId, x: +d.x.toFixed(2), z: +d.z.toFixed(2) })),
      ...this.buffDrops.map(d => ({ id: d.id, k: 'buff', bt: d.buffType, x: +d.x.toFixed(2), z: +d.z.toFixed(2) })),
      ...this.tomeDrops.map(d => ({ id: d.id, k: 'tome', x: +d.x.toFixed(2), z: +d.z.toFixed(2) })),
    ];
  }
}
