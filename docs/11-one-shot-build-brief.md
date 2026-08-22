# One-shot brief для Codex

Ниже — самостоятельное задание, которое можно целиком передать Codex для реализации первого среза.

---

## Задание

Собери в этом репозитории локальный TypeScript-инструмент для детерминированной генерации вертикальных casino/game-show reels. Сначала полностью прочитай `skills/direct-casino-reels/SKILL.md`, загрузи указанные им references и используй этот skill для арт-дирекшена и финального visual review. Затем изучи все документы в `docs/` и существующий код. Сохраняй совместимость с описанными контрактами; если код и документ расходятся, зафиксируй расхождение в handoff и выбери самый маленький вариант, который выполняет acceptance criteria ниже.

Работай автономно до проверенного результата. Не расширяй scope. Вопрос пользователю нужен только при настоящем блокере: отсутствует обязательный закрытый ресурс, нужна новая внешняя authority или два возможных решения заметно меняют продукт.

## Результат one-shot

### P0: один полностью готовый animated reel

Реализуй `survive-500` с hook:

> CAN $100 SURVIVE 500 ROUNDS?

Ролик должен быть вертикальным, 14–18 секунд (target 16), с одной оригинальной темой `Carnival Night`. В нём нужны:

- крупный hero wheel и физически убедительный pointer;
- hook и короткая постановка условия;
- cards текущего игрока, раунда, bankroll и peak;
- survivor milestones из frozen batch на 1,000 illustrative runs;
- bankroll graph, который раскрывается только до текущего раунда;
- suspense beat перед ключевой остановкой;
- синхронный reveal и итоговая result card;
- аккуратные light/particle accents;
- поддержка звуковых events, даже если MVP использует только лицензированные/собственные placeholder SFX.

Hero player для golden ролика можно выбрать по зафиксированному dramatic-score, но selection policy, considered count, run ID и экранная подпись `SELECTED ILLUSTRATIVE RUN FROM 1,000` обязательны. Не притворяйся, что это случайный средний игрок.

Используй Remotion как timeline/render orchestration. Критический текст, HUD и графики делай DOM/SVG; wheel, сценический свет и частицы можно разместить в одном PixiJS/WebGL canvas. Не переноси весь интерфейс в canvas.

### P1: scaffolds всех обязательных форматов

Зарегистрируй семь format IDs:

1. `survive-500` — fully animated P0;
2. `luckiest-player`;
3. `stop-or-continue`;
4. `one-vs-ten`;
5. `impossible-target`;
6. `last-man-standing`;
7. `race-to-1000`.

Для каждого нужны:

- валидируемый config и разумные defaults;
- deterministic demo fixture;
- привязка к одному из kernels: `single-run`, `duel`, `population`, `race`;
- simulation output;
- скомпилированный StoryPlan;
- базовый preview через shared visual primitives;
- запись в format registry и smoke test.

Отдельная polished-анимация шести P1-форматов не требуется. Не копируй Survival-композицию семь раз.

Форматные особенности:

- `luckiest-player`: выбери extreme run из партии и обязательно покажи честную подпись вроде `Luckiest of 10,000`, а не выдавай его за типичный;
- `stop-or-continue`: конфигурируемый decision pause на peak и продолжение к win/loss ending;
- `one-vs-ten`: один общий поток результатов wheel, стартовый bankroll одинаковый, стратегии ставок $1 и $10 считаются параллельно;
- `impossible-target`: population funnel к далёкой цели с фактическим числом прогнанных approximate simulations;
- `last-man-standing`: alive milestones из population kernel;
- `race-to-1000`: несколько bankroll tracks, ранги и первая честно достигнутая цель.

## Математика

Сейчас нужна только явная сменная модель `approximate-v0`:

- seedable PRNG;
- конфигурируемые weighted wheel outcomes;
- простой payout table;
- bankroll engine;
- стратегии ставок;
- single-run и batch/population simulation;
- единые правила округления денег.

Не заявляй, что это реальные odds или математика Crazy Time. Изолируй её за GameAdapter, чтобы позже заменить точной моделью без изменения StoryPlan, компонентов и CLI.

Не используй `Math.random()` и wall clock в симуляции или render path. Сохраняй полный SimulationResult; seed сам по себе недостаточен для архивного рендера.

## Story engine и temporal truth

Реализуй сериализуемый StoryPlan с canonical beats:

- hook;
- setup;
- progress;
- threat;
- hope;
- decision;
- climax;
- reveal;
- outro.

Для каждого frame/beat должен быть visibility horizon (`visibleThroughRound` или эквивалент). HUD, graph, survivor counts, peak и labels могут читать только уже раскрытые данные. Финал, победитель и будущие milestones скрыты до reveal.

Любой cherry-pick сохраняй в manifest: размер выборки, критерий выбора, run ID и честная экранная подпись.

## Визуальный язык

Создай собственную тему `Carnival Night`: театральный тёмный фон, тёплые лампы, золото, глубокие винные/изумрудные акценты, ясная белая типографика, физические материалы и дозированное праздничное свечение.

Это должен быть оригинальный game-show/carnival мир. Не используй логотипы, wheel art, bonus icons, ведущих, текстуры, видео, аудио или точный trade dress Crazy Time/Evolution. Не создавай пиксельную копию пользовательского референса. Референсы можно использовать только для абстрактных принципов композиции и драматургии.

В каждый момент оставляй один главный фокус. Избегай generic SaaS cards, дешёвого cyberpunk, одинакового glow на всём, постоянного confetti и мелкого текста.

## CLI

Предоставь единый интерфейс `pnpm reel` с командами:

```text
validate
simulate
compile
preview
render
batch
contact-sheet
doctor
```

Полный happy path:

```text
validate -> simulate -> compile -> contact-sheet -> render -> QA
```

Preview обязан читать те же frozen данные, что final render. Никакой отдельной mock-логики в UI.

## Артефакты

Для run сохраняй:

```text
input/reel-spec.json
data/simulation.json
data/story-plan.json
render-manifest.json
preview/keyframes/*.png
preview/contact-sheet.jpg
video/draft.mp4
video/final.mp4
qa/report.json
qa/ffprobe.json
run-manifest.json
```

Manifest должен включать версии схем/движков, seed, `simulationModel`, hashes входов, render profile, pinned runtime/dependency versions, asset provenance, warnings и статусы QA.

## Детерминизм и окружение

- Закрепи версию Node и lockfile.
- Любая анимация — функция absolute frame и frozen StoryPlan.
- Отключи независимый Pixi ticker, wall-clock таймеры и runtime randomness.
- В pinned environment одинаковые входы должны давать одинаковые SimulationResult, StoryPlan и golden frames в установленном допуске.
- Не требуй bit-identical MP4 на разных машинах. Кодеки/GPU могут менять байты; проверяй frozen state, keyframes и параметры streams.

## QA, который нужно автоматизировать

- schema и cross-field validation;
- deterministic repeat test;
- temporal-truth tests без future spoilers;
- math sanity tests;
- семь golden frames Survival;
- contact sheet;
- small-phone preview 360×640 без zoom;
- дополнительная проверка семи golden frames при ширине 270 px;
- проверка hook/HUD/graph/result на читаемость;
- ffprobe: 1080×1920, H.264, `yuv420p`, CFR 30 FPS, длительность ±1 frame, AAC 48 kHz при наличии аудио;
- extraction первого, среднего и последнего кадра;
- asset provenance check;
- честная подпись для extreme/cherry-picked runs;
- configurable placeholders для 18+, Simulation/Approximate model, responsible gambling, ad/affiliate и geo disclosure.

## Обязательные acceptance criteria

Работа завершена только когда:

1. Чистая установка по lockfile и `pnpm reel doctor` проходят.
2. Survival проходит `validate -> simulate -> compile -> contact-sheet -> render`.
3. Survival имеет цельный draft и final MP4, семь golden frames и QA report без Blocker/Major.
4. На frame с раундом N ни один компонент не показывает данные после N.
5. Один и тот же frozen input воспроизводит состояния и keyframes в pinned environment.
6. Все семь форматов зарегистрированы и проходят validate/simulate/compile smoke tests.
7. Шесть P1-форматов создают осмысленный базовый preview, но не притворяются полностью отполированными.
8. `$1 vs $10` использует один outcome stream, а не два независимых wheel.
9. Luckiest/Impossible/Last Man показывают фактический размер выборки и честное описание selection.
10. Final MP4 проходит ffprobe contract.
11. Ни один ассет не имеет неизвестного provenance; брендовые assets Crazy Time/Evolution отсутствуют.
12. В репозитории есть короткий handoff: что сделано, как запустить, какие проверки пройдены и какие TODO оставлены для реальной математики.

## Non-goals

Не делай в этом one-shot:

- сайт или landing page;
- пользовательский timeline/editor;
- облачный render, accounts, database или CMS;
- автопубликацию в соцсети;
- несколько skins;
- полноценную уникальную анимацию всех семи форматов;
- точную математику Crazy Time;
- точный клон Crazy Time/Evolution;
- ведущего, сложное 3D или lip sync.

Если что-то из non-goals кажется полезным, оставь короткий TODO без реализации.

## Порядок работы и handoff

Следуй проходам из `docs/10-build-sequence.md`. После каждого прохода запускай его exit checks; не накапливай непроверенный код до конца.

В финальном ответе перечисли:

- реализованный scope;
- команды запуска и пути к ключевым артефактам;
- результаты tests/QA/ffprobe;
- сделанные допущения;
- известные ограничения;
- точную точку расширения, куда позже подключить реальную математику.

---

Этот brief намеренно останавливается на одном сильном анимированном Survival reel и рабочей архитектуре остальных форматов. Следующий разумный шаг после его выполнения — выбрать один P1-формат по результатам preview и дать ему собственную polished motion grammar.
