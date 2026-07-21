import * as THREE from 'three';
import { NET } from '../../../shared/constants.js';
import { lerp } from '../../../shared/client-constants.js';
import { makeEnemy, makeHpBar } from '../render/Meshes.js';

const TICK_S = NET.TICK_MS / 1000;

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// ============================================================================
// ENEMYVIEW — клиентское представление врага: интерполяция позиции, HP-бар,
// вспышки урона, анимации появления/смерти. Логика ИИ — на сервере.
// ============================================================================
export class EnemyView {
  constructor(scene, camera, snap) {
    this.scene = scene;
    this.camera = camera;
    this.id = snap.id;
    this.type = snap.t;
    this.size = snap.sz;

    const { group, bodyMat, height, eyeMats } = makeEnemy(snap.t, snap.b);
    this.mesh = group;
    this.bodyMat = bodyMat;
    this.height = height;
    this.eyeMats = eyeMats || [];
    this.eyeBaseColors = this.eyeMats.map(em => em.color.clone());
    this.baseEm = bodyMat.emissive.getHex();
    this.baseEmInt = bodyMat.emissiveIntensity;
    scene.add(group);

    const hb = makeHpBar();
    this.hpBar = hb;
    hb.group.position.y = height + 0.45;
    group.add(hb.group);

    this.prev = { ...snap };
    this.curr = { ...snap };
    this.t = 1;
    this.deathT = 0;
    this.spawnScale = 0.05;
  }

  pushSnap(snap) {
    this.prev = this.curr;
    this.curr = snap;
    this.t = 0;
  }

  update(dt) {
    const c = this.curr;

    if (c.dy) {
      // анимация смерти: вспышка → усадка + вращение + исчезновение
      this.deathT += dt;
      if (this.deathT < 0.08) {
        this.bodyMat.emissive.setHex(0xffffff);
        this.bodyMat.emissiveIntensity = 2.0;
      } else {
        this.bodyMat.emissive.setHex(0xffffff);
        this.bodyMat.emissiveIntensity = Math.max(0, 1.5 * (1 - (this.deathT - 0.08) / 0.4));
      }
      this.bodyMat.transparent = true;
      this.bodyMat.depthWrite = false;
      this.bodyMat.opacity = Math.max(0, 1 - this.deathT / 0.5);
      this.mesh.rotation.x += dt * 4;
      this.mesh.rotation.z += dt * 3;
      this.mesh.position.y -= dt * 1.8;
      this.mesh.scale.multiplyScalar(Math.pow(0.12, dt));
      return this.deathT > 0.5;
    }

    this.t = Math.min(1, this.t + dt / TICK_S);
    const k = this.t, a = this.prev, b = this.curr;

    // масштаб появления из портала
    const targetScale = b.sp ? Math.max(0.05, this.size * (1 - 0.9)) : this.size;
    this.spawnScale = lerp(this.spawnScale, this.size, Math.min(1, dt * 4));
    const sc = b.sp ? this.spawnScale * 0.6 : this.size;
    this.mesh.scale.setScalar(sc);

    this.mesh.position.set(lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.z, b.z, k));
    this.mesh.rotation.y = lerpAngle(a.yaw, b.yaw, k);

    // вспышка урона + low HP intensification + phase glow
    if (b.f) { this.bodyMat.emissive.setHex(0xffffff); this.bodyMat.emissiveIntensity = 0.9; }
    else {
      const hpPct = b.hp / b.mhp;
      const lowHpBoost = hpPct < 0.3 ? (0.3 - hpPct) * 2.0 : 0;
      // Boss phase glow: higher phase = more intense emissive
      const phaseBoost = b.b && b.ph ? (b.ph - 1) * 0.15 : 0;
      this.bodyMat.emissive.setHex(this.baseEm);
      this.bodyMat.emissiveIntensity = this.baseEmInt + lowHpBoost + phaseBoost;
    }

    // pulsing eyes (faster in higher phases)
    const eyeSpeed = b.b && b.ph ? 0.005 + (b.ph - 1) * 0.002 : 0.005;
    const eyePulse = 0.7 + Math.sin(performance.now() * eyeSpeed) * 0.3;
    for (let i = 0; i < this.eyeMats.length; i++) {
      this.eyeMats[i].color.copy(this.eyeBaseColors[i]).multiplyScalar(eyePulse);
    }

    // phantom невидимость
    if (b.inv) {
      this.bodyMat.opacity = 0.15;
      this.bodyMat.transparent = true;
      this.bodyMat.depthWrite = false;
    } else if (this.bodyMat.opacity < 1 && !c.dy) {
      this.bodyMat.opacity = 1;
      this.bodyMat.transparent = false;
      this.bodyMat.depthWrite = true;
    }

    // shielder / golemKing / frostQueen щит — пульсация
    if (b.sh) {
      this.bodyMat.emissiveIntensity = this.baseEmInt + Math.sin(performance.now() * 0.008) * 0.25;
    }

    // Boss phase 4 berserk visual: red pulsing outline
    if (b.b && b.ph >= 4) {
      const berserkPulse = Math.sin(performance.now() * 0.01) * 0.3 + 0.3;
      this.bodyMat.emissiveIntensity += berserkPulse;
    }

    // hp-бар — billboard (всегда смотрит в камеру)
    const pct = Math.max(0.001, b.hp / b.mhp);
    this.hpBar.fill.scale.x = pct;
    this.hpBar.fill.position.x = -(1 - pct) / 2;
    this.hpBar.fill.material.color.setHex(pct > 0.5 ? 0x3dff6a : pct > 0.25 ? 0xffc233 : 0xff2d3f);
    this.hpBar.group.updateWorldMatrix(true, false);
    this.hpBar.group.quaternion.copy(this.camera.quaternion);
    const damaged = b.hp < b.mhp;
    this.hpBar.group.visible = damaged && !b.sp;

    return false;
  }

  get pos() { return this.curr; }

  dispose() {
    this.scene.remove(this.mesh);
  }
}
