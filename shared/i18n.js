// ============================================================================
// i18n — shared localization layer for server & client.
//
// Usage:
//   import { t } from './i18n.js';    // Node (ESM) or Vite-bundled client
//   t('hud.wave', { n: 3 })           // → "ВОЛНА 3"
//
// Currently ships only a `ru` locale.  Add more by extending `locales`.
// ============================================================================

const locales = {
  ru: {
    // ── server / startup ──────────────────────────────────────────────
    server: {
      ready:       '🎮 Arena coop server работает. Клиент — через <code>npm run client</code> (dev) или соберите <code>npm run build</code>.',
      launched:    'ARENA COOP — игровой сервер запущен',
      localUrl:    'Локально:      http://localhost:${port}',
      lanUrl:      'По сети (LAN): http://${ip}:${port}   ← раздай этот адрес',
      wsUrl:       'WebSocket:     ws://<адрес>:${port}/ws',
      devHint:     'В dev клиент открывается на http://localhost:5173 (или http://<LAN-IP>:5173)',
      rateLimit:   'Слишком много сообщений',
    },

    // ── wave system ───────────────────────────────────────────────────
    wave: {
      bossApproaching: '⚠️ БОСС ПРИБЛИЖАЕТСЯ!',
    },

    // ── HUD ───────────────────────────────────────────────────────────
    hud: {
      level:       'УР ${n}',
      waveBoss:    '⚠ БОСС',
      wave:        'ВОЛНА ${n}',
      enemies:     'врагов: ${n}',
      ultReady:    'ГОТОВО!',
      ultLabel:    'УЛЬТА',
      combo:       'СЕРИЯ x${n}',
      comboDmg:    '+${n}% урона',
      bossNecro:   'НЕКРОМАНТ',
      bossButcher: 'МЯСНИК',
      seconds:     'с',                       // buff duration suffix
    },

    // ── lobby ─────────────────────────────────────────────────────────
    lobby: {
      defaultName:      'Боец',
      connecting:       'Подключение к серверу…',
      connected:        '✅ Сервер подключён. Создай игру или введи код.',
      disconnected:     '❌ Нет связи с сервером…',
      reconnecting:     '🔄 Переподключение…',
      you:              ' (ты)',
      host:             'ХОСТ',
      emptySlot:        'свободное место…',
      hostWaitReady:    'Нажми «НАЧАТЬ БОЙ», когда все будут готовы.',
      hostWaitEmpty:    '',
      guestWait:        'Ждём, пока хост начнёт бой…',
      roomCode:         'КОД КОМНАТЫ: ${code}',
      shareHint:        'Передай код друзьям — пусть введут его во «ВОЙТИ».',
    },

    // ── HTML / UI labels ──────────────────────────────────────────────
    ui: {
      // meta
      title:            'ARENA — кооп слэшер',
      brand:            'КООПЕРАТИВ 1–4 ИГРОКА · БРАУЗЕР',
      subtitle:         'Выживай в орде вместе с друзьями. Локально по Wi-Fi или онлайн.',

      // lobby form
      nameLabel:        'Твоё имя',
      namePlaceholder:  'Боец',
      createGame:       '▶ СОЗДАТЬ ИГРУ',
      codePlaceholder:  'КОД',
      join:             'ВОЙТИ',
      startBattle:      '⚔️ НАЧАТЬ БОЙ',
      leave:            '← ПОКИНУТЬ',

      // HUD
      pause:            'Пауза',
      respawn:          'ВОЗРОЖДЕНИЕ…',

      // touch / aria
      ariaDash:         'Рывок',
      ariaJump:         'Прыжок',
      ariaAttack:       'Атака',
      ariaInventory:    'Инвентарь',
      ariaGrimoire:     'Гримуар',
      ariaUlt:          'Ульта',
      ariaSkill1:       'Скилл 1',
      ariaSkill2:       'Скилл 2',

      // PC hints
      pcHints:          'WASD бег · ЛКМ атака · ПКМ камера · SPACE прыжок · SHIFT рывок',
      pcHints2:         '1/2 скилы · F ульта · I инвентарь · K гримуар · ESC пауза',

      // upgrade screen
      levelUp:          'УРОВЕНЬ ${n}!',
      chooseUpgrade:    'ВЫБЕРИ УЛУЧШЕНИЕ',

      // inventory
      inventory:        '🎒 ИНВЕНТАРЬ',
      invHint:          'ТАП — ВЫБРАТЬ · ПЕРЕТАЩИ НА СЛОТ ЧТОБЫ НАДЕТЬ · ИГРА НА ПАУЗЕ',
      weapon:           'ОРУЖИЕ',
      relic1:           'РЕЛИКВИЯ I',
      relic2:           'РЕЛИКВИЯ II',
      trashZone:        '🗑 СЮДА — ПРОДАТЬ ЛИШНЕЕ',

      // grimoire
      grimoire:         '📖 ГРИМУАР',
      grimoireHint:     'ТАП — ИНФО · ПЕРЕТАЩИ НА СЛОТ — НАЗНАЧИТЬ · 2 СКИЛА ИЗ СЕТА = АУРА',
      panel:            'ПАНЕЛЬ',

      // game over
      gameOver:         'GAME OVER',
      defeat:           'ПОРАЖЕНИЕ',
      statWave:         'ВОЛНА',
      statKills:        'УБИЙСТВ',
      statScore:        'ОЧКОВ',
      statTime:         'ВРЕМЯ',
      players:          'ИГРОКИ',
      toLobby:          'В ЛОББИ',

      // settings
      settings:         '⚙ НАСТРОЙКИ',
      settingsHint:     'НАСТРОЙ ПОД СЕБЯ · СОХРАНЯЕТСЯ АВТОМАТИЧЕСКИ',
      camSensitivity:   'ЧУВСТВИТЕЛЬНОСТЬ КАМЕРЫ',
      sound:            'ЗВУК',
      quality:          'КАЧЕСТВО',
      qualityHigh:      'ВЫСОКОЕ',
      resetSettings:    'СБРОСИТЬ НАСТРОЙКИ',
      back:             '← НАЗАД',

      // pause
      pauseTitle:       '⏸ ПАУЗА',
      pauseSub:         'ИГРА ПРОДОЛЖАЕТСЯ ДЛЯ ДРУГИХ ИГРОКОВ',
      resume:           '▶ ПРОДОЛЖИТЬ',
      leaveGame:        '← ПОКИНУТЬ ИГРУ',

      // misc
      rotateScreen:     'ПОВЕРНИ ЭКРАН ГОРИЗОНТАЛЬНО',
    },
  },
};

let current = locales.ru;

/**
 * Set the active locale.
 * @param {'ru'} lang
 */
export function setLocale(lang) {
  if (!locales[lang]) throw new Error(`Unknown locale: ${lang}`);
  current = locales[lang];
}

/**
 * Get the active locale object.
 * @returns {object}
 */
export function getLocale() {
  return current;
}

/**
 * Translate a dot-separated key, interpolating ${...} placeholders.
 *
 *   t('hud.wave', { n: 3 })  →  "ВОЛНА 3"
 *   t('ui.title')            →  "ARENA — кооп слэшер"
 *
 * Returns the key itself if not found (fail-open for safety).
 *
 * @param {string}   key   dot-separated path, e.g. 'hud.wave'
 * @param {object}   [vars] interpolation variables
 * @returns {string}
 */
export function t(key, vars) {
  const parts = key.split('.');
  let node = current;
  for (const p of parts) {
    if (node == null || typeof node !== 'object') return key;
    node = node[p];
  }
  if (typeof node !== 'string') return key;
  if (!vars) return node;
  return node.replace(/\$\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : '${' + k + '}'));
}
