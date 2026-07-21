# Отчёт: Фаза 2-4 — Скилы, Лут, Экипировка, Сеты

**Дата:** 2026-07-20
**Статус:** ✅ Завершено
**Задачи:** T3.1–T3.7

---

## Что сделано

### T3.1: Shared Data Definitions (`shared/gameData.js`)
- **8 предметов оружия** (w1–w8): Ржавый меч, Клинок стража, Огненная сабля, Ледяная грань, Громовая катана, Клык вампира, ЖНЕЦ, Меч хранителя
- **8 реликвий** (r1–r8): Амулет спринта, Кольцо крита, Сердце вампира, Талисман камня, Кулон ярости, Глаз алчности, Магнитное ядро, КРЫЛО ФЕНИКСА
- **8 скилов**: fire, frost, chain, whirl, blood, holy, meteor, poison
- **3 сета**: ИНФЕРНО (fire+meteor), ШТОРМ (frost+chain), ЖАТВЕННИК (whirl+blood)
- **6 бафов**: power, haste, barrier, magnet, fury, luck
- **4 редкости**: ОБЫЧНЫЙ, РЕДКИЙ, ЭПИЧЕСКИЙ, ЛЕГЕНДАРНЫЙ
- Вспомогательные функции: `itemStatLines()`, `skillDesc()`, `computeActiveSets()`

### T3.2: Server Loot System (`server/systems/LootSystem.js`)
- **Предметы**: шанс дропа `13% + wave*0.4% × luck`, боссы всегда дропают
- **Бафы**: шанс 11% × luck
- **Страницы гримуара**: шанс 3% × luck
- **Редкость**: 55% обычный, 30% редкий, 12% эпический, 3% легендарный (босс: 50% эпик, 50% легенда)
- Полная логика подбора: предмет → инвентарь, баф → применение, гримуар → изучение скила
- Инвентарь полон → продажа за монеты

### T3.3: Server Skill System (`server/systems/SkillSystem.js`)
- **8 скилов** с серверной валидацией:
  - `fire`: огненный шар (AoE взрыв 65 урона + поджог)
  - `frost`: ледяная нова (45 урона + замедление 2.5с)
  - `chain`: цепная молния (до 4 целей, 55 урона с衰减)
  - `whirl`: вихрь (периодический урон 1.3с, 55% от базового)
  - `blood`: кровавый ритуал (8% HP → 85 урона AoE + вампиризм)
  - `holy`: свет исцеления (30% HP лечение + 40 урона)
  - `meteor`: метеор (телеграф 0.9с → 135 урона AoE)
  - `poison`: ядовитое облако (зона 4с, 16 урона/такт + замедление)
- Кулдауны с CDR (макс 50%)
- Сет-бонусы: ИНФЕРНО +25% урона скилов, ШТORM +50% по замороженным, ЖАТВЕННИК вихрь крадёт HP

### T3.4: Server Equipment/Inventory (`server/game/Player.js`)
- **Инвентарь**: до 12 предметов, экипировка в 3 слота (оружие, реликвия I, реликвия II)
- **Расчёт статов**: урон, скорость, крит, вампиризм, макс HP, CDR, множитель счёта
- **Бафы**: силa (×1.5 урон), ускорение (×1.4 скорость), бешенство (×1.8 скорострельность)
- **Щит**: макс 60, поглощает урон
- **Воскрешение**: крыло феникса (1 раз за бой, 50% HP)
- **Элементы**: fire (поджог), frost (замедление), volt (цепная молния)
- `recomputeStats()` при смене экипировки/скилов/бафов

### T3.5: Client Skill UI (`client/src/ui/SkillUI.js`)
- **Гримуар**: экран с коллекцией скилов, назначение на панель, снятие
- **Панель скилов**: 2 слота + ульта, КД-оверлеи, визуальная индикация
- **Сет-бонусы**: список с активными/неактивными сетами
- Горячие клавиши: 1/2 — скилы, F — ульта
- Тач-кнопки для мобильных

### T3.6: Client Inventory UI (`client/src/ui/InventoryUI.js`)
- **Инвентарь**: сетка 4×3, выбор предмета, инфо-панель
- **Экипировка**: 3 слота (оружие, 2 реликвии), тап = надеть
- **Продажа**: корзина, кнопка продажи в инфо-панели
- **Рарность**: цветовая индикация (серый/голубой/фиолетовый/золотой)
- Горячие клавиши: I — инвентарь, K — гримуар

### T3.7: Integration
- **Протокол** (`shared/protocol.js`): новые сообщения EQUIP, UNEQUIP, SELL, ASSIGN, UNASSIGN; события SKILL, SKILLFX, BUFF, PICKUP, EQUIP, INVENTORY
- **Server Room** (`server/Room.js`): обработка всех новых сообщений, интеграция SkillSystem в тик-цикл, передача полного состояния при позднем входе
- **Client Game** (`client/src/game/Game.js`): обработка STATE, SKILL, SKILLFX, BUFF, PICKUP, EQUIP событий; дропы с 3D моделями и столбами света
- **Client Input** (`client/src/game/Input.js`): добавлены sk0/sk1/invToggle/bookToggle
- **Effects** (`client/src/render/Effects.js`): fireball, beam, zone, whirl, telegraph
- **Audio** (`client/src/audio/AudioSys.js`): frost, zap, holy, shot, explode, tome, pickup, coin, equip, drop

---

## Исправленные ошибки
1. **CRITICAL**: SkillSystem импортировал SETS/ELEMENT_COLORS из constants.js (не существуют) → исправлен импорт из gameData.js
2. **HIGH**: SKILLS из constants.js содержал 6 скилов (без blood/poison) → теперь re-export из gameData.js (8 скилов)
3. **MEDIUM**: Дублирование ITEMS/SKILLS в constants.js и gameData.js → constants.js теперь re-export из gameData.js
4. **MEDIUM**: Отсутствовали PLAYER.CRIT_BASE и PLAYER.CRIT_DMG → добавлены в constants.js

---

## Структура файлов

```
shared/
  gameData.js        [NEW]  — предметы, скилы, сеты, бафы
  constants.js       [EDIT] — добавлены CRIT_BASE/CRIT_DMG, re-export ITEMS/SKILLS
  protocol.js        [EDIT] — новые типы сообщений

server/
  Room.js            [EDIT] — интеграция SkillSystem, новые обработчики сообщений
  game/Player.js     [EDIT] — инвентарь, экипировка, скилы, бафы, расчёт статов
  game/Enemy.js      [EDIT] — slowT/slowF/burnT/burnDps/stunT, применение эффектов
  systems/LootSystem.js  [REWRITE] — полная система лута
  systems/SkillSystem.js [NEW]     — серверная логика 8 скилов
  systems/CombatSystem.js [EDIT]   — использует stats, элементальный урон

client/
  index.html         [EDIT] — скил-панель, экран инвентаря, экран гримуара
  styles/main.css    [EDIT] — стили для нового UI
  src/main.js        [unchanged]
  src/game/Game.js   [EDIT] — интеграция SkillUI/InventoryUI, новые события
  src/game/Input.js  [EDIT] — sk0/sk1/invToggle/bookToggle
  src/ui/SkillUI.js  [NEW]  — гримуар + панель скилов
  src/ui/InventoryUI.js [NEW] — инвентарь + экипировка
  src/render/Effects.js [EDIT] — fireball/beam/zone/whirl/telegraph
  src/audio/AudioSys.js [EDIT] — новые звуки
```

---

## Что осталось (будущие фазы)
- **Фаза 5**: Боссы — полная реализация AI (заряд, спираль, миньоны, фазы)
- **Фаза 6**: Полировка — визуальные эффекты, оптимизация, баланс
- **Настройки**: чувствительность, звук, вибрация, качество графики
- **Пауза**: экран паузы с инвентарём/гримуаром
- **Интернет**: JWT аутентификация, REST API для матчмейкинга
