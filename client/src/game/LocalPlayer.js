import * as THREE from 'three';
import { PLAYER, ARENA, NET, clamp, lerp, ITEMS } from '../../../shared/constants.js';
import { integrateMovement } from '../../../shared/physics.js';
import { makePlayerBody, makeSword, makeAxe, makeDagger, makeBow, makeStaff, makeTwoHandedSword } from '../render/Meshes.js';

// Map weapon ID to model factory
const WEAPON_MODELS = {
  w1: 'sword', w2: 'sword', w3: 'sword', w4: 'sword', w5: 'sword', w6: 'sword', w7: 'sword', w8: 'sword',
  w9: 'bow', w10: 'staff', w11: 'axe', w12: 'dagger', w13: 'staff', w14: 'twoHandedSword',
};

function createWeaponModel(weaponId) {
  const key = WEAPON_MODELS[weaponId] || 'sword';
  const builders = { sword: makeSword, axe: makeAxe, dagger: makeDagger, bow: makeBow, staff: makeStaff, twoHandedSword: makeTwoHandedSword };
  return (builders[key] || makeSword)();
}

// ============================================================================
// LOCALPLAYER — предсказание движения (клиентская копия серверной интеграции)
// + сверка с авторитарным снапшотом (reconciliation) + камера + взмах мечом.
// ============================================================================
export class LocalPlayer {
  constructor(scene, camera, color) {
    this.scene = scene;
    this.camera = camera;
    this.color = color;

    const { group, body } = makePlayerBody(color);
    this.mesh = group;
    this.body = body;
    scene.add(group);

    // меч от первого лица — крепим к камере
    this.sword = createWeaponModel('w1');
    this.weaponId = 'w1';
    this.weaponType = 'melee';
    this._setWeaponPosition();
    camera.add(this.sword);
    scene.add(camera);

    // состояние (зеркалит серверного Player)
    this.x = 0; this.y = PLAYER.HEIGHT; this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = 0; this.pitch = 0.12;
    this.grounded = true;
    this.jumpsLeft = 2;
    this.dashing = false; this.dashT = 0;
    this.dashDX = 0; this.dashDZ = 1;

    this.atkCd = 0;
    this.swing = { active: false, t: 0, dur: 0.16, step: 0 };
    this.swingReturn = 1;
    this.bobPhase = 0;

    // sword trail - thicker, brighter
    this.trails = [];
    this.trailGeo = new THREE.RingGeometry(0.01, 0.5, 6, 1, 0, 2.8);
    this.trailGeo.rotateX(-Math.PI / 2);

    this.snap = null;       // последний серверный снапшот игрока
    this.alive = true;
    this.trailColor = 0xff3300;
    this._wasGrounded = true;
    this.onLand = null;
    this._glowPhase = Math.random() * Math.PI * 2;
  }

  forward() { return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) }; }

  // Клиентская копия серверного Player.integrate + применение граней ввода.
  predict(inp, dt) {
    this.yaw = inp.yaw;
    this.pitch = inp.pitch;

    if (inp.jump && this.jumpsLeft > 0) {
      this.vy = PLAYER.JUMP * (this.jumpsLeft < 1 ? 0.92 : 1);
      this.jumpsLeft--; this.grounded = false;
    }
    if (inp.dash && !this.dashing) {
      const f = this.forward();
      const rx = -f.z, rz = f.x;
      let dx = rx * inp.mx + f.x * (-inp.mz);
      let dz = rz * inp.mx + f.z * (-inp.mz);
      if (Math.hypot(dx, dz) < 0.1) { dx = f.x; dz = f.z; }
      const len = Math.hypot(dx, dz) || 1;
      this.dashDX = dx / len; this.dashDZ = dz / len;
      this.dashing = true; this.dashT = PLAYER.DASH_DUR;
    }
    // локальный кулдаун атаки — для синхронизации анимации взмаха
    if (this.atkCd > 0) this.atkCd -= dt;
    if (inp.atk && this.atkCd <= 0) {
      const atkSpd = this.snap?.atkSpd || 1;
      this.atkCd = PLAYER.ATTACK_COOLDOWN / atkSpd;
      this.swing.step = (this.swing.active && this.swing.step < 2) ? this.swing.step + 1 : 0;
      this.swing.active = true; this.swing.t = 0;
      this.swing.dur = this.swing.step === 2 ? 0.26 : 0.16;
    }

    integrateMovement(this, inp, dt);
  }

  // Сверка с авторитарной позицией сервера.
  reconcile(snap) {
    this.snap = snap;
    this.alive = snap.alive;
    // sync weapon model from server snap wid
    if (snap.wid) {
      this.setWeaponModel(snap.wid);
    }
    const dx = snap.x - this.x, dy = snap.y - this.y, dz = snap.z - this.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist > NET.RECONCILE_THRESHOLD) {
      // плавная коррекция — не рывок, а лerp к серверной позиции
      const k = NET.RECONCILE_FACTOR;
      this.x += dx * k; this.y += dy * k; this.z += dz * k;
      // корректируем скорость, чтобы не дрift-ить обратно
      this.vx += dx * k * 30;
      this.vz += dz * k * 30;
    }
  }

  // Принудительная установка позиции (респавн/вход)
  teleport(x, y, z) {
    this.x = x; this.y = y; this.z = z;
    this.vx = this.vy = this.vz = 0;
  }

  updateVisual(dt, shake) {
    // landing dust detection
    if (this.grounded && !this._wasGrounded && this.onLand) {
      this.onLand(new THREE.Vector3(this.x, 0.1, this.z));
    }
    this._wasGrounded = this.grounded;

    // меш тела (виден другим игрокам; изнутри почти не виден из-за backface culling)
    this.mesh.position.set(this.x, this.y - PLAYER.HEIGHT, this.z);
    this.mesh.rotation.y = this.yaw;
    this.mesh.visible = this.alive;

    // bob phase (for camera + weapon)
    const moving = Math.hypot(this.vx, this.vz) > 1;
    if (moving && this.grounded) this.bobPhase += dt * 10;

    // камера
    this.camera.position.set(this.x, this.y + PLAYER.CAM_HEIGHT, this.z);
    // camera bob while walking
    if (moving && this.grounded) {
      this.camera.position.y += Math.sin(this.bobPhase * 2) * 0.025;
      this.camera.position.x += Math.cos(this.bobPhase) * 0.015;
    }
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    if (shake > 0) {
      const intensity = shake * 1.2;
      const decay = 1 - shake * 0.15;
      this.camera.position.x += (Math.random() - 0.5) * intensity * decay;
      this.camera.position.y += (Math.random() - 0.5) * intensity * 0.7 * decay;
      this.camera.position.z += (Math.random() - 0.5) * intensity * decay;
    }

    // анимация меча
    const bobY = Math.sin(this.bobPhase * 2) * 0.013 * (moving ? 1 : 0.35) + Math.sin(performance.now() * 0.0018) * 0.008;
    const bobX = Math.cos(this.bobPhase) * 0.011 * (moving ? 1 : 0);

    if (this.swing.active) {
      this.swing.t += dt;
      const p = Math.min(1, this.swing.t / this.swing.dur);
      const e = 1 - Math.pow(1 - p, 3);
      this._pose(this.swing.step, e);

      // axe blade: fully visible during swing
      if (this.weaponType === 'axe' && this.sword.blade) {
        this.sword.blade.scale.y = 1;
        this.sword.blade.visible = true;
      }

      // sword trail — spawn arc at blade tip position in world space
      const tipWorld = new THREE.Vector3(0, 1.25, 0);
      this.sword.localToWorld(tipWorld);
      this._spawnTrail(tipWorld);

      if (p >= 1) { this.swing.active = false; this.swingReturn = 0; }
    } else {
      // axe blade: nearly invisible when idle (show only handle)
      if (this.weaponType === 'axe' && this.sword.blade) {
        this.sword.blade.scale.y = 0.05;
      }
      const k = 1 - Math.exp(-11 * dt);
      const isRanged = this.weaponType === 'ranged';
      const idleX = isRanged ? 0.32 : 0.36;
      const idleY = isRanged ? -0.35 : -0.4;
      const idleZ = isRanged ? -0.7 : -0.52;
      const rotX = isRanged ? 0.1 : 0.18;
      const rotY = isRanged ? -0.15 : -0.32;
      const rotZ = isRanged ? 0.05 : 0.12;
      this.sword.position.x = lerp(this.sword.position.x, idleX + bobX, k);
      this.sword.position.y = lerp(this.sword.position.y, idleY + bobY, k);
      this.sword.position.z = lerp(this.sword.position.z, idleZ, k);
      this.sword.rotation.x = lerp(this.sword.rotation.x, rotX, k);
      this.sword.rotation.y = lerp(this.sword.rotation.y, rotY, k);
      this.sword.rotation.z = lerp(this.sword.rotation.z, rotZ, k);
    }

    // update & cull trails
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const tr = this.trails[i];
      tr.life -= dt;
      if (tr.life <= 0) { this.scene.remove(tr.m); this.trails.splice(i, 1); continue; }
      tr.mat.opacity = Math.max(0, tr.life / tr.maxLife) * 0.9;
    }

    // weapon glow pulse - more intense
    this._glowPhase += dt * 3.5;
    if (this.sword.bladeMat && this.sword.bladeMat.emissiveIntensity !== undefined) {
      this.sword.bladeMat.emissiveIntensity = 0.2 + Math.sin(this._glowPhase) * 0.18;
    }
  }

  _spawnTrail(worldPos) {
    // limit trail count
    if (this.trails.length > 12) {
      const old = this.trails.shift();
      this.scene.remove(old.m);
    }
    const color = this.trailColor || 0xff3300;
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.85,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false
    });
    const m = new THREE.Mesh(this.trailGeo, mat);
    m.position.copy(worldPos);
    m.rotation.set(
      Math.random() * 0.4 - 0.2,
      Math.random() * Math.PI * 2,
      Math.random() * 0.4 - 0.2
    );
    this.scene.add(m);
    this.trails.push({ m, mat, life: 0.14, maxLife: 0.14 });
  }

  _setWeaponPosition() {
    const it = ITEMS[this.weaponId];
    if (it && it.weaponType === 'ranged') {
      this.sword.position.set(0.32, -0.35, -0.7);
      this.sword.rotation.set(0.1, -0.15, 0.05);
    } else {
      this.sword.position.set(0.36, -0.4, -0.52);
      this.sword.rotation.set(0.18, -0.32, 0.12);
    }
  }

  setWeaponModel(weaponId) {
    if (weaponId === this.weaponId) return;
    if (!weaponId) { this.sword.visible = false; this.weaponId = null; return; }
    this.sword.visible = true;
    this.camera.remove(this.sword);
    this.sword = createWeaponModel(weaponId);
    this.weaponId = weaponId;
    const it = ITEMS[weaponId];
    this.weaponType = it ? (it.weaponType || 'melee') : 'melee';
    this._setWeaponPosition();
    this.camera.add(this.sword);
  }

  dispose() {
    for (const tr of this.trails) this.scene.remove(tr.m);
    this.trails = [];
    this.scene.remove(this.mesh);
    if (this.sword) this.camera.remove(this.sword);
  }

  _pose(step, e) {
    const P = [
      [[-0.55, -0.1, -0.4, 0.3, 1.4, 0.55], [0.58, -0.36, -0.44, -0.05, -1.55, -0.5]],
      [[0.58, -0.08, -0.4, 0.25, -1.4, -0.55], [-0.55, -0.36, -0.44, -0.05, 1.55, 0.5]]
    ][step] || null;
    if (P) {
      const [a, b] = P;
      this.sword.position.set(lerp(a[0], b[0], e), lerp(a[1], b[1], e), lerp(a[2], b[2], e));
      this.sword.rotation.set(lerp(a[3], b[3], e), lerp(a[4], b[4], e), lerp(a[5], b[5], e));
    } else {
      const a = lerp(2.6, -2.6, e);
      this.sword.position.set(Math.sin(a) * 0.62, -0.28 + Math.sin(e * Math.PI) * 0.12, -0.42);
      this.sword.rotation.set(-0.5, a + Math.PI, 0.2);
    }
  }
}
