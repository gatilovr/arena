import * as THREE from 'three';

// ============================================================================
// EFFECTS — партиклы (кровь/искры), всплывающие цифры урона, кольца-новы.
// Чисто клиентская косметика, не влияет на симуляцию.
// ============================================================================
export class Effects {
  constructor(scene, camera, glowTex) {
    this.scene = scene;
    this.camera = camera;
    this.particles = [];
    this.arcs = [];
    this.pGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
    this.matCache = {};
    this.glowTex = glowTex;
    this.layer = document.getElementById('float-layer');
    this.floats = [];
    this.budget = 400;

    // particle pool: pre-allocate 400 reusable meshes
    this.pool = [];
    this.poolSize = 400;
    for (let i = 0; i < this.poolSize; i++) {
      const m = new THREE.Mesh(this.pGeo);
      m.visible = false;
      this.scene.add(m);
      this.pool.push(m);
    }
    this.poolIdx = 0;

    // floating text pool: pre-allocate 40 reusable DOM elements
    this.textPool = [];
    this.textPoolFree = [];
    for (let i = 0; i < 40; i++) {
      const el = document.createElement('div');
      el.className = 'float-text';
      el.style.display = 'none';
      this.layer.appendChild(el);
      this.textPool.push(el);
      this.textPoolFree.push(el);
    }
  }

  _mat(hex) {
    if (!this.matCache[hex]) this.matCache[hex] = new THREE.MeshBasicMaterial({ color: hex, toneMapped: false });
    return this.matCache[hex];
  }

  blood(pos, count, hex) {
    for (let i = 0; i < count; i++) {
      const m = this.pool[this.poolIdx % this.poolSize];
      this.poolIdx++;
      m.material = this._mat(hex);
      m.visible = true;
      m.position.set(pos.x + (Math.random() - 0.5) * 1.0, pos.y + (Math.random() - 0.5) * 0.7, pos.z + (Math.random() - 0.5) * 1.0);
      const s = 1.0 + Math.random() * 0.8;
      m.scale.set(s, s, s);
      m.rotation.set(0, 0, 0);
      this.particles.push({
        m,
        vel: new THREE.Vector3((Math.random() - 0.5) * 14, 2.5 + Math.random() * 8, (Math.random() - 0.5) * 14),
        rot: new THREE.Vector3((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16),
        life: 0.7 + Math.random() * 0.5
      });
    }
  }

  dust(pos, count) {
    for (let i = 0; i < count; i++) {
      const m = this.pool[this.poolIdx % this.poolSize];
      this.poolIdx++;
      m.material = this._mat(0x887766);
      m.visible = true;
      m.position.set(pos.x + (Math.random() - 0.5) * 1.5, 0.08, pos.z + (Math.random() - 0.5) * 1.5);
      m.scale.set(1.2, 0.4, 1.2);
      m.rotation.set(0, Math.random() * Math.PI * 2, 0);
      this.particles.push({
        m,
        vel: new THREE.Vector3((Math.random() - 0.5) * 4, 0.6 + Math.random() * 1.8, (Math.random() - 0.5) * 4),
        rot: new THREE.Vector3(0, (Math.random() - 0.5) * 5, 0),
        life: 0.4 + Math.random() * 0.3
      });
    }
  }

  spark(pos, count) {
    for (let i = 0; i < count; i++) {
      const hex = Math.random() > 0.5 ? 0xffffaa : 0xffffff;
      const m = this.pool[this.poolIdx % this.poolSize];
      this.poolIdx++;
      m.material = this._mat(hex);
      m.visible = true;
      const scale = 0.2 + Math.random() * 0.3;
      m.position.set(pos.x + (Math.random() - 0.5) * 0.3, pos.y + (Math.random() - 0.5) * 0.3, pos.z + (Math.random() - 0.5) * 0.3);
      m.scale.set(scale, scale, scale);
      m.rotation.set(0, 0, 0);
      const angle = Math.random() * Math.PI * 2;
      const speed = 8 + Math.random() * 14;
      this.particles.push({
        m,
        vel: new THREE.Vector3(Math.cos(angle) * speed, 1.5 + Math.random() * 5, Math.sin(angle) * speed),
        rot: new THREE.Vector3(0, 0, 0),
        life: 0.1 + Math.random() * 0.12
      });
    }
  }

  fire(pos, count) {
    for (let i = 0; i < count; i++) {
      const m = this.pool[this.poolIdx % this.poolSize];
      this.poolIdx++;
      const hex = Math.random() > 0.5 ? 0xff6600 : 0xff3300;
      m.material = this._mat(hex);
      m.visible = true;
      m.position.set(pos.x + (Math.random() - 0.5) * 0.6, pos.y + Math.random() * 0.3, pos.z + (Math.random() - 0.5) * 0.6);
      const s = 0.6 + Math.random() * 0.6;
      m.scale.set(s, s, s);
      m.rotation.set(0, 0, 0);
      this.particles.push({
        m,
        vel: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 4, (Math.random() - 0.5) * 3),
        rot: new THREE.Vector3(0, 0, 0),
        life: 0.3 + Math.random() * 0.3
      });
    }
  }

  ice(pos, count) {
    for (let i = 0; i < count; i++) {
      const m = this.pool[this.poolIdx % this.poolSize];
      this.poolIdx++;
      const hex = Math.random() > 0.5 ? 0xccffff : 0x88ccff;
      m.material = this._mat(hex);
      m.visible = true;
      m.position.set(pos.x + (Math.random() - 0.5) * 0.8, pos.y + 0.2 + Math.random() * 0.5, pos.z + (Math.random() - 0.5) * 0.8);
      const s = 0.4 + Math.random() * 0.5;
      m.scale.set(s, s, s);
      m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.particles.push({
        m,
        vel: new THREE.Vector3((Math.random() - 0.5) * 2, -0.5 + Math.random() * 1.5, (Math.random() - 0.5) * 2),
        rot: new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 0),
        life: 0.4 + Math.random() * 0.4
      });
    }
  }

  nova(pos, radius, color) {
    // Улучшенная нова: тройное кольцо + вспышка + glow + ударная волна
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(pos.x, 0.1, pos.z);
    this.scene.add(m);
    this.arcs.push({ m, mat, t: 0, life: 0.5, max: radius });

    // Inner flash
    const flashMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const flash = new THREE.Mesh(new THREE.CircleGeometry(1, 32), flashMat);
    flash.rotation.x = -Math.PI / 2; flash.position.set(pos.x, 0.08, pos.z);
    this.scene.add(flash);
    this.arcs.push({ m: flash, mat: flashMat, t: 0, life: 0.35, max: radius * 0.7 });

    // Second ring (delayed, thinner)
    const mat2 = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const m2 = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48), mat2);
    m2.rotation.x = -Math.PI / 2; m2.position.set(pos.x, 0.12, pos.z);
    this.scene.add(m2);
    this.arcs.push({ m: m2, mat: mat2, t: -0.08, life: 0.55, max: radius * 1.15 });

    // Glow sprite at center
    if (this.glowTex) {
      const glowMat = new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const glow = new THREE.Sprite(glowMat);
      glow.position.set(pos.x, 0.5, pos.z);
      glow.scale.setScalar(radius * 1.5);
      this.scene.add(glow);
      this.arcs.push({ m: glow, mat: glowMat, t: 0, life: 0.4, max: 1 });
    }

    // Vertical shockwave pillar (for large novas)
    if (radius > 4 && this.glowTex) {
      const pillarMat = new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const pillar = new THREE.Sprite(pillarMat);
      pillar.position.set(pos.x, radius * 0.4, pos.z);
      pillar.scale.set(radius * 0.6, radius * 1.2, 1);
      this.scene.add(pillar);
      this.arcs.push({ m: pillar, mat: pillarMat, t: 0, life: 0.35, max: 1 });
    }
  }

  floatText(text, pos, color, size = 15, cls = '') {
    let el;
    if (this.textPoolFree.length > 0) {
      el = this.textPoolFree.pop();
    } else {
      // берём самый старый из активных
      el = this.floats.shift().el;
    }
    el.className = 'float-text' + (cls ? ' ' + cls : '');
    el.textContent = text;
    el.style.color = color;
    el.style.fontSize = size + 'px';
    el.style.fontWeight = cls === 'crit' ? 'bold' : 'normal';
    el.style.textShadow = cls === 'crit'
      ? '0 0 8px ' + color + ', 0 0 16px ' + color
      : cls === 'heal' ? '0 0 6px #3dff6a' : '';
    el.style.display = 'block';
    this.floats.push({ el, pos: pos.clone(), life: cls === 'crit' ? 1.1 : 0.95, vy: cls === 'crit' ? 2.5 : 1.9 });
  }

  update(dt) {
    // партиклы
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { p.m.visible = false; this.particles.splice(i, 1); continue; }
      p.vel.y -= 14 * dt;
      p.m.position.addScaledVector(p.vel, dt);
      if (p.m.position.y < 0.05 && p.vel.y < 0) { p.m.position.y = 0.05; p.vel.y *= -0.35; p.vel.x *= 0.7; p.vel.z *= 0.7; }
      p.m.rotation.x += p.rot.x * dt;
      p.m.rotation.y += p.rot.y * dt;
      p.m.scale.multiplyScalar(Math.pow(0.5, dt));
    }
    // новы
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const a = this.arcs[i];
      a.t += dt;
      const k = a.t / a.life;
      a.mat.opacity = (1 - k) * 0.9;
      a.m.scale.setScalar(a.max * (0.15 + k * 0.95));
      if (k >= 1) { this.scene.remove(a.m); this.arcs.splice(i, 1); }
    }
    // огненные шары
    if (this.fireballs) {
      for (let i = this.fireballs.length - 1; i >= 0; i--) {
        const fb = this.fireballs[i];
        fb.life -= dt;
        fb.m.position.x += fb.vx * dt;
        fb.m.position.z += fb.vz * dt;
        if (fb.life <= 0) { this.scene.remove(fb.m); this.fireballs.splice(i, 1); }
      }
    }
    // лучи
    if (this.beams) {
      for (let i = this.beams.length - 1; i >= 0; i--) {
        const b = this.beams[i];
        b.t += dt;
        b.mat.opacity = 0.95 * (1 - b.t / b.life);
        if (b.t >= b.life) { this.scene.remove(b.line); this.beams.splice(i, 1); }
      }
    }
    // зоны
    if (this.zones) {
      for (let i = this.zones.length - 1; i >= 0; i--) {
        const z = this.zones[i];
        z.t += dt;
        z.mat.opacity = 0.18 * (1 - z.t / z.dur) + 0.05;
        if (z.t >= z.dur) { this.scene.remove(z.m); this.zones.splice(i, 1); }
      }
    }
    // вихри
    if (this.whirlMeshes) {
      for (let i = this.whirlMeshes.length - 1; i >= 0; i--) {
        const w = this.whirlMeshes[i];
        w.t += dt;
        const k = w.t / w.life;
        w.mat.opacity = (1 - k) * 0.85;
        w.m.rotation.y += 4 * dt;
        if (k >= 1) { this.scene.remove(w.m); this.whirlMeshes.splice(i, 1); }
      }
    }
    // телеграфы
    if (this.telegraphs) {
      for (let i = this.telegraphs.length - 1; i >= 0; i--) {
        const tg = this.telegraphs[i];
        tg.t += dt;
        const k = tg.t / tg.dur;
        const mat = tg.g.children[0]?.material;
        if (mat) mat.opacity = 0.5 * (0.6 + Math.sin(performance.now() * 0.014) * 0.4) * Math.min(1, k * 3);
        // Countdown ring shrinks
        if (tg.cdRing) {
          const cdScale = Math.max(0.01, 1 - k);
          tg.cdRing.scale.setScalar(cdScale);
          tg.cdRing.material.opacity = 0.4 * (1 - k * 0.5);
        }
        // Flash near end
        if (k > 0.85) {
          const flashMat = tg.g.children[1]?.material;
          if (flashMat) flashMat.opacity = 0.12 + (k - 0.85) * 2.0;
        }
        if (k >= 1) { this.scene.remove(tg.g); this.telegraphs.splice(i, 1); }
      }
    }
    // порталы (спавн-эффекты)
    if (this.portals) {
      for (let i = this.portals.length - 1; i >= 0; i--) {
        const p = this.portals[i];
        p.t += dt;
        const k = p.t / p.life;
        p.mat.opacity = (1 - k) * 0.85;
        p.m.scale.setScalar(1 + k * 4);
        if (k >= 1) { this.scene.remove(p.m); this.portals.splice(i, 1); }
      }
    }
    // цифры урона
    const v = new THREE.Vector3();
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.life -= dt;
      if (f.life <= 0) { f.el.style.display = 'none'; this.textPoolFree.push(f.el); this.floats.splice(i, 1); continue; }
      f.pos.y += f.vy * dt;
      v.copy(f.pos).project(this.camera);
      if (v.z > 1) { f.el.style.display = 'none'; continue; }
      f.el.style.display = 'block';
      f.el.style.left = ((v.x * 0.5 + 0.5) * innerWidth) + 'px';
      f.el.style.top = ((-v.y * 0.5 + 0.5) * innerHeight) + 'px';
      f.el.style.opacity = Math.min(1, f.life * 2.2);
    }
  }

  // --- новые эффекты скилов ---

  fireball(x, y, z, vx, vz, color) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    gl.scale.setScalar(2.2); m.add(gl);
    m.position.set(x, y, z);
    this.scene.add(m);
    this.fireballs = this.fireballs || [];
    this.fireballs.push({ m, vx, vz, life: 1.6 });
  }

  beam(x1, y1, z1, x2, y2, z2, color) {
    // Улучшенный луч: линия + glow-спрайт в середине + точки на концах
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x1, y1, z1),
      new THREE.Vector3(x2, y2, z2),
    ]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
    const line = new THREE.Line(g, mat);
    this.scene.add(line);
    this.beams = this.beams || [];
    this.beams.push({ line, mat, t: 0, life: 0.22 });

    // Glow at midpoint
    if (this.glowTex) {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, mz = (z1 + z2) / 2;
      const glowMat = new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const glow = new THREE.Sprite(glowMat);
      glow.position.set(mx, my, mz);
      glow.scale.setScalar(1.5);
      this.scene.add(glow);
      this.arcs.push({ m: glow, mat: glowMat, t: 0, life: 0.2, max: 1 });
    }

    // Impact point glow at target
    if (this.glowTex) {
      const impMat = new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const imp = new THREE.Sprite(impMat);
      imp.position.set(x2, y2, z2);
      imp.scale.setScalar(0.8);
      this.scene.add(imp);
      this.arcs.push({ m: imp, mat: impMat, t: 0, life: 0.18, max: 1 });
    }
  }

  zone(x, z, r, dur, color) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false, toneMapped: false });
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.06, z);
    this.scene.add(m);
    this.zones = this.zones || [];
    this.zones.push({ m, mat, t: 0, dur });
  }

  whirl(x, z, color) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const geo = new THREE.RingGeometry(1.0, 2.4, 48, 1, 0, 5.8);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, 0.3, z);
    this.scene.add(m);
    this.whirlMeshes = this.whirlMeshes || [];
    this.whirlMeshes.push({ m, mat, t: 0, life: 1.3 });
  }

  telegraph(x, z, r, dur, color) {
    const g = new THREE.Group();
    // Outer ring (pulsing)
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2;
    // Inner fill (semi-transparent, animated)
    const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    fill.rotation.x = -Math.PI / 2;
    // Cross-hair lines for better readability
    const lineMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false });
    const line1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.001, 2), lineMat);
    const line2 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.001, 0.02), lineMat);
    // Countdown ring (shrinks over time)
    const cdRing = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.75, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    cdRing.rotation.x = -Math.PI / 2;
    cdRing.position.y = 0.01;
    g.add(ring); g.add(fill); g.add(line1); g.add(line2); g.add(cdRing);
    g.position.set(x, 0.07, z); g.scale.setScalar(r);
    this.scene.add(g);
    this.telegraphs = this.telegraphs || [];
    this.telegraphs.push({ g, t: 0, dur, cdRing });
  }

  // --- аура-кольца сетов ---
  drawAuras(activeSets, playerPos, time, playerKey) {
    if (!this.auraMeshes) this.auraMeshes = {};
    const pfx = (playerKey || 'local') + '_';
    const seen = new Set();

    for (const s of activeSets) {
      const uid = pfx + s.id;
      seen.add(uid);
      let a = this.auraMeshes[uid];
      if (!a) {
        const mat = new THREE.MeshBasicMaterial({
          color: s.color, transparent: true, opacity: 0.3,
          side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
          depthWrite: false, toneMapped: false
        });
        const geo = new THREE.RingGeometry(1.8, 2.6, 48);
        geo.rotateX(-Math.PI / 2);
        const m = new THREE.Mesh(geo, mat);
        this.scene.add(m);
        this.auraMeshes[uid] = { m, mat, color: s.color };
      }
      a.m.position.set(playerPos.x, 0.08, playerPos.z);
      a.mat.opacity = 0.18 + Math.sin(time * 3) * 0.1;
      a.m.rotation.y = time * 0.5;
    }

    // убираем неактивные ауры этого игрока
    for (const id in this.auraMeshes) {
      if (id.startsWith(pfx) && !seen.has(id)) {
        this.scene.remove(this.auraMeshes[id].m);
        delete this.auraMeshes[id];
      }
    }
  }

  // --- портал-эффект спавна врага ---
  portal(x, z, color) {
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.85,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false
    });
    const m = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.5, 32), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.12, z);
    this.scene.add(m);
    this.portals = this.portals || [];
    this.portals.push({ m, mat, t: 0, life: 0.6 });
  }

  // --- холодное пламя (линия огня по земле) ---
  coldflame(x1, z1, x2, z2, color) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const segments = Math.max(3, Math.floor(len / 1.5));
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const px = x1 + dx * t, pz = z1 + dz * t;
      const m = this.pool[this.poolIdx % this.poolSize];
      this.poolIdx++;
      m.material = this._mat(color);
      m.visible = true;
      m.position.set(px + (Math.random() - 0.5) * 0.5, 0.2 + Math.random() * 0.4, pz + (Math.random() - 0.5) * 0.5);
      const s = 0.5 + Math.random() * 0.5;
      m.scale.set(s, s * 1.5, s);
      m.rotation.set(0, 0, 0);
      this.particles.push({
        m,
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 1.5),
        rot: new THREE.Vector3(0, (Math.random() - 0.5) * 4, 0),
        life: 0.5 + Math.random() * 0.4
      });
    }
  }

  // --- костяной шторм (вихрь костей) ---
  boneStorm(x, z, color) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    // Spinning bone ring
    const geo = new THREE.RingGeometry(1.5, 3.0, 6, 1, 0, 5.2);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, 0.5, z);
    this.scene.add(m);
    this.whirlMeshes = this.whirlMeshes || [];
    this.whirlMeshes.push({ m, mat, t: 0, life: 1.5 });
    // Bone fragments flying out
    for (let i = 0; i < 12; i++) {
      const bm = this.pool[this.poolIdx % this.poolSize];
      this.poolIdx++;
      bm.material = this._mat(0xd4d0b8);
      bm.visible = true;
      const a = (i / 12) * Math.PI * 2;
      bm.position.set(x + Math.cos(a) * 1.5, 0.5 + Math.random() * 1.5, z + Math.sin(a) * 1.5);
      const s = 0.3 + Math.random() * 0.3;
      bm.scale.set(s, s, s);
      bm.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      this.particles.push({
        m: bm,
        vel: new THREE.Vector3(Math.cos(a) * 4, 2 + Math.random() * 3, Math.sin(a) * 4),
        rot: new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10),
        life: 0.6 + Math.random() * 0.4
      });
    }
  }

  clear() {
    for (const p of this.particles) p.m.visible = false;
    for (const a of this.arcs) this.scene.remove(a.m);
    for (const f of this.floats) { f.el.style.display = 'none'; this.textPoolFree.push(f.el); }
    if (this.fireballs) for (const fb of this.fireballs) this.scene.remove(fb.m);
    if (this.beams) for (const b of this.beams) this.scene.remove(b.line);
    if (this.zones) for (const z of this.zones) this.scene.remove(z.m);
    if (this.whirlMeshes) for (const w of this.whirlMeshes) this.scene.remove(w.m);
    if (this.telegraphs) for (const t of this.telegraphs) this.scene.remove(t.g);
    if (this.portals) for (const p of this.portals) this.scene.remove(p.m);
    if (this.auraMeshes) for (const id in this.auraMeshes) this.scene.remove(this.auraMeshes[id].m);
    this.particles = []; this.arcs = []; this.floats = [];
    this.fireballs = []; this.beams = []; this.zones = [];
    this.whirlMeshes = []; this.telegraphs = [];
    this.portals = []; this.auraMeshes = {};
  }
}
