# Последовательность сборки

## Как читать этот план

Это не календарь на много дней. Это серия коротких проходов с чётким выходом. Один проход можно сделать за одну сфокусированную сессию; соседние проходы можно объединять, если проект остаётся проверяемым.

Главное правило порядка: сначала доказать один насыщенный кадр и один полностью работающий ролик, затем размножать систему по форматам. Не строить редактор до доказанного render pipeline.

## Целевой срез

### P0 — готовый продуктовый пример

Один полностью анимированный формат:

- `survive-500`: «Can $100 survive 500 rounds?»;
- одна оригинальная тема `Carnival Night`;
- approximate math;
- wheel, HUD, survivor milestones, bankroll graph, suspense и reveal;
- draft/final render, contact sheet, QA report.

### P1 — расширяемый каркас

Зарегистрированные, валидируемые конфиги и StoryPlan scaffolds:

- `luckiest-player`;
- `stop-or-continue`;
- `one-vs-ten`;
- `impossible-target`;
- `last-man-standing`;
- `race-to-1000`.

Им не требуется отдельная polished-анимация в первом срезе. Они обязаны проходить `validate`, `simulate` и `compile`, использовать общий wheel и создавать осмысленный preview через shared primitives.

## Pass 0 — зафиксировать границы и контракты

Сделать:

- записать non-goals;
- утвердить IDs семи форматов и четырёх story kernels;
- создать версии ReelSpec, SimulationResult, StoryPlan и RenderManifest;
- определить `approximate-v0` как сменный GameAdapter;
- закрепить seed и правила money rounding.

Exit criteria:

- пример Survival проходит schema validation;
- неизвестный format/theme отвергается понятной ошибкой;
- в контрактах нет Crazy Time-specific названий и ассетов.

## Pass 1 — минимальный render skeleton

Сделать:

- поднять TypeScript/Remotion entrypoint;
- добавить CLI-каркас и `doctor`;
- создать пустую 9:16 composition с frame-driven clock;
- закрепить версии Node и зависимостей;
- проверить DOM/SVG и один Pixi/WebGL layer с fallback.

Exit criteria:

- `doctor` зелёный;
- smoke composition рендерится в draft MP4;
- scrub даёт одинаковое состояние на одном frame;
- никаких wall-clock таймеров в render path.

## Pass 2 — golden visual slice

До полноценной симуляции собрать один сильный frozen кадр Survival на fixture-данных.

Сделать:

- `Carnival Night` tokens: цвет, типографика, материалы, рамки, свет;
- hero wheel, pointer, title, HUD, graph shell, survivor strip;
- safe zones и иерархию под маленький телефон;
- provenance ledger для шрифтов и ассетов.

Exit criteria:

- кадр читается в 360×640 без zoom;
- wheel — главный объект;
- нет generic SaaS-card ощущения и нет точного клона Crazy Time;
- visual checklist пройден до добавления большого объёма motion.

## Pass 3 — approximate simulation

Сделать:

- seedable PRNG;
- weighted wheel outcomes и конфиг payout;
- bankroll engine и несколько простых стратегий;
- single-run, duel, population и race kernels;
- frozen fixtures для семи форматов.

Exit criteria:

- одинаковые spec/seed/versions дают одинаковый semantic payload и content hash в pinned environment; `createdAt` в envelope не сравнивается;
- sanity tests не находят `NaN`, отрицательные weights и невозможные ставки;
- данные явно помечены `approximate-v0`;
- реальная математика сможет заменить adapter без изменения визуальных компонентов.

## Pass 4 — story compiler и temporal truth

Сделать:

- компилятор SimulationResult -> StoryPlan;
- canonical beats: hook, setup, progress, threat, hope, decision, climax, reveal, outro;
- event detector и простой interestingness scorer;
- `visibleThroughRound` для каждого beat/frame;
- честную маркировку extreme selection.

Exit criteria:

- график, counters и labels не читают данные будущего;
- StoryPlan полностью сериализуем и не содержит runtime random;
- Luckiest Player явно описан как лучший/самый дикий из N;
- при одном и том же frozen input компиляция стабильна.

## Pass 5 — полностью анимированный Survival reel

Сделать:

- собрать 14–18-секундную композицию из shared primitives; golden target — 16 секунд;
- анимировать wheel acceleration, cruise, slowdown, stop и reveal;
- синхронизировать pointer, HUD, graph и SFX events;
- добавить controlled particles/light accents;
- создать семь golden frames и contact sheet.

Exit criteria:

- ролик понятен без звука;
- состояние корректно на произвольном scrub frame;
- все ключевые числа совпадают с frozen SimulationResult;
- draft и final проходят ffprobe и temporal-truth tests;
- ручной visual review не имеет Blocker/Major замечаний.

## Pass 6 — дешёвые производные single-run форматы

Сделать на тех же компонентах:

- `luckiest-player`: selection metadata + честная подпись;
- `stop-or-continue`: pause/question beat и две возможные концовки конфига.

Exit criteria:

- оба spec проходят validate/simulate/compile;
- generic preview собирается без нового wheel implementation;
- отличие форматов задаётся StoryPlan и конфигом, а не fork всей композиции.

## Pass 7 — duel, population и race scaffolds

Сделать:

- `$1 vs $10`: один общий stream wheel outcomes, две стратегии и два bankroll view;
- `Impossible Target`: population funnel и target line;
- `Last Man Standing`: alive counter, survivor field и milestones;
- `Race to $1,000`: несколько bankroll tracks и rank changes;
- зарегистрировать format-specific props и demo fixtures.

Exit criteria:

- все семь обязательных форматов видны в registry;
- каждый проходит validate/simulate/compile;
- каждый создаёт StoryPlan и осмысленный shared-primitives preview;
- отсутствие polished custom animation явно отмечено как backlog, а не маскируется.

## Pass 8 — CLI, batch и hardening

Сделать:

- завершить `validate`, `simulate`, `compile`, `preview`, `render`, `batch`, `contact-sheet`, `doctor`;
- сохранять manifest, QA report и ffprobe output;
- добавить batch smoke-set для семи форматов;
- проверить чистую установку по lockfile.

Exit criteria:

- Survival проходит полный конвейер до final MP4;
- batch создаёт отчёт по всем семи форматам;
- один сломанный spec не скрывает статусы остальных;
- репозиторий можно передать другому Codex с одной командой проверки.

## Что сознательно отложено

- точная математика Crazy Time;
- дополнительные skins и визуальный theme editor;
- отдельная polished-анимация всех форматов;
- сайт, пользовательский редактор и облачный render farm;
- CMS, база данных и accounts;
- автопубликация в TikTok/Reels/Shorts;
- точный брендовый клон Crazy Time;
- сложные 3D-сцены, ведущий и lip sync.

## Точка остановки для one-shot

One-shot считается успешным после Pass 8 только в указанном срезе: P0 Survival отполирован и полностью анимирован; остальные шесть форматов имеют рабочие контракты, fixtures, компиляцию истории и базовый preview. Не расширять one-shot до семи уникальных роликов или нескольких skins.
