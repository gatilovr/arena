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
  butcher: 0x7a1d1d, necro: 0x2a1140,
  golemKing: 0x555555, firelord: 0xff3300, shadowKing: 0x1a0a2e,
  frostQueen: 0x4488ff, dragonLord: 0xcc2200
};

export function makeEnemy(type, isBoss) {
  const g = new THREE.Group();
  const col = ENEMY_COLORS[type] || 0x9c2626;
  const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.65, emissive: col, emissiveIntensity: 0.14 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15161f, roughness: 0.8 });
  let height = 1.9;

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
    box(0.5, 0.9, 0.5, -0.42, 0.45, 0, dark);
    box(0.5, 0.9, 0.5, 0.42, 0.45, 0, dark);
    box(1.6, 1.4, 0.95, 0, 1.55, 0, mat);
    box(0.62, 0.55, 0.6, 0, 2.55, 0, mat);
    addEye(0xff3300, -0.15, 2.6, 0.31, 0.04);
    addEye(0xff3300, 0.15, 2.6, 0.31, 0.04);
    box(0.48, 1.35, 0.48, -1.1, 1.5, 0, mat);
    box(0.48, 1.35, 0.48, 1.1, 1.5, 0, mat);
    height = 3.1;

  } else if (type === 'necro') {
    const robe = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.6, 10), mat);
    robe.position.y = 1.3; robe.castShadow = true; g.add(robe);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 10), new THREE.MeshStandardMaterial({ color: 0x3a2a55 }));
    head.position.y = 2.72; g.add(head);
    addEye(0xb44dff, -0.12, 2.76, 0.28, 0.055);
    addEye(0xb44dff, 0.12, 2.76, 0.28, 0.055);
    height = 3.2;

  } else if (type === 'golemKing') {
    // Огромный каменный король с короной
    box(1.4, 1.6, 1.0, 0, 1.3, 0, mat);
    box(0.85, 0.65, 0.75, -1.05, 2.1, 0, mat);
    box(0.85, 0.65, 0.75, 1.05, 2.1, 0, mat);
    box(0.55, 0.55, 0.5, 0, 2.55, 0, mat);
    // каменные кулаки
    box(0.5, 0.5, 0.5, -1.35, 1.05, 0, mat);
    box(0.5, 0.5, 0.5, 1.35, 1.05, 0, mat);
    // glowing cracks in body
    const glowCrack = new THREE.MeshBasicMaterial({ color: 0xffaa00, toneMapped: false });
    box(0.08, 1.0, 0.02, 0.2, 1.5, 0.52, glowCrack);
    box(0.03, 0.7, 0.08, -0.25, 1.3, 0.52, glowCrack);
    box(0.08, 0.5, 0.02, 0.0, 1.8, 0.52, glowCrack);
    box(0.03, 0.6, 0.02, 0.5, 1.4, 0.42, glowCrack);
    box(0.03, 0.4, 0.02, -0.4, 1.6, 0.42, glowCrack);
    // корона
    const crownMat = new THREE.MeshStandardMaterial({ color: 0xccaa00, metalness: 0.85, roughness: 0.2, emissive: 0xccaa00, emissiveIntensity: 0.4 });
    box(0.55, 0.12, 0.55, 0, 2.9, 0, crownMat);
    box(0.1, 0.22, 0.1, -0.2, 3.08, -0.2, crownMat);
    box(0.1, 0.22, 0.1, 0.2, 3.08, -0.2, crownMat);
    box(0.1, 0.22, 0.1, 0, 3.08, 0.2, crownMat);
    addEye(0xffaa00, -0.14, 2.62, 0.27, 0.07);
    addEye(0xffaa00, 0.14, 2.62, 0.27, 0.07);
    height = 3.4;

  } else if (type === 'firelord') {
    // Огненный повелитель
    const fMat = new THREE.MeshStandardMaterial({ color: 0xff3300, roughness: 0.35, emissive: 0xff3300, emissiveIntensity: 0.6 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.2, 4, 8), fMat);
    body.position.y = 1.3; body.castShadow = true; g.add(body);
    box(0.38, 0.38, 0.36, 0, 2.2, 0, fMat);
    // flame particles around body
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6600, toneMapped: false });
    for (let i = 0; i < 8; i++) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 4), flameMat);
      const a = (i / 8) * Math.PI * 2;
      const r = 0.5 + Math.random() * 0.2;
      flame.position.set(Math.cos(a) * r, 0.8 + Math.random() * 1.5, Math.sin(a) * r);
      flame.rotation.z = (Math.random() - 0.5) * 0.4;
      g.add(flame);
    }
    // fire crown
    for (let i = 0; i < 5; i++) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 4), flameMat);
      const a = (i / 5) * Math.PI * 2;
      flame.position.set(Math.cos(a) * 0.22, 2.55, Math.sin(a) * 0.22);
      g.add(flame);
    }
    addEye(0xffff00, -0.1, 2.25, 0.2, 0.055);
    addEye(0xffff00, 0.1, 2.25, 0.2, 0.055);
    height = 2.8;

  } else if (type === 'shadowKing') {
    // Тёмный король с плащом
    box(0.55, 1.05, 0.38, 0, 1.05, 0, mat);
    box(0.34, 0.34, 0.32, 0, 1.8, 0, mat);
    // dark aura ring
    const auraMat = new THREE.MeshBasicMaterial({ color: 0x330066, transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const auraGeo = new THREE.RingGeometry(0.8, 1.4, 32);
    auraGeo.rotateX(-Math.PI / 2);
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.position.set(0, 0.1, 0);
    g.add(aura);
    // shadow clones (translucent copies offset to sides)
    const cloneMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2e, roughness: 0.5, emissive: 0x6633aa, emissiveIntensity: 0.3, transparent: true, opacity: 0.3 });
    const clone1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.8, 4, 8), cloneMat);
    clone1.position.set(-0.8, 1.0, -0.3); g.add(clone1);
    const clone2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.8, 4, 8), cloneMat);
    clone2.position.set(0.8, 1.0, -0.3); g.add(clone2);
    // плащ
    const capeMat = new THREE.MeshStandardMaterial({ color: 0x110a1e, roughness: 0.8, side: THREE.DoubleSide });
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.04), capeMat);
    cape.position.set(0, 1.2, -0.25); g.add(cape);
    // корона
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x6633aa, metalness: 0.8, roughness: 0.2, emissive: 0x6633aa, emissiveIntensity: 0.5 });
    box(0.36, 0.08, 0.36, 0, 2.06, 0, crownMat);
    box(0.06, 0.16, 0.06, -0.12, 2.18, -0.12, crownMat);
    box(0.06, 0.16, 0.06, 0.12, 2.18, -0.12, crownMat);
    box(0.06, 0.16, 0.06, 0, 2.18, 0.12, crownMat);
    addEye(0xaa44ff, -0.09, 1.84, 0.18, 0.05);
    addEye(0xaa44ff, 0.09, 1.84, 0.18, 0.05);
    height = 2.4;

  } else if (type === 'frostQueen') {
    // Ледяная королева
    const iceMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.15, emissive: 0x4488ff, emissiveIntensity: 0.5, transparent: true, opacity: 0.88 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.1, 4, 8), iceMat);
    body.position.y = 1.25; body.castShadow = true; g.add(body);
    box(0.34, 0.34, 0.32, 0, 2.05, 0, iceMat);
    // ледяная корона
    const crownMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, metalness: 0.7, roughness: 0.1, emissive: 0x88ccff, emissiveIntensity: 0.6 });
    for (let i = 0; i < 6; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.28, 4), crownMat);
      const a = (i / 6) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 0.2, 2.32, Math.sin(a) * 0.2);
      g.add(spike);
    }
    // More ice crystals orbiting body
    for (let i = 0; i < 8; i++) {
      const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.08 + Math.random() * 0.04, 0), iceMat);
      const a = (i / 8) * Math.PI * 2;
      const r = 0.5 + Math.random() * 0.3;
      cr.position.set(Math.cos(a) * r, 0.6 + Math.random() * 1.6, Math.sin(a) * r);
      cr.rotation.set(Math.random(), Math.random(), 0);
      g.add(cr);
    }
    // frost aura ring
    const frostAuraMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const frostAuraGeo = new THREE.RingGeometry(0.9, 1.3, 32);
    frostAuraGeo.rotateX(-Math.PI / 2);
    const frostAura = new THREE.Mesh(frostAuraGeo, frostAuraMat);
    frostAura.position.set(0, 0.1, 0);
    g.add(frostAura);
    addEye(0xccffff, -0.08, 2.1, 0.18, 0.05);
    addEye(0xccffff, 0.08, 2.1, 0.18, 0.05);
    height = 2.6;

  } else if (type === 'dragonLord') {
    // Дракон — самый большой босс
    const dMat = new THREE.MeshStandardMaterial({ color: 0xcc2200, roughness: 0.45, emissive: 0xcc2200, emissiveIntensity: 0.3 });
    // тело
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.65, 1.6, 4, 8), dMat);
    body.position.y = 1.6; body.castShadow = true; g.add(body);
    // голова
    box(0.48, 0.42, 0.55, 0, 2.75, 0.3, dMat);
    // рога
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x882200, metalness: 0.7, roughness: 0.3 });
    const h1 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 4), hornMat);
    h1.position.set(-0.2, 3.1, 0.2); h1.rotation.z = 0.3; g.add(h1);
    const h2 = h1.clone(); h2.position.x = 0.2; h2.rotation.z = -0.3; g.add(h2);
    // Wing-like structures (larger, more organic)
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x991100, roughness: 0.6, side: THREE.DoubleSide, emissive: 0xcc2200, emissiveIntensity: 0.2 });
    const wl = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 1.2), wingMat);
    wl.position.set(-1.4, 2.3, -0.3); wl.rotation.z = 0.3; g.add(wl);
    const wr = wl.clone(); wr.position.x = 1.4; wr.rotation.z = -0.3; g.add(wr);
    // wing membrane accents
    const wingInner = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.7), new THREE.MeshBasicMaterial({ color: 0xff4400, toneMapped: false, transparent: true, opacity: 0.4 }));
    wingInner.position.set(-0.9, 2.2, -0.2); wingInner.rotation.z = 0.25; g.add(wingInner);
    const wingInner2 = wingInner.clone(); wingInner2.position.x = 0.9; wingInner2.rotation.z = -0.25; g.add(wingInner2);
    // хвост
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.8, 6), dMat);
    tail.position.set(0, 0.9, -1.2); tail.rotation.x = 0.8; g.add(tail);
    // fire glow along body
    const fireGlowMat = new THREE.MeshBasicMaterial({ color: 0xff4400, toneMapped: false, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 4; i++) {
      const fg = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), fireGlowMat);
      fg.position.set((Math.random() - 0.5) * 0.4, 1.2 + i * 0.5, (Math.random() - 0.5) * 0.3);
      g.add(fg);
    }
    addEye(0xffcc00, -0.14, 2.82, 0.55, 0.06);
    addEye(0xffcc00, 0.14, 2.82, 0.55, 0.06);
    height = 3.3;

  } else { // normal / minion
    box(0.75, 1.05, 0.45, 0, 1.0, 0, mat);
    box(0.42, 0.42, 0.4, 0, 1.78, 0, mat);
    box(0.18, 0.7, 0.18, -0.5, 1.1, 0.22, mat, -1.0);
    box(0.18, 0.7, 0.18, 0.5, 1.1, 0.22, mat, -1.0);
    addEye(0xffdd88, -0.11, 1.82, 0.21, 0.055);
    addEye(0xffdd88, 0.11, 1.82, 0.21, 0.055);
    height = 2.0;
  }

  return { group: g, bodyMat: mat, height, eyeMats };
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
