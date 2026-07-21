// ============================================================================
// СЕТЕВОЙ ПРОТОКОЛ — типы сообщений клиент ↔ сервер.
// ============================================================================

export const PROTOCOL_VERSION = 1;

// --- Клиент → Сервер ---
export const C = {
  JOIN:    'join',     // { name, room } — создать/войти в комнату
  LEAVE:   'leave',    // покинуть комнату
  START:   'start',    // хост запускает игру
  INPUT:   'input',    // { seq, dt, mx, mz, yaw, pitch, jump, dash, atk, sk0, sk1, ult }
  EQUIP:   'equip',    // { slot, invIdx } — надеть предмет из инвентаря на слот
  UNEQUIP: 'unequip',  // { slot } — снять предмет со слота в инвентарь
  SELL:    'sell',      // { invIdx } — продать предмет из инвентаря
  ASSIGN:  'assign',   // { slot, skillId } — назначить скил на панель (0 или 1)
  UNASSIGN:'unassign', // { slot } — снять скил с панели
  REVIVE:  'revive',   // запрос возрождения (кооп)
  UPGRADE: 'upgrade',  // { choice: upgradeId } — выбор улучшения при левел-апе
  PING:    'ping'      // { t } — для замера пинга
};

// --- Сервер → Клиент ---
export const S = {
  WELCOME:  'welcome',  // { id } — присвоенный id
  JOINED:   'joined',   // { room, players, host, state }
  LOBBY:    'lobby',    // { players, host, state } — обновление лобби
  ERROR:    'error',    // { msg }
  START:    'start',    // игра начинается
  SNAP:     'snap',     // { tick, time, players, enemies, bullets, drops, wave, ... } — 20 Гц
  EVENT:    'event',    // игровые события (см. EV)
  STATE:    'state',    // полный снапшот для позднего входа (инвентарь, скилы)
  GAMEOVER: 'gameover', // { stats }
  PONG:     'pong'      // { t }
};

// --- Типы событий (поле ev.type) ---
export const EV = {
  HIT:       'hit',       // { eid, dmg, crit, x,y,z, by }
  KILL:      'kill',      // { eid, by, type, boss, x, z, combo }
  DAMAGE:    'dmg',        // { pid, amount }
  FLOAT:     'float',     // { x,y,z, text, color, size }
  WAVE:      'wave',      // { num, boss, bossType }
  LEVELUP:   'lvl',        // { pid, level }
  DROP:      'drop',      // { id, kind, defId, x, z }
  PICKUP:    'pickup',     // { pid, dropId, kind, defId }
  BUFF:      'buff',       // { pid, type, dur }
  SKILL:     'skill',      // { pid, skillId, x, z, yaw } — каст скила (для визуала)
  SKILLFX:   'skillfx',    // { kind, x, y, z, x2, z2, color, ... } — эффект скила
  ANNOUNCE:  'ann',        // { text, color }
  RESPAWN:   'respawn',    // { pid }
  DEATH:     'death',      // { pid }
  EQUIP:     'equip',      // { pid, slot, defId } — показать смену экипировки
  INVENTORY: 'inv',        // { pid, inv, equip } — полный инвентарь (при входе/изменении)
};

// Состояния комнаты
export const ROOM_STATE = { LOBBY: 'lobby', PLAYING: 'playing', OVER: 'over' };

// Генератор коротких кодов комнат (без неоднозначных символов)
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function genRoomCode(len = 5) {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}
