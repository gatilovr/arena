import * as THREE from 'three';
import { NET, PLAYER } from '../../../shared/constants.js';
import { lerp } from '../../../shared/client-constants.js';
import { ITEMS, BUFFS, RARITY, SKILLS, SETS, ELEMENT_COLORS } from '../../../shared/gameData.js';
import { GameScene } from '../render/Scene.js';
import { Effects } from '../render/Effects.js';
import { LocalPlayer } from './LocalPlayer.js';
import { RemotePlayer } from './RemotePlayer.js';
import { EnemyView } from './EnemyView.js';
import { Input } from './Input.js';
import { HUD } from '../ui/HUD.js';
import { SkillUI } from '../ui/SkillUI.js';
import { InventoryUI } from '../ui/InventoryUI.js';
import { UpgradeUI } from '../ui/UpgradeUI.js';
import { SettingsUI } from '../ui/SettingsUI.js';
import { PauseUI } from '../ui/PauseUI.js';
import { sfx } from '../audio/AudioSys.js';
import { S, C } from '../../../shared/protocol.js';

const STREAKS = { 2: 'ДВОЙНОЕ УБИЙСТВО!', 3: 'ТРОЙНОЕ УБИЙСТВО!', 4: 'УЛЬТРА-СЕРИЯ!', 5: 'РЕЗНЯ!', 7: 'БЕЗУМИЕ!' };
const BLOOD = { normal: 0x8a0f0f, runner: 0x147a36, tank: 0x6d3fb8, shooter: 0x2f7fd6, exploder: 0xffa028, rebradd: 0xccccaa, necro: 0x7722cc, butcher: 0xcc2200, minion: 0x773388 };
const DROP_COLORS = { item: 0xffc233, buff: 0x3dff6a, tome: 0x35e0ff, coin: 0xffc233 };

// ============================================================================
// GAME — клиентский оркестратор: сцена, ввод, предсказание, интерполяция,
// обработка снапшотов и событий сервера, рендер-цикл.
// ============================================================================
export class Game {
  constructor(canvas, net, lobby, audio) {
    this.canvas = canvas;
    this.net = net;
    this.lobby = lobby;
    this.audio = audio;

    this.scene = new GameScene(canvas);
    this.effects = new Effects(this.scene.scene, this.scene.camera, this.scene.glowTex);
    this.input = new Input();
    this.input.init(canvas);
    this.hud = new HUD();
    this.skillUI = new SkillUI(net);
    this.invUI = new InventoryUI(net, sfx);
    this.upgradeUI = new UpgradeUI(net);

    this.paused = false;
    this.settingsUI = new SettingsUI(null);
    this.pauseUI = new PauseUI(this);

    // apply saved settings
    this._applySettings();
    this._bindEsc();
    this._pauseBtnHandler = () => {
      if (this.started) this.pauseUI.toggle();
    };
    document.getElementById('pause-btn').addEventListener('click', this._pauseBtnHandler);

    this.local = null;
    this.remotes = new Map();
    this.enemies = new Map();
    this.bullets = new Map();
    this._bulletPool = this._createBulletPool();
    this.drops = new Map();
    this.wave = { num: 1, left: 0, boss: false };
    this.me = null;
    this.meSnaps = null; // полный снапшот с инвентарём/скилами
    this.roomPlayers = null; // список игроков из ROOM_STATE
    this.roomHost = null;    // хост из ROOM_STATE
    this._knownSkills = new Set();

    this.started = false;
    this.shake = 0;
    this.inputAcc = 0;
    this.lastTime = 0;
    this._fpsCount = 0;
    this._fpsLast = 0;
    this._fps = 0;

    this._bindNet();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  get myId() { return this.lobby.myId; }

  _applySettings() {
    this.input.sens = this.settingsUI.sensitivity;
    sfx.bind(this.audio);
    this.audio.setMuted(!this.settingsUI.soundEnabled);
    if (this.scene) this.scene.renderer.setPixelRatio(this.settingsUI.pixelRatio);
  }

  _bindEsc() {
    this._escHandler = (e) => {
      if (e.code === 'Escape' && this.started) {
        e.preventDefault();
        if (this.settingsUI.isOpen) {
          this.settingsUI.close();
          this._applySettings();
          this.pauseUI.open();
          return;
        }
        this.pauseUI.toggle();
      }
    };
    addEventListener('keydown', this._escHandler);
  }

  // --- bullet object pool ---
  _createBulletPool() {
    const geo = new THREE.SphereGeometry(0.16, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x66ccff, toneMapped: false });
    const free = [];
    const active = new Set();
    return {
      get() {
        let m;
        if (free.length > 0) {
          m = free.pop();
          // Reset userData to avoid stale tx/ty/tz from a previous bullet
          m.userData.tx = undefined;
          m.userData.ty = undefined;
          m.userData.tz = undefined;
        } else {
          m = new THREE.Mesh(geo, mat.clone());
        }
        active.add(m);
        return m;
      },
      put(m) {
        active.delete(m);
        free.push(m);
      },
      get size() { return active.size + free.length; }
    };
  }

  leaveGame() {
    this.net.send({ t: C.LEAVE });
    this.destroy();
    this.lobby.show();
    this.lobby.showConnect();
  }

  destroy() {
    // stop animation loop
    this._destroyed = true;

    // remove esc handler
    if (this._escHandler) {
      removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }

    // remove pause button handler
    if (this._pauseBtnHandler) {
      document.getElementById('pause-btn')?.removeEventListener('click', this._pauseBtnHandler);
      this._pauseBtnHandler = null;
    }

    // remove net handlers
    if (this._netHandlers) {
      for (const [event, handler] of this._netHandlers) {
        this.net.off(event, handler);
      }
      this._netHandlers = [];
    }

    // destroy sub-components
    if (this.input) { this.input.destroy(); }
    if (this.hud) { this.hud.destroy(); }
    if (this.skillUI) { this.skillUI.destroy(); }
    if (this.invUI) { this.invUI.destroy(); }

    // clean up scene
    this.reset();
  }

  onGameOver(m) {
    this.started = false;
    const el = document.getElementById('gameover-screen');
    const stats = m.stats;
    document.getElementById('go-wave').textContent = stats.wave;
    document.getElementById('go-kills').textContent = stats.kills;
    document.getElementById('go-score').textContent = stats.score;
    const mins = Math.floor(stats.time / 60);
    const secs = stats.time % 60;
    document.getElementById('go-time').textContent = mins + ':' + String(secs).padStart(2, '0');
    const list = document.getElementById('go-player-list');
    list.textContent = '';
    for (const p of stats.players) {
      const row = document.createElement('div');
      row.className = 'go-player';
      for (const text of [p.name, `УР ${p.level}`, `☠ ${p.kills}`, `⭐ ${p.score}`]) {
        const span = document.createElement('span');
        span.textContent = text;
        row.appendChild(span);
      }
      list.appendChild(row);
    }
    el.classList.remove('hidden');
    document.getElementById('go-lobby').onclick = () => {
      el.classList.add('hidden');
      this.reset();
      this.lobby.show();
      this.lobby.showConnect();
    };
  }

  _bindNet() {
    this._netHandlers = [];
    const events = [
      [S.START, () => this.startGame()],
      [S.SNAP, (m) => this.onSnap(m)],
      [S.EVENT, (m) => this.onEvent(m.ev)],
      [S.PLAYER_STATE, (m) => this.onPlayerState(m)],
      [S.ROOM_STATE, (m) => this.onRoomState(m)],
      [S.STATE, (m) => this.onState(m)],
      [S.GAMEOVER, (m) => this.onGameOver(m)],
    ];
    for (const [event, handler] of events) {
      this.net.on(event, handler);
      this._netHandlers.push([event, handler]);
    }
  }

  startGame() {
    this.started = true;
    this.lobby.hide();
    document.getElementById('hud').classList.remove('hidden');
    this.applyMode();
    this.audio.init(); this.audio.resume();
    // сбрасываем все toggle-флаги чтобы не открылось из лобби
    this.input.invToggle = false;
    this.input.bookToggle = false;
    this.input.jumpEdge = false;
    this.input.dashEdge = false;
    this.input.ultEdge = false;
    this.input.skillEdge[0] = false;
    this.input.skillEdge[1] = false;
  }

  applyMode() {
    const mode = this.input.mode;
    document.body.classList.toggle('mode-touch', mode === 'touch');
    document.body.classList.toggle('mode-pc', mode === 'pc');
  }

  // --- данные конкретного игрока (инвентарь, скилы, экипировка) ---
  onPlayerState(m) {
    this.meSnaps = m;
    if (m.inv !== undefined) this.invUI.updateState(m);
    if (m.skills !== undefined) {
      this.skillUI.updateState(m);
      for (const skId of m.skills) this._knownSkills.add(skId);
    }
  }

  // --- состояние комнаты (список игроков, хост) ---
  onRoomState(m) {
    this.roomPlayers = m.players;
    this.roomHost = m.host;
  }

  // --- legacy STATE (backward compat) ---
  onState(m) {
    if (m.inv !== undefined || m.skills !== undefined) this.onPlayerState(m);
    if (m.players !== undefined) this.onRoomState(m);
  }

  // --- снапшот мира (20 Гц) ---
  onSnap(m) {
    this.wave = { num: m.wave, left: m.left, boss: m.wstate === 1 && m.enemies.some(e => e.b) };

    // локальный игрок
    const meSnap = m.players.find(p => p.id === this.myId);
    if (meSnap) {
      this.me = meSnap;
      if (!this.local) {
        this.local = new LocalPlayer(this.scene.scene, this.scene.camera, meSnap.c);
        this.local.teleport(meSnap.x, meSnap.y, meSnap.z);
        this.local.onLand = (pos) => this.effects.dust(pos, 8);
      }
      this.local.reconcile(meSnap);
      // обновляем статы для инвентаря
      if (this.invUI.isOpen) this.invUI.updateStats(meSnap, this.meSnaps);
      // обновляем КД скилов
      this.skillUI.updateCooldowns(meSnap.scd);
      // цвет трейла меча = цвет элемента оружия
      if (this.meSnaps?.equip?.weapon) {
        const wDef = ITEMS[this.meSnaps.equip.weapon];
        if (wDef) this.local.trailColor = ELEMENT_COLORS[wDef.el || 'none'] || 0xff3300;
      }
    }

    // удалённые игроки
    const seen = new Set();
    for (const p of m.players) {
      if (p.id === this.myId) continue;
      seen.add(p.id);
      let rp = this.remotes.get(p.id);
      if (!rp) { rp = new RemotePlayer(this.scene.scene, this.scene.camera, p); this.remotes.set(p.id, rp); }
      rp.pushSnap(p);
    }
    for (const [id, rp] of this.remotes) if (!seen.has(id)) { rp.dispose(); this.remotes.delete(id); }

    // враги
    const seenE = new Set();
    for (const e of m.enemies) {
      seenE.add(e.id);
      let ev = this.enemies.get(e.id);
      if (!ev) {
        ev = new EnemyView(this.scene.scene, this.scene.camera, e);
        this.enemies.set(e.id, ev);
        // portal spawn effect — color matches enemy type
        const ENEMY_COL = { normal: 0x9c2626, runner: 0x1fae4e, tank: 0x6d3fb8, shooter: 0x2f7fd6, exploder: 0xd67f1f, rebradd: 0xccccaa, necro: 0xb44dff, butcher: 0xcc2200 };
        this.effects.portal(e.x, e.z, ENEMY_COL[e.t] || 0x9c2626);
      }
      ev.pushSnap(e);
    }
    for (const [id, ev] of this.enemies) if (!seenE.has(id)) { ev.dispose(); this.enemies.delete(id); }

    // пули — object pool (переиспользуем мешы)
    const seenB = new Set();
    for (const b of m.bullets) {
      seenB.add(b.id);
      let bm = this.bullets.get(b.id);
      if (!bm) {
        bm = this._bulletPool.get();
        bm.material.color.setHex(b.c || 0x66ccff);
        bm.position.set(b.x, b.y, b.z);
        bm.visible = true;
        this.scene.scene.add(bm);
        this.bullets.set(b.id, bm);
      }
      bm.userData.tx = b.x; bm.userData.ty = b.y; bm.userData.tz = b.z;
    }
    for (const [id, bm] of this.bullets) {
      if (!seenB.has(id)) {
        bm.visible = false;
        this.scene.scene.remove(bm);
        this._bulletPool.put(bm);
        this.bullets.delete(id);
      }
    }

    // дропы (предметы, бафы, гримуар)
    const seenD = new Set();
    for (const d of m.drops) {
      seenD.add(d.id);
      if (!this.drops.has(d.id)) {
        const color = DROP_COLORS[d.k] || 0xffc233;
        let geom;
        if (d.k === 'tome') geom = new THREE.SphereGeometry(0.25, 8, 8);
        else if (d.k === 'buff') geom = new THREE.IcosahedronGeometry(0.28, 0);
        else geom = new THREE.OctahedronGeometry(0.32);

        const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7, roughness: 0.3 });
        const dm = new THREE.Mesh(geom, mat);
        dm.position.set(d.x, 0.6, d.z);
        this.scene.scene.add(dm);

        // столб света
        const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 5, 8, 1, true), beamMat);
        beam.position.y = 2.5; dm.add(beam);

        // свечение
        const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.scene.glowTex, color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
        gl.scale.setScalar(1.8); dm.add(gl);

        this.drops.set(d.id, { mesh: dm, kind: d.k, defId: d.di, buffType: d.bt });
      }
    }
    for (const [id, dd] of this.drops) {
      if (!seenD.has(id)) { this.scene.scene.remove(dd.mesh); this.drops.delete(id); }
    }
  }

  // --- игровые события ---
  onEvent(ev) {
    if (!this.started) return;
    switch (ev.type) {
      case 'hit': {
        const col = ev.crit ? '#ff4dff' : '#ffd9a8';
        this.effects.floatText(String(ev.dmg), new THREE.Vector3(ev.x, ev.y + 0.7, ev.z), col, ev.crit ? 24 : 15, ev.crit ? 'crit' : '');
        const evw = this.enemies.get(ev.eid);
        if (evw) {
          this.effects.blood(new THREE.Vector3(ev.x, ev.y, ev.z), ev.crit ? 10 : 5, BLOOD[evw.type] || 0x8a0f0f);
          this.effects.spark(new THREE.Vector3(ev.x, ev.y + 0.5, ev.z), ev.crit ? 8 : 4);
        }
        if (ev.by === this.myId) { sfx.slash(); ev.crit ? sfx.crit() : sfx.hit(); this.shake = Math.max(this.shake, ev.crit ? 0.2 : 0.1); }
        break;
      }
      case 'kill': {
        const evw = this.enemies.get(ev.eid);
        this.effects.blood(new THREE.Vector3(ev.x, 1, ev.z), ev.boss ? 40 : 16, BLOOD[ev.t] || 0x8a0f0f);
        if (ev.by === this.myId) {
          sfx.kill();
          if (STREAKS[ev.combo]) this.hud.announce(STREAKS[ev.combo], ev.combo >= 5 ? '#ff2d3f' : '#ffc233');
        }
        if (ev.boss) this.hud.announce('БОСС ПОВЕРЖЕН!', '#ffc233');
        break;
      }
      case 'dmg': {
        if (ev.pid === this.myId) { this.hud.damageFlash(); sfx.hurt(); this.shake = Math.max(this.shake, 0.2); }
        break;
      }
      case 'wave': {
        const bossNames = { rebradd: 'LORD REBRADD', butcher: 'МЯСНИК', necro: 'НЕКРОМАНТ', golemKing: 'КОРОЛЬ ГОЛЕМОВ', firelord: 'ПОВЕЛИТЕЛЬ ОГНЯ', shadowKing: 'КОРОЛЬ ТЕНЕЙ', frostQueen: 'ЛЕДЯНАЯ КОРОЛЕВА', dragonLord: 'ПОВЕЛИТЕЛЬ ДРАКОНОВ' };
        if (ev.boss) { this.hud.banner('⚠ БОСС ⚠', bossNames[ev.bossType] || ev.bossType, true); sfx.wave(); this.shake = 0.3; }
        else this.hud.banner('ВОЛНА ' + ev.num, 'приготовься');
        break;
      }
      case 'lvl': {
        if (ev.pid === this.myId) {
          this.hud.announce('УРОВЕНЬ ' + ev.level + '!', '#35e0ff');
          sfx.levelup();
          // toast for newly learned skills
          const skills = this.meSnaps?.skills || [];
          for (const skId of skills) {
            if (!this._knownSkills.has(skId)) {
              this._knownSkills.add(skId);
              const sk = SKILLS[skId];
              if (sk) this.hud.announce(sk.icon + ' ' + sk.name + ': ' + sk.desc, '#35e0ff');
            }
          }
        }
        break;
      }
      case 'upgrade': {
        if (ev.pid === this.myId && ev.options) { this.upgradeUI.show(ev.options, this.me ? this.me.level : 1); }
        break;
      }
      case 'ann': {
        this.hud.announce(ev.text, ev.color);
        break;
      }
      case 'ult': {
        this.effects.nova(new THREE.Vector3(ev.x, 0, ev.z), 9, 0xffc233);
        if (ev.pid === this.myId) { sfx.ult(); this.shake = 0.4; }
        break;
      }
      case 'respawn': {
        if (ev.pid === this.myId && this.local && this.me) this.local.teleport(this.me.x, this.me.y, this.me.z);
        break;
      }
      case 'hitfx': {
        if (this.local) this.effects.blood(new THREE.Vector3(ev.x, 1, ev.z), 3, 0xffa028);
        break;
      }
      case 'skill': {
        // визуал каста скила другим игроком
        if (ev.pid !== this.myId) {
          const sk = SKILLS[ev.skillId];
          if (sk) sfx.click();
        }
        break;
      }
      case 'skillfx': {
        this._handleSkillFx(ev);
        break;
      }
      case 'pickup': {
        if (ev.pid === this.myId) {
          if (ev.kind === 'item') {
            const d = ITEMS[ev.defId];
            sfx.drop(d ? d.rar : 0);
            if (d) this.hud.toast(d.icon + ' ' + d.name);
          }
          else if (ev.kind === 'buff') {
            sfx.pickup();
            const b = BUFFS[ev.buffType || ev.defId];
            if (b) this.hud.toast(b.icon + ' ' + b.name);
          }
          else if (ev.kind === 'tome') {
            sfx.tome();
            this.hud.toast('📖 Гримуарная страница');
          }
          else if (ev.kind === 'coin') {
            sfx.coin();
          }
        }
        break;
      }
      case 'buff': {
        if (ev.pid === this.myId) {
          const b = BUFFS[ev.buff];
          if (b) this.hud.announce(b.icon + ' ' + b.name, b.color);
        }
        break;
      }
      case 'equip': {
        // другой игрок сменил экипировку — можно показать визуал
        break;
      }
      case 'inv': {
        // обновление инвентаря
        break;
      }
    }
  }

  _handleSkillFx(ev) {
    switch (ev.kind) {
      case 'fireball':
        this.effects.fireball(ev.x, ev.y || 1.3, ev.z, ev.vx, ev.vz, ev.color || 0xff6a00);
        sfx.shot();
        break;
      case 'beam':
        this.effects.beam(ev.x, ev.y || 1.2, ev.z, ev.x2, ev.y2 || 1, ev.z2, ev.color || 0xffe14d);
        sfx.zap();
        break;
      case 'nova':
        this.effects.nova(new THREE.Vector3(ev.x, 0, ev.z), ev.radius || 5, ev.color || 0x35e0ff);
        sfx.frost();
        this.shake = Math.max(this.shake, 0.2);
        break;
      case 'whirl':
        this.effects.whirl(ev.x, ev.z, ev.color || 0x9fd8ff);
        sfx.dash();
        break;
      case 'telegraph':
        this.effects.telegraph(ev.x, ev.z, ev.r || 4, ev.dur || 0.9, ev.color || 0xff7a1a);
        break;
      case 'zone':
        this.effects.zone(ev.x, ev.z, ev.r || 3.6, ev.dur || 4, ev.color || 0x7dff4d);
        sfx.frost();
        this.shake = Math.max(this.shake, 0.15);
        break;
      case 'float':
        this.effects.floatText(ev.text, new THREE.Vector3(ev.x, ev.y, ev.z), ev.color, ev.size || 15);
        break;
    }
  }

  // --- главный цикл ---
  _loop(now) {
    if (this._destroyed) return;
    requestAnimationFrame(this._loop);
    const t = now * 0.001;
    let dt = this.lastTime ? (t - this.lastTime) : 0.016;
    this.lastTime = t;
    dt = Math.min(dt, 0.05);

    this.scene.animateEnv(t);

    if (!this.started) {
      const a = t * 0.1;
      this.scene.camera.position.set(Math.sin(a) * 18, 9 + Math.sin(t * 0.3) * 0.6, Math.cos(a) * 18);
      this.scene.camera.lookAt(0, 1, 0);
    }

    if (this.started && this.local) {
      if (!this.paused) {
        // отправка инпута + предсказание (≈30 Гц)
        this.inputAcc += dt;
        while (this.inputAcc >= NET.INPUT_MS / 1000) {
          this.inputAcc -= NET.INPUT_MS / 1000;
          const inp = this.input.sample();
          if (this.local.alive) this.local.predict(inp, NET.INPUT_MS / 1000);
          else { this.local.yaw = inp.yaw; this.local.pitch = inp.pitch; }
          this.net.send({ t: 'input', ...inp });
          // toggle инвентаря/гримуара
          if (inp.invToggle) {
            if (this.skillUI.isOpen) this.skillUI.close();
            else if (this.invUI.isOpen) this.invUI.close();
            else { this.invUI.open(); if (this.me) this.invUI.updateStats(this.me, this.meSnaps); }
          }
          if (inp.bookToggle) {
            if (this.invUI.isOpen) this.invUI.close();
            else if (this.skillUI.isOpen) this.skillUI.close();
            else this.skillUI.open();
          }
        }
      }

      // визуал локального игрока + камера
      this.local.updateVisual(dt, this.shake);

      // удалённые игроки
      for (const rp of this.remotes.values()) rp.update(dt);

      // враги
      for (const [id, ev] of this.enemies) {
        const justDied = ev.curr.dy && ev.deathT === 0;
        const dead = ev.update(dt);
        if (justDied) this.effects.blood(new THREE.Vector3(ev.curr.x, 1, ev.curr.z), 20, BLOOD[ev.type] || 0x8a0f0f);
        if (dead) { ev.dispose(); this.enemies.delete(id); }
      }

      // пули (плавное движение к целевой позиции)
      for (const bm of this.bullets.values()) {
        if (bm.userData.tx !== undefined) {
          bm.position.x = lerp(bm.position.x, bm.userData.tx, Math.min(1, dt * 20));
          bm.position.y = lerp(bm.position.y, bm.userData.ty, Math.min(1, dt * 20));
          bm.position.z = lerp(bm.position.z, bm.userData.tz, Math.min(1, dt * 20));
        }
      }

      // дропы (вращение/покачивание)
      for (const [, dd] of this.drops) {
        dd.mesh.rotation.y += dt * 2;
        dd.mesh.position.y = 0.6 + Math.sin(t * 2.5) * 0.15;
      }

      // тряска камеры затухает
      if (this.shake > 0) { this.shake *= Math.pow(0.02, dt); if (this.shake < 0.01) this.shake = 0; }

      // FPS counter
      this._fpsCount++;
      if (now - this._fpsLast >= 1000) {
        this._fps = this._fpsCount;
        this._fpsCount = 0;
        this._fpsLast = now;
        this.hud.updateFPS(this._fps);
      }

      // HUD
      if (this.me) {
        this.hud.update(this.me, this.wave, this._playerSnaps());
        // buff indicators — server sends buffs as {type: dur} object, convert to array
        const buffObj = this.me.buffs || {};
        const activeBuffs = Object.entries(buffObj).map(([type, dur]) => ({ ...BUFFS[type], dur, type })).filter(b => b.icon);
        this.hud.updateBuffs(activeBuffs);
      }
      this.hud.updatePing(this.net.ping);
      this.hud.tick(dt);

      // радар
      if (this.me) {
        const allies = [];
        for (const rp of this.remotes.values()) allies.push(rp.curr);
        const enArr = [];
        for (const [, ev] of this.enemies) enArr.push({ x: ev.curr.x, z: ev.curr.z, boss: ev.curr.b });
        const drArr = [];
        for (const [, dd] of this.drops) drArr.push({ x: dd.mesh.position.x, z: dd.mesh.position.z });
        this.hud.drawRadar({ x: this.me.x, z: this.me.z }, this.me.yaw || 0, enArr, drArr, allies);
      }

      // HP-бар босса
      const bossSnap = this._findBoss();
      this.hud.updateBossBar(bossSnap);

      // аура-кольца активных сетов — локальный игрок
      if (this.me && this.skillUI.activeSets.length) {
        this.effects.drawAuras(this.skillUI.activeSets, { x: this.me.x, z: this.me.z }, t, 'local');
      } else {
        this.effects.drawAuras([], { x: 0, z: 0 }, t, 'local');
      }
      // ауры удалённых игроков
      for (const [pid, rp] of this.remotes) {
        if (!rp.curr.alive || !rp.curr.sets?.length) {
          this.effects.drawAuras([], { x: 0, z: 0 }, t, pid);
        } else {
          const remoteSets = rp.curr.sets.map(sid => SETS.find(s => s.id === sid)).filter(Boolean);
          this.effects.drawAuras(remoteSets, { x: rp.curr.x, z: rp.curr.z }, t, pid);
        }
      }
    }

    this.effects.update(dt);
    this.scene.render();
  }

  _playerSnaps() {
    const arr = [];
    if (this.me) arr.push(this.me);
    for (const rp of this.remotes.values()) arr.push(rp.curr);
    return arr;
  }

  _findBoss() {
    for (const [, ev] of this.enemies) {
      if (ev.curr.b) return { type: ev.type, hp: ev.curr.hp, mhp: ev.curr.mhp };
    }
    return null;
  }

  reset() {
    this.paused = false;
    if (this.pauseUI.isOpen) this.pauseUI.close();
    if (this.settingsUI.isOpen) this.settingsUI.close();
    for (const rp of this.remotes.values()) rp.dispose();
    for (const ev of this.enemies.values()) ev.dispose();
    for (const bm of this.bullets.values()) this.scene.scene.remove(bm);
    for (const [, dd] of this.drops) this.scene.scene.remove(dd.mesh);
    this.remotes.clear(); this.enemies.clear(); this.bullets.clear(); this.drops.clear();
    this.effects.clear();
    this.hud.reset();
    if (this.local) { this.local.dispose(); this.local = null; }
    this.me = null; this.meSnaps = null;
    this.roomPlayers = null; this.roomHost = null;
    this._knownSkills.clear();
    this.started = false;
    this.skillUI.skillSlots = [null, null];
    this.skillUI.learnedSkills = [];
    this.invUI.inv = [];
    this.invUI.equip = { weapon: null, relic1: null, relic2: null };
    document.getElementById('hud').classList.add('hidden');
  }
}
