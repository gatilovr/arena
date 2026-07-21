import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomManager } from '../server/RoomManager.js';
import { ROOM_STATE } from '../shared/protocol.js';

function wsConn() {
  return { ws: { send() {} }, room: null };
}

function makeManager() {
  return new RoomManager();
}

// Helper: destroy all rooms in manager to clear setInterval timers
function destroyAll(mgr) {
  for (const [code, room] of mgr.rooms) {
    room.destroy();
  }
  mgr.destroy();
}

// --- Room creation ---

test('createRoom creates room with given code', () => {
  const mgr = makeManager();
  const room = mgr.createRoom('TEST1');
  assert.equal(room.code, 'TEST1');
  assert.equal(mgr.rooms.has('TEST1'), true);
  destroyAll(mgr);
});

test('createRoom handles code collision by generating new code', () => {
  const mgr = makeManager();
  const room1 = mgr.createRoom('COLL');
  assert.equal(room1.code, 'COLL');
  // Second createRoom with same code generates a new code (collision guard)
  const room2 = mgr.createRoom('COLL');
  assert.notEqual(room2.code, 'COLL');
  assert.equal(mgr.rooms.has(room2.code), true);
  destroyAll(mgr);
});

// --- Join ---

test('join without code creates a new room', () => {
  const mgr = makeManager();
  const conn = wsConn();
  const result = mgr.join(conn, 'Alice', '');
  assert.equal(result.error, undefined);
  assert.ok(result.room);
  assert.ok(result.player);
  assert.equal(result.player.name, 'Alice');
  assert.equal(conn.room, result.room);
  destroyAll(mgr);
});

test('join with valid code joins existing room', () => {
  const mgr = makeManager();
  mgr.createRoom('ROOM1');
  const conn = wsConn();
  const result = mgr.join(conn, 'Bob', 'ROOM1');
  assert.equal(result.error, undefined);
  assert.equal(result.room.code, 'ROOM1');
  assert.equal(result.player.name, 'Bob');
  destroyAll(mgr);
});

test('join with invalid code returns error', () => {
  const mgr = makeManager();
  const conn = wsConn();
  const result = mgr.join(conn, 'Charlie', 'NOPE');
  assert.equal(result.error, 'Комната не найдена');
  assert.equal(result.room, undefined);
  mgr.destroy();
});

test('join with empty/null code finds open room or creates new', () => {
  const mgr = makeManager();
  const conn1 = wsConn();
  const r1 = mgr.join(conn1, 'P1', null);
  const code1 = r1.room.code;

  const conn2 = wsConn();
  const r2 = mgr.join(conn2, 'P2', '');
  // should reuse the existing open room
  assert.equal(r2.room.code, code1);
  destroyAll(mgr);
});

test('join respects max 4 players per room', () => {
  const mgr = makeManager();
  mgr.createRoom('FULL');
  for (let i = 0; i < 4; i++) {
    mgr.join(wsConn(), `P${i}`, 'FULL');
  }
  const conn5 = wsConn();
  const result = mgr.join(conn5, 'P5', 'FULL');
  assert.equal(result.error, 'Комната заполнена (макс. 4)');
  destroyAll(mgr);
});

test('join to room in OVER state returns error', () => {
  const mgr = makeManager();
  const room = mgr.createRoom('OVER1');
  room.state = ROOM_STATE.OVER;
  const conn = wsConn();
  const result = mgr.join(conn, 'Late', 'OVER1');
  assert.equal(result.error, 'Игра уже завершена');
  destroyAll(mgr);
});

// --- Remove player ---

test('removePlayer removes player from room', () => {
  const mgr = makeManager();
  const conn = wsConn();
  mgr.createRoom('RM1');
  const result = mgr.join(conn, 'P1', 'RM1');
  const pid = result.player.id;
  assert.equal(result.room.players.has(pid), true);

  result.room.removePlayer(pid);
  assert.equal(result.room.players.has(pid), false);
  mgr.destroy();
});

test('removePlayer destroys room when last player leaves', () => {
  const mgr = makeManager();
  const conn = wsConn();
  mgr.createRoom('LAST');
  const result = mgr.join(conn, 'P1', 'LAST');
  const room = result.room;
  const pid = result.player.id;

  room.removePlayer(pid);
  assert.equal(mgr.rooms.has('LAST'), false);
  mgr.destroy();
});

test('removePlayer transfers host to next player', () => {
  const mgr = makeManager();
  mgr.createRoom('HOST');
  const conn1 = wsConn();
  const r1 = mgr.join(conn1, 'Host', 'HOST');
  const hostId = r1.player.id;
  assert.equal(r1.room.host, hostId);

  const conn2 = wsConn();
  const r2 = mgr.join(conn2, 'Guest', 'HOST');

  r1.room.removePlayer(hostId);
  assert.equal(r1.room.host, r2.player.id);
  destroyAll(mgr);
});

// --- findOpen ---

test('findOpen returns lobby room with fewer than 4 players', () => {
  const mgr = makeManager();
  const room = mgr.createRoom('OPEN');
  assert.equal(mgr.findOpen(), room);
  destroyAll(mgr);
});

test('findOpen returns null when no room is available', () => {
  const mgr = makeManager();
  assert.equal(mgr.findOpen(), null);
  mgr.destroy();
});

test('findOpen skips full rooms', () => {
  const mgr = makeManager();
  const room = mgr.createRoom('FULL');
  // fill with 4 players
  for (let i = 0; i < 4; i++) mgr.join(wsConn(), `P${i}`, 'FULL');
  assert.equal(mgr.findOpen(), null);
  destroyAll(mgr);
});

test('findOpen skips non-lobby rooms', () => {
  const mgr = makeManager();
  const room = mgr.createRoom('PLAYING');
  room.state = ROOM_STATE.PLAYING;
  assert.equal(mgr.findOpen(), null);
  destroyAll(mgr);
});

// --- Idle timeout ---

test('_cleanupIdle destroys idle lobby rooms', () => {
  const mgr = makeManager();
  const room = mgr.createRoom('IDLE');
  room.lastActivity = Date.now() - 10 * 60 * 1000; // 10 minutes ago
  mgr._cleanupIdle();
  assert.equal(mgr.rooms.has('IDLE'), false);
  mgr.destroy();
});

test('_cleanupIdle destroys idle OVER rooms', () => {
  const mgr = makeManager();
  const room = mgr.createRoom('IDLE2');
  room.state = ROOM_STATE.OVER;
  room.lastActivity = Date.now() - 10 * 60 * 1000;
  mgr._cleanupIdle();
  assert.equal(mgr.rooms.has('IDLE2'), false);
  mgr.destroy();
});

test('_cleanupIdle does not destroy active PLAYING rooms', () => {
  const mgr = makeManager();
  const room = mgr.createRoom('ACTIVE');
  room.state = ROOM_STATE.PLAYING;
  room.lastActivity = Date.now() - 10 * 60 * 1000;
  mgr._cleanupIdle();
  assert.equal(mgr.rooms.has('ACTIVE'), true);
  destroyAll(mgr);
});

test('_cleanupIdle does not destroy recent lobby rooms', () => {
  const mgr = makeManager();
  mgr.createRoom('FRESH');
  mgr._cleanupIdle();
  assert.equal(mgr.rooms.has('FRESH'), true);
  destroyAll(mgr);
});

// --- Stats ---

test('stats() returns room and player counts', () => {
  const mgr = makeManager();
  assert.deepEqual(mgr.stats(), { rooms: 0, players: 0 });

  mgr.join(wsConn(), 'P1', '');
  mgr.join(wsConn(), 'P2', '');
  assert.deepEqual(mgr.stats(), { rooms: 1, players: 2 });
  destroyAll(mgr);
});

// --- Tick duration tracking ---

test('recordTickDuration and avgTickDuration', () => {
  const mgr = makeManager();
  assert.equal(mgr.avgTickDuration(), 0);

  mgr.recordTickDuration(10);
  mgr.recordTickDuration(20);
  assert.equal(mgr.avgTickDuration(), 15);

  // shift old values when exceeding max (100)
  for (let i = 0; i < 101; i++) mgr.recordTickDuration(i);
  assert.ok(mgr.avgTickDuration() >= 0);
  mgr.destroy();
});

// --- delete ---

test('delete removes room from manager', () => {
  const mgr = makeManager();
  const room = mgr.createRoom('DEL');
  assert.equal(mgr.rooms.has('DEL'), true);
  room.destroy();
  assert.equal(mgr.rooms.has('DEL'), false);
  mgr.destroy();
});

// --- code format ---

test('room codes are uppercase alphanumeric (5 chars)', () => {
  const mgr = makeManager();
  const conn = wsConn();
  const result = mgr.join(conn, 'P1', '');
  const code = result.room.code;
  assert.equal(code.length, 5);
  assert.ok(/^[A-Z0-9]+$/.test(code));
  destroyAll(mgr);
});
