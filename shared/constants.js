// ============================================================================
// ОБЩИЕ КОНСТАНТЫ — единый источник правды для сервера и клиента.
// Только значения, которые реально используются обеими сторонами.
// Сервер-специфичные → server-constants.js, клиент-специфичные → client-constants.js.
// ============================================================================

export const NET = {
  TICK_RATE: 30,
  TICK_MS: 1000 / 30,
  INPUT_RATE: 30,
  INPUT_MS: 1000 / 30
};

export const ARENA = {
  SIZE: 45,
  LIMIT: 44
};

export const PLAYER = {
  RADIUS: 0.5,
  HEIGHT: 1.15,
  CAM_HEIGHT: 0.5,
  SPEED: 8.5,
  GRAVITY: 30,
  JUMP: 11.6,
  BASE_HP: 100,
  ATTACK_RANGE: 3.8,
  ATTACK_DAMAGE: 34,
  ATTACK_COOLDOWN: 0.34,
  ATTACK_CONE: 0.34,
  DASH_SPEED: 24,
  DASH_DUR: 0.16,
  DASH_CD: 2.2,
  RESPAWN_TIME: 5,
  CRIT_BASE: 0.03,
  CRIT_DMG: 2
};

// Имена боссов для UI (клиент и сервер)
export const BOSS_NAMES = {
  rebradd:    'LORD REBRADD',
  necro:      'НЕКРОМАНТ',
  golemKing:  'КОРОЛЬ ГОЛЕМОВ',
  firelord:   'ПОВЕЛИТЕЛЬ ОГНЯ',
  shadowKing: 'КОРОЛЬ ТЕНЕЙ',
  frostQueen: 'ЛЕДЯНАЯ КОРОЛЕВА',
  dragonLord: 'ПОВЕЛИТЕЛЬ ДРАКОНОВ'
};

export { ITEMS, SKILLS } from './gameData.js';
export const RARITY_COLORS = [0xaab2bd, 0x35e0ff, 0xb44dff, 0xffc233];

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
