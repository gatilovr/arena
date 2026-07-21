// ============================================================================
// GAME DATA — предметы, скилы, сеты, бафы, редкости. Единый источник правды
// для сервера (авторитарный расчёт) и клиента (рендер/интерфейс).
// ============================================================================

// --- Редкость ---
export const RARITY = [
  { id: 0, name: 'ОБЫЧНЫЙ',    color: '#aab2bd', hex: 0xaab2bd },
  { id: 1, name: 'РЕДКИЙ',     color: '#35e0ff', hex: 0x35e0ff },
  { id: 2, name: 'ЭПИЧЕСКИЙ',  color: '#b44dff', hex: 0xb44dff },
  { id: 3, name: 'ЛЕГЕНДАРНЫЙ', color: '#ffc233', hex: 0xffc233 },
];

// --- Предметы ---
export const ITEMS = {
  // === Оружие ===
  w1:  { slot: 'weapon', name: 'Ржавый меч',       icon: '🗡️', rar: 0, weaponType: 'melee',   dmg: 1.0,  val: 30 },
  w2:  { slot: 'weapon', name: 'Клинок стража',     icon: '⚔️', rar: 0, weaponType: 'melee',   dmg: 1.22, spd: 1.05, val: 60 },
  w3:  { slot: 'weapon', name: 'Огненная сабля',    icon: '🔥', rar: 1, weaponType: 'melee',   dmg: 1.35, el: 'fire', val: 160 },
  w4:  { slot: 'weapon', name: 'Ледяная грань',     icon: '❄️', rar: 1, weaponType: 'melee',   dmg: 1.3,  el: 'frost', val: 160 },
  w5:  { slot: 'weapon', name: 'Громовая катана',   icon: '⚡', rar: 2, weaponType: 'melee',   dmg: 1.55, el: 'volt', val: 420 },
  w6:  { slot: 'weapon', name: 'Клык вампира',      icon: '🦇', rar: 2, weaponType: 'melee',   dmg: 1.45, vamp: 0.12, val: 420 },
  w7:  { slot: 'weapon', name: 'ЖНЕЦ',              icon: '💀', rar: 3, weaponType: 'melee',   dmg: 2.0,  crit: 0.15, exec: true, val: 1100 },
  w8:  { slot: 'weapon', name: 'Меч хранителя',     icon: '🛡️', rar: 1, weaponType: 'melee',   dmg: 1.25, hp: 25, val: 150 },
  w9:  { slot: 'weapon', name: 'Лук охотника',      icon: '🏹', rar: 1, weaponType: 'ranged',  dmg: 0.8,  atkRange: 14, val: 160 },
  w10: { slot: 'weapon', name: 'Посох огня',        icon: '🔥', rar: 2, weaponType: 'ranged',  dmg: 1.1,  el: 'fire', atkRange: 12, val: 420 },
  w11: { slot: 'weapon', name: 'Топор варвара',     icon: '🪓', rar: 1, weaponType: 'melee',   dmg: 1.5,  spd: 0.9, val: 160 },
  w12: { slot: 'weapon', name: 'Кинжал тени',       icon: '🗡️', rar: 2, weaponType: 'melee',   dmg: 0.75, spd: 1.2, crit: 0.1, val: 420 },
  w13: { slot: 'weapon', name: 'Посох льда',        icon: '❄️', rar: 2, weaponType: 'ranged',  dmg: 1.3,  el: 'frost', atkRange: 11, val: 420 },
  w14: { slot: 'weapon', name: 'Двуручный меч',     icon: '⚔️', rar: 3, weaponType: 'melee',   dmg: 1.8,  spd: 0.8, val: 1100 },

  // === Реликвии ===
  r1:  { slot: 'relic', name: 'Амулет спринта',    icon: '👟', rar: 0, spd: 0.1,  val: 40 },
  r2:  { slot: 'relic', name: 'Кольцо крита',      icon: '💍', rar: 0, crit: 0.08, val: 45 },
  r3:  { slot: 'relic', name: 'Сердце вампира',    icon: '🧛', rar: 1, vamp: 0.05, val: 170 },
  r4:  { slot: 'relic', name: 'Талисман камня',    icon: '🪨', rar: 0, hp: 30, val: 40 },
  r5:  { slot: 'relic', name: 'Кулон ярости',      icon: '🔮', rar: 1, cdr: 0.18, val: 180 },
  r6:  { slot: 'relic', name: 'Глаз алчности',     icon: '👁️', rar: 1, score: 0.5, val: 170 },
  r7:  { slot: 'relic', name: 'Магнитное ядро',    icon: '🧲', rar: 0, pull: 5, val: 50 },
  r8:  { slot: 'relic', name: 'КРЫЛО ФЕНИКСА',     icon: '🪶', rar: 3, revive: 1, val: 1200 },
  r9:  { slot: 'relic', name: 'Коготь ярости',     icon: '🐾', rar: 1, critDmg: 0.5, val: 200 },
  r10: { slot: 'relic', name: 'Щит стража',        icon: '🛡️', rar: 0, shield: 30, val: 50 },
  r11: { slot: 'relic', name: 'Кристалл маны',     icon: '💎', rar: 1, cdr: 0.12, val: 185 },
  r12: { slot: 'relic', name: 'Посох странника',   icon: '🪄', rar: 2, skillDmg: 0.2, val: 430 },
  r13: { slot: 'relic', name: 'Коготь волка',       icon: '🐺', rar: 1, lifesteal: 0.08, val: 200 },
  r14: { slot: 'relic', name: 'Глаз орла',          icon: '👁️', rar: 0, critRange: 0.5, val: 80 },
  r15: { slot: 'relic', name: 'Камень здоровья',    icon: '❤️', rar: 0, hp: 50, val: 60 },
  r16: { slot: 'relic', name: 'Кулон теней',        icon: '🌑', rar: 2, dodge: 0.15, val: 500 },
  r17: { slot: 'relic', name: 'Сердце льва',        icon: '🦁', rar: 2, dmg: 0.15, val: 480 },
};

// --- Скилы ---
export const SKILLS = {
  fire:   { name: 'Огненный шар',     icon: '🔥', cd: 5,  rar: 0, desc: 'Снаряд: взрыв + поджог',        el: 0xff6a00 },
  frost:  { name: 'Ледяная нова',     icon: '❄️', cd: 7,  rar: 0, desc: 'Замораживает врагов вокруг',     el: 0x35e0ff },
  chain:  { name: 'Цепная молния',    icon: '⚡', cd: 6,  rar: 1, desc: 'Бьёт до 4 целей подряд',         el: 0xffe14d },
  whirl:  { name: 'Вихрь',            icon: '🌪️', cd: 8,  rar: 1, desc: 'Крутящийся вихрь смерти',        el: 0x9fd8ff },
  blood:  { name: 'Кровавый ритуал',  icon: '🩸', cd: 9,  rar: 1, desc: 'Жертва HP: взрыв + вампиризм',   el: 0xff2d3f },
  holy:   { name: 'Свет исцеления',   icon: '✨', cd: 10, rar: 1, desc: 'Лечит 30% и жжёт нечисть',       el: 0xffd76a },
  meteor: { name: 'Метеор',           icon: '☄️', cd: 12, rar: 2, desc: 'Падение метеорита на толпу',      el: 0xff7a1a },
  poison:  { name: 'Ядовитое облако',  icon: '☠️', cd: 9,  rar: 2, desc: 'Зона отравления',                el: 0x7dff4d },
  lightning: { name: 'Гром',            icon: '🌩️', cd: 7,  rar: 1, desc: 'Удар молнии по ближайшему врагу', el: 0xffe14d },
  shadow:   { name: 'Тень',            icon: '👤', cd: 6,  rar: 1, desc: 'Телепорт за спину врага + удар', el: 0xb44dff },
  heal:     { name: 'Регенерация',     icon: '💚', cd: 12, rar: 0, desc: 'Лечение 2% HP/сек на 8с',        el: 0x3dff6a },
  trap:     { name: 'Ловушка',         icon: '🪤', cd: 8,  rar: 1, desc: 'Ловушка: враги застревают на 2с', el: 0xaab2bd },
  whirlwind: { name: 'Вихревой щит',   icon: '🌀', cd: 10, rar: 2, desc: 'Создает вращающийся щит который отражает пули', el: 0x6ad4ff },
  chainHeal: { name: 'Цепное исцеление', icon: '💚', cd: 14, rar: 2, desc: 'Лечит ближайшего союзника и перескакивает на 2', el: 0x3dff6a },
  blade:     { name: 'Клинок ветра',    icon: '🌀', cd: 5,  rar: 0, desc: 'Быстрый удар веером клинков',   el: 0xaaddff },
  shield:    { name: 'Магический щит',  icon: '🛡️', cd: 8,  rar: 1, desc: 'Создает щит блокирующий 50 урона', el: 0x35e0ff },
  berserk:   { name: 'Ярость',          icon: '😤', cd: 15, rar: 2, desc: '+100% урона и скорости на 5с',   el: 0xff2d3f },
  blink:     { name: 'Скачок',          icon: '✨', cd: 4,  rar: 0, desc: 'Телепорт на 8м вперёд',          el: 0xffd76a },
  slam:      { name: 'Удар о землю',    icon: '💥', cd: 6,  rar: 1, desc: 'AoE удар с knockback',           el: 0xff7a1a },
  poisonBlade: { name: 'Ядовитый клинок', icon: '🗡️', cd: 7, rar: 1, desc: 'Следующая атака наносит яд',   el: 0x7dff4d },
  summon:    { name: 'Призыв прислужника', icon: '👻', cd: 20, rar: 2, desc: 'Призывает союзного прислужника на 15с', el: 0xb44dff },
  storm:     { name: 'Шторм',           icon: '⛈️', cd: 14, rar: 2, desc: 'Несколько молний по случайным врагам', el: 0xffe14d },
  rage:      { name: 'Кровавая ярость', icon: '🩸', cd: 10, rar: 1, desc: 'Жертвует HP: +2% вампиризм навсегда', el: 0xff2d3f },
  fortify:   { name: 'Укрепление',      icon: '🏰', cd: 12, rar: 1, desc: '+50% HP и щит на 8с',            el: 0x35e0ff },
};

// --- Сеты (два скила из одного сета = бонус) ---
export const SETS = [
  {
    id: 'inferno', a: 'fire', b: 'meteor', name: 'ИНФЕРНО',
    icon: '🔥', color: 0xff6a00,
    desc: 'Аура огня: враги рядом горят, +25% урона скилов',
  },
  {
    id: 'storm', a: 'frost', b: 'chain', name: 'ШТОРМ',
    icon: '⛈️', color: 0x35e0ff,
    desc: 'Молнии +50% по замороженным, удары бьют током',
  },
  {
    id: 'reaper', a: 'whirl', b: 'blood', name: 'ЖАТВЕННИК',
    icon: '💀', color: 0xb44dff,
    desc: 'Вихрь крадёт 30% HP, +10% вампиризма',
  },
  {
    id: 'arcane', a: 'lightning', b: 'shadow', name: 'АРКАНА',
    icon: '🔮', color: 0xb44dff,
    desc: 'Телепорт лечит 15% HP, молнии бьют 6 целей',
  },
  {
    id: 'guardian', a: 'holy', b: 'heal', name: 'СТРАЖ',
    icon: '🏰', color: 0xffd76a,
    desc: 'Лечение +50%, щит +30',
  },
  {
    id: 'shadow-blade', a: 'shadow', b: 'trap', name: 'ТЕНЬ И КОЗЫРЬ',
    icon: '🌑', color: 0x6a2dff,
    desc: 'Телепорт активирует ловушку, +30% урона из засады',
  },
  {
    id: 'life-binder', a: 'heal', b: 'blood', name: 'УЗЫ ЖИЗНИ',
    icon: '💚', color: 0x3dff6a,
    desc: 'Вампиризм +15%, лечение усилено при низком HP',
  },
  {
    id: 'wind-blade', a: 'blade', b: 'blink', name: 'ВЕТРЯНОЙ КЛИНОК',
    icon: '🌀', color: 0xaaddff,
    desc: 'Скачок восстанавливает КД клинка, +20% урона клинков',
  },
  {
    id: 'war-cry', a: 'berserk', b: 'slam', name: 'БОЕВОЙ КЛИЧ',
    icon: '😤', color: 0xff2d3f,
    desc: 'Удар о землю усилен в ярости на 50%, +30% knockback',
  },
  {
    id: 'dark-art', a: 'poisonBlade', b: 'summon', name: 'ТЁМНЫЕ ИСКУССТВА',
    icon: '👻', color: 0xb44dff,
    desc: 'Прислужник наносит яд, +40% урона призывов',
  },
  {
    id: 'thunder-god', a: 'storm', b: 'chain', name: 'БОГ ГРОМА',
    icon: '⛈️', color: 0xffe14d,
    desc: 'Молнии бьют 7 целей, +40% урона молний',
  },
  {
    id: 'blood-oath', a: 'rage', b: 'blood', name: 'КРОВЯНАЯ КЛЯТВА',
    icon: '🩸', color: 0xff2d3f,
    desc: 'Кровавая ярость лечит на 30%, +20% вампиризма',
  },
];

// --- Бафы (дропы с врагов) ---
export const BUFFS = {
  power:   { icon: '⚔️', name: 'СИЛА',        color: '#ff2d3f', dur: 20, desc: '+50% урона' },
  haste:   { icon: '👟', name: 'УСКОРЕНИЕ',   color: '#3dff6a', dur: 20, desc: '+40% скорости' },
  barrier: { icon: '🛡️', name: 'БАРЬЕР',      color: '#35e0ff', dur: 0,  desc: '+40 щита' },
  magnet:  { icon: '🧲', name: 'МАГНИТ',       color: '#7df9ff', dur: 15, desc: '+9 радиус сбора' },
  fury:    { icon: '😤', name: 'БЕШЕНСТВО',    color: '#ff7a1a', dur: 12, desc: '+80% скорострельности' },
  luck:    { icon: '🍀', name: 'УДАЧА',         color: '#ffc233', dur: 25, desc: '×2 шанс дропа' },
};

// --- Улучшения при повышении уровня ---
export const UPGRADES = [
  { id: 'str',     icon: '⚔️', name: 'СИЛА',        desc: '+10% урона',         apply(p) { p._bonusDmg = (p._bonusDmg || 0) + 0.10; } },
  { id: 'vital',   icon: '❤️', name: 'ЖИВУЧЕСТЬ',    desc: '+25 макс. HP',       apply(p) { p._bonusHP = (p._bonusHP || 0) + 25; } },
  { id: 'aim',     icon: '🎯', name: 'МЕТКОСТЬ',      desc: '+5% крита',         apply(p) { p._bonusCrit = (p._bonusCrit || 0) + 0.05; } },
  { id: 'tech',    icon: '🔧', name: 'ТЕХНИКА',       desc: '+8% скорострельности', apply(p) { p._bonusAtkSpd = (p._bonusAtkSpd || 0) + 0.08; } },
  { id: 'swift',   icon: '👟', name: 'ПРОВОРСТВО',    desc: '+6% скорости',       apply(p) { p._bonusSpd = (p._bonusSpd || 0) + 0.06; } },
  { id: 'charge',  icon: '⚡', name: 'НАКОПИТЕЛЬ',     desc: '+20% заряда ульты',  apply(p) { p._bonusUlt = (p._bonusUlt || 0) + 0.20; } },
  { id: 'range',   icon: '🎯', name: 'ДАЛЬНОСТЬ',     desc: '+15% дальность атаки', apply(p) { p._bonusRange = (p._bonusRange || 0) + 0.15; } },
  { id: 'shield',  icon: '🛡️', name: 'ЩИТОНОСЕЦ',     desc: '+20 макс. щита',     apply(p) { p._bonusShield = (p._bonusShield || 0) + 20; } },
];

// --- Элементы оружия (цвета特效) ---
export const ELEMENT_COLORS = {
  none:  0xff3300,
  fire:  0xff6a00,
  frost: 0x35e0ff,
  volt:  0xffe14d,
  vamp:  0xff2d3f,
  death: 0xb44dff,
};

// --- Вспомогательные функции ---

/** Получить описание статов предмета (для UI) */
export function itemStatLines(id) {
  const it = ITEMS[id];
  if (!it) return [];
  const L = [];
  if (it.slot === 'weapon') {
    L.push(`⚔️ Урон ×${it.dmg.toFixed(2)}`);
    if (it.weaponType === 'ranged') L.push(`🏹 Дальность: ${it.atkRange || 12}`);
    if (it.spd) L.push(`💨 Скорость ×${it.spd.toFixed(2)}`);
    if (it.el && it.el !== 'none') {
      L.push({ fire: '🔥 Поджигает врагов', frost: '❄️ Замедляет врагов', volt: '⚡ Цепляет молнией' }[it.el] || it.el);
    }
    if (it.vamp) L.push(`🧛 Вампиризм +${Math.round(it.vamp * 100)}%`);
    if (it.crit) L.push(`🎯 Крит +${Math.round(it.crit * 100)}%`);
    if (it.exec) L.push('⚖️ Казнь: добивает при HP<10%');
    if (it.hp) L.push(`❤️ +${it.hp} макс. HP`);
  } else {
    if (it.spd) L.push(`👟 Скорость +${Math.round(it.spd * 100)}%`);
    if (it.crit) L.push(`🎯 Крит +${Math.round(it.crit * 100)}%`);
    if (it.critDmg) L.push(`💥 Крит. урон +${Math.round(it.critDmg * 100)}%`);
    if (it.vamp) L.push(`🧛 Вампиризм +${Math.round(it.vamp * 100)}%`);
    if (it.hp) L.push(`❤️ +${it.hp} макс. HP`);
    if (it.shield) L.push(`🛡️ +${it.shield} макс. щита`);
    if (it.lifesteal) L.push(`🧛 Вампиризм +${Math.round(it.lifesteal * 100)}%`);
    if (it.critRange) L.push(`🎯 Шанс крита +${Math.round(it.critRange * 100)}%`);
    if (it.dodge) L.push(`💨 Шанс уклонения +${Math.round(it.dodge * 100)}%`);
    if (it.dmg) L.push(`⚔️ Урон +${Math.round(it.dmg * 100)}%`);
    if (it.skillDmg) L.push(`✨ Урон скилов +${Math.round(it.skillDmg * 100)}%`);
    if (it.cdr) L.push(`⏱ Перезарядка скилов −${Math.round(it.cdr * 100)}%`);
    if (it.score) L.push(`💰 Счёт +${Math.round(it.score * 100)}%`);
    if (it.pull) L.push(`🧲 Радиус сбора орбов +${it.pull}`);
    if (it.revive) L.push('🪶 Воскрешает один раз за бой');
    if (it.weaponType) L.push(`⚔️ Тип оружия: ${it.weaponType}`);
    if (it.atkRange) L.push(`🎯 Дальность атаки +${Math.round(it.atkRange * 100)}%`);
  }
  return L;
}

/** Получить текстовый бонус скила (для UI) */
export function skillDesc(id) {
  const sk = SKILLS[id];
  if (!sk) return '';
  return `${sk.desc} · КД ${sk.cd}с`;
}

/** Проверить, какие сеты активны для заданных скилов */
export function computeActiveSets(skillSlots) {
  return SETS.filter(s => skillSlots.includes(s.a) && skillSlots.includes(s.b));
}
