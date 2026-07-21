import { NetClient } from './net/NetClient.js';
import { Lobby } from './ui/Lobby.js';
import { Game } from './game/Game.js';
import { AudioSys, sfx } from './audio/AudioSys.js';
import { S, ROOM_STATE, PROTOCOL_VERSION } from '../../shared/protocol.js';

// ============================================================================
// MAIN — точка входа клиента: связывает сеть, лобби и игру, определяет режим
// управления, запускает цикл.
// ============================================================================

const canvas = document.getElementById('game-canvas');

// --- определение режима управления (авто по типу устройства) ---
const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
const mode = isTouch ? 'touch' : 'pc';

// --- аудио ---
const audio = new AudioSys();
sfx.bind(audio);
const unlockAudio = () => { audio.init(); audio.resume(); };
document.addEventListener('pointerdown', unlockAudio, { once: false });
document.addEventListener('keydown', unlockAudio, { once: false });

// --- сеть / лобби / игра ---
const net = new NetClient();
const lobby = new Lobby(net);
const game = new Game(canvas, net, lobby, audio);
game.input.setMode(mode);
game.applyMode();

// --- session resume: load stored token from localStorage ---
try {
  const stored = localStorage.getItem('arena_session');
  if (stored) {
    const { token } = JSON.parse(stored);
    if (token) net.sessionToken = token;
  }
} catch {}

// lobby settings button
document.getElementById('lobby-settings').addEventListener('click', () => {
  game.settingsUI.onBack = () => game._applySettings();
  game.settingsUI.open();
});

// сервер подтвердил вход в комнату
net.on(S.JOINED, (data) => {
  if (data.protocolVersion !== PROTOCOL_VERSION) {
    console.error(`Protocol mismatch: client=${PROTOCOL_VERSION} server=${data.protocolVersion}`);
    lobby.onError('Версия протокола не совпадает. Обновите клиент и сервер.');
    return;
  }
  // Store session token for reconnect
  if (data.sessionToken) {
    net.sessionToken = data.sessionToken;
    net._resuming = false;
    try { localStorage.setItem('arena_session', JSON.stringify({ token: data.sessionToken })); } catch {}
  }
  game.reset();
  lobby.onJoined(data);
  // If resuming a game in progress, skip lobby and go straight to game
  if (data.state === ROOM_STATE.PLAYING) {
    lobby.hide();
  } else {
    lobby.show();
  }
  game.audio.init(); game.audio.resume(); sfx.click();
});

// обновление лобби (состав/хост/состояние)
net.on(S.LOBBY, (data) => {
  lobby.onLobby(data);
  // если вернулись в лобби из игры (хост вышел и т.п.)
  if (data.state === ROOM_STATE.LOBBY && game.started) {
    game.reset();
    lobby.show();
  }
});

net.on(S.ERROR, (m) => {
  lobby.onError(m.msg);
  // If this error is from a failed resume attempt, clear the token
  if (net._resuming) {
    net._resuming = false;
    net.sessionToken = null;
    try { localStorage.removeItem('arena_session'); } catch {}
  }
});

// при обрыве связи во время игры — если есть session token, ждём реконнекта;
// иначе возвращаемся в лобби
net.onStatus = (s) => {
  lobby._status(s);
  if (s === 'disconnected' && game.started && !net.sessionToken) {
    game.reset();
    lobby.show();
  }
};

// --- подсказка «поверни экран» (портрет + тач) ---
function updateRotateHint() {
  const portrait = matchMedia('(orientation: portrait)').matches;
  document.getElementById('rotate-hint').classList.toggle('show', portrait && mode === 'touch' && game.started);
}
addEventListener('resize', updateRotateHint);
addEventListener('orientationchange', () => setTimeout(updateRotateHint, 120));

// автопауза рендера при скрытии вкладки не нужна — сервер авторитарен.

// --- старт ---
lobby.show();
net.connect();
