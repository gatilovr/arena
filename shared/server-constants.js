// ============================================================================
// SERVER-ONLY CONSTANTS — значения, которые использует только сервер
// (управление комнатами, враги, волны, боссы).
// ============================================================================

export const MAX_PLAYERS = 4;

// Типы врагов. hp/dmg масштабируются сервером от волны.
export const ENEMY_TYPES = {
  normal:     { hp: 52,  sp: 3.4, dmg: 10, size: 1.0,  r: 0.7,  xp: 12, sc: 60,  col: 0x9c2626 },
  runner:     { hp: 30,  sp: 6.2, dmg: 7,  size: 0.78, r: 0.55, xp: 10, sc: 70,  col: 0x1fae4e },
  tank:       { hp: 150, sp: 2.4, dmg: 18, size: 1.35, r: 1.0,  xp: 30, sc: 140, col: 0x6d3fb8 },
  shooter:    { hp: 44,  sp: 3.4, dmg: 11, size: 0.92, r: 0.6,  xp: 16, sc: 110, col: 0x2f7fd6 },
  exploder:   { hp: 36,  sp: 4.6, dmg: 24, size: 0.85, r: 0.6,  xp: 14, sc: 120, col: 0xd67f1f },
  assassin:   { hp: 38,  sp: 7.0, dmg: 14, size: 0.82, r: 0.55, xp: 18, sc: 130, col: 0x1a1a2e },
  berserker:  { hp: 80,  sp: 4.0, dmg: 22, size: 1.1,  r: 0.85, xp: 22, sc: 150, col: 0x8b0000 },
  summoner:   { hp: 40,  sp: 2.8, dmg: 8,  size: 0.95, r: 0.65, xp: 20, sc: 140, col: 0x4a0080 },
  shielder:   { hp: 200, sp: 2.0, dmg: 12, size: 1.2,  r: 0.9,  xp: 28, sc: 160, col: 0x2f5080 },
  sprinter:   { hp: 25,  sp: 9.0, dmg: 6,  size: 0.7,  r: 0.45, xp: 8,  sc: 40,  col: 0x00cc44 },
  phantom:    { hp: 45,  sp: 3.5, dmg: 16, size: 0.88, r: 0.6,  xp: 16, sc: 120, col: 0x6633aa },
  golem:      { hp: 300, sp: 1.5, dmg: 30, size: 1.5,  r: 1.2,  xp: 40, sc: 200, col: 0x555555 },
  firestarter:{ hp: 35,  sp: 4.5, dmg: 18, size: 0.85, r: 0.6,  xp: 15, sc: 110, col: 0xff4400 },
  frost_mage: { hp: 42,  sp: 3.0, dmg: 14, size: 0.9,  r: 0.65, xp: 17, sc: 125, col: 0x4488ff },
  cursed:     { hp: 50,  sp: 3.8, dmg: 20, size: 0.92, r: 0.65, xp: 19, sc: 135, col: 0x8844aa }
};

// ============================================================================
// БОССЫ — увеличенное HP для эпичных боёв 60-180 секунд при 1-4 игроках.
// ============================================================================
export const BOSS = {
  butcher:    { hp: 1900, sp: 3.0, dmg: 12, size: 1.4,  r: 1.5,  xp: 420, sc: 1200 },
  necro:      { hp: 3200, sp: 3.2, dmg: 20, size: 1.3,  r: 1.1,  xp: 460, sc: 1200 },
  golemKing:  { hp: 5500, sp: 2.2, dmg: 32, size: 1.9,  r: 1.8,  xp: 620, sc: 1800 },
  firelord:   { hp: 4200, sp: 3.4, dmg: 26, size: 1.45, r: 1.3,  xp: 540, sc: 1500 },
  shadowKing: { hp: 3600, sp: 4.2, dmg: 24, size: 1.35, r: 1.2,  xp: 560, sc: 1600 },
  frostQueen: { hp: 4000, sp: 3.2, dmg: 22, size: 1.4,  r: 1.25, xp: 540, sc: 1500 },
  dragonLord: { hp: 6500, sp: 3.0, dmg: 36, size: 2.1,  r: 2.0,  xp: 800, sc: 2400 }
};

// Пороги фаз боссов (доля HP) — 4 фазы для глубокого боя
export const BOSS_PHASES = {
  p2: 0.70,   // фаза 2 при 70% HP
  p3: 0.40,   // фаза 3 при 40% HP
  p4: 0.15    // фаза 4 (BERSERK) при 15% HP
};

// Мягкий энрейдж — нарастающее давление со временем
export const BOSS_ENRAGE = {
  START_TIME: 90,     // через 90с начинается нарастание
  RAMP_PER_SEC: 0.004, // +0.4% урона/скорости в секунду
  MAX_MULT: 1.6       // максимум +60%
};

export const WAVE = {
  BASE_COUNT: 10,
  PER_WAVE: 2,
  MAX_COUNT: 48,
  BOSS_EVERY: 3,
  REST_TIME: 3.4
};
