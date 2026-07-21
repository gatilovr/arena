import { clamp } from '../../../shared/constants.js';

// ============================================================================
// INPUT — единый слой ввода: клавиатура+мышь (PC) и тач (джойстик/свайп/кнопки).
// Хранит углы камеры (yaw/pitch) и выдаёт сэмпл инпута для отправки на сервер.
// ============================================================================
export class Input {
  constructor() {
    this.mx = 0; this.mz = 0;
    this.yaw = 0; this.pitch = 0.12;
    this.sens = 1;
    this.mode = 'touch';

    this.keys = {};
    this.atkHeld = false;
    this.jumpEdge = false;
    this.dashEdge = false;
    this.ultEdge = false;
    this.skillEdge = [false, false];
    this.invToggle = false;
    this.bookToggle = false;

    this.joyId = null; this.joyOX = 0; this.joyOY = 0;
    this.lookId = null; this.lookLX = 0; this.lookLY = 0;
    this.rmb = false;
  }

  init(canvas) {
    this.canvas = canvas;
    this._setupKeyboard();
    this._setupMouse();
    this._setupTouch();
  }

  setMode(mode) { this.mode = mode; }

  // --- клавиатура ---
  _setupKeyboard() {
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      // не обрабатываем клавиши если фокус в поле ввода
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      this.keys[e.code] = true;
      if (e.code === 'Space') { e.preventDefault(); this.jumpEdge = true; }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.dashEdge = true;
      if (e.code === 'KeyF' || e.code === 'KeyQ') this.ultEdge = true;
      if (e.code === 'Digit1') this.skillEdge[0] = true;
      if (e.code === 'Digit2') this.skillEdge[1] = true;
      if (e.code === 'KeyI') this.invToggle = true;
      if (e.code === 'KeyK') this.bookToggle = true;
    });
    addEventListener('keyup', (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      this.keys[e.code] = false;
    });
  }

  // --- мышь: ЛКМ атака, ПКМ камера (Pointer Lock) ---
  _setupMouse() {
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.mode !== 'pc') return;
      if (e.button === 0) this.atkHeld = true;
      if (e.button === 2) {
        e.preventDefault();
        this.rmb = true;
        // запрашиваем pointer lock при зажатии ПКМ
        if (document.pointerLockElement !== this.canvas) {
          this.canvas.requestPointerLock();
        }
      }
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) this.atkHeld = false;
      if (e.button === 2) {
        this.rmb = false;
        // отпускаем pointer lock при отпускании ПКМ
        if (document.pointerLockElement === this.canvas) {
          document.exitPointerLock();
        }
      }
    });
    // вращение камеры через movementX/movementY (без движения курсора)
    addEventListener('mousemove', (e) => {
      if (this.rmb && this.mode === 'pc' && document.pointerLockElement === this.canvas) {
        const m = 0.003 * this.sens;
        this.yaw -= e.movementX * m;
        this.pitch = clamp(this.pitch - e.movementY * m, -1.25, 1.25);
      }
    });
    addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // --- тач: джойстик, свайп-камера, кнопки ---
  _setupTouch() {
    const jz = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    const maxD = 42;

    jz.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { jz.setPointerCapture(e.pointerId); } catch {}
      this.joyId = e.pointerId;
      const r = jz.getBoundingClientRect();
      this.joyOX = r.left + r.width / 2; this.joyOY = r.top + r.height / 2;
      knob.classList.add('active');
      this._joyMove(e, knob, maxD);
    });
    jz.addEventListener('pointermove', (e) => { if (e.pointerId === this.joyId) this._joyMove(e, knob, maxD); });
    const joyEnd = (e) => {
      if (e.pointerId === this.joyId) {
        this.joyId = null; this.mx = 0; this.mz = 0;
        knob.style.transform = 'translate(-50%,-50%)';
        knob.classList.remove('active');
      }
    };
    jz.addEventListener('pointerup', joyEnd);
    jz.addEventListener('pointercancel', joyEnd);

    // свайп-камера
    const lz = document.getElementById('look-zone');
    lz.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.lookId === null) {
        this.lookId = e.pointerId; this.lookLX = e.clientX; this.lookLY = e.clientY;
        try { lz.setPointerCapture(e.pointerId); } catch {}
      }
    });
    lz.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookId) return;
      const m = 0.0046 * this.sens;
      this.yaw -= (e.clientX - this.lookLX) * m;
      this.pitch = clamp(this.pitch - (e.clientY - this.lookLY) * m, -1.25, 1.25);
      this.lookLX = e.clientX; this.lookLY = e.clientY;
    });
    const lookEnd = (e) => { if (e.pointerId === this.lookId) this.lookId = null; };
    lz.addEventListener('pointerup', lookEnd);
    lz.addEventListener('pointercancel', lookEnd);

    // кнопки
    const bind = (id, down, up) => {
      const el = document.getElementById(id);
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); try { el.setPointerCapture(e.pointerId); } catch {} down(); });
      el.addEventListener('pointerup', (e) => { e.preventDefault(); e.stopPropagation(); if (up) up(); });
      el.addEventListener('pointercancel', () => { if (up) up(); });
    };
    bind('btn-atk', () => this.atkHeld = true, () => this.atkHeld = false);
    bind('btn-jump', () => this.jumpEdge = true);
    bind('btn-dash', () => this.dashEdge = true);

    // скилы — без stopPropagation, чтобы SkillUI тоже ловил клик
    const bindSkill = (id, fn) => {
      const el = document.getElementById(id);
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch {} fn(); });
      el.addEventListener('pointerup', (e) => { e.preventDefault(); });
      el.addEventListener('pointercancel', () => {});
    };
    bindSkill('sk0', () => this.skillEdge[0] = true);
    bindSkill('sk1', () => this.skillEdge[1] = true);
    bind('btn-ult', () => this.ultEdge = true);

    // инвентарь / гримуар —.touch кнопки
    bind('btn-inv', () => this.invToggle = true);
    bind('btn-book', () => this.bookToggle = true);
  }

  _joyMove(e, knob, maxD) {
    let dx = e.clientX - this.joyOX, dy = e.clientY - this.joyOY;
    const d = Math.hypot(dx, dy);
    if (d > maxD) { dx = dx / d * maxD; dy = dy / d * maxD; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    this.mx = dx / maxD;
    this.mz = dy / maxD;
  }

  // Сэмпл для отправки на сервер. Вызывается ~30 Гц.
  sample() {
    let mx = this.mx, mz = this.mz;
    if (this.joyId === null) {
      mx = 0; mz = 0;
      if (this.keys['KeyW'] || this.keys['ArrowUp']) mz -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) mz += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) mx -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) mx += 1;
      const l = Math.hypot(mx, mz);
      if (l > 1) { mx /= l; mz /= l; }
    }
    const out = {
      mx, mz,
      yaw: this.yaw, pitch: this.pitch,
      jump: this.jumpEdge,
      dash: this.dashEdge,
      atk: this.atkHeld,
      ult: this.ultEdge,
      sk0: this.skillEdge[0],
      sk1: this.skillEdge[1],
      invToggle: this.invToggle,
      bookToggle: this.bookToggle,
    };
    // граничные действия сбрасываются после сэмпла
    this.jumpEdge = false;
    this.dashEdge = false;
    this.ultEdge = false;
    this.skillEdge[0] = false;
    this.skillEdge[1] = false;
    this.invToggle = false;
    this.bookToggle = false;
    return out;
  }
}
