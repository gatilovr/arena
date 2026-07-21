import { Room } from './Room.js';
import { genRoomCode, ROOM_STATE } from '../shared/protocol.js';

// --- Room logging ---
function logTime() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}
function roomLog(msg) { console.log(`[${logTime()}] ${msg}`); }

// ============================================================================
// МЕНЕДЖЕР КОМНАТ — создание/поиск комнат по коду, очистка пустых.
// ============================================================================
export class RoomManager {
  constructor() {
    this.rooms = new Map(); // code → Room
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
    roomLog(`Room created: ${code}`);
    return room;
  }

  findOpen() {
    for (const room of this.rooms.values()) {
      if (room.state === ROOM_STATE.LOBBY && room.players.size < 4) return room;
    }
    return null;
  }

  delete(code) {
    roomLog(`Room destroyed: ${code}`);
    this.rooms.delete(code);
  }

  stats() {
    return { rooms: this.rooms.size, players: [...this.rooms.values()].reduce((a, r) => a + r.players.size, 0) };
  }
}
