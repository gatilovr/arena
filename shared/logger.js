const LEVELS = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };

function parseLevel(v) {
  if (typeof v === 'number' && v in LEVELS) return v;
  const s = String(v).trim().toUpperCase();
  return s in LEVELS ? LEVELS[s] : undefined;
}

function resolveLevel() {
  const env = process.env.LOG_LEVEL;
  if (env !== undefined) {
    const lv = parseLevel(env);
    if (lv !== undefined) return lv;
  }
  const isProd = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
  return isProd ? LEVELS.INFO : LEVELS.DEBUG;
}

let globalLevel = resolveLevel();

const LEVEL_NAMES = ['ERROR', 'WARN', 'INFO', 'DEBUG'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function timestamp() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatMsg(level, msg, ctx) {
  const tag = ctx ? `[${ctx}]` : '';
  return `[${timestamp()}] ${LEVEL_NAMES[level].padEnd(5)} ${tag} ${msg}`.trim();
}

class Logger {
  constructor(context) {
    this._ctx = context || '';
  }

  _log(level, msg) {
    if (level > globalLevel) return;
    const text = formatMsg(level, msg, this._ctx);
    if (level === LEVELS.ERROR) {
      console.error(text);
    } else {
      console.log(text);
    }
  }

  error(msg) { this._log(LEVELS.ERROR, msg); }
  warn(msg)  { this._log(LEVELS.WARN, msg); }
  info(msg)  { this._log(LEVELS.INFO, msg); }
  debug(msg) { this._log(LEVELS.DEBUG, msg); }

  child(context) {
    const parent = this._ctx;
    return new Logger(parent ? `${parent}:${context}` : context);
  }

  setLevel(level) {
    const lv = parseLevel(level);
    if (lv !== undefined) globalLevel = lv;
  }
}

export function createLogger(context) {
  return new Logger(context);
}

export const logger = new Logger();

export { LEVELS, globalLevel };
