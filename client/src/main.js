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
  game.reset();
  lobby.onJoined(data);
  lobby.show();
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

net.on(S.ERROR, (m) => lobby.onError(m.msg));

// при обрыве связи во время игры — возвращаемся в лобби
net.onStatus = (s) => {
  lobby._status(s);
  if (s === 'disconnected' && game.started) {
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
