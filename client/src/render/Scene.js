import * as THREE from 'three';
import { ARENA } from '../../../shared/constants.js';

// ============================================================================
// SCENE — вся статичная 3D-сцена: арена, свет, небо, кристаллы.
// Динамика (игроки, враги, эффекты) добавляется поверх из Game.
// ============================================================================
export class GameScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060810);
    // Улучшенный туман: более плотный, с пурпурным оттенком
    this.scene.fog = new THREE.FogExp2(0x0a0c18, 0.018);

    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 160);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;

    this.glowTex = this._makeGlow();
    this._lights();
    this._arena();
    this._sky();
    this._fogParticles();

    addEventListener('resize', () => this.resize());
  }

  _makeGlow() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.4, 'rgba(255,255,255,0.4)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  _lights() {
    // Улучшенное освещение: более богатая палитра
    this.scene.add(new THREE.HemisphereLight(0x2a3560, 0x0a0c14, 0.7));
    this.scene.add(new THREE.AmbientLight(0x353550, 0.45));
    const moon = new THREE.DirectionalLight(0x8899cc, 1.15);
    moon.position.set(24, 34, 14);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    const s = 46;
    moon.shadow.camera.left = -s; moon.shadow.camera.right = s;
    moon.shadow.camera.top = s; moon.shadow.camera.bottom = -s;
    moon.shadow.camera.near = 1; moon.shadow.camera.far = 100;
    moon.shadow.bias = -0.001;
    this.scene.add(moon);

    // Rim light from behind for depth (purple)
    const rim = new THREE.DirectionalLight(0x7744cc, 0.55);
    rim.position.set(-20, 28, -30);
    this.scene.add(rim);

    // Warm fill light from front-left
    const fill = new THREE.DirectionalLight(0xff8844, 0.2);
    fill.position.set(-15, 10, 20);
    this.scene.add(fill);

    // Corner point lights colored by crystals (brighter)
    const A = ARENA.SIZE;
    const cols = [0xff2d3f, 0x35e0ff, 0xb44dff, 0xffc233];
    this.cornerLights = [];
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      const d = A - 6;
      const pl = new THREE.PointLight(cols[i], 0.8, 22, 1.5);
      pl.position.set(Math.cos(a) * d, 5.5, Math.sin(a) * d);
      this.scene.add(pl);
      this.cornerLights.push(pl);
    }

    // Center arena glow (subtle)
    const centerGlow = new THREE.PointLight(0x5a1020, 0.4, 15, 2);
    centerGlow.position.set(0, 3, 0);
    this.scene.add(centerGlow);
    this.centerGlow = centerGlow;
  }

  _arena() {
    const A = ARENA.SIZE;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(A * 2, A * 2),
      new THREE.MeshStandardMaterial({ color: 0x0e0f16, roughness: 0.95, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    this.scene.add(floor);

    // Floor cracks / scorch marks
    const crackMat = new THREE.MeshBasicMaterial({ color: 0x0a0a10, toneMapped: false });
    for (let i = 0; i < 20; i++) {
      const ca = Math.random() * Math.PI * 2;
      const cd = 3 + Math.random() * (A - 10);
      const cw = 0.04 + Math.random() * 0.08;
      const cl = 0.8 + Math.random() * 2.5;
      const crack = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.005, cl), crackMat);
      crack.position.set(Math.cos(ca) * cd, 0.005, Math.sin(ca) * cd);
      crack.rotation.y = ca;
      this.scene.add(crack);
    }
    // scorch marks
    const scorchMat = new THREE.MeshBasicMaterial({ color: 0x110808, toneMapped: false, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 8; i++) {
      const sa = Math.random() * Math.PI * 2;
      const sd = 4 + Math.random() * (A - 14);
      const scorch = new THREE.Mesh(new THREE.CircleGeometry(0.4 + Math.random() * 0.8, 16), scorchMat);
      scorch.rotation.x = -Math.PI / 2;
      scorch.position.set(Math.cos(sa) * sd, 0.004, Math.sin(sa) * sd);
      this.scene.add(scorch);
    }

    const grid = new THREE.GridHelper(A * 2, 46, 0x23263c, 0x161826);
    grid.position.y = 0.01; this.scene.add(grid);

    const circle = new THREE.Mesh(
      new THREE.RingGeometry(7.6, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x5a1020, transparent: true, opacity: 0.65, toneMapped: false })
    );
    circle.rotation.x = -Math.PI / 2; circle.position.y = 0.02; this.scene.add(circle);

    // AO-like edge darkening
    const edgeDark = new THREE.Mesh(
      new THREE.RingGeometry(A * 0.65, A * 1.05, 64),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })
    );
    edgeDark.rotation.x = -Math.PI / 2; edgeDark.position.y = 0.03; this.scene.add(edgeDark);

    // стены по периметру
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x12141f, roughness: 0.8 });
    const stripMat = new THREE.MeshBasicMaterial({ color: 0xff2440, toneMapped: false });
    const mk = (x, z, ry) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(A * 2, 1.5, 0.8), wallMat);
      w.position.set(x, 0.75, z); w.rotation.y = ry; w.castShadow = true; w.receiveShadow = true;
      this.scene.add(w);
      const st = new THREE.Mesh(new THREE.BoxGeometry(A * 2, 0.07, 0.84), stripMat);
      st.position.set(x, 1.52, z); st.rotation.y = ry; this.scene.add(st);
    };
    mk(0, -A, 0); mk(0, A, 0); mk(-A, 0, Math.PI / 2); mk(A, 0, Math.PI / 2);

    // угловые кристаллы
    const cols = [0xff2d3f, 0x35e0ff, 0xb44dff, 0xffc233];
    this.crystals = [];
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4, d = A - 6;
      const px = Math.cos(a) * d, pz = Math.sin(a) * d;
      const pil = new THREE.Mesh(new THREE.BoxGeometry(1.4, 5.4, 1.4), new THREE.MeshStandardMaterial({ color: 0x171a28, roughness: 0.7 }));
      pil.position.set(px, 2.7, pz); pil.castShadow = true; this.scene.add(pil);
      const cm = new THREE.MeshStandardMaterial({ color: cols[i], emissive: cols[i], emissiveIntensity: 0.8, roughness: 0.3 });
      const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), cm);
      cr.position.set(px, 6.1, pz); this.scene.add(cr);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: cols[i], transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
      gl.position.copy(cr.position); gl.scale.setScalar(3.4); this.scene.add(gl);
      this.crystals.push({ m: cm, gl, ph: i * 1.7 });
    }

    // Decorative pillars along walls
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x14172a, roughness: 0.7, metalness: 0.2 });
    for (let i = 0; i < 8; i++) {
      const side = Math.floor(i / 4);
      const offset = ((i % 4) - 1.5) * (A * 0.55);
      const px = side === 0 ? offset : (side === 2 ? -A + 1 : A - 1);
      const pz = side === 0 ? -A + 1 : (side === 1 ? offset : (side === 3 ? A - 1 : 0));
      if (side === 1 || side === 3) continue; // skip for simplicity
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 3.5, 8), pillarMat);
      pillar.position.set(px, 1.75, pz); pillar.castShadow = true; this.scene.add(pillar);
      // torch flame on top
      const torchFlame = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xff8833, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      torchFlame.position.set(px, 3.7, pz); torchFlame.scale.setScalar(1.2); this.scene.add(torchFlame);
    }

    // Chains between pillars
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x2a2a35, metalness: 0.8, roughness: 0.5 });
    for (let i = 0; i < 10; i++) {
      const ca = (i / 10) * Math.PI * 2;
      const cd = A - 3;
      const cx = Math.cos(ca) * cd, cz = Math.sin(ca) * cd;
      // vertical chain segment
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2, 4), chainMat);
      chain.position.set(cx, 1.2, cz);
      chain.rotation.z = (Math.random() - 0.5) * 0.15;
      this.scene.add(chain);
    }

    // декоративные блоки
    for (let i = 0; i < 12; i++) {
      const h = 2.5 + Math.random() * 4.5, a = Math.random() * Math.PI * 2, d = 14 + Math.random() * (A - 22);
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(1 + Math.random() * 1.2, h, 1 + Math.random() * 1.2),
        new THREE.MeshStandardMaterial({ color: i % 2 ? 0x191c2c : 0x131522, roughness: 0.75 })
      );
      b.position.set(Math.cos(a) * d, h / 2, Math.sin(a) * d);
      b.rotation.y = Math.random() * Math.PI;
      b.castShadow = true; b.receiveShadow = true;
      this.scene.add(b);
    }
  }

  _sky() {
    const sp = [];
    this.starSizes = [];
    this.starPhases = [];
    for (let i = 0; i < 600; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI * 0.45 + 0.08, r = 70 + Math.random() * 50;
      sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
      this.starSizes.push(0.3 + Math.random() * 0.5);
      this.starPhases.push(Math.random() * Math.PI * 2);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0x99aadd, size: 0.6, fog: false, transparent: true, opacity: 0.85, toneMapped: false });
    this.starField = new THREE.Points(sg, this.starMat);
    this.scene.add(this.starField);

    const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(4, 32), new THREE.MeshBasicMaterial({ color: 0xdde6ff, fog: false, toneMapped: false }));
    moonDisc.position.set(-42, 40, -64); moonDisc.lookAt(0, 0, 0); this.scene.add(moonDisc);
    const mg = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0x99bbff, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, fog: false, depthWrite: false }));
    mg.position.copy(moonDisc.position); mg.scale.setScalar(26); this.scene.add(mg);
  }

  // Объёмные частицы тумана
  _fogParticles() {
    this.fogSprites = [];
    const fogTex = this._makeFogTex();
    for (let i = 0; i < 24; i++) {
      const mat = new THREE.SpriteMaterial({
        map: fogTex,
        color: 0x1a1c30,
        transparent: true,
        opacity: 0.12 + Math.random() * 0.08,
        blending: THREE.NormalBlending,
        depthWrite: false,
        fog: false,
      });
      const sprite = new THREE.Sprite(mat);
      const a = Math.random() * Math.PI * 2;
      const d = 5 + Math.random() * 35;
      sprite.position.set(Math.cos(a) * d, 0.5 + Math.random() * 2.5, Math.sin(a) * d);
      const sc = 6 + Math.random() * 10;
      sprite.scale.set(sc, sc * 0.4, 1);
      this.scene.add(sprite);
      this.fogSprites.push({ sprite, mat, baseX: sprite.position.x, baseZ: sprite.position.z, phase: Math.random() * Math.PI * 2, speed: 0.2 + Math.random() * 0.3 });
    }
  }

  _makeFogTex() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,0.6)');
    r.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  animateEnv(t) {
    for (const c of this.crystals) {
      c.m.emissiveIntensity = 0.55 + Math.sin(t * 2 + c.ph) * 0.35;
      c.gl.material.opacity = 0.35 + Math.sin(t * 2 + c.ph) * 0.2;
    }

    // FogExp2 color animation (deep blue-purple shift)
    const fogR = 0.035 + Math.sin(t * 0.08) * 0.006 + Math.sin(t * 0.04) * 0.003;
    const fogG = 0.038 + Math.sin(t * 0.11) * 0.004;
    const fogB = 0.085 + Math.sin(t * 0.07) * 0.012 + Math.sin(t * 0.05) * 0.005;
    this.scene.fog.color.setRGB(fogR, fogG, fogB);
    // Subtle density pulsing
    this.scene.fog.density = 0.018 + Math.sin(t * 0.15) * 0.003;

    // corner light pulsing
    if (this.cornerLights) {
      for (let i = 0; i < this.cornerLights.length; i++) {
        this.cornerLights[i].intensity = 0.6 + Math.sin(t * 1.5 + i * 1.7) * 0.25;
      }
    }

    // Center glow pulse
    if (this.centerGlow) {
      this.centerGlow.intensity = 0.3 + Math.sin(t * 0.8) * 0.15;
    }

    // star twinkle
    if (this.starField) {
      this.starMat.opacity = 0.75 + Math.sin(t * 0.3) * 0.1;
    }

    // Animate fog particles (drift)
    if (this.fogSprites) {
      for (const f of this.fogSprites) {
        f.sprite.position.x = f.baseX + Math.sin(t * f.speed + f.phase) * 3;
        f.sprite.position.z = f.baseZ + Math.cos(t * f.speed * 0.7 + f.phase) * 2;
        f.mat.opacity = 0.1 + Math.sin(t * 0.5 + f.phase) * 0.04;
      }
    }
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
