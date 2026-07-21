import { C } from '../../../shared/protocol.js';

// ============================================================================
// LOBBY — экран создания/подключения: имя, код комнаты, список игроков, старт.
// ============================================================================
export class Lobby {
  constructor(net) {
    this.net = net;
    this.myId = null;
    this.host = null;
    this.state = 'lobby';

    this._wire();
    net.onStatus = (s) => this._status(s);
  }

  _wire() {
    const name = () => {
      const v = document.getElementById('inp-name').value.trim();
      return v || 'Боец';
    };
    document.getElementById('btn-create').addEventListener('click', () => {
      this.net.send({ t: C.JOIN, name: name(), room: '' });
    });
    document.getElementById('btn-join').addEventListener('click', () => {
      const code = document.getElementById('inp-room').value.trim().toUpperCase();
      this.net.send({ t: C.JOIN, name: name(), room: code });
    });
    document.getElementById('inp-room').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-join').click();
    });
    document.getElementById('btn-start').addEventListener('click', () => {
      this.net.send({ t: C.START });
    });
    document.getElementById('btn-leave').addEventListener('click', () => {
      this.net.send({ t: C.LEAVE });
      this.showConnect();
    });
  }

  _status(s) {
    const line = document.getElementById('status-line');
    const map = {
      connecting: 'Подключение к серверу…',
      connected: '✅ Сервер подключён. Создай игру или введи код.',
      disconnected: '❌ Нет связи с сервером…',
      reconnecting: '🔄 Переподключение…'
    };
    if (line) line.textContent = map[s] || s;
  }

  show() { document.getElementById('lobby').classList.remove('hidden'); }
  hide() { document.getElementById('lobby').classList.add('hidden'); }
  showConnect() {
    document.getElementById('lobby-connect').classList.remove('hidden');
    document.getElementById('lobby-room').classList.add('hidden');
  }

  // сервер подтвердил вход в комнату
  onJoined(data) {
    this.myId = data.id;
    this.host = data.host;
    this.state = data.state;
    document.getElementById('room-code').textContent = data.room;
    document.getElementById('lobby-connect').classList.add('hidden');
    document.getElementById('lobby-room').classList.remove('hidden');
    this._renderPlayers(data.players);
  }

  onLobby(data) {
    this.host = data.host;
    this.state = data.state;
    this._renderPlayers(data.players);
  }

  _renderPlayers(players) {
    const list = document.getElementById('player-list');
    list.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const p = players.find(x => x.slot === i);
      const row = document.createElement('div');
      row.className = 'pl-row';
      if (p) {
        const isHost = p.id === this.host;
        const isMe = p.id === this.myId;
        row.innerHTML = `
          <span class="pl-dot" style="background:#${p.color.toString(16).padStart(6, '0')};color:#${p.color.toString(16).padStart(6, '0')}"></span>
          <span class="pl-name">${this._esc(p.name)}${isMe ? ' (ты)' : ''}</span>
          ${isHost ? '<span class="pl-host">ХОСТ</span>' : ''}`;
      } else {
        row.innerHTML = `<span class="pl-dot" style="background:#2a2f45"></span><span class="pl-name pl-empty">свободное место…</span>`;
      }
      list.appendChild(row);
    }
    const isHost = this.myId === this.host;
    document.getElementById('btn-start').classList.toggle('hidden', !isHost);
    document.getElementById('wait-line').textContent = isHost
      ? (players.length > 0 ? 'Нажми «НАЧАТЬ БОЙ», когда все будут готовы.' : '')
      : 'Ждём, пока хост начнёт бой…';
  }

  _esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  onError(msg) {
    const line = document.getElementById('status-line');
    if (line) { line.textContent = '⚠ ' + msg; line.style.color = '#ff8b95'; }
  }
}
