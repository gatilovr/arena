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
// вспышки урона, анимации появления/смерти, анимации боссов по типам.
// ============================================================================
export class EnemyView {
  constructor(scene, camera, snap) {
    this.scene = scene;
    this.camera = camera;
    this.id = snap.id;
    this.type = snap.t;
    this.size = snap.sz;
    this.isBoss = snap.b;

    const { group, bodyMat, height, eyeMats, parts } = makeEnemy(snap.t, snap.b);
    this.mesh = group;
    this.bodyMat = bodyMat;
    this.height = height;
    this.eyeMats = eyeMats || [];
    this.parts = parts || {};
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

    // Animation state
    this._animTime = Math.random() * 100; // random offset for variety
    this._lastHp = snap.hp;
    this._attackFlashT = 0;
    this._phaseTransitionT = 0;
    this._lastPhase = snap.ph || 1;
    this._chargeLean = 0;
    this._slamSquash = 0;
    this._prevX = snap.x;
    this._prevZ = snap.z;
    this._moveSpeed = 0;
  }

  pushSnap(snap) {
    this.prev = this.curr;
    this.curr = snap;
    this.t = 0;

    // Detect phase transition
    if (snap.ph && snap.ph > this._lastPhase) {
      this._phaseTransitionT = 1.0;
      this._lastPhase = snap.ph;
    }

    // Detect attack (HP drop of enemy = it's attacking)
    if (snap.f) {
      this._attackFlashT = 0.2;
    }
  }

  update(dt) {
    const c = this.curr;
    this._animTime += dt;

    if (c.dy) {
      return this._updateDeath(dt);
    }

    this.t = Math.min(1, this.t + dt / TICK_S);
    const k = this.t, a = this.prev, b = this.curr;

    // Calculate movement speed for animation blending
    const dx = b.x - this._prevX;
    const dz = b.z - this._prevZ;
    this._moveSpeed = lerp(this._moveSpeed, Math.hypot(dx, dz) / (dt || 0.016), 0.1);
    this._prevX = b.x;
    this._prevZ = b.z;

    // Spawn scale animation
    const targetScale = b.sp ? Math.max(0.05, this.size * (1 - 0.9)) : this.size;
    this.spawnScale = lerp(this.spawnScale, this.size, Math.min(1, dt * 4));
    const sc = b.sp ? this.spawnScale * 0.6 : this.size;
    this.mesh.scale.setScalar(sc);

    // Position interpolation
    this.mesh.position.set(lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.z, b.z, k));
    this.mesh.rotation.y = lerpAngle(a.yaw, b.yaw, k);

    // === BOSS-SPECIFIC ANIMATIONS ===
    if (this.isBoss) {
      this._updateBossAnimation(dt, b);
    } else {
      this._updateMobAnimation(dt, b);
    }

    // Phase transition effect
    if (this._phaseTransitionT > 0) {
      this._phaseTransitionT -= dt;
      const pt = this._phaseTransitionT;
      // Dramatic scale pulse
      const pulse = 1 + Math.sin(pt * Math.PI * 4) * 0.08 * pt;
      this.mesh.scale.multiplyScalar(pulse);
      // Bright flash
      this.bodyMat.emissiveIntensity = this.baseEmInt + pt * 2.0;
      // Slight rise
      this.mesh.position.y += pt * 0.3;
    }

    // Attack flash
    if (this._attackFlashT > 0) {
      this._attackFlashT -= dt;
    }

    // Damage flash + low HP + phase glow
    if (b.f) {
      this.bodyMat.emissive.setHex(0xffffff);
      this.bodyMat.emissiveIntensity = 0.9;
    } else if (this._phaseTransitionT <= 0) {
      const hpPct = b.hp / b.mhp;
      const lowHpBoost = hpPct < 0.3 ? (0.3 - hpPct) * 2.0 : 0;
      const phaseBoost = b.b && b.ph ? (b.ph - 1) * 0.15 : 0;
      this.bodyMat.emissive.setHex(this.baseEm);
      this.bodyMat.emissiveIntensity = this.baseEmInt + lowHpBoost + phaseBoost;
    }

    // Pulsing eyes (faster in higher phases)
    const eyeSpeed = b.b && b.ph ? 0.005 + (b.ph - 1) * 0.002 : 0.005;
    const eyePulse = 0.7 + Math.sin(performance.now() * eyeSpeed) * 0.3;
    for (let i = 0; i < this.eyeMats.length; i++) {
      this.eyeMats[i].color.copy(this.eyeBaseColors[i]).multiplyScalar(eyePulse);
    }

    // Phantom invisibility
    if (b.inv) {
      this.bodyMat.opacity = 0.15;
      this.bodyMat.transparent = true;
      this.bodyMat.depthWrite = false;
    } else if (this.bodyMat.opacity < 1 && !c.dy) {
      this.bodyMat.opacity = 1;
      this.bodyMat.transparent = false;
      this.bodyMat.depthWrite = true;
    }

    // Shield pulsation
    if (b.sh) {
      this.bodyMat.emissiveIntensity = this.baseEmInt + Math.sin(performance.now() * 0.008) * 0.25;
    }

    // Boss phase 4 berserk visual
    if (b.b && b.ph >= 4) {
      const berserkPulse = Math.sin(performance.now() * 0.01) * 0.3 + 0.3;
      this.bodyMat.emissiveIntensity += berserkPulse;
    }

    // HP bar billboard
    const pct = Math.max(0.001, b.hp / b.mhp);
    this.hpBar.fill.scale.x = pct;
    this.hpBar.fill.position.x = -(1 - pct) / 2;
    this.hpBar.fill.material.color.setHex(pct > 0.5 ? 0x3dff6a : pct > 0.25 ? 0xffc233 : 0xff2d3f);
    this.hpBar.group.updateWorldMatrix(true, false);
    this.hpBar.group.quaternion.copy(this.camera.quaternion);
    const damaged = b.hp < b.mhp;
    this.hpBar.group.visible = damaged && !b.sp;

    this._lastHp = b.hp;
    return false;
  }

  // ========================================================================
  // BOSS ANIMATIONS — unique idle/move/attack animations per boss type
  // ========================================================================
  _updateBossAnimation(dt, snap) {
    const t = this._animTime;
    const speed = this._moveSpeed;
    const isMoving = speed > 1.5;
    const moveBlend = Math.min(1, speed / 8);

    switch (this.type) {
      case 'rebradd':
        this._animRebradd(t, dt, isMoving, moveBlend, snap);
        break;
      case 'butcher':
        this._animButcher(t, dt, isMoving, moveBlend, snap);
        break;
      case 'necro':
        this._animNecro(t, dt, isMoving, moveBlend, snap);
        break;
      case 'golemKing':
        this._animGolemKing(t, dt, isMoving, moveBlend, snap);
        break;
      case 'firelord':
        this._animFirelord(t, dt, isMoving, moveBlend, snap);
        break;
      case 'shadowKing':
        this._animShadowKing(t, dt, isMoving, moveBlend, snap);
        break;
      case 'frostQueen':
        this._animFrostQueen(t, dt, isMoving, moveBlend, snap);
        break;
      case 'dragonLord':
        this._animDragonLord(t, dt, isMoving, moveBlend, snap);
        break;
      default:
        // Generic boss idle
        this.mesh.position.y += Math.sin(t * 2) * 0.04;
        break;
    }
  }

  // --- LORD REBRADD: skeletal float, bone rattle, axe sway, jaw chomp ---
  _animRebradd(t, dt, isMoving, moveBlend, snap) {
    const p = this.parts;
    // Ethereal floating bob (layered sine waves for organic feel)
    const floatY = Math.sin(t * 1.5) * 0.06 + Math.sin(t * 2.7) * 0.03 + Math.sin(t * 4.1) * 0.015;
    this.mesh.position.y += floatY;

    // Subtle skeletal sway
    this.mesh.rotation.z = Math.sin(t * 0.9) * 0.035;
    this.mesh.rotation.x = Math.sin(t * 0.7) * 0.02;

    // Movement: lean forward + faster bob + arm swing
    if (isMoving) {
      this.mesh.rotation.x += moveBlend * 0.08;
      this.mesh.position.y += Math.abs(Math.sin(t * 5)) * 0.04 * moveBlend;
    }

    // Jaw animation: slow chomp idle, fast on attack
    if (p.jaw) {
      const jawSpeed = this._attackFlashT > 0 ? 25 : 2;
      const jawAmt = this._attackFlashT > 0 ? 0.12 : 0.04;
      p.jaw.rotation.x = Math.sin(t * jawSpeed) * jawAmt;
      p.jaw.position.y = 2.42 - Math.abs(Math.sin(t * jawSpeed)) * jawAmt * 0.5;
    }

    // Axe glow pulsation (faster in higher phases)
    const glowSpeed = 3 + (snap.ph - 1) * 2;
    const glowPulse = 0.2 + Math.sin(t * glowSpeed) * 0.15;
    if (p.leftAxeGlow) p.leftAxeGlow.material.opacity = glowPulse;
    if (p.rightAxeGlow) p.rightAxeGlow.material.opacity = glowPulse;

    // Bone fragments: orbit and bob independently
    if (p.boneFragments) {
      for (let i = 0; i < p.boneFragments.length; i++) {
        const frag = p.boneFragments[i];
        const a = (i / p.boneFragments.length) * Math.PI * 2 + t * (0.5 + i * 0.1);
        const r = 0.7 + Math.sin(t * 1.5 + i) * 0.15;
        frag.position.x = Math.cos(a) * r;
        frag.position.z = Math.sin(a) * r;
        frag.position.y = 1.2 + i * 0.25 + Math.sin(t * 2 + i * 1.3) * 0.15;
        frag.rotation.x += dt * (1 + i * 0.3);
        frag.rotation.y += dt * (0.8 + i * 0.2);
      }
    }

    // Frost aura: rotate and pulse
    if (p.frostAura) {
      p.frostAura.rotation.z = t * 0.3;
      p.frostAura.material.opacity = 0.12 + Math.sin(t * 2) * 0.06;
      const auraScale = 1 + Math.sin(t * 1.5) * 0.08;
      p.frostAura.scale.setScalar(auraScale);
    }

    // Bone rattle: subtle scale jitter on attack
    if (this._attackFlashT > 0) {
      const rattle = Math.sin(t * 40) * 0.015 * this._attackFlashT;
      this.mesh.rotation.z += rattle;
      this.mesh.position.y += Math.abs(rattle) * 2;
    }

    // Phase 3+: more aggressive floating, slight rotation, faster fragments
    if (snap.ph >= 3) {
      this.mesh.rotation.y += Math.sin(t * 0.5) * 0.02;
      this.mesh.position.y += Math.sin(t * 3) * 0.02;
    }

    // Phase 4: berserk — rapid vibration, intense glow
    if (snap.ph >= 4) {
      this.mesh.rotation.z += Math.sin(t * 15) * 0.01;
      if (p.leftAxeGlow) p.leftAxeGlow.material.opacity = 0.5 + Math.sin(t * 10) * 0.3;
      if (p.rightAxeGlow) p.rightAxeGlow.material.opacity = 0.5 + Math.sin(t * 10 + 1) * 0.3;
    }
  }

  // --- BUTCHER: heavy breathing, meat jiggle, cleaver sway, head bob ---
  _animButcher(t, dt, isMoving, moveBlend, snap) {
    const p = this.parts;
    // Heavy breathing (torso expand/contract)
    const breathe = Math.sin(t * 2.2) * 0.02;
    this.mesh.scale.x *= (1 + breathe);
    this.mesh.scale.z *= (1 + breathe * 0.7);

    // Belly jiggle (delayed follow to breathing)
    if (p.belly) {
      const jiggle = Math.sin(t * 2.2 + 0.5) * 0.015 + Math.sin(t * 4.4) * 0.005;
      p.belly.scale.x = 1 + jiggle;
      p.belly.scale.y = 1 - jiggle * 0.5;
    }

    // Head bob (menacing slow look around)
    if (p.head) {
      p.head.rotation.y = Math.sin(t * 0.7) * 0.12;
      p.head.rotation.z = Math.sin(t * 1.1) * 0.04;
      // On attack: snap head toward target
      if (this._attackFlashT > 0) {
        p.head.rotation.x = -0.15 * Math.sin(this._attackFlashT * Math.PI / 0.2);
      } else {
        p.head.rotation.x = Math.sin(t * 0.5) * 0.03;
      }
    }

    // Cleaver sway (idle: slow pendulum, attack: quick chop)
    if (p.cleaver) {
      if (this._attackFlashT > 0) {
        const chop = Math.sin(this._attackFlashT * Math.PI / 0.2);
        p.cleaver.rotation.z = -chop * 0.4;
        p.cleaver.position.y = -0.12 - chop * 0.15;
      } else {
        p.cleaver.rotation.z = Math.sin(t * 1.5) * 0.06;
      }
    }

    // Heavy walk bob (slow, heavy footsteps)
    if (isMoving) {
      const stomp = Math.abs(Math.sin(t * 4));
      this.mesh.position.y += stomp * 0.06 * moveBlend;
      this.mesh.rotation.z = Math.sin(t * 4) * 0.04 * moveBlend;
      this.mesh.rotation.x = moveBlend * 0.06; // lean forward
    }

    // Idle: slight sway, menacing
    this.mesh.rotation.z += Math.sin(t * 1.2) * 0.02;
    this.mesh.position.y += Math.sin(t * 1.8) * 0.02;

    // Attack: quick lunge forward
    if (this._attackFlashT > 0) {
      const lunge = Math.sin(this._attackFlashT * Math.PI / 0.2) * 0.15;
      this.mesh.rotation.x += lunge;
      this.mesh.position.y -= lunge * 0.3;
    }

    // Blood rage (phase 3+): faster breathing, redder, shaking
    if (snap.ph >= 3) {
      const rage = Math.sin(t * 6) * 0.015;
      this.mesh.rotation.z += rage;
      this.mesh.position.y += Math.abs(Math.sin(t * 8)) * 0.02;
      // Faster breathing
      this.mesh.scale.x *= (1 + Math.sin(t * 5) * 0.01);
    }

    // Phase 4: berserk — constant tremor
    if (snap.ph >= 4) {
      this.mesh.position.x += Math.sin(t * 20) * 0.008;
      this.mesh.position.z += Math.cos(t * 18) * 0.008;
    }
  }

  // --- NECRO: floating, robe sway, casting gestures, head tracking, souls orbit ---
  _animNecro(t, dt, isMoving, moveBlend, snap) {
    const p = this.parts;
    // Mystical float (layered sine waves)
    this.mesh.position.y += Math.sin(t * 2 + 1) * 0.08 + Math.sin(t * 3.3) * 0.03;

    // Robe sway
    this.mesh.rotation.z = Math.sin(t * 1.3) * 0.04;
    this.mesh.rotation.x = Math.sin(t * 0.8) * 0.02;

    // Head tracking (slow look around)
    if (p.head) {
      p.head.rotation.y = Math.sin(t * 0.6) * 0.15;
      p.head.rotation.x = Math.sin(t * 0.9) * 0.05;
    }

    // Robe billow
    if (p.robe) {
      p.robe.rotation.z = Math.sin(t * 1.1) * 0.03;
      const robeScale = 1 + Math.sin(t * 2) * 0.01;
      p.robe.scale.x = robeScale;
      p.robe.scale.z = robeScale;
    }

    // Souls orbit (float around boss)
    if (p.souls) {
      for (let i = 0; i < p.souls.length; i++) {
        const soul = p.souls[i];
        const a = (i / p.souls.length) * Math.PI * 2 + t * (0.4 + i * 0.08);
        const r = 0.8 + Math.sin(t * 1.2 + i * 1.5) * 0.2;
        soul.position.x = Math.cos(a) * r;
        soul.position.z = Math.sin(a) * r;
        soul.position.y = 1.5 + i * 0.2 + Math.sin(t * 1.8 + i * 0.9) * 0.2;
        // Pulse size
        const pulse = 1 + Math.sin(t * 3 + i * 2) * 0.2;
        soul.scale.setScalar(pulse);
      }
    }

    // Dark aura rotation and pulse
    if (p.darkAura) {
      p.darkAura.rotation.z = t * 0.2;
      p.darkAura.material.opacity = 0.15 + Math.sin(t * 1.5) * 0.06;
      const auraScale = 1 + Math.sin(t * 1.2) * 0.06;
      p.darkAura.scale.setScalar(auraScale);
    }

    // Casting animation: slight rise + pulse + souls converge
    if (this._attackFlashT > 0) {
      this.mesh.position.y += this._attackFlashT * 0.5;
      const castPulse = Math.sin(this._attackFlashT * Math.PI / 0.2) * 0.05;
      this.mesh.scale.multiplyScalar(1 + castPulse);
      if (p.head) p.head.rotation.x = -0.2; // look up while casting
      // Souls rush inward during cast
      if (p.souls) {
        for (const soul of p.souls) {
          soul.position.x *= 0.7;
          soul.position.z *= 0.7;
        }
      }
    }

    // Strafe movement
    if (isMoving) {
      this.mesh.rotation.z += Math.sin(t * 3) * 0.03 * moveBlend;
    }

    // Phase 3+: darker aura, faster float, souls agitated
    if (snap.ph >= 3) {
      this.mesh.position.y += Math.sin(t * 3.5) * 0.03;
      if (p.souls) {
        for (let i = 0; i < p.souls.length; i++) {
          p.souls[i].position.y += Math.sin(t * 5 + i) * 0.05;
        }
      }
    }

    // Phase 4: berserk — intense soul orbit, dark aura flare
    if (snap.ph >= 4) {
      this.mesh.rotation.z += Math.sin(t * 8) * 0.01;
      if (p.darkAura) p.darkAura.material.opacity = 0.3 + Math.sin(t * 6) * 0.1;
    }
  }

  // --- GOLEM KING: heavy stomps, ground shake, fist raises, crown glow, debris orbit ---
  _animGolemKing(t, dt, isMoving, moveBlend, snap) {
    const p = this.parts;
    // Very subtle idle (barely moves, feels heavy)
    this.mesh.position.y += Math.sin(t * 1.2) * 0.015;

    // Fist idle sway (slow, heavy)
    if (p.leftFist) {
      p.leftFist.position.y = 1.05 + Math.sin(t * 1.5) * 0.03;
      p.leftFist.rotation.z = Math.sin(t * 1.2) * 0.04;
    }
    if (p.rightFist) {
      p.rightFist.position.y = 1.05 + Math.sin(t * 1.5 + Math.PI) * 0.03;
      p.rightFist.rotation.z = Math.sin(t * 1.2 + Math.PI) * 0.04;
    }

    // Head slow look
    if (p.head) {
      p.head.rotation.y = Math.sin(t * 0.5) * 0.08;
    }

    // Crown glow pulsation
    if (p.crown) {
      p.crown.material.emissiveIntensity = 0.4 + Math.sin(t * 2) * 0.2;
    }

    // Debris orbit (floating rocks around boss)
    if (p.debris) {
      for (let i = 0; i < p.debris.length; i++) {
        const deb = p.debris[i];
        const a = (i / p.debris.length) * Math.PI * 2 + t * (0.3 + i * 0.06);
        const r = 1.0 + Math.sin(t * 0.8 + i * 1.2) * 0.2;
        deb.position.x = Math.cos(a) * r;
        deb.position.z = Math.sin(a) * r;
        deb.position.y = 0.8 + i * 0.3 + Math.sin(t * 1.2 + i * 0.7) * 0.15;
        deb.rotation.x += dt * (0.5 + i * 0.2);
        deb.rotation.y += dt * (0.3 + i * 0.15);
      }
    }

    // Earth aura pulse
    if (p.earthAura) {
      p.earthAura.rotation.z = t * 0.15;
      p.earthAura.material.opacity = 0.12 + Math.sin(t * 1.5) * 0.05;
      const auraScale = 1 + Math.sin(t * 1.0) * 0.05;
      p.earthAura.scale.setScalar(auraScale);
    }

    // Heavy stomping walk
    if (isMoving) {
      const stomp = Math.abs(Math.sin(t * 3));
      this.mesh.position.y += stomp * 0.08 * moveBlend;
      this.mesh.rotation.z = Math.sin(t * 3) * 0.03 * moveBlend;
      // Ground shake feel
      this.mesh.position.x += Math.sin(t * 6) * 0.01 * moveBlend;
      // Alternate fist swing while walking
      if (p.leftFist) p.leftFist.position.y = 1.05 + Math.sin(t * 3) * 0.08 * moveBlend;
      if (p.rightFist) p.rightFist.position.y = 1.05 + Math.sin(t * 3 + Math.PI) * 0.08 * moveBlend;
      // Debris agitated while moving
      if (p.debris) {
        for (const deb of p.debris) {
          deb.position.y += Math.sin(t * 4) * 0.03;
        }
      }
    }

    // Slam animation: squash down + fists raise then slam
    if (this._attackFlashT > 0) {
      const slamPhase = this._attackFlashT / 0.2;
      if (slamPhase > 0.5) {
        // Wind up: rise + fists up
        this.mesh.position.y += (slamPhase - 0.5) * 0.4;
        if (p.leftFist) p.leftFist.position.y = 1.05 + (slamPhase - 0.5) * 0.6;
        if (p.rightFist) p.rightFist.position.y = 1.05 + (slamPhase - 0.5) * 0.6;
      } else {
        // Slam down: squash + fists down
        this.mesh.scale.y *= (1 - slamPhase * 0.15);
        this.mesh.scale.x *= (1 + slamPhase * 0.08);
        this.mesh.scale.z *= (1 + slamPhase * 0.08);
        if (p.leftFist) p.leftFist.position.y = 1.05 - slamPhase * 0.3;
        if (p.rightFist) p.rightFist.position.y = 1.05 - slamPhase * 0.3;
        // Debris scatter on slam
        if (p.debris) {
          for (const deb of p.debris) {
            deb.position.y += 0.1;
          }
        }
      }
    }

    // Fortify: pulse larger
    if (snap.ph >= 3) {
      this.mesh.position.y += Math.sin(t * 2) * 0.01;
      if (p.earthAura) p.earthAura.material.opacity = 0.2 + Math.sin(t * 3) * 0.08;
    }

    // Phase 4: berserk — debris orbit faster, ground shake
    if (snap.ph >= 4) {
      this.mesh.position.x += Math.sin(t * 12) * 0.006;
      this.mesh.position.z += Math.cos(t * 10) * 0.006;
      if (p.debris) {
        for (let i = 0; i < p.debris.length; i++) {
          p.debris[i].rotation.x += dt * 2;
          p.debris[i].rotation.y += dt * 1.5;
        }
      }
    }
  }

  // --- FIRELORD: flame flicker, hovering, fiery presence, head tracking, embers ---
  _animFirelord(t, dt, isMoving, moveBlend, snap) {
    const p = this.parts;
    // Fiery hover
    this.mesh.position.y += Math.sin(t * 2.5) * 0.06 + 0.05;

    // Flame flicker (scale jitter)
    const flicker = 1 + Math.sin(t * 12) * 0.01 + Math.sin(t * 7.3) * 0.008;
    this.mesh.scale.multiplyScalar(flicker);

    // Sway
    this.mesh.rotation.z = Math.sin(t * 1.5) * 0.03;

    // Head tracking
    if (p.head) {
      p.head.rotation.y = Math.sin(t * 0.8) * 0.1;
      p.head.rotation.x = Math.sin(t * 1.2) * 0.04;
    }

    // Animate flame cones (flicker individually)
    if (p.flames) {
      for (let i = 0; i < p.flames.length; i++) {
        const flame = p.flames[i];
        const flick = Math.sin(t * (8 + i * 2) + i * 1.7) * 0.15;
        flame.scale.y = 1 + flick;
        flame.scale.x = 1 - flick * 0.3;
        flame.position.y += Math.sin(t * (6 + i) + i) * 0.003;
      }
    }

    // Embers float (rising sparks)
    if (p.embers) {
      for (let i = 0; i < p.embers.length; i++) {
        const ember = p.embers[i];
        const a = (i / p.embers.length) * Math.PI * 2 + t * (0.5 + i * 0.1);
        const r = 0.6 + Math.sin(t * 0.9 + i * 1.3) * 0.2;
        ember.position.x = Math.cos(a) * r;
        ember.position.z = Math.sin(a) * r;
        ember.position.y = 1.0 + ((t * 0.5 + i * 0.4) % 2.0);
        // Fade out at top
        const lifePct = ((t * 0.5 + i * 0.4) % 2.0) / 2.0;
        ember.material.opacity = 1 - lifePct * 0.7;
        const pulse = 0.8 + Math.sin(t * 5 + i * 2) * 0.3;
        ember.scale.setScalar(pulse);
      }
    }

    // Fire aura pulse
    if (p.fireAura) {
      p.fireAura.rotation.z = t * 0.3;
      p.fireAura.material.opacity = 0.15 + Math.sin(t * 2) * 0.07;
      const auraScale = 1 + Math.sin(t * 1.5) * 0.06;
      p.fireAura.scale.setScalar(auraScale);
    }

    if (isMoving) {
      this.mesh.rotation.x = moveBlend * 0.05;
      this.mesh.position.y += Math.sin(t * 4) * 0.03 * moveBlend;
    }

    // Attack: flare up
    if (this._attackFlashT > 0) {
      const flare = Math.sin(this._attackFlashT * Math.PI / 0.2);
      this.mesh.scale.multiplyScalar(1 + flare * 0.08);
      this.mesh.position.y += flare * 0.15;
      if (p.head) p.head.rotation.x = -0.15 * flare; // rear up
      // Embers burst outward on attack
      if (p.embers) {
        for (const ember of p.embers) {
          ember.position.x *= 1.3;
          ember.position.z *= 1.3;
        }
      }
    }

    // Phase 3+: fire aura visual (faster flicker, bigger flames)
    if (snap.ph >= 3 && p.flames) {
      for (const flame of p.flames) {
        flame.scale.y *= 1.3;
      }
      if (p.fireAura) p.fireAura.material.opacity = 0.25 + Math.sin(t * 3) * 0.1;
    }

    // Phase 4: berserk — intense fire, rapid ember rise
    if (snap.ph >= 4) {
      this.mesh.rotation.z += Math.sin(t * 10) * 0.008;
      if (p.fireAura) p.fireAura.material.opacity = 0.35 + Math.sin(t * 5) * 0.1;
    }
  }

  // --- SHADOW KING: teleport flicker, shadow sway, cape flow, tendrils, head tracking ---
  _animShadowKing(t, dt, isMoving, moveBlend, snap) {
    const p = this.parts;
    // Shadowy float
    this.mesh.position.y += Math.sin(t * 2.2) * 0.05 + 0.03;

    // Menacing sway
    this.mesh.rotation.z = Math.sin(t * 1.1) * 0.04;
    this.mesh.rotation.y += Math.sin(t * 0.6) * 0.015;

    // Head tracking (quick, darting)
    if (p.head) {
      p.head.rotation.y = Math.sin(t * 1.5) * 0.15;
      p.head.rotation.x = Math.sin(t * 2) * 0.05;
    }

    // Cape flow (billowing)
    if (p.cape) {
      p.cape.rotation.x = Math.sin(t * 1.8) * 0.06;
      p.cape.rotation.z = Math.sin(t * 1.2) * 0.04;
      p.cape.scale.y = 1 + Math.sin(t * 2.5) * 0.03;
    }

    // Tendrils wave (shadow tentacles from back)
    if (p.tendrils) {
      for (let i = 0; i < p.tendrils.length; i++) {
        const tendril = p.tendrils[i];
        tendril.rotation.x = 0.5 + i * 0.1 + Math.sin(t * 2 + i * 0.8) * 0.15;
        tendril.rotation.z = (i - 1.5) * 0.2 + Math.sin(t * 1.5 + i * 1.2) * 0.1;
        tendril.position.y = 1.3 + i * 0.15 + Math.sin(t * 1.8 + i) * 0.05;
      }
    }

    // Shadow particles orbit
    if (p.shadowParticles) {
      for (let i = 0; i < p.shadowParticles.length; i++) {
        const sp = p.shadowParticles[i];
        const a = (i / p.shadowParticles.length) * Math.PI * 2 + t * (0.4 + i * 0.07);
        const r = 0.6 + Math.sin(t * 1.0 + i * 1.1) * 0.15;
        sp.position.x = Math.cos(a) * r;
        sp.position.z = Math.sin(a) * r;
        sp.position.y = 0.8 + i * 0.2 + Math.sin(t * 1.5 + i * 0.6) * 0.15;
        sp.rotation.x += dt * (1 + i * 0.3);
        sp.rotation.y += dt * (0.8 + i * 0.2);
      }
    }

    // Dark aura pulse
    if (p.darkAura) {
      p.darkAura.rotation.z = t * 0.25;
      p.darkAura.material.opacity = 0.15 + Math.sin(t * 1.8) * 0.06;
      const auraScale = 1 + Math.sin(t * 1.3) * 0.05;
      p.darkAura.scale.setScalar(auraScale);
    }

    // Teleport flicker effect
    if (this._attackFlashT > 0) {
      const flicker = Math.sin(this._attackFlashT * 30) > 0 ? 1 : 0.3;
      this.bodyMat.opacity = flicker;
      this.bodyMat.transparent = flicker < 1;
      // Tendrils lash out on attack
      if (p.tendrils) {
        for (const tendril of p.tendrils) {
          tendril.rotation.x += 0.3;
        }
      }
    }

    if (isMoving) {
      // Gliding movement (smooth, no bob)
      this.mesh.rotation.x = moveBlend * 0.04;
      if (p.cape) p.cape.rotation.x += moveBlend * 0.1; // cape trails behind
      // Tendrils trail behind while moving
      if (p.tendrils) {
        for (const tendril of p.tendrils) {
          tendril.rotation.x += moveBlend * 0.15;
        }
      }
    }

    // Phase 3+: more erratic, tendrils agitated
    if (snap.ph >= 3) {
      this.mesh.rotation.z += Math.sin(t * 4) * 0.02;
      if (p.tendrils) {
        for (let i = 0; i < p.tendrils.length; i++) {
          p.tendrils[i].rotation.z += Math.sin(t * 5 + i) * 0.05;
        }
      }
    }

    // Phase 4: berserk — shadow particles swirl faster, dark aura flare
    if (snap.ph >= 4) {
      this.mesh.position.x += Math.sin(t * 15) * 0.005;
      this.mesh.position.z += Math.cos(t * 13) * 0.005;
      if (p.darkAura) p.darkAura.material.opacity = 0.3 + Math.sin(t * 5) * 0.1;
    }
  }

  // --- FROST QUEEN: elegant float, ice shimmer, regal, crystal orbit, snowflakes ---
  _animFrostQueen(t, dt, isMoving, moveBlend, snap) {
    const p = this.parts;
    // Elegant float
    this.mesh.position.y += Math.sin(t * 1.8) * 0.07 + 0.04;

    // Regal sway (slow, graceful)
    this.mesh.rotation.z = Math.sin(t * 0.8) * 0.025;
    this.mesh.rotation.x = Math.sin(t * 0.6) * 0.015;

    // Head tracking (regal, slow)
    if (p.head) {
      p.head.rotation.y = Math.sin(t * 0.5) * 0.1;
      p.head.rotation.x = Math.sin(t * 0.7) * 0.03;
    }

    // Ice crystals orbit
    if (p.crystals) {
      for (let i = 0; i < p.crystals.length; i++) {
        const cr = p.crystals[i];
        const a = (i / p.crystals.length) * Math.PI * 2 + t * (0.3 + i * 0.05);
        const r = 0.5 + Math.sin(t * 1.2 + i) * 0.1;
        cr.position.x = Math.cos(a) * r;
        cr.position.z = Math.sin(a) * r;
        cr.position.y = 0.6 + i * 0.2 + Math.sin(t * 1.5 + i * 0.8) * 0.1;
        cr.rotation.x += dt * 0.5;
        cr.rotation.y += dt * 0.3;
      }
    }

    // Snowflakes drift (gentle floating)
    if (p.snowflakes) {
      for (let i = 0; i < p.snowflakes.length; i++) {
        const sf = p.snowflakes[i];
        const a = (i / p.snowflakes.length) * Math.PI * 2 + t * (0.2 + i * 0.04);
        const r = 0.7 + Math.sin(t * 0.7 + i * 1.4) * 0.2;
        sf.position.x = Math.cos(a) * r;
        sf.position.z = Math.sin(a) * r;
        // Gentle downward drift with reset
        sf.position.y = 1.0 + ((2.5 - (t * 0.3 + i * 0.5) % 2.5));
        sf.rotation.x += dt * 0.8;
        sf.rotation.z += dt * 0.5;
        // Twinkle
        sf.material.opacity = 0.4 + Math.sin(t * 4 + i * 2) * 0.2;
      }
    }

    // Frost aura pulse
    if (p.frostAura) {
      p.frostAura.rotation.z = t * 0.2;
      p.frostAura.material.opacity = 0.15 + Math.sin(t * 1.5) * 0.06;
      const auraScale = 1 + Math.sin(t * 1.2) * 0.05;
      p.frostAura.scale.setScalar(auraScale);
    }

    // Ice shimmer (subtle scale pulse)
    const shimmer = 1 + Math.sin(t * 5) * 0.005;
    this.mesh.scale.multiplyScalar(shimmer);

    if (isMoving) {
      this.mesh.position.y += Math.sin(t * 3) * 0.02 * moveBlend;
      this.mesh.rotation.z += Math.sin(t * 2.5) * 0.02 * moveBlend;
    }

    // Casting: rise + spread + crystals expand
    if (this._attackFlashT > 0) {
      const cast = Math.sin(this._attackFlashT * Math.PI / 0.2);
      this.mesh.position.y += cast * 0.2;
      this.mesh.scale.multiplyScalar(1 + cast * 0.04);
      if (p.head) p.head.rotation.x = -0.1 * cast; // look up
      // Crystals expand outward during cast
      if (p.crystals) {
        for (const cr of p.crystals) {
          cr.position.x *= 1.2;
          cr.position.z *= 1.2;
        }
      }
    }

    // Phase 4: absolute zero visual — intense shimmer, snowflakes swirl faster
    if (snap.ph >= 4 && p.crystals) {
      for (const cr of p.crystals) {
        cr.scale.setScalar(1.3 + Math.sin(t * 8) * 0.2);
      }
      if (p.frostAura) p.frostAura.material.opacity = 0.3 + Math.sin(t * 4) * 0.1;
    }
  }

  // --- DRAGON LORD: powerful stance, wing flap, tail sway, head tracking, embers ---
  _animDragonLord(t, dt, isMoving, moveBlend, snap) {
    const p = this.parts;
    // Powerful idle bob
    this.mesh.position.y += Math.sin(t * 1.5) * 0.04;

    // Wing flap (continuous, speed varies)
    const wingSpeed = isMoving ? 4 : 2.5;
    const wingAmt = isMoving ? 0.06 : 0.03;
    if (p.leftWing) {
      p.leftWing.rotation.z = 0.3 + Math.sin(t * wingSpeed) * wingAmt;
    }
    if (p.rightWing) {
      p.rightWing.rotation.z = -0.3 - Math.sin(t * wingSpeed) * wingAmt;
    }

    // Tail sway (sinuous)
    if (p.tail) {
      p.tail.rotation.y = Math.sin(t * 1.2) * 0.15;
      p.tail.rotation.x = 0.8 + Math.sin(t * 0.8) * 0.05;
    }

    // Head tracking (powerful, slow)
    if (p.head) {
      p.head.rotation.y = Math.sin(t * 0.6) * 0.1;
      p.head.rotation.x = Math.sin(t * 0.9) * 0.04;
    }

    // Embers float (rising sparks around dragon)
    if (p.embers) {
      for (let i = 0; i < p.embers.length; i++) {
        const ember = p.embers[i];
        const a = (i / p.embers.length) * Math.PI * 2 + t * (0.4 + i * 0.08);
        const r = 0.8 + Math.sin(t * 0.8 + i * 1.2) * 0.25;
        ember.position.x = Math.cos(a) * r;
        ember.position.z = Math.sin(a) * r;
        ember.position.y = 1.0 + ((t * 0.4 + i * 0.35) % 2.5);
        // Fade out at top
        const lifePct = ((t * 0.4 + i * 0.35) % 2.5) / 2.5;
        ember.material.opacity = 1 - lifePct * 0.6;
        const pulse = 0.7 + Math.sin(t * 4 + i * 1.5) * 0.3;
        ember.scale.setScalar(pulse);
      }
    }

    // Fire aura pulse
    if (p.fireAura) {
      p.fireAura.rotation.z = t * 0.2;
      p.fireAura.material.opacity = 0.12 + Math.sin(t * 1.5) * 0.05;
      const auraScale = 1 + Math.sin(t * 1.0) * 0.04;
      p.fireAura.scale.setScalar(auraScale);
    }

    // Heavy walk
    if (isMoving) {
      const stomp = Math.abs(Math.sin(t * 3.5));
      this.mesh.position.y += stomp * 0.05 * moveBlend;
      this.mesh.rotation.z = Math.sin(t * 3.5) * 0.03 * moveBlend;
      this.mesh.rotation.x = moveBlend * 0.05;
    }

    // Fire breath: rear up + wings spread + embers burst
    if (this._attackFlashT > 0) {
      const rear = Math.sin(this._attackFlashT * Math.PI / 0.2);
      this.mesh.rotation.x -= rear * 0.12;
      this.mesh.position.y += rear * 0.2;
      if (p.head) p.head.rotation.x = -0.2 * rear; // head up for breath
      if (p.leftWing) p.leftWing.rotation.z = 0.3 + rear * 0.15;
      if (p.rightWing) p.rightWing.rotation.z = -0.3 - rear * 0.15;
      // Embers burst outward on breath
      if (p.embers) {
        for (const ember of p.embers) {
          ember.position.x *= 1.2;
          ember.position.z *= 1.2;
        }
      }
    }

    // Flying: rise + tilt + fast wing flap + embers trail
    if (snap.ph >= 3 && this.mesh.position.y > 1) {
      this.mesh.rotation.x = -0.15;
      if (p.leftWing) p.leftWing.rotation.z = 0.3 + Math.sin(t * 8) * 0.12;
      if (p.rightWing) p.rightWing.rotation.z = -0.3 - Math.sin(t * 8) * 0.12;
      if (p.tail) p.tail.rotation.y = Math.sin(t * 2) * 0.2;
      // Embers trail behind while flying
      if (p.embers) {
        for (const ember of p.embers) {
          ember.position.y -= 0.05;
        }
      }
    }

    // Phase 4: berserk — intense fire aura, rapid wing flap
    if (snap.ph >= 4) {
      if (p.leftWing) p.leftWing.rotation.z = 0.3 + Math.sin(t * 6) * 0.08;
      if (p.rightWing) p.rightWing.rotation.z = -0.3 - Math.sin(t * 6) * 0.08;
      if (p.fireAura) p.fireAura.material.opacity = 0.25 + Math.sin(t * 4) * 0.1;
      this.mesh.position.x += Math.sin(t * 10) * 0.005;
    }
  }

  // ========================================================================
  // MOB ANIMATIONS — simpler idle/move for regular enemies
  // ========================================================================
  _updateMobAnimation(dt, snap) {
    const t = this._animTime;
    const speed = this._moveSpeed;
    const isMoving = speed > 1;
    const moveBlend = Math.min(1, speed / 6);

    switch (this.type) {
      case 'runner':
      case 'sprinter':
        // Fast bob, lean forward
        if (isMoving) {
          this.mesh.position.y += Math.abs(Math.sin(t * 8)) * 0.05 * moveBlend;
          this.mesh.rotation.x = moveBlend * 0.12;
        }
        this.mesh.position.y += Math.sin(t * 3) * 0.02;
        break;

      case 'tank':
      case 'golem':
        // Heavy stomp
        if (isMoving) {
          this.mesh.position.y += Math.abs(Math.sin(t * 3)) * 0.04 * moveBlend;
          this.mesh.rotation.z = Math.sin(t * 3) * 0.02 * moveBlend;
        }
        this.mesh.position.y += Math.sin(t * 1.5) * 0.015;
        break;

      case 'assassin':
      case 'phantom':
        // Smooth glide, slight sway
        this.mesh.position.y += Math.sin(t * 2.5) * 0.04;
        this.mesh.rotation.z = Math.sin(t * 1.5) * 0.03;
        if (isMoving) {
          this.mesh.rotation.x = moveBlend * 0.06;
        }
        break;

      case 'shooter':
      case 'frost_mage':
      case 'summoner':
        // Caster sway
        this.mesh.position.y += Math.sin(t * 2) * 0.03;
        this.mesh.rotation.z = Math.sin(t * 1.2) * 0.025;
        break;

      case 'exploder':
        // Pulsing (about to explode feel)
        const pulse = 1 + Math.sin(t * 6) * 0.03;
        this.mesh.scale.multiplyScalar(pulse);
        this.mesh.position.y += Math.sin(t * 4) * 0.03;
        break;

      case 'berserker':
        // Aggressive bounce
        if (isMoving) {
          this.mesh.position.y += Math.abs(Math.sin(t * 6)) * 0.04 * moveBlend;
          this.mesh.rotation.x = moveBlend * 0.08;
        }
        this.mesh.rotation.z = Math.sin(t * 2) * 0.03;
        break;

      default:
        // Generic idle bob
        this.mesh.position.y += Math.sin(t * 2) * 0.025;
        if (isMoving) {
          this.mesh.position.y += Math.abs(Math.sin(t * 5)) * 0.03 * moveBlend;
        }
        break;
    }

    // Attack lunge for melee mobs
    if (this._attackFlashT > 0 && (this.type === 'normal' || this.type === 'berserker' || this.type === 'assassin')) {
      const lunge = Math.sin(this._attackFlashT * Math.PI / 0.2) * 0.08;
      this.mesh.rotation.x += lunge;
    }
  }

  // ========================================================================
  // DEATH ANIMATION — unique per boss type
  // ========================================================================
  _updateDeath(dt) {
    this.deathT += dt;

    if (this.isBoss) {
      // Boss death: dramatic, longer
      if (this.deathT < 0.15) {
        // Flash white
        this.bodyMat.emissive.setHex(0xffffff);
        this.bodyMat.emissiveIntensity = 2.5;
      } else {
        // Slow crumble + fade
        const p = (this.deathT - 0.15) / 0.8;
        this.bodyMat.emissive.setHex(0xffffff);
        this.bodyMat.emissiveIntensity = Math.max(0, 2.0 * (1 - p));
        this.bodyMat.transparent = true;
        this.bodyMat.depthWrite = false;
        this.bodyMat.opacity = Math.max(0, 1 - p);

        // Boss-specific death
        switch (this.type) {
          case 'rebradd':
            // Bones scatter: rise + spin + shrink
            this.mesh.position.y += dt * 1.5;
            this.mesh.rotation.y += dt * 3;
            this.mesh.rotation.x += dt * 2;
            this.mesh.scale.multiplyScalar(Math.pow(0.3, dt));
            break;
          case 'butcher':
            // Collapse: fall + squash
            this.mesh.position.y -= dt * 2.5;
            this.mesh.scale.y *= Math.pow(0.2, dt);
            this.mesh.scale.x *= Math.pow(1.3, dt);
            this.mesh.rotation.z += dt * 1.5;
            break;
          case 'necro':
            // Dissolve: rise + fade + spin
            this.mesh.position.y += dt * 2;
            this.mesh.rotation.y += dt * 4;
            this.mesh.scale.multiplyScalar(Math.pow(0.25, dt));
            break;
          case 'golemKing':
            // Crumble: shake + sink
            this.mesh.position.x += Math.sin(this.deathT * 30) * 0.05;
            this.mesh.position.y -= dt * 1.5;
            this.mesh.scale.y *= Math.pow(0.4, dt);
            break;
          case 'firelord':
            // Explode: expand + fade
            this.mesh.scale.multiplyScalar(Math.pow(1.5, dt));
            this.mesh.rotation.y += dt * 5;
            break;
          case 'shadowKing':
            // Vanish: flicker + shrink
            this.bodyMat.opacity = Math.sin(this.deathT * 20) > 0 ? (1 - p) : 0;
            this.mesh.scale.multiplyScalar(Math.pow(0.2, dt));
            this.mesh.rotation.y += dt * 6;
            break;
          case 'frostQueen':
            // Shatter: rise + spin + shrink
            this.mesh.position.y += dt * 1.8;
            this.mesh.rotation.y += dt * 4;
            this.mesh.rotation.z += dt * 3;
            this.mesh.scale.multiplyScalar(Math.pow(0.3, dt));
            break;
          case 'dragonLord':
            // Fall: crash down + shake
            this.mesh.position.y -= dt * 3;
            this.mesh.rotation.x += dt * 1.5;
            this.mesh.position.x += Math.sin(this.deathT * 20) * 0.04;
            this.mesh.scale.multiplyScalar(Math.pow(0.4, dt));
            break;
          default:
            this.mesh.rotation.x += dt * 4;
            this.mesh.scale.multiplyScalar(Math.pow(0.12, dt));
            break;
        }
      }
      return this.deathT > 1.0;
    }

    // Regular mob death (faster)
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

  get pos() { return this.curr; }

  dispose() {
    this.scene.remove(this.mesh);
  }
}
