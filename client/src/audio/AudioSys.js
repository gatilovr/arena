// ============================================================================
// AUDIOSYS — компактный синтезатор эффектов (Web Audio, без файлов).
// ============================================================================
export class AudioSys {
  constructor() { this.ctx = null; this.master = null; this.noiseBuf = null; this.muted = false; }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) {}
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.5; }

  tone(o) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + (o.delay || 0);
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1 ?? o.f0), t + o.dur);
    g.gain.setValueAtTime(o.vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + o.dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + o.dur + 0.03);
  }
  noise(dur, vol, type, f0, f1, q) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur); f.Q.value = q || 1;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t); s.stop(t + dur + 0.03);
  }
}

export const sfx = {
  _a: null,
  bind(a) { this._a = a; },
  slash() { this._a.noise(0.14, 0.2, 'bandpass', 1100, 3400, 1.1); this._a.tone({ type: 'sine', f0: 300, f1: 90, dur: 0.1, vol: 0.1 }); },
  hit() { this._a.tone({ type: 'square', f0: 170, f1: 55, dur: 0.11, vol: 0.18 }); this._a.noise(0.08, 0.14, 'lowpass', 900, 200); },
  crit() { this._a.tone({ type: 'sawtooth', f0: 540, f1: 120, dur: 0.16, vol: 0.16 }); },
  kill() { this._a.tone({ type: 'sawtooth', f0: 230, f1: 50, dur: 0.26, vol: 0.2 }); this._a.noise(0.18, 0.16, 'lowpass', 1400, 100); },
  hurt() { this._a.tone({ type: 'sine', f0: 130, f1: 40, dur: 0.22, vol: 0.28 }); this._a.noise(0.12, 0.16, 'lowpass', 500, 80); },
  dash() { this._a.noise(0.18, 0.16, 'highpass', 700, 3200); },
  jump() { this._a.tone({ type: 'sine', f0: 180, f1: 430, dur: 0.14, vol: 0.13 }); },
  levelup() { [523, 659, 784, 1046].forEach((f, i) => this._a.tone({ type: 'triangle', f0: f, f1: f, dur: 0.17, vol: 0.15, delay: i * 0.07 })); },
  ult() { this._a.tone({ type: 'sawtooth', f0: 520, f1: 40, dur: 0.6, vol: 0.26 }); this._a.noise(0.5, 0.26, 'lowpass', 2200, 80); },
  wave() { this._a.tone({ type: 'sawtooth', f0: 95, f1: 36, dur: 0.7, vol: 0.28 }); },
  click() { this._a.tone({ type: 'sine', f0: 640, f1: 500, dur: 0.06, vol: 0.1 }); },
  frost() { this._a.tone({ type: 'sine', f0: 1700, f1: 280, dur: 0.35, vol: 0.15 }); },
  zap() { this._a.tone({ type: 'sawtooth', f0: 1300, f1: 180, dur: 0.12, vol: 0.12 }); this._a.noise(0.1, 0.11, 'highpass', 1500, 3000); },
  holy() { [660, 880, 1320].forEach((f, i) => this._a.tone({ type: 'sine', f0: f, f1: f, dur: 0.25, vol: 0.11, delay: i * 0.06 })); },
  shot() { this._a.tone({ type: 'square', f0: 720, f1: 180, dur: 0.09, vol: 0.09 }); },
  explode() { this._a.noise(0.45, 0.3, 'lowpass', 900, 60); this._a.tone({ type: 'sine', f0: 95, f1: 28, dur: 0.4, vol: 0.28 }); },
  tome() { [392, 523, 659, 784].forEach((f, i) => this._a.tone({ type: 'triangle', f0: f, f1: f, dur: 0.2, vol: 0.13, delay: i * 0.08 })); },
  pickup() { this._a.tone({ type: 'sine', f0: 760, f1: 1260, dur: 0.09, vol: 0.12 }); },
  coin() { this._a.tone({ type: 'square', f0: 980, f1: 1470, dur: 0.07, vol: 0.08 }); },
  equip() { this._a.tone({ type: 'triangle', f0: 420, f1: 660, dur: 0.12, vol: 0.13 }); this._a.noise(0.07, 0.09, 'highpass', 2200, 4400); },
  drop(r) { this._a.tone({ type: 'triangle', f0: [520, 660, 820, 1040][r] || 660, f1: [780, 990, 1240, 1560][r] || 990, dur: 0.14, vol: 0.11 }); },
};
