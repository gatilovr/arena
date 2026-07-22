import * as THREE from 'three';

// ============================================================================
// MESHES — фабрики 3D-моделей: тело игрока, меч, враги по типам, ник-спрайты.
// ============================================================================

export function makePlayerBody(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, emissive: color, emissiveIntensity: 0.25 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.5, 4, 8), mat);
  body.position.y = 1.15; body.castShadow = true;
  g.add(body);
  // визор
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.1), new THREE.MeshBasicMaterial({ color: 0x0a0d16, toneMapped: false }));
  visor.position.set(0, 1.7, 0.34); g.add(visor);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.02), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  glow.position.set(0, 1.7, 0.4); g.add(glow);
  return { group: g, body, mat };
}

export function makeSword() {
  const pivot = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xf2f4f8, metalness: 0.95, roughness: 0.06, emissive: 0xff3300, emissiveIntensity: 0.3 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.085, 1.25, 0.028), bladeMat);
  blade.position.y = 0.62; pivot.add(blade);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 4), bladeMat);
  tip.position.y = 1.35; tip.rotation.x = Math.PI; pivot.add(tip);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.09), new THREE.MeshStandardMaterial({ color: 0x8a8f9c, metalness: 0.85, roughness: 0.3 }));
  pivot.add(guard);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.048, 0.36, 8), new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 }));
  handle.position.y = -0.19; pivot.add(handle);
  // blade glow sprite
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff5533, toneMapped: false, transparent: true, opacity: 0.3 });
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.06), glowMat);
  glow.position.y = 0.62; pivot.add(glow);
  pivot.bladeMat = bladeMat;
  return pivot;
}

// --- Модели нового оружия ---

export function makeAxe() {
  const pivot = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xb0b8c4, metalness: 0.9, roughness: 0.12, emissive: 0xff3300, emissiveIntensity: 0.25 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.04), bladeMat);
  blade.position.set(0, 0.42, 0); pivot.add(blade);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.038, 0.55, 8), new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 }));
  handle.position.y = -0.05; pivot.add(handle);
  // blade glow
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff6644, toneMapped: false, transparent: true, opacity: 0.25 });
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.08), glowMat);
  glow.position.set(0, 0.42, 0); pivot.add(glow);
  pivot.bladeMat = bladeMat;
  pivot.blade = blade;
  return pivot;
}

export function makeDagger() {
  const pivot = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xc8cdd5, metalness: 0.92, roughness: 0.08, emissive: 0x6a2dff, emissiveIntensity: 0.3 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.018), bladeMat);
  blade.position.y = 0.3; pivot.add(blade);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.12, 4), bladeMat);
  tip.position.y = 0.61; tip.rotation.x = Math.PI; pivot.add(tip);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.05), new THREE.MeshStandardMaterial({ color: 0x6a3aaa, metalness: 0.8, roughness: 0.3 }));
  pivot.add(guard);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.22, 8), new THREE.MeshStandardMaterial({ color: 0x1a1028, roughness: 0.9 }));
  handle.position.y = -0.13; pivot.add(handle);
  // blade glow
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x8844ff, toneMapped: false, transparent: true, opacity: 0.25 });
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.04), glowMat);
  glow.position.y = 0.3; pivot.add(glow);
  pivot.bladeMat = bladeMat;
  return pivot;
}

export function makeBow() {
  const pivot = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.85, emissive: 0x8b5e3c, emissiveIntensity: 0.2 });
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 8, 16, Math.PI), woodMat);
  arc.rotation.z = Math.PI / 2; arc.position.y = 0.3; pivot.add(arc);
  const stringMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.1, 4), stringMat);
  string.position.y = 0.3; pivot.add(string);
  pivot.bladeMat = woodMat;
  return pivot;
}

export function makeStaff() {
  const pivot = new THREE.Group();
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.8 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.4, 8), shaftMat);
  shaft.position.y = 0.7; pivot.add(shaft);
  const orbMat = new THREE.MeshStandardMaterial({ color: 0xff6a00, roughness: 0.3, emissive: 0xff6a00, emissiveIntensity: 0.7 });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), orbMat);
  orb.position.y = 1.48; pivot.add(orb);
  // orb glow
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff8844, toneMapped: false, transparent: true, opacity: 0.35 });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), glowMat);
  glow.position.y = 1.48; pivot.add(glow);
  const bladeMat = orbMat;
  pivot.bladeMat = bladeMat;
  return pivot;
}

export function makeTwoHandedSword() {
  const pivot = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xe8ecf0, metalness: 0.95, roughness: 0.04, emissive: 0xff3300, emissiveIntensity: 0.3 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.035), bladeMat);
  blade.position.y = 0.8; pivot.add(blade);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.3, 4), bladeMat);
  tip.position.y = 1.75; tip.rotation.x = Math.PI; pivot.add(tip);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.12), new THREE.MeshStandardMaterial({ color: 0x8a8f9c, metalness: 0.85, roughness: 0.3 }));
  pivot.add(guard);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.44, 8), new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 }));
  handle.position.y = -0.24; pivot.add(handle);
  // blade glow
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff5533, toneMapped: false, transparent: true, opacity: 0.28 });
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.7, 0.06), glowMat);
  glow.position.y = 0.8; pivot.add(glow);
  pivot.bladeMat = bladeMat;
  return pivot;
}

// ============================================================================
// ВРАГИ — цвета и 3D-модели по типам
// ============================================================================

const ENEMY_COLORS = {
  normal: 0x9c2626, runner: 0x1fae4e, tank: 0x6d3fb8, shooter: 0x2f7fd6, exploder: 0xd67f1f,
  assassin: 0x1a1a2e, berserker: 0x8b0000, summoner: 0x4a0080, shielder: 0x2f5080,
  sprinter: 0x00cc44, phantom: 0x6633aa, golem: 0x555555, firestarter: 0xff4400,
  frost_mage: 0x4488ff, cursed: 0x8844aa,
  rebradd: 0xccccaa, necro: 0x2a1140, butcher: 0xcc2200,
  golemKing: 0x555555, firelord: 0xff3300, shadowKing: 0x1a0a2e,
  frostQueen: 0x4488ff, dragonLord: 0xcc2200
};

export function makeEnemy(type, isBoss) {
  const g = new THREE.Group();
  const col = ENEMY_COLORS[type] || 0x9c2626;
  const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.65, emissive: col, emissiveIntensity: 0.14 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15161f, roughness: 0.8 });
  let height = 1.9;
  const parts = {}; // animatable part references for EnemyView

  const box = (w, h, d, x, y, z, m, rx) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z); if (rx) b.rotation.x = rx; b.castShadow = true; g.add(b); return b;
  };

  // Eye glow data (for pulsing in EnemyView)
  const eyeMats = [];
  const addEye = (hex, px, py, pz, size) => {
    const em = new THREE.MeshBasicMaterial({ color: hex, toneMapped: false });
    const e = new THREE.Mesh(new THREE.SphereGeometry(size || 0.05), em);
    e.position.set(px, py, pz); g.add(e);
    eyeMats.push(em);
  };

  if (type === 'runner') {
    box(0.5, 0.85, 0.35, 0, 0.9, 0.06, mat, 0.3);
    box(0.34, 0.34, 0.32, 0, 1.42, 0.28, mat);
    box(0.13, 0.85, 0.13, -0.34, 0.95, 0.2, mat, -0.6);
    box(0.13, 0.85, 0.13, 0.34, 0.95, 0.2, mat, -0.6);
    addEye(0xff4444, -0.09, 1.46, 0.44, 0.05);
    addEye(0xff4444, 0.09, 1.46, 0.44, 0.05);
    height = 1.6;

  } else if (type === 'tank') {
    box(1.15, 1.25, 0.7, 0, 1.15, 0, mat);
    box(0.5, 0.42, 0.62, -0.78, 1.78, 0, mat);
    box(0.5, 0.42, 0.62, 0.78, 1.78, 0, mat);
    box(0.4, 0.4, 0.38, 0, 2.05, 0, mat);
    addEye(0xffaa00, -0.1, 2.1, 0.2, 0.06);
    addEye(0xffaa00, 0.1, 2.1, 0.2, 0.06);
    height = 2.3;

  } else if (type === 'shooter') {
    box(0.6, 1.0, 0.4, 0, 1.0, 0, mat);
    box(0.38, 0.38, 0.36, 0, 1.72, 0, mat);
    addEye(0x66ccff, -0.08, 1.76, 0.2, 0.04);
    addEye(0x66ccff, 0.08, 1.76, 0.2, 0.04);
    box(0.12, 0.12, 0.72, 0.42, 1.18, 0.3, dark);
    height = 1.95;

  } else if (type === 'exploder') {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, emissive: 0xff3300, emissiveIntensity: 0.5, flatShading: true }));
    b.position.y = 0.9; b.castShadow = true; g.add(b);
    addEye(0xffffff, 0, 0.98, 0.48, 0.13);
    height = 1.5;

  // --- НОВЫЕ МОБЫ ---

  } else if (type === 'assassin') {
    // Худой, капюшон, кинжалы
    box(0.42, 0.95, 0.28, 0, 0.95, 0, mat);
    box(0.3, 0.32, 0.28, 0, 1.6, 0.08, mat);
    // капюшон
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.3, 6), mat);
    hood.position.set(0, 1.88, 0.06); hood.rotation.x = 0.15; g.add(hood);
    // кинжалы по бокам
    const daggerMat = new THREE.MeshStandardMaterial({ color: 0xc8cdd5, metalness: 0.9, roughness: 0.1, emissive: 0x1a1a2e, emissiveIntensity: 0.4 });
    const dk1 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.38, 0.015), daggerMat);
    dk1.position.set(-0.32, 1.05, 0.18); dk1.rotation.z = 0.3; g.add(dk1);
    const dk2 = dk1.clone(); dk2.position.x = 0.32; dk2.rotation.z = -0.3; g.add(dk2);
    addEye(0xff0044, -0.07, 1.64, 0.22, 0.04);
    addEye(0xff0044, 0.07, 1.64, 0.22, 0.04);
    height = 2.0;

  } else if (type === 'berserker') {
    // Массивный, красный, горбатый
    box(0.85, 1.15, 0.55, 0, 1.05, 0, mat);
    box(1.05, 0.65, 0.6, 0, 1.85, -0.05, mat); // плечи
    box(0.38, 0.36, 0.34, 0, 2.25, 0.05, mat);
    // руки-кулаки
    box(0.3, 0.3, 0.3, -0.7, 1.15, 0, mat);
    box(0.3, 0.3, 0.3, 0.7, 1.15, 0, mat);
    addEye(0xff2200, -0.1, 2.3, 0.2, 0.06);
    addEye(0xff2200, 0.1, 2.3, 0.2, 0.06);
    height = 2.6;

  } else if (type === 'summoner') {
    // Роба, парящие орбы
    const robe = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 8), mat);
    robe.position.y = 1.0; robe.castShadow = true; g.add(robe);
    box(0.32, 0.32, 0.3, 0, 2.0, 0, mat);
    // орбы
    const orbMat = new THREE.MeshStandardMaterial({ color: 0x9944ff, roughness: 0.3, emissive: 0x9944ff, emissiveIntensity: 0.7 });
    for (let i = 0; i < 3; i++) {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), orbMat);
      const a = (i / 3) * Math.PI * 2;
      orb.position.set(Math.cos(a) * 0.5, 1.5 + Math.sin(a) * 0.15, Math.sin(a) * 0.5);
      g.add(orb);
    }
    addEye(0xbb66ff, -0.08, 2.04, 0.17, 0.045);
    addEye(0xbb66ff, 0.08, 2.04, 0.17, 0.045);
    height = 2.3;

  } else if (type === 'shielder') {
    // Массивный, щит спереди
    box(0.8, 1.2, 0.6, 0, 1.1, 0, mat);
    box(0.4, 0.4, 0.38, 0, 1.85, 0, mat);
    // щит
    const shieldMat = new THREE.MeshStandardMaterial({ color: 0x2f5080, metalness: 0.7, roughness: 0.3, emissive: 0x2f5080, emissiveIntensity: 0.3 });
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.08), shieldMat);
    shield.position.set(0, 1.1, 0.42); g.add(shield);
    addEye(0x4488cc, -0.1, 1.9, 0.2, 0.05);
    addEye(0x4488cc, 0.1, 1.9, 0.2, 0.05);
    height = 2.2;

  } else if (type === 'sprinter') {
    // Маленький, наклонённый вперёд, обтекаемый
    box(0.42, 0.72, 0.28, 0, 0.82, 0.1, mat, 0.25);
    box(0.28, 0.28, 0.26, 0, 1.25, 0.22, mat);
    // длинные ноги
    box(0.1, 0.65, 0.1, -0.2, 0.65, -0.1, mat, -0.4);
    box(0.1, 0.65, 0.1, 0.2, 0.65, -0.1, mat, -0.4);
    addEye(0x00ff66, -0.06, 1.28, 0.38, 0.04);
    addEye(0x00ff66, 0.06, 1.28, 0.38, 0.04);
    height = 1.5;

  } else if (type === 'phantom') {
    // Призрачный, полупрозрачный, парящий
    const phMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, emissive: col, emissiveIntensity: 0.5, transparent: true, opacity: 0.75 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.9, 4, 8), phMat);
    body.position.y = 1.2; body.castShadow = true; g.add(body);
    // «хвост» вместо ног
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 6), phMat);
    tail.position.y = 0.5; tail.rotation.x = Math.PI; g.add(tail);
    addEye(0xaa66ff, -0.09, 1.38, 0.26, 0.05);
    addEye(0xaa66ff, 0.09, 1.38, 0.26, 0.05);
    height = 1.7;

  } else if (type === 'golem') {
    // Огромный, каменный, блочный
    box(1.2, 1.4, 0.85, 0, 1.2, 0, mat);
    box(0.7, 0.55, 0.65, -0.9, 1.95, 0, mat); // левое плечо
    box(0.7, 0.55, 0.65, 0.9, 1.95, 0, mat);  // правое плечо
    box(0.45, 0.45, 0.42, 0, 2.2, 0, mat);
    // каменные кулаки
    box(0.4, 0.4, 0.4, -1.1, 1.0, 0, mat);
    box(0.4, 0.4, 0.4, 1.1, 1.0, 0, mat);
    // трещины (светящиеся)
    const crack = new THREE.MeshBasicMaterial({ color: 0xffaa00, toneMapped: false });
    box(0.06, 0.8, 0.02, 0.15, 1.4, 0.44, crack);
    box(0.02, 0.5, 0.06, -0.2, 1.3, 0.44, crack);
    addEye(0xffaa00, -0.12, 2.26, 0.22, 0.06);
    addEye(0xffaa00, 0.12, 2.26, 0.22, 0.06);
    height = 2.7;

  } else if (type === 'firestarter') {
    // Огненный, угловатый, с языками пламени
    box(0.55, 0.9, 0.38, 0, 0.95, 0, mat);
    box(0.32, 0.32, 0.3, 0, 1.6, 0, mat);
    // языки пламени
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.8, roughness: 0.4 });
    for (let i = 0; i < 4; i++) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 4), flameMat);
      const a = (i / 4) * Math.PI * 2;
      flame.position.set(Math.cos(a) * 0.15, 1.85 + Math.random() * 0.1, Math.sin(a) * 0.15);
      flame.rotation.z = (Math.random() - 0.5) * 0.3;
      g.add(flame);
    }
    addEye(0xffcc00, -0.08, 1.64, 0.18, 0.05);
    addEye(0xffcc00, 0.08, 1.64, 0.18, 0.05);
    height = 2.1;

  } else if (type === 'frost_mage') {
    // Ледяной маг, с кристаллами
    const robe = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 8), mat);
    robe.position.y = 0.95; robe.castShadow = true; g.add(robe);
    box(0.3, 0.3, 0.28, 0, 1.8, 0, mat);
    // ледяные кристаллы
    const iceMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.2, emissive: 0x4488ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 });
    const cr1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), iceMat);
    cr1.position.set(-0.35, 1.4, 0.2); cr1.rotation.set(0.3, 0.5, 0); g.add(cr1);
    const cr2 = cr1.clone(); cr2.position.set(0.35, 1.4, 0.2); cr2.rotation.set(0.3, -0.5, 0); g.add(cr2);
    const cr3 = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), iceMat);
    cr3.position.set(0, 2.1, 0); g.add(cr3);
    addEye(0x88ddff, -0.07, 1.84, 0.17, 0.045);
    addEye(0x88ddff, 0.07, 1.84, 0.17, 0.045);
    height = 2.2;

  } else if (type === 'cursed') {
    // Тёмный, с рунами
    box(0.58, 1.0, 0.4, 0, 1.0, 0, mat);
    box(0.35, 0.35, 0.33, 0, 1.7, 0, mat);
    // руны (светящиеся полосы)
    const runeMat = new THREE.MeshBasicMaterial({ color: 0xaa44ff, toneMapped: false });
    box(0.04, 0.5, 0.02, -0.12, 1.2, 0.21, runeMat);
    box(0.04, 0.5, 0.02, 0.12, 1.2, 0.21, runeMat);
    box(0.22, 0.04, 0.02, 0, 1.45, 0.21, runeMat);
    addEye(0xcc44ff, -0.09, 1.74, 0.19, 0.05);
    addEye(0xcc44ff, 0.09, 1.74, 0.19, 0.05);
    height = 2.1;

  // --- БОССЫ ---

  } else if (type === 'butcher') {
    // МЯСНИК — массивный мясной монстр с тесаком, цепями и крюками
    const meatMat = new THREE.MeshStandardMaterial({ color: 0xcc2200, roughness: 0.72, emissive: 0x881100, emissiveIntensity: 0.22 });
    const muscleMat = new THREE.MeshStandardMaterial({ color: 0xaa1800, roughness: 0.8, emissive: 0x660000, emissiveIntensity: 0.18 });
    const scarMat = new THREE.MeshStandardMaterial({ color: 0x880000, roughness: 0.85, emissive: 0x550000, emissiveIntensity: 0.12 });

    // === Тело (массивный торс с буграми мышц) ===
    box(1.55, 1.45, 0.95, 0, 1.32, 0, meatMat);
    // грудные мышцы
    box(0.55, 0.45, 0.25, -0.35, 1.65, 0.42, muscleMat);
    box(0.55, 0.45, 0.25, 0.35, 1.65, 0.42, muscleMat);
    // живот с шрамами
    parts.belly = box(0.9, 0.6, 0.3, 0, 1.05, 0.42, muscleMat);

    // === Плечи (огромные, горбатые) ===
    box(1.15, 0.75, 0.8, -0.88, 2.12, 0, meatMat);
    box(1.15, 0.75, 0.8, 0.88, 2.12, 0, meatMat);
    // шипы на плечах
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.5, metalness: 0.3 });
    const sp1 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 5), spikeMat);
    sp1.position.set(-1.2, 2.55, 0); sp1.rotation.z = 0.4; g.add(sp1);
    const sp2 = sp1.clone(); sp2.position.set(1.2, 2.55, 0); sp2.rotation.z = -0.4; g.add(sp2);
    const sp3 = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 5), spikeMat);
    sp3.position.set(-0.9, 2.6, 0.2); sp3.rotation.z = 0.2; g.add(sp3);
    const sp4 = sp3.clone(); sp4.position.set(0.9, 2.6, 0.2); sp4.rotation.z = -0.2; g.add(sp4);

    // === Голова (маленькая, свиноподобная, с клыками) ===
    parts.head = box(0.5, 0.46, 0.5, 0, 2.58, 0.15, meatMat);
    // рыло
    box(0.24, 0.18, 0.22, 0, 2.5, 0.44, meatMat);
    // клыки
    const tuskMat = new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.4 });
    const tusk1 = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.18, 4), tuskMat);
    tusk1.position.set(-0.1, 2.42, 0.48); tusk1.rotation.x = -0.3; g.add(tusk1);
    const tusk2 = tusk1.clone(); tusk2.position.x = 0.1; g.add(tusk2);
    // глаза (маленькие, злобные)
    addEye(0xff0000, -0.11, 2.64, 0.32, 0.055);
    addEye(0xff0000, 0.11, 2.64, 0.32, 0.055);
    // брови (нахмуренные)
    box(0.16, 0.04, 0.06, -0.11, 2.72, 0.38, scarMat);
    box(0.16, 0.04, 0.06, 0.11, 2.72, 0.38, scarMat);

    // === Правая рука с тесаком ===
    box(0.14, 1.0, 0.14, -1.3, 1.8, 0, meatMat); // плечо-локоть
    box(0.16, 0.5, 0.16, -1.35, 1.2, 0, meatMat); // предплечье
    box(0.3, 0.3, 0.3, -1.35, 0.9, 0, meatMat);  // кулак
    // тесак (большой, с зазубринами)
    const cleaverMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.92, roughness: 0.08, emissive: 0xcc2200, emissiveIntensity: 0.35 });
    box(0.08, 0.5, 0.08, -1.35, 0.6, 0, new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 })); // рукоять
    box(0.65, 0.5, 0.05, -1.35, 0.15, 0, cleaverMat); // лезвие
    parts.cleaver = box(0.65, 0.06, 0.07, -1.35, -0.12, 0, cleaverMat); // нижняя кромка
    // зазубрины на лезвии
    const notchMat = new THREE.MeshBasicMaterial({ color: 0x880000, toneMapped: false });
    box(0.04, 0.08, 0.06, -1.55, 0.1, 0, notchMat);
    box(0.04, 0.08, 0.06, -1.2, 0.05, 0, notchMat);
    // кровь на тесаке
    const bloodMat2 = new THREE.MeshBasicMaterial({ color: 0xaa0000, toneMapped: false, transparent: true, opacity: 0.6 });
    box(0.3, 0.15, 0.06, -1.35, 0.05, 0.03, bloodMat2);

    // === Левая рука (огромный кулак) ===
    box(0.14, 1.0, 0.14, 1.15, 1.3, 0, meatMat);
    box(0.32, 0.32, 0.32, 1.15, 0.82, 0, meatMat); // кулак
    // костяшки
    box(0.08, 0.06, 0.08, 1.05, 0.98, 0.12, scarMat);
    box(0.08, 0.06, 0.08, 1.25, 0.98, 0.12, scarMat);

    // === Шрамы и швы на теле ===
    const stitchMat = new THREE.MeshBasicMaterial({ color: 0x440000, toneMapped: false });
    box(0.04, 0.7, 0.02, 0.18, 1.5, 0.48, stitchMat);
    box(0.04, 0.55, 0.02, -0.22, 1.7, 0.48, stitchMat);
    box(0.35, 0.04, 0.02, 0, 1.3, 0.48, stitchMat);
    box(0.25, 0.04, 0.02, 0.1, 1.55, 0.48, stitchMat);
    // крестовой шов на животе
    box(0.04, 0.3, 0.02, 0, 1.05, 0.58, stitchMat);
    box(0.2, 0.04, 0.02, 0, 1.05, 0.58, stitchMat);

    // === Цепи на теле ===
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x6a6a6a, metalness: 0.85, roughness: 0.3 });
    for (let i = 0; i < 5; i++) {
      const link = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.015, 6, 8), chainMat);
      link.position.set(-0.5 + i * 0.25, 1.85, 0.5);
      link.rotation.y = i * 0.6;
      g.add(link);
    }
    // цепь через плечо
    for (let i = 0; i < 4; i++) {
      const link = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.015, 6, 8), chainMat);
      link.position.set(0.6, 2.0 - i * 0.15, 0.45);
      link.rotation.x = 0.5;
      g.add(link);
    }

    // === Крюки на спине ===
    const hookMat = new THREE.MeshStandardMaterial({ color: 0x8a8f9c, metalness: 0.85, roughness: 0.25 });
    for (let i = 0; i < 3; i++) {
      const hook = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.35, 4), hookMat);
      hook.position.set(-0.3 + i * 0.3, 2.65, -0.4);
      hook.rotation.z = (i - 1) * 0.4;
      hook.rotation.x = 0.3;
      g.add(hook);
    }

    // === Ноги (толстые, мускулистые) ===
    box(0.32, 0.85, 0.32, -0.38, 0.42, 0, meatMat);
    box(0.32, 0.85, 0.32, 0.38, 0.42, 0, meatMat);
    // ступни
    box(0.34, 0.12, 0.42, -0.38, 0.06, 0.05, meatMat);
    box(0.34, 0.12, 0.42, 0.38, 0.06, 0.05, meatMat);

    // === Капли крови ===
    const bloodMat = new THREE.MeshBasicMaterial({ color: 0xaa0000, toneMapped: false, transparent: true, opacity: 0.65 });
    for (let i = 0; i < 5; i++) {
      const drip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.008, 0.15 + Math.random() * 0.15, 4), bloodMat);
      drip.position.set((Math.random() - 0.5) * 1.0, 0.7 + Math.random() * 0.8, 0.5);
      g.add(drip);
    }

    height = 3.1;

  } else if (type === 'rebradd') {
    // ЛОРД РЕБРАДД — высокий скелет-повелитель с ледяными секирами и морозными рунами
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xd8d4bc, roughness: 0.68, emissive: 0x999977, emissiveIntensity: 0.18 });
    const boneDarkMat = new THREE.MeshStandardMaterial({ color: 0xb8b4a0, roughness: 0.75, emissive: 0x777755, emissiveIntensity: 0.1 });
    const axeMat = new THREE.MeshStandardMaterial({ color: 0x88ccee, roughness: 0.2, metalness: 0.85, emissive: 0x4488cc, emissiveIntensity: 0.5 });
    const axeGlowMat = new THREE.MeshBasicMaterial({ color: 0x66bbee, toneMapped: false, transparent: true, opacity: 0.35 });
    const frostRuneMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, toneMapped: false, transparent: true, opacity: 0.7 });
    const capeMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.85, side: THREE.DoubleSide, emissive: 0x223344, emissiveIntensity: 0.1 });

    // === Череп (детализированный) ===
    box(0.44, 0.5, 0.38, 0, 2.72, 0, boneMat);
    // скулы
    box(0.18, 0.12, 0.1, -0.22, 2.62, 0.12, boneDarkMat);
    box(0.18, 0.12, 0.1, 0.22, 2.62, 0.12, boneDarkMat);
    // надбровные дуги
    box(0.48, 0.06, 0.08, 0, 2.82, 0.16, boneDarkMat);
    // глазницы (тёмные впадины)
    box(0.15, 0.12, 0.05, -0.11, 2.76, 0.19, dark);
    box(0.15, 0.12, 0.05, 0.11, 2.76, 0.19, dark);
    // ледяное пламя в глазницах
    addEye(0x4488ff, -0.11, 2.76, 0.21, 0.05);
    addEye(0x4488ff, 0.11, 2.76, 0.21, 0.05);
    // носовая впадина
    box(0.06, 0.08, 0.04, 0, 2.66, 0.2, dark);
    // челюсть (отдельная, слегка открытая)
    parts.jaw = box(0.34, 0.1, 0.22, 0, 2.42, 0.08, boneMat);
    // зубы
    for (let i = 0; i < 5; i++) {
      box(0.04, 0.06, 0.03, -0.12 + i * 0.06, 2.48, 0.18, boneDarkMat);
    }
    // рога-отростки на черепе
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xccccaa, roughness: 0.5, metalness: 0.2 });
    const rh1 = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.35, 5), hornMat);
    rh1.position.set(-0.2, 3.05, -0.05); rh1.rotation.z = 0.35; g.add(rh1);
    const rh2 = rh1.clone(); rh2.position.x = 0.2; rh2.rotation.z = -0.35; g.add(rh2);
    const rh3 = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.25, 5), hornMat);
    rh3.position.set(0, 3.08, -0.1); rh3.rotation.x = -0.2; g.add(rh3);

    // === Позвоночник (сегментированный) ===
    for (let i = 0; i < 6; i++) {
      box(0.09, 0.12, 0.09, 0, 2.25 - i * 0.18, 0, boneMat);
      // остистые отростки
      box(0.03, 0.06, 0.06, 0, 2.25 - i * 0.18, -0.06, boneDarkMat);
    }

    // === Грудная клетка (5 пар рёбер, изогнутые) ===
    for (let i = 0; i < 5; i++) {
      const w = 0.82 - i * 0.08;
      const y = 2.28 - i * 0.17;
      box(w, 0.045, 0.2, 0, y, 0, boneMat);
      // изгиб рёбер вперёд
      box(0.04, 0.04, 0.12, -w / 2, y - 0.02, 0.08, boneDarkMat);
      box(0.04, 0.04, 0.12, w / 2, y - 0.02, 0.08, boneDarkMat);
    }

    // === Морозные руны на рёбрах и позвоночнике ===
    box(0.03, 0.35, 0.02, 0, 2.1, 0.11, frostRuneMat);
    box(0.2, 0.03, 0.02, 0, 2.2, 0.11, frostRuneMat);
    box(0.15, 0.03, 0.02, 0, 1.95, 0.11, frostRuneMat);
    box(0.03, 0.25, 0.02, -0.25, 2.05, 0.1, frostRuneMat);
    box(0.03, 0.25, 0.02, 0.25, 2.05, 0.1, frostRuneMat);
    // руна на лбу
    box(0.08, 0.03, 0.02, 0, 2.88, 0.2, frostRuneMat);
    box(0.03, 0.08, 0.02, 0, 2.88, 0.2, frostRuneMat);

    // === Таз ===
    box(0.42, 0.1, 0.2, 0, 1.22, 0, boneMat);
    box(0.12, 0.15, 0.1, -0.18, 1.15, 0, boneDarkMat);
    box(0.12, 0.15, 0.1, 0.18, 1.15, 0, boneDarkMat);

    // === Руки (костяные сегменты) ===
    // Плечи (ключицы)
    box(0.5, 0.06, 0.08, -0.35, 2.32, 0, boneMat);
    box(0.5, 0.06, 0.08, 0.35, 2.32, 0, boneMat);
    // Плечевые кости
    box(0.08, 0.52, 0.08, -0.52, 2.05, 0, boneMat);
    box(0.08, 0.52, 0.08, 0.52, 2.05, 0, boneMat);
    // Локтевые суставы
    box(0.1, 0.08, 0.1, -0.55, 1.75, 0, boneDarkMat);
    box(0.1, 0.08, 0.1, 0.55, 1.75, 0, boneDarkMat);
    // Предплечья (слегка разведены)
    box(0.07, 0.5, 0.07, -0.64, 1.48, 0, boneMat);
    box(0.07, 0.5, 0.07, 0.64, 1.48, 0, boneMat);
    // Кисти (костяные)
    box(0.12, 0.12, 0.08, -0.68, 1.18, 0, boneDarkMat);
    box(0.12, 0.12, 0.08, 0.68, 1.18, 0, boneDarkMat);
    // Пальцы (по 3 на каждой руке)
    for (let i = 0; i < 3; i++) {
      box(0.025, 0.1, 0.025, -0.72 + i * 0.04, 1.08, 0.02, boneMat);
      box(0.025, 0.1, 0.025, 0.64 + i * 0.04, 1.08, 0.02, boneMat);
    }

    // === Ледяные секиры (в обеих руках) ===
    // Левая секира
    box(0.05, 0.6, 0.05, -0.68, 1.42, 0, boneDarkMat);  // рукоять
    box(0.38, 0.28, 0.05, -0.68, 1.76, 0, axeMat);       // лезвие
    parts.leftAxeGlow = box(0.42, 0.32, 0.09, -0.68, 1.76, 0, axeGlowMat);   // свечение
    // ледяные кристаллы на лезвии
    const iceCrMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, roughness: 0.1, emissive: 0x66aaee, emissiveIntensity: 0.6, transparent: true, opacity: 0.8 });
    const ic1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), iceCrMat);
    ic1.position.set(-0.82, 1.85, 0); g.add(ic1);
    const ic2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), iceCrMat);
    ic2.position.set(-0.55, 1.82, 0); g.add(ic2);
    // Правая секира
    box(0.05, 0.6, 0.05, 0.68, 1.42, 0, boneDarkMat);
    box(0.38, 0.28, 0.05, 0.68, 1.76, 0, axeMat);
    parts.rightAxeGlow = box(0.42, 0.32, 0.09, 0.68, 1.76, 0, axeGlowMat);
    const ic3 = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), iceCrMat);
    ic3.position.set(0.82, 1.85, 0); g.add(ic3);
    const ic4 = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), iceCrMat);
    ic4.position.set(0.55, 1.82, 0); g.add(ic4);

    // === Ноги (костяные) ===
    // Бедренные кости
    box(0.09, 0.52, 0.09, -0.18, 0.92, 0, boneMat);
    box(0.09, 0.52, 0.09, 0.18, 0.92, 0, boneMat);
    // Коленные суставы
    box(0.1, 0.08, 0.1, -0.18, 0.62, 0, boneDarkMat);
    box(0.1, 0.08, 0.1, 0.18, 0.62, 0, boneDarkMat);
    // Голени
    box(0.07, 0.5, 0.07, -0.18, 0.35, 0, boneMat);
    box(0.07, 0.5, 0.07, 0.18, 0.35, 0, boneMat);
    // Ступни (костяные, удлинённые)
    box(0.12, 0.05, 0.22, -0.18, 0.03, 0.04, boneDarkMat);
    box(0.12, 0.05, 0.22, 0.18, 0.03, 0.04, boneDarkMat);
    // Пальцы ног
    for (let i = 0; i < 3; i++) {
      box(0.025, 0.03, 0.06, -0.22 + i * 0.04, 0.02, 0.16, boneMat);
      box(0.025, 0.03, 0.06, 0.14 + i * 0.04, 0.02, 0.16, boneMat);
    }

    // === Рваный плащ (остатки) ===
    const cape1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.03), capeMat);
    cape1.position.set(0, 1.6, -0.22); cape1.rotation.x = 0.08; g.add(cape1);
    // рваные края
    const cape2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.02), capeMat);
    cape2.position.set(-0.15, 0.85, -0.24); cape2.rotation.z = 0.1; g.add(cape2);
    const cape3 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.02), capeMat);
    cape3.position.set(0.2, 0.9, -0.25); cape3.rotation.z = -0.08; g.add(cape3);

    // === Парящие костяные осколки (вокруг босса) ===
    const fragMat = new THREE.MeshStandardMaterial({ color: 0xd4d0b8, roughness: 0.6, emissive: 0x4488cc, emissiveIntensity: 0.3 });
    parts.boneFragments = [];
    for (let i = 0; i < 6; i++) {
      const frag = new THREE.Mesh(new THREE.TetrahedronGeometry(0.04 + Math.random() * 0.03, 0), fragMat);
      const a = (i / 6) * Math.PI * 2;
      const r = 0.7 + Math.random() * 0.3;
      frag.position.set(Math.cos(a) * r, 1.2 + Math.random() * 1.5, Math.sin(a) * r);
      frag.rotation.set(Math.random() * 2, Math.random() * 2, 0);
      g.add(frag);
      parts.boneFragments.push(frag);
    }

    // === Морозная аура (кольцо у основания) ===
    const frostAuraMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const frostAuraGeo = new THREE.RingGeometry(0.8, 1.3, 32);
    frostAuraGeo.rotateX(-Math.PI / 2);
    const frostAura = new THREE.Mesh(frostAuraGeo, frostAuraMat);
    frostAura.position.set(0, 0.08, 0);
    g.add(frostAura);
    parts.frostAura = frostAura;

    height = 3.1;

  } else if (type === 'necro') {
    // НЕКРОМАНТ — тёмный маг с посохом-черепом, парящими душами, рунами и капюшоном
    const robeMat = new THREE.MeshStandardMaterial({ color: 0x2a1140, roughness: 0.75, emissive: 0x1a0a30, emissiveIntensity: 0.2 });
    const robeDarkMat = new THREE.MeshStandardMaterial({ color: 0x1a0a28, roughness: 0.8, emissive: 0x0a0518, emissiveIntensity: 0.15 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x3a2a55, roughness: 0.6, emissive: 0x2a1a45, emissiveIntensity: 0.25 });
    const runeMat = new THREE.MeshBasicMaterial({ color: 0xb44dff, toneMapped: false, transparent: true, opacity: 0.8 });
    const soulMat = new THREE.MeshStandardMaterial({ color: 0x44ff88, roughness: 0.2, emissive: 0x22cc66, emissiveIntensity: 0.8, transparent: true, opacity: 0.7 });
    const boneMat2 = new THREE.MeshStandardMaterial({ color: 0xd8d4bc, roughness: 0.65, emissive: 0x999977, emissiveIntensity: 0.15 });

    // === Роба (многослойная, рваная) ===
    const robe = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.6, 10), robeMat);
    robe.position.y = 1.3; robe.castShadow = true; g.add(robe);
    parts.robe = robe;
    // внутренний слой робы
    const robeInner = new THREE.Mesh(new THREE.ConeGeometry(0.95, 2.2, 8), robeDarkMat);
    robeInner.position.y = 1.2; g.add(robeInner);
    // рваные края робы (лоскуты)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rag = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5 + Math.random() * 0.3, 0.03), robeDarkMat);
      rag.position.set(Math.cos(a) * 0.9, 0.3 + Math.random() * 0.2, Math.sin(a) * 0.9);
      rag.rotation.y = a;
      rag.rotation.x = 0.15 + Math.random() * 0.1;
      g.add(rag);
    }

    // === Торс (под робой, видимый) ===
    box(0.6, 0.8, 0.4, 0, 1.8, 0, robeMat);
    // рёбра-руны на груди
    box(0.03, 0.4, 0.02, -0.1, 1.9, 0.21, runeMat);
    box(0.03, 0.4, 0.02, 0.1, 1.9, 0.21, runeMat);
    box(0.15, 0.03, 0.02, 0, 2.05, 0.21, runeMat);
    box(0.12, 0.03, 0.02, 0, 1.85, 0.21, runeMat);
    // тёмный орб в груди (сердце-филактерия)
    const phylactery = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshStandardMaterial({ color: 0x5500aa, roughness: 0.2, emissive: 0x7722cc, emissiveIntensity: 0.9 }));
    phylactery.position.set(0, 1.95, 0.22); g.add(phylactery);

    // === Капюшон (глубокий, скрывает лицо) ===
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0x1a0a28, roughness: 0.8, side: THREE.DoubleSide });
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.55, 8), hoodMat);
    hood.position.set(0, 2.85, -0.02); hood.rotation.x = 0.12; g.add(hood);
    // поля капюшона
    const hoodBrim = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.44, 8), hoodMat);
    hoodBrim.position.set(0, 2.62, 0.08); hoodBrim.rotation.x = -0.3; g.add(hoodBrim);

    // === Голова (в тени капюшона) ===
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), skinMat);
    head.position.y = 2.68; g.add(head);
    parts.head = head;
    // впалые щёки
    box(0.08, 0.12, 0.06, -0.2, 2.62, 0.15, skinMat);
    box(0.08, 0.12, 0.06, 0.2, 2.62, 0.15, skinMat);
    // горящие глаза (глубоко в капюшоне)
    addEye(0xb44dff, -0.1, 2.72, 0.24, 0.05);
    addEye(0xb44dff, 0.1, 2.72, 0.24, 0.05);
    // третий глаз на лбу (рунический)
    const thirdEye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), new THREE.MeshBasicMaterial({ color: 0x7722cc, toneMapped: false }));
    thirdEye.position.set(0, 2.82, 0.26); g.add(thirdEye);

    // === Плечи (костяные наплечники) ===
    box(0.35, 0.18, 0.25, -0.55, 2.35, 0, boneMat2);
    box(0.35, 0.18, 0.25, 0.55, 2.35, 0, boneMat2);
    // шипы на наплечниках
    const sh1 = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.25, 4), boneMat2);
    sh1.position.set(-0.65, 2.5, 0); sh1.rotation.z = 0.4; g.add(sh1);
    const sh2 = sh1.clone(); sh2.position.x = 0.65; sh2.rotation.z = -0.4; g.add(sh2);

    // === Руки (костлявые, с когтями) ===
    // левая рука (держит посох)
    box(0.08, 0.55, 0.08, -0.55, 1.95, 0.1, skinMat);
    box(0.07, 0.45, 0.07, -0.6, 1.5, 0.15, skinMat);
    // когти левой руки
    for (let i = 0; i < 3; i++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.12, 3), boneMat2);
      claw.position.set(-0.63 + i * 0.03, 1.22, 0.18);
      claw.rotation.x = 0.3;
      g.add(claw);
    }
    // правая рука (кастующая, поднята)
    box(0.08, 0.55, 0.08, 0.55, 1.95, 0.1, skinMat);
    box(0.07, 0.45, 0.07, 0.62, 1.55, 0.2, skinMat);
    // когти правой руки
    for (let i = 0; i < 3; i++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.12, 3), boneMat2);
      claw.position.set(0.59 + i * 0.03, 1.28, 0.24);
      claw.rotation.x = 0.4;
      g.add(claw);
    }

    // === Посох с черепом (в левой руке) ===
    const staffMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.85 });
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.2, 6), staffMat);
    staff.position.set(-0.65, 1.6, 0.15); staff.rotation.z = 0.08; g.add(staff);
    // череп на посохе
    const skullMat = new THREE.MeshStandardMaterial({ color: 0xd8d4bc, roughness: 0.6, emissive: 0x7722cc, emissiveIntensity: 0.3 });
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), skullMat);
    skull.position.set(-0.65, 2.78, 0.15); g.add(skull);
    // глазницы черепа (светятся)
    const skullEyeMat = new THREE.MeshBasicMaterial({ color: 0xb44dff, toneMapped: false });
    const se1 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), skullEyeMat);
    se1.position.set(-0.69, 2.8, 0.25); g.add(se1);
    const se2 = se1.clone(); se2.position.x = -0.61; g.add(se2);
    // челюсть черепа
    box(0.1, 0.04, 0.06, -0.65, 2.68, 0.2, skullMat);
    // орб-свечение вокруг черепа
    const orbGlow = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: 0x7722cc, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    orbGlow.position.set(-0.65, 2.78, 0.15); g.add(orbGlow);

    // === Парящие души (вокруг босса) ===
    parts.souls = [];
    for (let i = 0; i < 5; i++) {
      const soul = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.03, 6, 6), soulMat);
      const a = (i / 5) * Math.PI * 2;
      const r = 0.8 + Math.random() * 0.4;
      soul.position.set(Math.cos(a) * r, 1.5 + Math.random() * 1.2, Math.sin(a) * r);
      g.add(soul);
      parts.souls.push(soul);
    }

    // === Тёмная аура (кольцо у основания) ===
    const darkAuraMat = new THREE.MeshBasicMaterial({ color: 0x5500aa, transparent: true, opacity: 0.18, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const darkAuraGeo = new THREE.RingGeometry(0.9, 1.4, 32);
    darkAuraGeo.rotateX(-Math.PI / 2);
    const darkAura = new THREE.Mesh(darkAuraGeo, darkAuraMat);
    darkAura.position.set(0, 0.08, 0);
    g.add(darkAura);
    parts.darkAura = darkAura;

    // === Костяные украшения на поясе ===
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.2, 4), boneMat2);
      bone.position.set(Math.cos(a) * 0.5, 1.15, Math.sin(a) * 0.5);
      bone.rotation.z = 0.3;
      g.add(bone);
    }

    // === Руны на робе (светящиеся символы) ===
    box(0.04, 0.3, 0.02, -0.2, 1.5, 0.55, runeMat);
    box(0.04, 0.3, 0.02, 0.2, 1.5, 0.55, runeMat);
    box(0.2, 0.04, 0.02, 0, 1.6, 0.55, runeMat);
    box(0.15, 0.04, 0.02, 0, 1.4, 0.55, runeMat);
    // спиральная руна
    box(0.03, 0.2, 0.02, -0.3, 1.8, 0.45, runeMat);
    box(0.12, 0.03, 0.02, -0.25, 1.9, 0.45, runeMat);
    box(0.03, 0.2, 0.02, 0.3, 1.8, 0.45, runeMat);
    box(0.12, 0.03, 0.02, 0.25, 1.9, 0.45, runeMat);

    height = 3.2;

  } else if (type === 'golemKing') {
    // КОРОЛЬ ГОЛЕМОВ — массивный каменный титан с короной, трещинами лавы и кулаками-валунами
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.85, emissive: 0x333333, emissiveIntensity: 0.1 });
    const stoneDarkMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9, emissive: 0x222222, emissiveIntensity: 0.08 });
    const lavaMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, toneMapped: false });
    const lavaGlowMat = new THREE.MeshBasicMaterial({ color: 0xff6600, toneMapped: false, transparent: true, opacity: 0.5 });

    // === Торс (массивный каменный блок) ===
    box(1.5, 1.7, 1.1, 0, 1.35, 0, stoneMat);
    // каменные пластины на груди
    box(0.6, 0.5, 0.15, -0.3, 1.7, 0.55, stoneDarkMat);
    box(0.6, 0.5, 0.15, 0.3, 1.7, 0.55, stoneDarkMat);
    box(0.8, 0.3, 0.12, 0, 1.2, 0.55, stoneDarkMat);
    // живот (каменные блоки)
    box(0.9, 0.4, 0.2, 0, 0.85, 0.5, stoneDarkMat);

    // === Плечи (огромные каменные глыбы) ===
    box(0.9, 0.7, 0.8, -1.1, 2.15, 0, stoneMat);
    box(0.9, 0.7, 0.8, 1.1, 2.15, 0, stoneMat);
    // шипы на плечах (каменные)
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.7, metalness: 0.1 });
    const gs1 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 5), spikeMat);
    gs1.position.set(-1.3, 2.65, 0); gs1.rotation.z = 0.3; g.add(gs1);
    const gs2 = gs1.clone(); gs2.position.x = 1.3; gs2.rotation.z = -0.3; g.add(gs2);
    const gs3 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 5), spikeMat);
    gs3.position.set(-0.9, 2.6, 0.25); gs3.rotation.z = 0.15; g.add(gs3);
    const gs4 = gs3.clone(); gs4.position.x = 0.9; gs4.rotation.z = -0.15; g.add(gs4);

    // === Голова (каменная, с короной) ===
    parts.head = box(0.6, 0.6, 0.55, 0, 2.6, 0, stoneMat);
    // каменные брови (нахмуренные)
    box(0.22, 0.08, 0.1, -0.15, 2.78, 0.25, stoneDarkMat);
    box(0.22, 0.08, 0.1, 0.15, 2.78, 0.25, stoneDarkMat);
    // челюсть (массивная)
    box(0.45, 0.15, 0.3, 0, 2.35, 0.1, stoneDarkMat);
    // зубы (каменные)
    for (let i = 0; i < 4; i++) {
      box(0.06, 0.08, 0.05, -0.12 + i * 0.08, 2.42, 0.26, stoneMat);
    }
    addEye(0xffaa00, -0.14, 2.68, 0.3, 0.07);
    addEye(0xffaa00, 0.14, 2.68, 0.3, 0.07);

    // === Корона (золотая, с самоцветами) ===
    const crownMat = new THREE.MeshStandardMaterial({ color: 0xccaa00, metalness: 0.85, roughness: 0.2, emissive: 0xccaa00, emissiveIntensity: 0.4 });
    parts.crown = box(0.6, 0.14, 0.6, 0, 2.98, 0, crownMat);
    // зубцы короны
    box(0.12, 0.28, 0.12, -0.22, 3.18, -0.22, crownMat);
    box(0.12, 0.28, 0.12, 0.22, 3.18, -0.22, crownMat);
    box(0.12, 0.28, 0.12, 0, 3.18, 0.22, crownMat);
    box(0.12, 0.32, 0.12, -0.22, 3.2, 0.22, crownMat);
    box(0.12, 0.32, 0.12, 0.22, 3.2, 0.22, crownMat);
    // самоцветы в короне
    const gemMat = new THREE.MeshStandardMaterial({ color: 0xff4400, roughness: 0.1, emissive: 0xff4400, emissiveIntensity: 0.8 });
    const gem1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), gemMat);
    gem1.position.set(0, 3.05, 0.32); g.add(gem1);
    const gem2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), gemMat);
    gem2.position.set(-0.22, 3.05, 0); g.add(gem2);
    const gem3 = gem2.clone(); gem3.position.x = 0.22; g.add(gem3);

    // === Руки (каменные, с кулаками-валунами) ===
    // левая рука
    box(0.25, 0.8, 0.25, -1.35, 1.6, 0, stoneMat);
    parts.leftFist = box(0.55, 0.55, 0.55, -1.4, 1.05, 0, stoneMat);
    // каменные наросты на кулаке
    box(0.15, 0.12, 0.15, -1.55, 1.25, 0.15, stoneDarkMat);
    box(0.12, 0.1, 0.12, -1.3, 1.3, -0.1, stoneDarkMat);
    // правая рука
    box(0.25, 0.8, 0.25, 1.35, 1.6, 0, stoneMat);
    parts.rightFist = box(0.55, 0.55, 0.55, 1.4, 1.05, 0, stoneMat);
    box(0.15, 0.12, 0.15, 1.55, 1.25, 0.15, stoneDarkMat);
    box(0.12, 0.1, 0.12, 1.3, 1.3, -0.1, stoneDarkMat);

    // === Ноги (каменные столбы) ===
    box(0.4, 0.9, 0.4, -0.4, 0.45, 0, stoneMat);
    box(0.4, 0.9, 0.4, 0.4, 0.45, 0, stoneMat);
    // ступни (широкие каменные)
    box(0.5, 0.15, 0.55, -0.4, 0.08, 0.05, stoneDarkMat);
    box(0.5, 0.15, 0.55, 0.4, 0.08, 0.05, stoneDarkMat);

    // === Светящиеся трещины лавы (по всему телу) ===
    box(0.08, 1.1, 0.02, 0.2, 1.5, 0.57, lavaMat);
    box(0.03, 0.8, 0.08, -0.25, 1.3, 0.57, lavaMat);
    box(0.08, 0.6, 0.02, 0.0, 1.85, 0.57, lavaMat);
    box(0.03, 0.7, 0.02, 0.5, 1.4, 0.47, lavaMat);
    box(0.03, 0.5, 0.02, -0.4, 1.6, 0.47, lavaMat);
    // трещины на плечах
    box(0.06, 0.4, 0.02, -1.1, 2.15, 0.42, lavaMat);
    box(0.06, 0.4, 0.02, 1.1, 2.15, 0.42, lavaMat);
    // трещины на кулаках
    box(0.04, 0.3, 0.02, -1.4, 1.05, 0.3, lavaMat);
    box(0.04, 0.3, 0.02, 1.4, 1.05, 0.3, lavaMat);
    // свечение трещин (glow)
    const glowCrack2 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), lavaGlowMat);
    glowCrack2.position.set(0.2, 1.5, 0.55); g.add(glowCrack2);
    const glowCrack3 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), lavaGlowMat);
    glowCrack3.position.set(-0.25, 1.3, 0.55); g.add(glowCrack3);

    // === Каменные обломки (парящие вокруг) ===
    parts.debris = [];
    for (let i = 0; i < 5; i++) {
      const deb = new THREE.Mesh(new THREE.TetrahedronGeometry(0.06 + Math.random() * 0.04, 0), stoneMat);
      const a = (i / 5) * Math.PI * 2;
      const r = 1.0 + Math.random() * 0.4;
      deb.position.set(Math.cos(a) * r, 0.8 + Math.random() * 1.5, Math.sin(a) * r);
      deb.rotation.set(Math.random() * 2, Math.random() * 2, 0);
      g.add(deb);
      parts.debris.push(deb);
    }

    // === Аура земли (кольцо у основания) ===
    const earthAuraMat = new THREE.MeshBasicMaterial({ color: 0x885522, transparent: true, opacity: 0.15, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const earthAuraGeo = new THREE.RingGeometry(1.0, 1.6, 32);
    earthAuraGeo.rotateX(-Math.PI / 2);
    const earthAura = new THREE.Mesh(earthAuraGeo, earthAuraMat);
    earthAura.position.set(0, 0.06, 0);
    g.add(earthAura);
    parts.earthAura = earthAura;

    height = 3.5;

  } else if (type === 'firelord') {
    // ПОВЕЛИТЕЛЬ ОГНЯ — огненный демон с лавовыми трещинами, рогами и пламенем
    const fMat = new THREE.MeshStandardMaterial({ color: 0xff3300, roughness: 0.35, emissive: 0xff3300, emissiveIntensity: 0.6 });
    const fDarkMat = new THREE.MeshStandardMaterial({ color: 0x881100, roughness: 0.5, emissive: 0x661100, emissiveIntensity: 0.3 });
    const lavaMat2 = new THREE.MeshBasicMaterial({ color: 0xff6600, toneMapped: false });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6600, toneMapped: false });

    // === Торс (огненное тело) ===
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.3, 4, 8), fMat);
    body.position.y = 1.35; body.castShadow = true; g.add(body);
    // лавовые трещины на теле
    box(0.06, 0.7, 0.02, 0.15, 1.5, 0.48, lavaMat2);
    box(0.04, 0.5, 0.02, -0.18, 1.3, 0.48, lavaMat2);
    box(0.2, 0.04, 0.02, 0, 1.6, 0.48, lavaMat2);
    box(0.15, 0.04, 0.02, 0.05, 1.2, 0.48, lavaMat2);
    // нагрудник из застывшей лавы
    box(0.7, 0.5, 0.2, 0, 1.65, 0.4, fDarkMat);

    // === Плечи (огненные наросты) ===
    box(0.4, 0.35, 0.35, -0.6, 2.0, 0, fMat);
    box(0.4, 0.35, 0.35, 0.6, 2.0, 0, fMat);
    // шипы из застывшей лавы
    const lavaSpikeMat = new THREE.MeshStandardMaterial({ color: 0xcc2200, roughness: 0.4, emissive: 0xff4400, emissiveIntensity: 0.5 });
    const ls1 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 5), lavaSpikeMat);
    ls1.position.set(-0.7, 2.3, 0); ls1.rotation.z = 0.4; g.add(ls1);
    const ls2 = ls1.clone(); ls2.position.x = 0.7; ls2.rotation.z = -0.4; g.add(ls2);

    // === Голова (демоническая, с рогами) ===
    parts.head = box(0.42, 0.42, 0.4, 0, 2.3, 0, fMat);
    // рога (огненные, изогнутые)
    const hornMat2 = new THREE.MeshStandardMaterial({ color: 0xcc2200, roughness: 0.3, emissive: 0xff4400, emissiveIntensity: 0.6 });
    const fh1 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 5), hornMat2);
    fh1.position.set(-0.22, 2.65, -0.05); fh1.rotation.z = 0.35; fh1.rotation.x = -0.15; g.add(fh1);
    const fh2 = fh1.clone(); fh2.position.x = 0.22; fh2.rotation.z = -0.35; g.add(fh2);
    // маленькие рога
    const fh3 = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.25, 4), hornMat2);
    fh3.position.set(-0.12, 2.58, 0.1); fh3.rotation.z = 0.2; g.add(fh3);
    const fh4 = fh3.clone(); fh4.position.x = 0.12; fh4.rotation.z = -0.2; g.add(fh4);
    // пылающие глаза
    addEye(0xffff00, -0.1, 2.35, 0.22, 0.055);
    addEye(0xffff00, 0.1, 2.35, 0.22, 0.055);
    // пылающая борода/подбородок
    box(0.2, 0.12, 0.1, 0, 2.12, 0.18, fDarkMat);

    // === Руки (огненные, с когтями) ===
    box(0.12, 0.6, 0.12, -0.6, 1.6, 0.1, fMat);
    box(0.12, 0.6, 0.12, 0.6, 1.6, 0.1, fMat);
    // кулаки с огненными когтями
    box(0.18, 0.18, 0.18, -0.62, 1.2, 0.12, fDarkMat);
    box(0.18, 0.18, 0.18, 0.62, 1.2, 0.12, fDarkMat);
    for (let i = 0; i < 3; i++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.15, 3), hornMat2);
      claw.position.set(-0.66 + i * 0.04, 1.05, 0.16);
      claw.rotation.x = 0.3;
      g.add(claw);
      const claw2 = claw.clone(); claw2.position.x = 0.58 + i * 0.04; g.add(claw2);
    }

    // === Ноги (огненные) ===
    box(0.16, 0.7, 0.16, -0.22, 0.5, 0, fMat);
    box(0.16, 0.7, 0.16, 0.22, 0.5, 0, fMat);
    // копыта из застывшей лавы
    box(0.2, 0.1, 0.28, -0.22, 0.06, 0.04, fDarkMat);
    box(0.2, 0.1, 0.28, 0.22, 0.06, 0.04, fDarkMat);

    // === Языки пламени (вокруг тела) ===
    parts.flames = [];
    for (let i = 0; i < 10; i++) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.05 + Math.random() * 0.03, 0.3 + Math.random() * 0.2, 4), flameMat);
      const a = (i / 10) * Math.PI * 2;
      const r = 0.5 + Math.random() * 0.25;
      flame.position.set(Math.cos(a) * r, 0.8 + Math.random() * 1.6, Math.sin(a) * r);
      flame.rotation.z = (Math.random() - 0.5) * 0.4;
      g.add(flame);
      parts.flames.push(flame);
    }
    // огненная корона (5 крупных языков)
    for (let i = 0; i < 5; i++) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 4), flameMat);
      const a = (i / 5) * Math.PI * 2;
      flame.position.set(Math.cos(a) * 0.22, 2.65, Math.sin(a) * 0.22);
      g.add(flame);
    }

    // === Огненная аура (кольцо у основания) ===
    const fireAuraMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.2, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const fireAuraGeo = new THREE.RingGeometry(0.8, 1.3, 32);
    fireAuraGeo.rotateX(-Math.PI / 2);
    const fireAura = new THREE.Mesh(fireAuraGeo, fireAuraMat);
    fireAura.position.set(0, 0.08, 0);
    g.add(fireAura);
    parts.fireAura = fireAura;

    // === Угли (парящие вокруг) ===
    parts.embers = [];
    for (let i = 0; i < 6; i++) {
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 4, 4), new THREE.MeshBasicMaterial({ color: 0xff6600, toneMapped: false }));
      const a = (i / 6) * Math.PI * 2;
      const r = 0.6 + Math.random() * 0.5;
      ember.position.set(Math.cos(a) * r, 1.0 + Math.random() * 1.5, Math.sin(a) * r);
      g.add(ember);
      parts.embers.push(ember);
    }

    height = 2.9;

  } else if (type === 'shadowKing') {
    // КОРОЛЬ ТЕНЕЙ — тёмный властелин с кинжалами, теневыми щупальцами и короной
    const shadowMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2e, roughness: 0.5, emissive: 0x330066, emissiveIntensity: 0.35 });
    const shadowDarkMat = new THREE.MeshStandardMaterial({ color: 0x0a0518, roughness: 0.7, emissive: 0x1a0a2e, emissiveIntensity: 0.2 });
    const voidMat = new THREE.MeshBasicMaterial({ color: 0x6633aa, toneMapped: false, transparent: true, opacity: 0.6 });
    const daggerMat2 = new THREE.MeshStandardMaterial({ color: 0x8866cc, metalness: 0.9, roughness: 0.1, emissive: 0x6633aa, emissiveIntensity: 0.5 });

    // === Торс (стройный, теневой) ===
    box(0.55, 1.1, 0.38, 0, 1.1, 0, shadowMat);
    // теневые руны на груди
    box(0.03, 0.4, 0.02, -0.08, 1.3, 0.2, voidMat);
    box(0.03, 0.4, 0.02, 0.08, 1.3, 0.2, voidMat);
    box(0.12, 0.03, 0.02, 0, 1.45, 0.2, voidMat);
    // тёмный кристалл в груди
    const darkCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), new THREE.MeshStandardMaterial({ color: 0x4400aa, roughness: 0.1, emissive: 0x6633aa, emissiveIntensity: 0.9 }));
    darkCrystal.position.set(0, 1.35, 0.22); g.add(darkCrystal);

    // === Плечи (теневые наросты) ===
    box(0.3, 0.2, 0.25, -0.45, 1.75, 0, shadowMat);
    box(0.3, 0.2, 0.25, 0.45, 1.75, 0, shadowMat);
    // шипы из тьмы
    const voidSpikeMat = new THREE.MeshStandardMaterial({ color: 0x330066, roughness: 0.3, emissive: 0x6633aa, emissiveIntensity: 0.6 });
    const vs1 = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 4), voidSpikeMat);
    vs1.position.set(-0.55, 1.95, 0); vs1.rotation.z = 0.4; g.add(vs1);
    const vs2 = vs1.clone(); vs2.position.x = 0.55; vs2.rotation.z = -0.4; g.add(vs2);

    // === Голова (с короной) ===
    parts.head = box(0.34, 0.36, 0.32, 0, 1.95, 0, shadowMat);
    // капюшон (теневой)
    const hoodMat2 = new THREE.MeshStandardMaterial({ color: 0x0a0518, roughness: 0.8, side: THREE.DoubleSide });
    const hood2 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 6), hoodMat2);
    hood2.position.set(0, 2.2, -0.02); hood2.rotation.x = 0.1; g.add(hood2);
    // пылающие глаза
    addEye(0xaa44ff, -0.09, 1.98, 0.18, 0.05);
    addEye(0xaa44ff, 0.09, 1.98, 0.18, 0.05);
    // корона (тёмная, с шипами)
    const crownMat2 = new THREE.MeshStandardMaterial({ color: 0x6633aa, metalness: 0.8, roughness: 0.2, emissive: 0x6633aa, emissiveIntensity: 0.5 });
    box(0.36, 0.08, 0.36, 0, 2.18, 0, crownMat2);
    box(0.06, 0.2, 0.06, -0.12, 2.32, -0.12, crownMat2);
    box(0.06, 0.2, 0.06, 0.12, 2.32, -0.12, crownMat2);
    box(0.06, 0.2, 0.06, 0, 2.32, 0.12, crownMat2);
    box(0.06, 0.24, 0.06, -0.12, 2.34, 0.12, crownMat2);
    box(0.06, 0.24, 0.06, 0.12, 2.34, 0.12, crownMat2);

    // === Руки (с теневыми кинжалами) ===
    box(0.1, 0.55, 0.1, -0.45, 1.4, 0.05, shadowMat);
    box(0.1, 0.55, 0.1, 0.45, 1.4, 0.05, shadowMat);
    // кинжалы в руках
    const dk1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.02), daggerMat2);
    dk1.position.set(-0.48, 1.0, 0.12); dk1.rotation.z = 0.15; g.add(dk1);
    const dk2 = dk1.clone(); dk2.position.x = 0.48; dk2.rotation.z = -0.15; g.add(dk2);
    // свечение кинжалов
    const dkGlow1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.04), new THREE.MeshBasicMaterial({ color: 0x8844ff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    dkGlow1.position.set(-0.48, 1.0, 0.12); g.add(dkGlow1);
    const dkGlow2 = dkGlow1.clone(); dkGlow2.position.x = 0.48; g.add(dkGlow2);

    // === Ноги (теневые) ===
    box(0.14, 0.65, 0.14, -0.18, 0.45, 0, shadowDarkMat);
    box(0.14, 0.65, 0.14, 0.18, 0.45, 0, shadowDarkMat);

    // === Плащ (длинный, разввающийся) ===
    const capeMat = new THREE.MeshStandardMaterial({ color: 0x110a1e, roughness: 0.8, side: THREE.DoubleSide, emissive: 0x1a0a2e, emissiveIntensity: 0.15 });
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.7, 0.04), capeMat);
    cape.position.set(0, 1.15, -0.25); g.add(cape);
    parts.cape = cape;
    // рваные края плаща
    const cape2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.03), capeMat);
    cape2.position.set(-0.2, 0.3, -0.27); cape2.rotation.z = 0.08; g.add(cape2);
    const cape3 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.03), capeMat);
    cape3.position.set(0.25, 0.35, -0.28); cape3.rotation.z = -0.06; g.add(cape3);

    // === Теневые щупальца (из спины) ===
    parts.tendrils = [];
    for (let i = 0; i < 4; i++) {
      const tendril = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.8, 4), shadowDarkMat);
      const a = (i / 4) * Math.PI * 0.8 - Math.PI * 0.4;
      tendril.position.set(Math.sin(a) * 0.3, 1.3 + i * 0.15, -0.35);
      tendril.rotation.x = 0.5 + i * 0.1;
      tendril.rotation.z = (i - 1.5) * 0.2;
      g.add(tendril);
      parts.tendrils.push(tendril);
    }

    // === Теневые клоны (полупрозрачные копии) ===
    const cloneMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2e, roughness: 0.5, emissive: 0x6633aa, emissiveIntensity: 0.3, transparent: true, opacity: 0.25 });
    const clone1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.75, 4, 8), cloneMat);
    clone1.position.set(-0.85, 1.0, -0.3); g.add(clone1);
    const clone2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.75, 4, 8), cloneMat);
    clone2.position.set(0.85, 1.0, -0.3); g.add(clone2);

    // === Тёмная аура (кольцо у основания) ===
    const auraMat = new THREE.MeshBasicMaterial({ color: 0x330066, transparent: true, opacity: 0.2, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const auraGeo = new THREE.RingGeometry(0.8, 1.4, 32);
    auraGeo.rotateX(-Math.PI / 2);
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.position.set(0, 0.1, 0);
    g.add(aura);
    parts.darkAura = aura;

    // === Теневые частицы (парящие) ===
    parts.shadowParticles = [];
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Mesh(new THREE.TetrahedronGeometry(0.03 + Math.random() * 0.02, 0), new THREE.MeshBasicMaterial({ color: 0x6633aa, toneMapped: false, transparent: true, opacity: 0.5 }));
      const a = (i / 6) * Math.PI * 2;
      const r = 0.6 + Math.random() * 0.4;
      sp.position.set(Math.cos(a) * r, 0.8 + Math.random() * 1.2, Math.sin(a) * r);
      g.add(sp);
      parts.shadowParticles.push(sp);
    }

    height = 2.5;

  } else if (type === 'frostQueen') {
    // ЛЕДЯНАЯ КОРОЛЕВА — величественная ледяная владычица с посохом, кристаллами и ледяным платьем
    const iceMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.15, emissive: 0x4488ff, emissiveIntensity: 0.5, transparent: true, opacity: 0.88 });
    const iceDarkMat = new THREE.MeshStandardMaterial({ color: 0x4488cc, roughness: 0.2, emissive: 0x2266aa, emissiveIntensity: 0.3, transparent: true, opacity: 0.85 });
    const iceGlowMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, toneMapped: false, transparent: true, opacity: 0.5 });
    const frostMat = new THREE.MeshBasicMaterial({ color: 0xccffff, toneMapped: false, transparent: true, opacity: 0.6 });

    // === Тело (ледяная капсула) ===
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.15, 4, 8), iceMat);
    body.position.y = 1.3; body.castShadow = true; g.add(body);
    // ледяные трещины на теле
    box(0.04, 0.5, 0.02, 0.12, 1.4, 0.4, frostMat);
    box(0.03, 0.4, 0.02, -0.15, 1.2, 0.4, frostMat);
    box(0.15, 0.03, 0.02, 0, 1.5, 0.4, frostMat);
    // ледяной нагрудник
    box(0.5, 0.35, 0.15, 0, 1.6, 0.35, iceDarkMat);

    // === Плечи (ледяные кристаллы) ===
    const shoulderMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, roughness: 0.1, emissive: 0x66aaee, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 });
    const ls1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), shoulderMat);
    ls1.position.set(-0.55, 1.9, 0); ls1.rotation.z = 0.3; g.add(ls1);
    const ls2 = ls1.clone(); ls2.position.x = 0.55; ls2.rotation.z = -0.3; g.add(ls2);
    // шипы на плечах
    const iceSpikeMat = new THREE.MeshStandardMaterial({ color: 0xccffff, roughness: 0.1, emissive: 0x88ccff, emissiveIntensity: 0.7 });
    const is1 = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 4), iceSpikeMat);
    is1.position.set(-0.6, 2.1, 0); is1.rotation.z = 0.4; g.add(is1);
    const is2 = is1.clone(); is2.position.x = 0.6; is2.rotation.z = -0.4; g.add(is2);

    // === Голова (с ледяной короной) ===
    parts.head = box(0.34, 0.36, 0.32, 0, 2.1, 0, iceMat);
    // ледяная корона (6 шипов)
    const crownMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, metalness: 0.7, roughness: 0.1, emissive: 0x88ccff, emissiveIntensity: 0.6 });
    for (let i = 0; i < 6; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.32, 4), crownMat);
      const a = (i / 6) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 0.2, 2.38, Math.sin(a) * 0.2);
      g.add(spike);
    }
    // основание короны
    const crownBase = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 12), crownMat);
    crownBase.position.set(0, 2.3, 0); crownBase.rotation.x = Math.PI / 2; g.add(crownBase);
    // ледяные глаза
    addEye(0xccffff, -0.08, 2.14, 0.18, 0.05);
    addEye(0xccffff, 0.08, 2.14, 0.18, 0.05);
    // ледяные слёзы (под глазами)
    box(0.02, 0.08, 0.02, -0.08, 2.04, 0.18, frostMat);
    box(0.02, 0.08, 0.02, 0.08, 2.04, 0.18, frostMat);

    // === Руки (ледяные, с посохом) ===
    box(0.09, 0.55, 0.09, -0.5, 1.55, 0.05, iceMat);
    box(0.09, 0.55, 0.09, 0.5, 1.55, 0.05, iceMat);
    // ледяные когти
    for (let i = 0; i < 3; i++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.12, 3), iceSpikeMat);
      claw.position.set(-0.53 + i * 0.03, 1.2, 0.1);
      claw.rotation.x = 0.3;
      g.add(claw);
      const claw2 = claw.clone(); claw2.position.x = 0.47 + i * 0.03; g.add(claw2);
    }

    // === Посох (ледяной, с кристаллом) ===
    const staffMat2 = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.15, emissive: 0x4488ff, emissiveIntensity: 0.4, transparent: true, opacity: 0.9 });
    const staff2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 2.0, 6), staffMat2);
    staff2.position.set(0.55, 1.5, 0.1); staff2.rotation.z = -0.06; g.add(staff2);
    // кристалл на посохе
    const staffCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), new THREE.MeshStandardMaterial({ color: 0xccffff, roughness: 0.05, emissive: 0x88ccff, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 }));
    staffCrystal.position.set(0.55, 2.58, 0.1); g.add(staffCrystal);
    // свечение кристалла
    const staffGlow = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    staffGlow.position.set(0.55, 2.58, 0.1); g.add(staffGlow);

    // === Ледяное платье (нижняя часть) ===
    const dressMat = new THREE.MeshStandardMaterial({ color: 0x6699cc, roughness: 0.2, emissive: 0x4488ff, emissiveIntensity: 0.3, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
    const dress = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.2, 8), dressMat);
    dress.position.y = 0.6; g.add(dress);
    // ледяные осколки на платье
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.2, 3), iceSpikeMat);
      shard.position.set(Math.cos(a) * 0.55, 0.3, Math.sin(a) * 0.55);
      shard.rotation.z = (Math.random() - 0.5) * 0.3;
      g.add(shard);
    }

    // === Ледяные кристаллы (орбитальные) ===
    parts.crystals = [];
    for (let i = 0; i < 8; i++) {
      const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.08 + Math.random() * 0.04, 0), iceMat);
      const a = (i / 8) * Math.PI * 2;
      const r = 0.5 + Math.random() * 0.3;
      cr.position.set(Math.cos(a) * r, 0.6 + Math.random() * 1.6, Math.sin(a) * r);
      cr.rotation.set(Math.random(), Math.random(), 0);
      g.add(cr);
      parts.crystals.push(cr);
    }

    // === Морозная аура (кольцо у основания) ===
    const frostAuraMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const frostAuraGeo = new THREE.RingGeometry(0.9, 1.3, 32);
    frostAuraGeo.rotateX(-Math.PI / 2);
    const frostAura = new THREE.Mesh(frostAuraGeo, frostAuraMat);
    frostAura.position.set(0, 0.1, 0);
    g.add(frostAura);
    parts.frostAura = frostAura;

    // === Снежинки (парящие вокруг) ===
    parts.snowflakes = [];
    for (let i = 0; i < 6; i++) {
      const sf = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.6 }));
      const a = (i / 6) * Math.PI * 2;
      const r = 0.7 + Math.random() * 0.5;
      sf.position.set(Math.cos(a) * r, 1.0 + Math.random() * 1.5, Math.sin(a) * r);
      g.add(sf);
      parts.snowflakes.push(sf);
    }

    height = 2.7;

  } else if (type === 'dragonLord') {
    // ЛОРД ДРАКОНОВ — огромный дракон с чешуёй, крыльями, хвостом и огненным дыханием
    const dMat = new THREE.MeshStandardMaterial({ color: 0xcc2200, roughness: 0.45, emissive: 0xcc2200, emissiveIntensity: 0.3 });
    const dDarkMat = new THREE.MeshStandardMaterial({ color: 0x881100, roughness: 0.55, emissive: 0x661100, emissiveIntensity: 0.2 });
    const scaleMat = new THREE.MeshStandardMaterial({ color: 0xaa1800, roughness: 0.5, emissive: 0x882200, emissiveIntensity: 0.25 });
    const fireGlowMat = new THREE.MeshBasicMaterial({ color: 0xff4400, toneMapped: false, transparent: true, opacity: 0.5 });

    // === Тело (массивное, драконье) ===
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 1.7, 4, 8), dMat);
    body.position.y = 1.65; body.castShadow = true; g.add(body);
    // чешуя на теле (ряды пластин)
    for (let i = 0; i < 5; i++) {
      const scale = new THREE.Mesh(new THREE.BoxGeometry(0.5 - i * 0.05, 0.12, 0.15), scaleMat);
      scale.position.set(0, 1.2 + i * 0.3, 0.65);
      scale.rotation.x = -0.15;
      g.add(scale);
    }
    // брюшные пластины
    for (let i = 0; i < 4; i++) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.08), dDarkMat);
      plate.position.set(0, 1.1 + i * 0.35, 0.68);
      g.add(plate);
    }
    // огненные трещины на теле
    box(0.06, 0.8, 0.02, 0.2, 1.6, 0.7, fireGlowMat);
    box(0.04, 0.6, 0.02, -0.25, 1.4, 0.7, fireGlowMat);

    // === Голова (драконья, с рогами и челюстями) ===
    parts.head = box(0.52, 0.46, 0.6, 0, 2.85, 0.35, dMat);
    // морда (вытянутая)
    box(0.35, 0.25, 0.35, 0, 2.75, 0.65, dMat);
    // ноздри (светящиеся)
    const nostrilMat = new THREE.MeshBasicMaterial({ color: 0xff6600, toneMapped: false });
    const n1 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), nostrilMat);
    n1.position.set(-0.08, 2.78, 0.82); g.add(n1);
    const n2 = n1.clone(); n2.position.x = 0.08; g.add(n2);
    // верхняя челюсть
    box(0.38, 0.1, 0.3, 0, 2.68, 0.7, dDarkMat);
    // нижняя челюсть
    box(0.34, 0.08, 0.28, 0, 2.58, 0.68, dDarkMat);
    // зубы (верхние)
    for (let i = 0; i < 5; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 3), new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.4 }));
      tooth.position.set(-0.12 + i * 0.06, 2.62, 0.82);
      tooth.rotation.x = Math.PI;
      g.add(tooth);
    }
    // зубы (нижние)
    for (let i = 0; i < 4; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.08, 3), new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.4 }));
      tooth.position.set(-0.1 + i * 0.065, 2.62, 0.8);
      g.add(tooth);
    }
    // рога (большие, изогнутые)
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x882200, metalness: 0.7, roughness: 0.3 });
    const h1 = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 5), hornMat);
    h1.position.set(-0.22, 3.2, 0.2); h1.rotation.z = 0.35; h1.rotation.x = -0.2; g.add(h1);
    const h2 = h1.clone(); h2.position.x = 0.22; h2.rotation.z = -0.35; g.add(h2);
    // маленькие рога
    const h3 = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 4), hornMat);
    h3.position.set(-0.15, 3.1, 0.35); h3.rotation.z = 0.2; h3.rotation.x = -0.15; g.add(h3);
    const h4 = h3.clone(); h4.position.x = 0.15; h4.rotation.z = -0.2; g.add(h4);
    // гребень на голове
    for (let i = 0; i < 3; i++) {
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.2, 3), scaleMat);
      crest.position.set(0, 3.15 - i * 0.12, 0.1 - i * 0.1);
      crest.rotation.x = -0.3;
      g.add(crest);
    }
    // пылающие глаза
    addEye(0xffcc00, -0.14, 2.92, 0.6, 0.06);
    addEye(0xffcc00, 0.14, 2.92, 0.6, 0.06);
    // надбровные дуги
    box(0.18, 0.06, 0.08, -0.14, 3.0, 0.55, dDarkMat);
    box(0.18, 0.06, 0.08, 0.14, 3.0, 0.55, dDarkMat);

    // === Крылья (большие, с мембранами) ===
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x991100, roughness: 0.6, side: THREE.DoubleSide, emissive: 0xcc2200, emissiveIntensity: 0.2 });
    const wingMembraneMat = new THREE.MeshBasicMaterial({ color: 0xff4400, toneMapped: false, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    // левое крыло
    const wl = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 1.3), wingMat);
    wl.position.set(-1.5, 2.4, -0.3); wl.rotation.z = 0.3; g.add(wl);
    parts.leftWing = wl;
    // мембрана левого крыла
    const wlm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.9), wingMembraneMat);
    wlm.position.set(-1.2, 2.3, -0.2); wlm.rotation.z = 0.25; g.add(wlm);
    // кости крыла
    box(0.06, 0.06, 1.2, -0.8, 2.45, -0.3, dDarkMat);
    box(0.05, 0.05, 1.0, -1.5, 2.35, -0.3, dDarkMat);
    // правое крыло
    const wr = wl.clone(); wr.position.x = 1.5; wr.rotation.z = -0.3; g.add(wr);
    parts.rightWing = wr;
    const wrm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.9), wingMembraneMat);
    wrm.position.set(1.2, 2.3, -0.2); wrm.rotation.z = -0.25; g.add(wrm);
    box(0.06, 0.06, 1.2, 0.8, 2.45, -0.3, dDarkMat);
    box(0.05, 0.05, 1.0, 1.5, 2.35, -0.3, dDarkMat);
    // когти на крыльях
    for (let i = 0; i < 3; i++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.2, 3), hornMat);
      claw.position.set(-2.5 + i * 0.15, 2.3, -0.3 + i * 0.2);
      claw.rotation.z = 0.5;
      g.add(claw);
      const claw2 = claw.clone(); claw2.position.x = 2.5 - i * 0.15; claw2.rotation.z = -0.5; g.add(claw2);
    }

    // === Хвост (длинный, с шипами) ===
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 2.0, 6), dMat);
    tail.position.set(0, 0.9, -1.3); tail.rotation.x = 0.8; g.add(tail);
    parts.tail = tail;
    // шипы на хвосте
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 3), scaleMat);
      spike.position.set(0, 0.7 + i * 0.15, -0.8 - i * 0.3);
      spike.rotation.x = 0.5;
      g.add(spike);
    }
    // булава на конце хвоста
    const tailMace = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), dDarkMat);
    tailMace.position.set(0, 0.4, -2.1); g.add(tailMace);

    // === Ноги (мощные, с когтями) ===
    box(0.3, 0.9, 0.3, -0.4, 0.55, 0.1, dMat);
    box(0.3, 0.9, 0.3, 0.4, 0.55, 0.1, dMat);
    // ступни с когтями
    box(0.35, 0.12, 0.45, -0.4, 0.06, 0.15, dDarkMat);
    box(0.35, 0.12, 0.45, 0.4, 0.06, 0.15, dDarkMat);
    for (let i = 0; i < 3; i++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.18, 3), hornMat);
      claw.position.set(-0.48 + i * 0.08, 0.04, 0.4);
      claw.rotation.x = -0.3;
      g.add(claw);
      const claw2 = claw.clone(); claw2.position.x = 0.32 + i * 0.08; g.add(claw2);
    }

    // === Огненное свечение (вдоль тела) ===
    for (let i = 0; i < 5; i++) {
      const fg = new THREE.Mesh(new THREE.SphereGeometry(0.12 + Math.random() * 0.06, 8, 8), fireGlowMat);
      fg.position.set((Math.random() - 0.5) * 0.4, 1.2 + i * 0.45, (Math.random() - 0.5) * 0.3);
      g.add(fg);
    }

    // === Огненная аура (кольцо у основания) ===
    const dragonAuraMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.15, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const dragonAuraGeo = new THREE.RingGeometry(1.2, 1.8, 32);
    dragonAuraGeo.rotateX(-Math.PI / 2);
    const dragonAura = new THREE.Mesh(dragonAuraGeo, dragonAuraMat);
    dragonAura.position.set(0, 0.06, 0);
    g.add(dragonAura);
    parts.fireAura = dragonAura;

    // === Искры (парящие вокруг) ===
    parts.embers = [];
    for (let i = 0; i < 6; i++) {
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 4, 4), new THREE.MeshBasicMaterial({ color: 0xff6600, toneMapped: false }));
      const a = (i / 6) * Math.PI * 2;
      const r = 0.8 + Math.random() * 0.6;
      ember.position.set(Math.cos(a) * r, 1.0 + Math.random() * 2.0, Math.sin(a) * r);
      g.add(ember);
      parts.embers.push(ember);
    }

    height = 3.5;

  } else { // normal / minion
    box(0.75, 1.05, 0.45, 0, 1.0, 0, mat);
    box(0.42, 0.42, 0.4, 0, 1.78, 0, mat);
    box(0.18, 0.7, 0.18, -0.5, 1.1, 0.22, mat, -1.0);
    box(0.18, 0.7, 0.18, 0.5, 1.1, 0.22, mat, -1.0);
    addEye(0xffdd88, -0.11, 1.82, 0.21, 0.055);
    addEye(0xffdd88, 0.11, 1.82, 0.21, 0.055);
    height = 2.0;
  }

  return { group: g, bodyMat: mat, height, eyeMats, parts };
}

// --- Экспортируемые фабрики отдельных типов (обёртки над makeEnemy) ---

export function makeAssassin() { return makeEnemy('assassin', false); }
export function makeBerserker() { return makeEnemy('berserker', false); }
export function makeSummoner() { return makeEnemy('summoner', false); }
export function makeShielder() { return makeEnemy('shielder', false); }
export function makeGolem() { return makeEnemy('golem', false); }
export function makePhantom() { return makeEnemy('phantom', false); }

// Ник-спрайт над игроком
export function makeNameSprite(name, colorHex) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 34px Rubik, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#' + colorHex.toString(16).padStart(6, '0');
  g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 6;
  g.strokeText(name, 128, 32);
  g.fillText(name, 128, 32);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  spr.scale.set(2.4, 0.6, 1);
  return spr;
}

// Полоска HP (фон + заполнение), билбордится на камеру
export function makeHpBar() {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.13), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.65, side: THREE.DoubleSide, toneMapped: false }));
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.08), new THREE.MeshBasicMaterial({ color: 0x3dff6a, side: THREE.DoubleSide, toneMapped: false }));
  fill.position.z = 0.01;
  g.add(bg); g.add(fill);
  return { group: g, fill };
}
