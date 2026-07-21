// ============================================================================
// BOSS CONFIGURATION — data-driven ability definitions for all bosses.
// Each boss defines: announcements, abilities (cooldowns, damage, phases),
// minion type, and behavioral parameters. AI state machines remain in Enemy.js.
// ============================================================================

export const BOSS_ABILITIES = {
  // ========================================================================
  // LORD REBRADD — bone skeleton boss: coldflame, bone storm, melee cleave
  // Inspired by Lord Marrowgar from WoW WotLK
  // ========================================================================
  rebradd: {
    minionType: 'normal',
    announcements: {
      1: { text: 'LORD REBRADD ПРОБУЖДАЕТСЯ!', color: '#88ccff' },
    },
    abilities: [
      {
        id: 'coldflame4',
        baseCd: 10,
        dmgMul: 0.7,
        duration: 3,
        speed: 8,
        width: 1.5,
        color: 0x4488ff,
        teleDur: 0.8,
        teleColor: 0x2266cc
      },
      {
        id: 'coldflame1',
        baseCd: 6,
        dmgMul: 0.9,
        duration: 2.5,
        speed: 10,
        width: 2.0,
        range: 18,
        color: 0x4488ff,
        teleDur: 0.6,
        teleColor: 0x2266cc
      },
      {
        id: 'boneStorm',
        baseCd: 22,
        dmgMul: 0.5,
        hitInterval: 0.6,
        pullRadius: 6,
        pullForce: 10,
        spinDuration: [7, 10],
        jumpCount: [2, 3],
        jumpDelay: 2.5,
        moveSpeed: 8,
        color: 0xccccaa,
        teleDur: 1.2,
        teleColor: 0xaaaacc
      },
      {
        id: 'meleeCleave',
        baseCd: 4,
        dmgMul: 1.0,
        coneAngle: 0.7,
        range: 4.0,
        knockback: 5,
        color: 0xff4444,
        teleDur: 0.5,
        teleColor: 0xcc2222
      }
    ]
  },

  // ========================================================================
  // МЯСНИК — melee bruiser boss: slam, charge, hook, cleave, minion spawn, blood rage
  // Heavy hitter that pulls players in with a hook
  // ========================================================================
  butcher: {
    minionType: 'berserker',
    announcements: {
      1: { text: 'МЯСНИК ВЫХОДИТ НА БОЙ!', color: '#cc2200' },
      2: { text: 'КРОВАВАЯ ЯРОСТЬ!', color: '#ff0000' },
      3: { text: 'МЯСОРУБКА!', color: '#ff2222' },
      4: { text: 'БЕЗУМНАЯ РЕЗНЯ!', color: '#ff0000' }
    },
    abilities: [
      {
        id: 'slam',
        baseCd: 3.5,
        cdByPhase: { 2: 2.8, 4: 1.8 },
        dmgMulsByPhase: { 1: 1.2, 3: 1.5, 4: 1.8 },
        radius: 5,
        knockback: 10,
        teleColor: 0xcc2200,
        hitColor: 0xcc2200,
        minPhase: 1
      },
      {
        id: 'charge',
        baseCd: 6,
        cdByPhase: { 4: 3.5 },
        dmgMul: 1.5,
        stunDur: 0.8,
        speed: 22,
        hitRadius: 2.5,
        teleDur: 0.7,
        teleColor: 0xcc2200,
        minPhase: 1
      },
      {
        id: 'hook',
        baseCd: 5,
        cdByPhase: { 2: 4, 4: 3 },
        dmgMul: 1.0,
        pullSpeed: 30,
        hookRange: 25,
        hookColor: 0xcc2200,
        minPhase: 1
      },
      {
        id: 'cleave',
        baseCd: 2,
        cdByPhase: { 4: 1.2 },
        dmgMul: 1.2,
        coneAngle: 0.7,
        range: 4.5,
        knockback: 6,
        color: 0xff4444,
        teleDur: 0.4,
        teleColor: 0xcc2222,
        minPhase: 1
      },
      {
        id: 'minionSpawn',
        baseCd: 10,
        cdByPhase: { 3: 6, 4: 4 },
        countsByPhase: { 1: 2, 3: 3, 4: 4 },
        minPhase: 1
      },
      {
        id: 'bloodRage',
        baseCd: 15,
        duration: 5,
        dmgMul: 1.35,
        speedMul: 1.25,
        color: 0xff0000,
        text: 'КРОВАВАЯ ЯРОСТЬ!',
        textColor: '#ff0000',
        minPhase: 3
      }
    ]
  },

  // ========================================================================
  // НЕКРОМАНТ — ranged boss: spiral, shadow bolt, soul drain, ritual, nova, curse
  // ========================================================================
  necro: {
    minionType: 'cursed',
    preferredDist: 12,
    preferredDistKiting: 10,
    announcements: {
      2: { text: 'ТЁМНАЯ МАГИЯ!', color: '#7722cc' },
      3: { text: 'ТЁМНЫЙ РИТУАЛ!', color: '#5500aa' },
      4: { text: 'ДУШИ ПОГЛОЩЕНЫ!', color: '#330066' }
    },
    abilities: [
      {
        id: 'spiral',
        baseCd: 3,
        cdByPhase: { 2: 2.2, 4: 1.5 },
        bulletCountsByPhase: { 1: 8, 2: 12, 3: 16 },
        bulletSpeedByPhase: { 1: 9, 2: 11, 3: 12 },
        bulletDmgMul: 0.45,
        bulletRadius: 0.18,
        bulletLife: 4,
        bulletColor: 0xb44dff,
        minPhase: 1
      },
      {
        id: 'minionSpawn',
        baseCd: 8,
        cdByPhase: { 3: 5, 4: 4 },
        countsByPhase: { 1: 2, 3: 4 },
        maxMinionsByPhase: { 1: 5, 3: 8, 4: 10 },
        minPhase: 1
      },
      {
        id: 'shadowBolt',
        baseCd: 5,
        cdByPhase: { 4: 2.5 },
        dmgMul: 1.3,
        bulletColor: 0x8800cc,
        slowDur: 3,
        slowFactor: 0.5,
        maxRange: 20,
        minPhase: 2
      },
      {
        id: 'soulDrain',
        baseCd: 7,
        cdByPhase: { 4: 5 },
        dmgMul: 0.8,
        healFactor: 0.5,
        maxRange: 12,
        beamColor: 0x44ff44,
        minPhase: 2
      },
      {
        id: 'deathNova',
        baseCd: 10,
        cdByPhase: { 4: 6 },
        dmgMul: 1.2,
        radius: 7,
        knockback: 10,
        maxRange: 8,
        color: 0x7722cc,
        minPhase: 3
      },
      {
        id: 'curseSpread',
        baseCd: 9,
        cdByPhase: { 4: 6 },
        slowDur: 2,
        slowFactor: 0.6,
        ampDur: 3,
        ampFactor: 1.25,
        novaRadius: 20,
        novaColor: 0x5500aa,
        text: 'ПРОКЛЯТИЕ РАСПРОСТРАНЯЕТСЯ!',
        textColor: '#5500aa',
        minPhase: 3
      },
      {
        id: 'ritual',
        baseCd: 12,
        cdByPhase: { 4: 10 },
        channelDur: 2.5,
        dmgMul: 2.0,
        slowDur: 3,
        slowFactor: 0.4,
        radius: 14,
        teleColor: 0x5500aa,
        hitColor: 0x5500aa,
        text: 'РИТУАЛ НАЧИНАЕТСЯ!',
        completeText: 'РИТУАЛ ЗАВЕРШЁН!',
        textColor: '#5500aa',
        minPhase: 3
      },
      {
        id: 'teleport',
        baseCd: 5,
        cdByPhase: { 3: 3, 4: 2 },
        teleportDist: 11,
        teleportRandom: 4,
        color: 0x7722cc,
        triggerRange: 5,
        minPhase: 1
      }
    ]
  },

  // ========================================================================
  // КОРОЛЬ ГОЛЕМОВ — tank boss: shield, slam, charge, boulder, seismic, fortify, earthquake, eruption
  // ========================================================================
  golemKing: {
    minionType: 'golem',
    shieldHp: 800,
    shieldBreakSpeedMul: 1.5,
    shieldBreakDmgMul: 1.3,
    announcements: {
      2: { text: 'ГОЛЕМ БЕШЕН!', color: '#ffaa00' },
      3: { text: 'ЗЕМЛЕТРЯСЕНИЕ!', color: '#885522' },
      4: { text: 'ТЕКТОНИЧЕСКИЙ РАЗЛОМ!', color: '#553300' }
    },
    abilities: [
      {
        id: 'slam',
        baseCd: 3.5,
        cdByPhase: { 2: 2.5, 4: 1.5 },
        dmgMulsByPhase: { 1: 1.2, 3: 1.5, 4: 1.8 },
        radius: 5,
        knockback: 10,
        teleColor: 0x555555,
        hitColor: 0x555555,
        minPhase: 1
      },
      {
        id: 'charge',
        baseCd: 5,
        cdByPhase: { 4: 3 },
        dmgMul: 1.5,
        stunDur: 1.0,
        speed: 24,
        hitRadius: 2.5,
        teleDur: 0.7,
        teleColor: 0xffaa00,
        seismicWallDmgMul: 0.8,
        seismicWallRadius: 6,
        minPhase: 2
      },
      {
        id: 'boulder',
        baseCd: 6,
        cdByPhase: { 4: 3 },
        dmgMul: 1.2,
        bulletColor: 0x888888,
        bulletY: 2.5,
        minRange: 8,
        minPhase: 2
      },
      {
        id: 'seismic',
        baseCd: 8,
        cdByPhase: { 4: 5 },
        dmgMul: 0.7,
        waveCount: 5,
        waveSpacing: 3,
        waveRadius: 2,
        color: 0x885522,
        minPhase: 3
      },
      {
        id: 'fortify',
        baseCd: 20,
        duration: 4,
        damageReduction: 0.6,
        hpThreshold: 0.5,
        text: 'КАМЕННАЯ КОЖА!',
        textColor: '#888888',
        color: 0x888888,
        minPhase: 3
      },
      {
        id: 'earthquake',
        baseCd: 7,
        cdByPhase: { 4: 5 },
        dmgMul: 1.3,
        radius: 6,
        knockback: 14,
        spawnMinionsByPhase: { 1: 3, 4: 4 },
        color: 0x885522,
        minPhase: 3
      },
      {
        id: 'eruption',
        baseCd: 8,
        dmgMul: 1.0,
        count: 4,
        radius: 2.5,
        spread: 10,
        teleDur: 1.0,
        teleColor: 0xff4400,
        hitColor: 0xff4400,
        minPhase: 4
      },
      {
        id: 'minionSpawn',
        baseCd: 10,
        cdByPhase: { 3: 6, 4: 4 },
        countsByPhase: { 1: 2, 3: 3, 4: 4 },
        minPhase: 1
      }
    ]
  },

  // ========================================================================
  // ПОВЕЛИТЕЛЬ ОГНЯ — fire boss: fireball, wave, meteor, aura, inferno, pillars, phoenix
  // ========================================================================
  firelord: {
    minionType: 'firestarter',
    preferredDist: 10,
    preferredDistKiting: 8,
    announcements: {
      2: { text: 'ВОЛНА ОГНЯ!', color: '#ff4400' },
      3: { text: 'ОГНЕННАЯ АУРА!', color: '#ff2200' },
      4: { text: 'ФЕНИКС ПРОБУЖДАЕТСЯ!', color: '#ff6600' }
    },
    abilities: [
      {
        id: 'fireball',
        baseCd: 2.5,
        cdByPhase: { 4: 1.5 },
        dmgMul: 0.8,
        countByPhase: { 1: 3, 3: 5 },
        bulletColor: 0xff4400,
        bulletY: 1.5,
        maxRange: 22,
        minPhase: 1
      },
      {
        id: 'fireWave',
        baseCd: 5,
        cdByPhase: { 4: 3 },
        dmgMul: 1.2,
        coneAngle: 120,
        maxRange: 8,
        burnDur: 3,
        burnDps: 8,
        color: 0xff6600,
        minPhase: 2
      },
      {
        id: 'firePillars',
        baseCd: 7,
        cdByPhase: { 4: 4 },
        dmgMul: 1.0,
        count: 3,
        radius: 1.5,
        spread: 6,
        teleDur: 1.0,
        teleColor: 0xff4400,
        hitColor: 0xff4400,
        burnDur: 2,
        burnDps: 6,
        minPhase: 2
      },
      {
        id: 'meteorRain',
        baseCd: 7,
        cdByPhase: { 4: 5 },
        dmgMul: 1.5,
        countByPhase: { 1: 5, 4: 7 },
        radius: 2,
        spread: 10,
        teleDur: 1.2,
        teleColor: 0xff2200,
        hitColor: 0xff2200,
        text: 'МЕТЕОРЫ!',
        textColor: '#ff4400',
        minPhase: 3
      },
      {
        id: 'fireAura',
        tickInterval: 0.5,
        dmgMul: 0.12,
        radius: 3.5,
        minPhase: 3
      },
      {
        id: 'heatWave',
        baseCd: 12,
        slowDur: 3,
        slowFactor: 0.6,
        burnDur: 4,
        burnDps: 5,
        novaRadius: 30,
        novaColor: 0xff6600,
        text: 'ВОЛНА ЖАРА!',
        textColor: '#ff6600',
        minPhase: 4
      },
      {
        id: 'phoenix',
        reviveHpPct: 0.25,
        triggerHpPct: 0.15,
        reviveRadius: 8,
        reviveDmgMul: 1.5,
        reviveBurnDur: 4,
        reviveBurnDps: 10,
        reviveColor: 0xff6600,
        text: 'ФЕНИКС ВОЗРОЖДАЕТСЯ!',
        textColor: '#ff6600',
        minPhase: 4
      }
    ]
  },

  // ========================================================================
  // КОРОЛЬ ТЕНЕЙ — stealth boss: backstab, clones, vortex, shadow step, darkness, soul rip
  // ========================================================================
  shadowKing: {
    minionType: 'phantom',
    announcements: {
      2: { text: 'ТЕНИ ОЖИВАЮТ!', color: '#222222' },
      3: { text: 'ТЁМНЫЙ ВИХРЬ!', color: '#440066' },
      4: { text: 'АБСОЛЮТНАЯ ТЬМА!', color: '#110022' }
    },
    abilities: [
      {
        id: 'backstab',
        baseCd: 4,
        cdByPhase: { 3: 2, 4: 1.5 },
        dmgMul: 1.8,
        attackCd: 0.7,
        teleportBackstabRange: 3.5,
        minPhase: 1
      },
      {
        id: 'clone',
        baseCd: 8,
        cdByPhase: { 4: 5 },
        countByPhase: { 1: 2, 4: 3 },
        cloneType: 'phantom',
        cloneHpMul: 0.4,
        cloneDmgMul: 0.6,
        cloneSizeMul: 0.7,
        cloneScore: 25,
        cloneXp: 6,
        spawnRadius: 3,
        novaColor: 0x222222,
        minPhase: 2
      },
      {
        id: 'vortex',
        baseCd: 6,
        cdByPhase: { 4: 4 },
        dmgMul: 1.0,
        pullRadius: 10,
        pullStrengthBase: 8,
        pullStrengthMul: 1.5,
        novaRadius: 10,
        novaColor: 0x440066,
        text: 'ТЁМНЫЙ ВИХРЬ!',
        textColor: '#440066',
        minPhase: 3
      },
      {
        id: 'darkness',
        baseCd: 10,
        cdByPhase: { 4: 7 },
        dmgMul: 1.2,
        radius: 6,
        slowDur: 3,
        slowFactor: 0.4,
        teleDur: 1.0,
        teleColor: 0x110022,
        hitColor: 0x220044,
        minPhase: 3
      },
      {
        id: 'soulRip',
        baseCd: 8,
        cdByPhase: { 4: 5 },
        dmgMul: 1.6,
        healFactor: 0.5,
        maxRange: 4,
        beamColor: 0xaa00ff,
        text: 'SOUL RIP!',
        textColor: 0xaa00ff,
        minPhase: 2
      },
      {
        id: 'shadowStep',
        baseCd: 4,
        cdByPhase: { 3: 2, 4: 1.5 },
        teleportDist: 2.0,
        backstabRange: 3.5,
        backstabDmgMul: 1.8,
        backstabText: 'BACKSTAB!',
        backstabTextColor: 0xff0000,
        novaColor: 0x333333,
        minPhase: 1
      },
      {
        id: 'minionSpawn',
        baseCd: 10,
        cdByPhase: { 3: 6, 4: 4 },
        countsByPhase: { 1: 2, 3: 3, 4: 4 },
        minPhase: 1
      }
    ]
  },

  // ========================================================================
  // ЛЕДЯНАЯ КОРОЛЕВА — ice boss: ice shards, freeze, blizzard, lance, frozen ground, absolute zero
  // ========================================================================
  frostQueen: {
    minionType: 'frost_mage',
    preferredDist: 10,
    preferredDistKiting: 8,
    announcements: {
      2: { text: 'ЛЕДЯНОЙ ЩИТ!', color: '#4488ff' },
      3: { text: 'МЕТЕЛЬ!', color: '#88ccff' },
      4: { text: 'АБСОЛЮТНЫЙ НОЛЬ!', color: '#00ffff' }
    },
    abilities: [
      {
        id: 'iceShard',
        baseCd: 2,
        cdByPhase: { 2: 1.5, 4: 1.0 },
        dmgMul: 0.85,
        bulletColor: 0x88ccff,
        bulletY: 1.5,
        slowDur: 3,
        slowFactor: 0.5,
        maxRange: 20,
        minPhase: 1
      },
      {
        id: 'iceLance',
        baseCd: 5,
        cdByPhase: { 4: 3 },
        dmgMul: 1.5,
        bulletColor: 0x4488ff,
        bulletY: 1.5,
        slowDur: 4,
        slowFactor: 0.3,
        maxRange: 16,
        text: 'ICE LANCE',
        textColor: 0x4488ff,
        minPhase: 2
      },
      {
        id: 'freeze',
        baseCd: 8,
        cdByPhase: { 4: 5 },
        dmgMul: 0.5,
        stunDur: 2,
        radius: 6,
        maxRange: 14,
        novaColor: 0x4488ff,
        text: 'ЗАМОРОЗКА!',
        textColor: '#4488ff',
        minPhase: 2
      },
      {
        id: 'iceWall',
        baseCd: 6,
        cdByPhase: { 4: 4 },
        dmgMul: 0.5,
        bulletCount: 7,
        bulletSpread: 0.3,
        bulletSpeed: 7,
        bulletRadius: 0.25,
        bulletLife: 3,
        bulletColor: 0x4488ff,
        maxRange: 14,
        minPhase: 2
      },
      {
        id: 'frozenGround',
        baseCd: 9,
        cdByPhase: { 4: 6 },
        radius: 5,
        duration: 5,
        slowDur: 4,
        slowFactor: 0.4,
        zoneColor: 0x88ccff,
        minPhase: 3
      },
      {
        id: 'blizzard',
        baseCd: 10,
        cdByPhase: { 4: 7 },
        dmgMul: 1.0,
        radius: 8,
        duration: 5,
        tickChance: 2,
        slowDur: 5,
        slowFactor: 0.3,
        initialDmg: true,
        teleDur: 1.5,
        teleColor: 0x88ccff,
        text: 'МЕТЕЛЬ!',
        textColor: '#88ccff',
        minPhase: 3
      },
      {
        id: 'absoluteZero',
        baseCd: 15,
        dmgMul: 1.8,
        radius: 12,
        stunDur: 2.5,
        slowDur: 5,
        slowFactor: 0.2,
        novaColor: 0x00ffff,
        text: 'АБСОЛЮТНЫЙ НОЛЬ!',
        textColor: '#00ffff',
        minPhase: 4
      },
      {
        id: 'iceBarrier',
        baseCd: 12,
        cdByPhase: { 4: 8 },
        hpPct: 0.1,
        novaColor: 0x88ccff,
        text: 'ЛЕДЯНОЙ БАРЬЕР!',
        textColor: '#88ccff',
        minPhase: 2
      }
    ]
  },

  // ========================================================================
  // ЛОРД ДРАКОНОВ — dragon boss: fire breath, tail sweep, flight, dive bomb, fire storm, roar
  // ========================================================================
  dragonLord: {
    minionType: 'berserker',
    announcements: {
      2: { text: 'ХВОСТ ДРАКОНА!', color: '#ff4400' },
      3: { text: 'В ПОЛЁТ!', color: '#ff6600' },
      4: { text: 'ДРАКОНЬЯ ЯРОСТЬ!', color: '#ff0000' }
    },
    abilities: [
      {
        id: 'fireBreath',
        baseCd: 4,
        cdByPhase: { 2: 3, 4: 2 },
        dmgMul: 0.45,
        coneDmgMul: 1.0,
        coneAngle: 90,
        bulletCount: 10,
        bulletSpeed: 12,
        bulletDmgMul: 0.45,
        bulletRadius: 0.22,
        bulletLife: 3,
        bulletColor: 0xff4400,
        coneMaxRange: 10,
        burnDur: 3,
        burnDps: 8,
        maxRange: 16,
        color: 0xff4400,
        minPhase: 1
      },
      {
        id: 'tailSweep',
        baseCd: 5,
        cdByPhase: { 4: 3 },
        dmgMul: 0.9,
        radius: 5,
        knockback: 12,
        maxRange: 6,
        spawnMinionsByPhase: { 1: 2, 4: 4 },
        color: 0xcc4400,
        minPhase: 2
      },
      {
        id: 'wingGust',
        baseCd: 8,
        cdByPhase: { 4: 5 },
        dmgMul: 0.5,
        knockback: 18,
        radius: 7,
        maxRange: 8,
        color: 0xff8800,
        minPhase: 2
      },
      {
        id: 'dragonRoar',
        baseCd: 14,
        cdByPhase: { 4: 8 },
        dmgMul: 0.6,
        stunDur: 1.5,
        radius: 8,
        maxRange: 10,
        color: 0xff6600,
        text: 'РЁВ ДРАКОНА!',
        textColor: '#ff6600',
        minPhase: 3
      },
      {
        id: 'fireStorm',
        baseCd: 12,
        cdByPhase: { 4: 8 },
        dmgMul: 1.2,
        count: 6,
        radius: 2.5,
        spread: 12,
        teleDur: 1.2,
        teleColor: 0xff3300,
        hitColor: 0xff3300,
        burnDur: 3,
        burnDps: 8,
        text: 'ОГНЕННЫЙ ШТОРМ!',
        textColor: '#ff3300',
        minPhase: 3
      },
      {
        id: 'flight',
        baseCd: 8,
        cdByPhase: { 4: 6 },
        duration: 2.5,
        flyHeight: 3.5,
        flySpeedMul: 1.5,
        rainInterval: 0.35,
        rainCount: 4,
        rainSpread: 8,
        rainDmgMul: 0.7,
        rainBulletColor: 0xff3300,
        rainBulletRadius: 0.3,
        rainBulletLife: 2,
        color: 0xff6600,
        text: 'В ПОЛЁТ!',
        textColor: '#ff6600',
        minPhase: 3
      },
      {
        id: 'diveBomb',
        baseCd: 10,
        dmgMul: 1.8,
        speed: 30,
        stunDur: 1.0,
        hitRadius: 3,
        radius: 4,
        teleDur: 0.5,
        teleColor: 0xff4400,
        hitColor: 0xff4400,
        minPhase: 3
      },
      {
        id: 'minionSpawn',
        baseCd: 10,
        cdByPhase: { 3: 6, 4: 4 },
        countsByPhase: { 1: 2, 3: 3, 4: 4 },
        minPhase: 1
      }
    ]
  }
};

// ============================================================================
// Helper: get ability config for a boss by ability id
// ============================================================================
export function getAbility(bossType, abilityId) {
  const boss = BOSS_ABILITIES[bossType];
  if (!boss) return null;
  return boss.abilities.find(a => a.id === abilityId) || null;
}

// ============================================================================
// Helper: get cooldown for an ability at current phase
// Returns cdByPhase[currentPhase] if set, else baseCd
// ============================================================================
export function getAbilityCd(ability, phase) {
  if (ability.cdByPhase && ability.cdByPhase[phase] !== undefined) {
    return ability.cdByPhase[phase];
  }
  return ability.baseCd;
}
