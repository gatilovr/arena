# Независимый аудит проекта ARENA

Дата аудита: 2026-07-21  
Область: клиент Three.js/Vite, Node.js/Express/WebSocket сервер, общий протокол/баланс, безопасность, производительность, UX, сопровождение.

## Краткий вывод

Проект уже собирается и имеет цельную архитектуру: авторитарный сервер, общие контракты в `shared/`, разделение клиента на `game/render/ui/net/audio`. Однако качество ближе к прототипу, чем к устойчивому продукту: отсутствуют автотесты, типизация и CI; есть несколько критичных багов сетевого протокола и игровой логики; часть UI небезопасно работает с HTML; сервер не защищён от крупных payload'ов, повторного join на одном соединении и накопления неактивных комнат.

## Проверки, выполненные во время аудита

| Проверка | Результат | Комментарий |
|---|---:|---|
| `npm run build` | PASS | Сборка успешна, но Vite предупреждает о чанке JS ~598 kB после minify. |
| `node --check` для всех JS-файлов | PASS | Синтаксических ошибок не найдено. |
| `npm audit --json` | WARN | Не выполнен из-за `403 Forbidden` от registry endpoint в окружении. |

## Приоритеты исправления

### P0 — критично

1. **Неверная обработка ping/pong на клиенте.** Сервер отвечает `{ t: 'pong', t0 }`, а клиент частично ожидает numeric `m.t` и считает ping от `_lastPingSent`, игнорируя `t0`. Если несколько ping пересекаются или задерживаются, значение становится недостоверным. Нужно считать `Date.now() - m.t0` и синхронизировать комментарии протокола.
2. **XSS/HTML-инъекции через игровые данные и имена в нескольких местах UI.** В лобби имя экранируется, но game over вставляет `p.name` через `innerHTML +=`. В инвентаре/гримуаре HTML строится через template strings из `ITEMS`, `SKILLS`, `SETS`; сейчас данные локальные, но это плохой контракт безопасности и будущая точка риска при серверном/внешнем контенте. Нужно перейти на `textContent`/DOM-узлы или централизованный sanitizer.
3. **Один WebSocket может многократно join'иться без предварительного cleanup.** `RoomManager.join()` не проверяет, что `conn.room` уже задан. Повторный `join` на том же соединении создаёт нового `Player`, старый может остаться в комнате до закрытия сокета. Нужно перед повторным join вызывать `cleanup`/`removePlayer` или запрещать join после входа.
4. **Нет ограничения размера входящих WebSocket сообщений.** Сервер парсит JSON без maxPayload на `WebSocketServer` и без ограничения `raw.length`; злоумышленник может грузить память/CPU крупными payload'ами. Нужно задать `maxPayload`, проверять размер и закрывать соединение с кодом policy violation.
5. **Игровые пули имеют смешанную модель friendly-fire/enemy-fire.** `CombatSystem.updateBullets()` проверяет столкновения только с игроками, а `rangedAttack()` кладёт пули игрока в тот же массив `room.bullets`. В результате ranged-атаки игрока визуально летят, но не наносят урон врагам; при этом `owner` исключает только владельца, создавая риск friendly-fire по союзникам. Нужно разделить player projectiles и enemy projectiles или добавить поле `team/type` и корректную обработку целей.

### P1 — высокий приоритет

1. **STATE для позднего входа смешивает снапшот одного игрока и полный state комнаты.** `_sendFullState()` делает spread `player.fullSnap()`, затем добавляет `players`, `host`. Клиент `Game.onState()` воспринимает `m.skills/inv/equip` как локальное состояние, но не обрабатывает полный список игроков. Нужно формализовать отдельные сообщения: `PLAYER_STATE` и `ROOM_STATE`, либо чётко описать схему.
2. **Валидация игровых сообщений неполная.** `upgrade.choice`, `skillId`, `slot`, `room`, `name` нормализуются частично. Нет проверки максимальной длины room/name до логирования, нет allowlist для `m.t`, нет фильтра лишних полей, `yaw` не нормализуется по диапазону.
3. **Комнаты живут вечно, пока есть хотя бы один зависший игрок.** Нет idle timeout для комнаты в lobby/over, нет heartbeat-kick по ping timeout, нет server-side cleanup по неактивности.
4. **Нет тестового каркаса.** Ключевые правила (урон, волны, лут, экипировка, скилы, комнаты, протокол) проверяются вручную. Нужны unit/integration tests минимум для `shared/`, `server/game`, `server/systems`.
5. **Нет CI и статического анализа.** Не хватает `npm test`, lint, форматтера, type checking через JSDoc/TypeScript или хотя бы ESLint.
6. **Сборка предупреждает о большом чанке.** Three.js и игровой код попадают в один bundle; нужен manualChunks/dynamic import для UI/игровых подсистем или осознанно поднять limit после анализа.
7. **Реконнект не восстанавливает сессию.** После reconnect клиент не переjoin'ится автоматически в комнату; сервер не имеет session token. Игрок теряет место/состояние.
8. **Недостаточное разграничение server/client constants.** `shared/constants.js` содержит баланс, сетевые параметры и re-export'ы, что затрудняет версионирование протокола и миграции.

### P2 — средний приоритет

1. **Много silent catch.** Ошибки WebSocket send, JSON parse, pointer capture и audio init часто проглатываются. Нужен минимальный debug logger с уровнями и отключением в production.
2. **DOM-события не имеют lifecycle cleanup.** `Game`, `Input`, UI-классы навешивают глобальные listeners без destroy/unsubscribe. При повторном создании Game будут дубли и утечки.
3. **Object pool пуль не очищает material/color/userData полностью.** При reuse меняется color, но userData и другие свойства могут переноситься. Нужен reset объекта.
4. **Баланс боссов и мобов захардкожен.** Большой AI-файл трудно поддерживать; лучше вынести способности/кулдауны/фазы в data-driven конфиги.
5. **Нет deterministic random для сервера.** `Math.random()` делает сложным воспроизведение багов боя/лута/волн. Нужен seedable RNG на комнату.
6. **Game over UI строится через `innerHTML +=`.** Помимо безопасности, это неэффективно и пересоздаёт DOM на каждой итерации.
7. **Нет accessibility/fallback для мобильного UI.** Кнопки touch-only не имеют aria-label, фокусных состояний, клавиатурной навигации.
8. **Нет локализации как слоя.** Русские строки раскиданы по серверу и клиенту; это усложнит поддержку ошибок/переводов.
9. **Нет документа production deployment checklist.** README описывает идеи, но нет health checks, reverse proxy headers, TLS, process manager, logging/metrics.
10. **Нет политики версий протокола.** Клиент и сервер должны обмениваться `protocolVersion`, иначе старый клиент может некорректно играть с новым сервером.

## Детальный аудит по областям

### Архитектура

Плюсы:
- Сервер авторитарен, основные контракты вынесены в `shared/`.
- Подсистемы боя, волн, лута и скилов разделены.
- Клиентские слои `game`, `render`, `ui`, `net`, `audio` разделены понятно.

Недостатки:
- `Enemy.js` стал слишком большим монолитом; риск регрессий при любом изменении AI.
- Нет интерфейсов/типов сообщений; схемы существуют только в комментариях.
- Часть UI и сетевого состояния завязаны на глобальные DOM id, что усложняет тестирование.

Рекомендации:
- Ввести `shared/schema.js` или TypeScript-типы для сообщений.
- Разбить boss AI на `server/game/bosses/*.js` и общие primitives.
- Добавить smoke integration test: поднять server, подключить ws-клиента, создать комнату, стартовать, получить snap.

### Сервер и безопасность

Плюсы:
- Есть rate limit для не-input сообщений.
- Input clamp'ится по движению и pitch.
- Сервер валидирует урон и действия, а не доверяет клиенту.

Недостатки:
- INPUT исключён из rate limit полностью; клиент может спамить больше 30 Гц.
- Нет `maxPayload` и нет close code для policy violations.
- Нет origin/CORS policy для WebSocket.
- Нет защиты от повторного join на одном соединении.
- Нет heartbeat timeout: ping используется только клиентом для UI.

Рекомендации:
- Добавить per-connection input throttle/drop до 30-60 Гц.
- `new WebSocketServer({ server, path: '/ws', maxPayload: 2048 })`.
- Хранить `lastSeen`, закрывать молчащие соединения.
- Добавить allowlist origins через env для production.

### Игровая логика

Плюсы:
- Есть авторитарные снапшоты, предсказание локального игрока и интерполяция чужих.
- Есть базовая античит-модель на дистанцию/конус атаки.
- Есть системы скилов, лута, сетов и апгрейдов.

Недостатки:
- Ranged projectile collision, вероятно, сломан для урона по врагам.
- Некоторые эффекты используют `burnT/burnDps` как универсальный DoT, что путает fire/poison.
- Сложный AI не покрыт тестами и содержит много side effects.
- Уровневые upgrade options выбираются через `sort(() => Math.random() - 0.5)`, что даёт смещённую shuffle-выборку.

Рекомендации:
- Разделить DoT-эффекты по типам или добавить `statusEffects` map.
- Использовать Fisher-Yates shuffle.
- Тестировать: melee cone, ranged projectile, ult, vamp, dodge, revive, loot pickup, skill cooldown.

### Клиент и UX

Плюсы:
- Есть HUD, инвентарь, гримуар, пауза, настройки.
- Есть mobile touch input и desktop input.
- Настройки сохраняются в localStorage.

Недостатки:
- Реконнект не восстанавливает состояние комнаты.
- Ping отображается недостоверно из-за обработки pong.
- UI строит HTML из строк в нескольких местах.
- При закрытии/leave не все transient состояния сбрасываются явно (например pointer lock/rmb/drag timers в Input/UI).

Рекомендации:
- Добавить session resume token и автоматический rejoin.
- Перевести повторяющиеся HTML-рендеры на DOM helpers.
- Добавить teardown методы для `Input`, `HUD`, `SkillUI`, `InventoryUI`, `NetClient`.

### Производительность

Плюсы:
- Есть object pool для пуль.
- Снапшоты компактны и округляют координаты.
- Tick rate 30 Гц разумен для LAN/Web.

Недостатки:
- Большой JS chunk.
- `Enemy.separate` по отчёту заявлен как spatial hash, но нужно подтвердить алгоритм и покрыть нагрузочным тестом.
- Снапшоты рассылаются всем игрокам полностью без interest management.
- Частый DOM update HUD/инвентаря может создавать лишние layout/reflow.

Рекомендации:
- Добавить benchmark/server load smoke (`rooms x players x enemies`).
- Вынести Three.js в отдельный manual chunk.
- Считать bandwidth на комнату и лимиты количества drops/bullets/effects.

### Наблюдаемость и эксплуатация

Недостатки:
- Логи — plain console без уровней и request/room/player context.
- `/api/status` минимален, нет uptime/tick lag/room breakdown.
- Нет graceful shutdown.
- Нет Dockerfile/compose/PM2/systemd примера.

Рекомендации:
- Добавить structured logger.
- В `/api/status`: uptime, memory, rooms, players, avg tick duration, event loop lag.
- Обработать SIGTERM/SIGINT: остановить accepting, закрыть ws, clear intervals.

### Документация и процесс

Недостатки:
- README хороший для запуска, но нет troubleshooting.
- Нет CONTRIBUTING, тестовой стратегии, кодстайла.
- Документ `ответ_qwen/audit.md` выглядит как отчёт о выполненных улучшениях, но не связан с текущим git diff и может вводить в заблуждение.

Рекомендации:
- Добавить `docs/testing.md`, `docs/protocol.md`, `docs/deployment.md`.
- Перенести/переименовать сторонние отчёты или пометить как historical/unverified.
- Ввести PR checklist.

## Предлагаемый план работ

### Этап 1: стабилизация (1–2 дня)

- Исправить ping/pong.
- Исправить ranged projectile collision и разделить типы пуль.
- Запретить повторный join без leave.
- Добавить `maxPayload`, input throttle и heartbeat timeout.
- Убрать XSS-точки из game over и основных UI-рендеров.
- Добавить `npm test` с unit-тестами для Player/Combat/RoomManager.

### Этап 2: качество и поддерживаемость (2–4 дня)

- Ввести ESLint/Prettier или Biome.
- Добавить GitHub Actions/CI: install, build, test, node --check/lint.
- Разбить `Enemy.js` на файлы способностей/боссов.
- Добавить протокольные схемы и `protocolVersion`.
- Добавить smoke e2e websocket test.

### Этап 3: production-readiness (3–5 дней)

- Session resume/rejoin.
- Graceful shutdown и observability.
- Deployment docs + reverse proxy пример.
- Load testing и bandwidth budget.
- Chunk splitting/performance pass.


## Статус ремедиации в последующих изменениях

Часть P0/P1 пунктов из аудита была закрыта отдельным исправлением:

- Ping/pong: клиент теперь считает задержку по `t0` из ответа сервера.
- XSS в game over: список игроков строится через DOM API и `textContent`, без `innerHTML +=`.
- Повторный join: при новом `join` на уже занятом соединении сервер предварительно удаляет старого игрока из комнаты.
- WebSocket hardening: добавлены `maxPayload`, проверка размера входящего сообщения и отдельный throttle для high-frequency `input`.
- Ranged bullets: player projectiles получили явную сторону `side: 'player'` и теперь проверяют столкновения с врагами, а не с союзниками.
- Тестовый каркас: добавлен `npm test` на `node --test` с проверками статов/скилов и ranged projectile collision.

Оставшиеся крупные задачи: полноценный session resume, CI/lint, разбиение boss AI, production observability, protocolVersion/schemas и перевод UI-рендера на безопасные DOM helpers во всех компонентах.

## Быстрые проверки после будущих исправлений

Минимальный набор команд, который должен стать постоянным:

```bash
npm run build
npm test
for f in $(rg --files -g '*.js' -g '!dist' -g '!node_modules'); do node --check "$f" || exit 1; done
npm audit --audit-level=moderate
```
