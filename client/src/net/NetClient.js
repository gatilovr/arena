// ============================================================================
// NETCLIENT — обёртка над WebSocket: подключение, авто-реконнект, маршрутизация
// сообщений. Клиент всегда коннектится к location.host, поэтому один и тот же
// код работает и на localhost, и по LAN, и (в будущем) через интернет.
// ============================================================================
export class NetClient {
  constructor() {
    this.ws = null;
    this.handlers = new Map();   // type → Set<cb>
    this.connected = false;
    this.shouldReconnect = true;
    this.reconnectDelay = 1000;
    this.onStatus = () => {};
    this.ping = 0;
    this._lastPingSent = 0;
    this._pingTimer = null;
  }

  connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${location.host}/ws`;
    this.onStatus('connecting');
    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.connected = true;
      this.reconnectDelay = 1000;
      this.onStatus('connected');
      this._startPing();
    };

    this.ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }
      // Ping/pong handling: server may echo timestamp in `t` field (overwriting type)
      // or send as `{ t: 'pong' }`. Detect pong by type string OR numeric timestamp.
      if (m.t === 'pong' || (typeof m.t === 'number' && this._lastPingSent)) {
        this.ping = Date.now() - this._lastPingSent;
        return;
      }
      const set = this.handlers.get(m.t);
      if (set) for (const cb of set) cb(m);
    };

    this.ws.onclose = () => {
      this.connected = false;
      this._stopPing();
      this.onStatus('disconnected');
      this.scheduleReconnect();
    };

    this.ws.onerror = () => { try { this.ws.close(); } catch {} };
  }

  scheduleReconnect() {
    if (!this.shouldReconnect) return;
    this.onStatus('reconnecting');
    setTimeout(() => this.connect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 5000);
  }

  on(type, cb) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(cb);
  }

  send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  _startPing() {
    this._stopPing();
    this._pingTimer = setInterval(() => {
      this._lastPingSent = Date.now();
      this.send({ t: 'ping', t0: this._lastPingSent });
    }, 3000);
  }

  _stopPing() {
    if (this._pingTimer) { clearInterval(this._pingTimer); this._pingTimer = null; }
  }

  disconnect() {
    this.shouldReconnect = false;
    this._stopPing();
    if (this.ws) try { this.ws.close(); } catch {}
  }
}
