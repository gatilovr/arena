import * as THREE from 'three';
import { NET, ITEMS } from '../../../shared/constants.js';
import { lerp } from '../../../shared/client-constants.js';
import { makePlayerBody, makeSword, makeAxe, makeDagger, makeBow, makeStaff, makeTwoHandedSword, makeNameSprite, makeHpBar } from '../render/Meshes.js';

const WEAPON_MODELS = {
  w1: 'sword', w2: 'sword', w3: 'sword', w4: 'sword', w5: 'sword', w6: 'sword', w7: 'sword', w8: 'sword',
  w9: 'bow', w10: 'staff', w11: 'axe', w12: 'dagger', w13: 'staff', w14: 'twoHandedSword',
};

function createWeaponModel(weaponId) {
  const key = WEAPON_MODELS[weaponId] || 'sword';
  const builders = { sword: makeSword, axe: makeAxe, dagger: makeDagger, bow: makeBow, staff: makeStaff, twoHandedSword: makeTwoHandedSword };
  return (builders[key] || makeSword)();
}

const TICK_S = NET.TICK_MS / 1000;

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// ============================================================================
// REMOTEPLAYER — другой игрок. Интерполирует позицию между снапшотами сервера,
// показывает ник, HP-бар и анимацию взмаха.
// ============================================================================
export class RemotePlayer {
  constructor(scene, camera, snap) {
    this.scene = scene;
    this.camera = camera;
    this.id = snap.id;

    const { group, body } = makePlayerBody(snap.c);
    this.mesh = group;
    this.body = body;
    scene.add(group);

    // оружие в руке
    this.sword = createWeaponModel(snap.wid || 'w1');
    this.weaponId = snap.wid || 'w1';
    this._setRemoteWeaponPose();
    group.add(this.sword);

    // ник
    this.name = makeNameSprite(snap.n, snap.c);
    this.name.position.y = 2.5;
    group.add(this.name);

    // hp-бар
    const hb = makeHpBar();
    this.hpBar = hb;
    hb.group.position.y = 2.15;
    hb.group.scale.setScalar(1.1);
    group.add(hb.group);

    this.prev = { ...snap };
    this.curr = { ...snap };
    this.t = 1;
    this.swing = 0;
    this.lastAtk = 0;
  }

  _setRemoteWeaponPose() {
    const it = ITEMS[this.weaponId];
    const isRanged = it && it.weaponType === 'ranged';
    if (isRanged) {
      this.sword.position.set(0.35, 1.0, 0.35);
      this.sword.rotation.set(0.1, 0, -0.2);
    } else {
      this.sword.position.set(0.45, 1.0, 0.2);
      this.sword.rotation.set(0.3, 0, -0.4);
    }
  }

  _swapWeapon(weaponId) {
    if (weaponId === this.weaponId || !weaponId) return;
    this.mesh.remove(this.sword);
    this.sword = createWeaponModel(weaponId);
    this.weaponId = weaponId;
    this._setRemoteWeaponPose();
    this.mesh.add(this.sword);
  }

  pushSnap(snap) {
    this.prev = this.curr;
    this.curr = snap;
    this.t = 0;
    if (snap.atk && snap.atk !== this.lastAtk) this.swing = 0.001;
    this.lastAtk = snap.atk;
    // swap weapon model if equipped weapon changed
    if (snap.wid && snap.wid !== this.weaponId) this._swapWeapon(snap.wid);
  }

  update(dt) {
    this.t = Math.min(1, this.t + dt / TICK_S);
    const k = this.t;
    const a = this.prev, b = this.curr;

    this.mesh.position.set(
      lerp(a.x, b.x, k),
      lerp(a.y, b.y, k) - 1.15,
      lerp(a.z, b.z, k)
    );
    this.mesh.rotation.y = lerpAngle(a.yaw, b.yaw, k);
    this.mesh.visible = b.alive;

    // hp-бар — billboard
    const pct = Math.max(0.001, b.hp / b.mhp);
    this.hpBar.fill.scale.x = pct;
    this.hpBar.fill.position.x = -(1 - pct) / 2;
    this.hpBar.fill.material.color.setHex(pct > 0.5 ? 0x3dff6a : pct > 0.25 ? 0xffc233 : 0xff2d3f);
    this.hpBar.group.updateWorldMatrix(true, false);
    this.hpBar.group.quaternion.copy(this.camera.quaternion);

    // взмах
    if (this.swing > 0) {
      this.swing += dt;
      const p = Math.min(1, this.swing / 0.2);
      this.sword.rotation.x = 0.3 - Math.sin(p * Math.PI) * 1.6;
      if (p >= 1) { this.swing = 0; this.sword.rotation.x = 0.3; }
    }
  }

  dispose() {
    this.scene.remove(this.mesh);
  }
}
