import { Room } from './Room.js';
import { genRoomCode, ROOM_STATE } from '../shared/protocol.js';
import { createLogger } from '../shared/logger.js';

const log = createLogger('rooms');

// ============================================================================
// МЕНЕДЖЕР КОМНАТ — создание/поиск комнат по коду, очистка пустых.
// ============================================================================
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 30 * 1000; // 30 seconds

export class RoomManager {
  constructor() {
    this.rooms = new Map(); // code → Room
    this._cleanupTimer = setInterval(() => this._cleanupIdle(), CLEANUP_INTERVAL_MS);
    this._tickDurations = [];
    this._tickDurationsMax = 100;
  }

  // name — имя игрока, roomCode — код (пусто = создать новую)
  join(conn, name, roomCode) {
    let code = (roomCode || '').trim().toUpperCase();
    let room;

    if (code) {
      room = this.rooms.get(code);
      if (!room) {
        return { error: 'Комната не найдена' };
      }
    } else {
      // быстрый подбор: ищем комнату в лобби со свободным местом, иначе новая
      room = this.findOpen() || this.createRoom(genRoomCode());
    }

    if (room.players.size >= 4) return { error: 'Комната заполнена (макс. 4)' };
    if (room.state === ROOM_STATE.OVER) return { error: 'Игра уже завершена' };

    const player = room.addPlayer(conn, name);
    if (!player) return { error: 'Комната заполнена (макс. 4)' };
    conn.room = room;
    return { room, player };
  }

  createRoom(code) {
    // защита от коллизии кода
    while (this.rooms.has(code)) code = genRoomCode();
    const room = new Room(code, this);
    this.rooms.set(code, room);
    log.info(`Room created: ${code}`);
    return room;
  }

  findOpen() {
    for (const room of this.rooms.values()) {
      if (room.state === ROOM_STATE.LOBBY && room.players.size < 4) return room;
    }
    return null;
  }

  delete(code) {
    log.info(`Room destroyed: ${code}`);
    this.rooms.delete(code);
  }

  _cleanupIdle() {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if ((room.state === ROOM_STATE.LOBBY || room.state === ROOM_STATE.OVER) &&
          now - room.lastActivity > IDLE_TIMEOUT_MS) {
        log.info(`Room idle timeout: ${code} (state=${room.state})`);
        room.destroy();
      }
    }
  }

  destroy() {
    clearInterval(this._cleanupTimer);
  }

  recordTickDuration(ms) {
    this._tickDurations.push(ms);
    if (this._tickDurations.length > this._tickDurationsMax) {
      this._tickDurations.shift();
    }
  }

  avgTickDuration() {
    const d = this._tickDurations;
    if (!d.length) return 0;
    let sum = 0;
    for (let i = 0; i < d.length; i++) sum += d[i];
    return +(sum / d.length).toFixed(2);
  }

  stats() {
    return { rooms: this.rooms.size, players: [...this.rooms.values()].reduce((a, r) => a + r.players.size, 0) };
  }
}
