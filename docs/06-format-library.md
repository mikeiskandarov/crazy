# Библиотека форматов

Статус документа: спецификация MVP. Здесь описаны семь обязательных форматов, но не семь отдельных видеодвижков. Все они собираются из четырёх story kernels, одного колеса и общего набора визуальных компонентов.

## 1. Жёсткие правила библиотеки

1. Один формат — это конфигурация данных, сюжетных битов и видимых компонентов, а не отдельная композиция с продублированным кодом.
2. Во всех форматах используется один `HeroWheel`; меняются его тема, подписи секторов и роль в сюжете.
3. Видео никогда не показывает данные из будущего. Графики, счётчики, таблицы и подписи получают только срез до `visibleThroughRound`.
4. Выбранный из массива удачный или неудачный прогон всегда честно маркируется: `LUCKIEST OF 10,000`, `SELECTED RUN`, `1 OF 100,000`, а не выдаётся за типичный случай.
5. Числа MVP получены моделью `approximate-v0`. В публичном видео должна быть короткая маркировка `Illustrative simulation • not real game odds`.
6. Внешний скин — оригинальный carnival/casino show. Нельзя публиковать точную копию логотипов, интерфейса, ведущих, фирменных иллюстраций или ассетов Crazy Time.
7. В MVP полностью анимируется только `survive-500`. Остальные форматы обязаны иметь рабочие данные, композицию ключевых кадров и корректный render path; уникальную полировку motion можно добавлять после вертикального среза.

## 2. Четыре story kernels

| Kernel | Что моделирует | Обязательные форматы | Новая механика поверх базы |
|---|---|---|---|
| `single-run` | Один bankroll во времени | Base Survival, Luckiest Player, Stop or Continue | Выбор прогона, точка паузы, разные правила финала |
| `duel` | Два bankroll на одном outcome stream | $1 vs $10 | Split HUD и два синхронных графика |
| `population` | Большой массив прогонов и его сжатие | Impossible Target, Last Man Standing | Funnel, survivor field, milestone counters |
| `race` | 6–10 конкурентов, лидерство и финиш | Race to $1,000 | Ranking bars, смена лидера, finish state |

Таким образом, после `single-run` не строятся ещё шесть систем. `duel` переиспользует один прогон и применяет к тем же исходам две стратегии. `population` запускает тот же bankroll engine пакетно. `race` является только новым способом представить несколько уже рассчитанных трасс.

## 3. Общий контракт формата

Единственный публичный registry-контракт — `FormatDefinition` из `02-data-contracts.md`: `kind`, SemVer, kernel, `validate()` и `compile()`. Отдельного persisted `StoryRecipe` нет. Внутри `compile()` формат может собрать одноразовый `StoryIntentDraft`, но наружу выходит только нормативный `StoryPlanV1`:

```ts
type StoryIntentDraft = {
  hook: {
    eyebrow?: string;
    line1: string;
    line2?: string;
  };
  selection: Record<string, unknown>;
  beatOrder: StoryBeat["kind"][];
  visibleComponents: string[];
  disclosure: string[];
};
```

Draft не содержит случайности и не выбирает packs. Format читает frozen `ReelSpec` и `SimulationResult`; theme, layout и motion/audio разрешаются исключительно из `ReelSpec.packs`, поэтому формат не связан со скином.

### Общие сюжетные биты

Все форматы собираются из ограниченного словаря:

- `hook` — один вопрос или парадокс, читаемый за первый экран;
- `setup` — стартовые деньги, ставка, число игроков и цель;
- `progress` — быстрое продвижение раундов и значимые milestones;
- `threat` — приближение к банкротству, дедлайну или провалу цели;
- `hope` — подтверждённое восстановление, новый peak или сокращение разрыва;
- `decision` — намеренная пауза перед ответом;
- `climax` — решающий spin, последний кандидат или пересечение goal line;
- `reveal` — единственный главный ответ и короткий proof;
- `outro` — маркировка модели и следующий вопрос.

### Общие визуальные слои

Порядок важности в кадре:

1. `ImpactTitle` — вопрос текущего сюжета;
2. `HeroWheel` + `WheelPointer` — физический источник исхода;
3. главный показатель формата: bankroll, survivors, leader или distance-to-target;
4. один объясняющий виджет: график, поле игроков, race bars или duel card;
5. вторичные подписи и disclosure;
6. `FxLayer`, который подчёркивает событие, но не конкурирует с числами.

На телефоне одновременно допускается не больше трёх активных смысловых зон. Финальный график не должен заранее занимать пол-экрана и раскрывать ответ.

## 4. Обязательные форматы

### 4.1 `survive-500` — Can $100 Survive 500 Rounds?

**Kernel:** `single-run`  
**Приоритет:** P0, единственный полностью отполированный motion-формат MVP.  
**Базовый hook:** `CAN $100 SURVIVE 500 ROUNDS?`

Минимальная конфигурация:

```ts
{
  kind: "survive-500",
  formatVersion: "1.0.0",
  roundCount: 500,
  startBankrollMinor: 10_000,
  displayRoundMilestones: [100, 250, 400, 500],
  populationSize: 1_000,
  betMinor: 100,
  strategy: { id: "flat-1", version: "1.0.0", config: {} },
  selection: { mode: "editorial-score", scoreId: "survival-drama-v1" }
}
```

Визуальная грамматика:

- один большой `HeroWheel` остаётся центром физического действия;
- `BankCard` меняет смысловой цвет: safe → warning → danger → result;
- `BankrollGraph` рисует только пройденную часть траектории;
- `RoundCard` является главным таймером угрозы;
- `MilestoneStrip` может показать контрольные точки 100/250/400/500, но будущие значения скрыты.

Story beats для ролика 14–18 секунд (golden target: 16):

1. 0–8%: hook и старт `$100 / $1 per round`;
2. 8–30%: быстрые ранние спины, первый локальный пик;
3. 30–62%: компрессия времени, 2–3 выбранных события;
4. 62–82%: danger phase и замедление около минимального bankroll;
5. 82–94%: последний значимый спин;
6. 94–100%: `SURVIVED` или `BUSTED AT ROUND N`, затем полный график как proof.

Честная маркировка:

- `ONE ILLUSTRATIVE RUN` для заранее выбранного seed;
- если прогон найден поиском, `SELECTED FROM N RUNS`;
- до reveal нельзя показывать финальный bankroll, итоговый цвет или конец графика.

Переиспользование: это эталон для `BankCard`, `RoundCard`, колеса, графика, переходов, camera rig и audio bus.

Сложность: **M**, потому что здесь создаётся вся базовая система; после неё производная стоимость других `single-run`-форматов низкая.

Acceptance criteria:

- один и тот же spec дважды даёт одинаковый semantic payload/content hash и визуально одинаковые кадры в pinned environment;
- на любом кадре график заканчивается на текущем раунде;
- на стоп-кадрах hook, bankroll и round читаются при ширине предпросмотра 270 px;
- результат не угадывается по цвету интерфейса раньше reveal;
- рендер проходит без сети и без вызовов `Math.random`, `Date.now`, ticker или `requestAnimationFrame`.

### 4.2 `luckiest-player` — Luckiest of N

**Kernel:** `single-run` + batch selection  
**Приоритет:** P1  
**Базовый hook:** `WE SIMULATED 10,000 PLAYERS. THIS WAS #1.`

Минимальная конфигурация:

```ts
{
  kind: "luckiest-player",
  formatVersion: "1.0.0",
  roundCount: 500,
  startBankrollMinor: 10_000,
  displayRoundMilestones: [100, 250, 400, 500],
  populationSize: 10_000,
  betMinor: 100,
  strategy: { id: "flat-1", version: "1.0.0", config: {} },
  rankingMetric: "highest-peak",
  discloseSelection: true
}
```

`rankingMetric` разрешает только заранее определённые метрики из контракта. Название hook должно соответствовать метрике. Нельзя назвать игрока самым удачливым, если он выбран вручную по драматичности.

Визуальная грамматика:

- короткий population-intro state: `SurvivorField`/`DenseSurvivorCloud` сжимается до выбранного игрока;
- затем используется почти тот же экран, что в `survive-500`;
- `SelectionDisclosure` постоянно показывает `#1 OF 10,000`;
- необязательные ghost-линии p50/p90 появляются только в proof-секции.

Story beats: population setup → мгновенный честный выбор #1 → 3–4 аномальных события → false crash → peak/final reveal → сравнение с медианой.

Честная маркировка: обязательная строка `BEST PEAK OUT OF 10,000 ILLUSTRATIVE RUNS`; если ранжирование по финалу — `HIGHEST FINAL BANKROLL...`.

Переиспользование: 85–90% `survive-500`; добавляются `SelectionDisclosure` и короткий population intro state.

Сложность: **S** после P0.

Acceptance criteria:

- выбранный `participantId` действительно имеет указанный rank по сохранённому batch result;
- metric label совпадает с `rankingMetric`;
- в ролике нет слов `average`, `typical` или `random player`;
- все bankroll-значения совпадают с выбранным полным trace.

### 4.3 `stop-or-continue` — Stop or Continue?

**Kernel:** `single-run`  
**Приоритет:** P1  
**Базовый hook:** `YOU'RE UP $347. WOULD YOU STOP?`

Минимальная конфигурация:

```ts
{
  kind: "stop-or-continue",
  formatVersion: "1.0.0",
  roundCount: 500,
  startBankrollMinor: 10_000,
  displayRoundMilestones: [100, 250, 400, 500],
  betMinor: 100,
  strategy: { id: "flat-1", version: "1.0.0", config: {} },
  decisionPoint: { mode: "first-peak-over", thresholdMinor: 34_700 },
  pauseFrames: 75,
  revealAlternative: true
}
```

Story compiler выбирает точку паузы только из уже рассчитанной трассы. Экспортированное видео не является интерактивным: вопрос — драматургическая пауза, после которой ролик автоматически продолжается.

Визуальная грамматика:

- перед паузой используется базовый экран;
- на beat `decision` колесо и фон почти замирают, остаётся только мягкое свечение;
- крупно показываются `TAKE $347` и `CONTINUE`, но без имитации клика;
- после продолжения цветовая семантика определяется текущим состоянием, а не будущим финалом.

Story beats: hook с суммой peak → очень короткий путь к peak → 2–3-секундный decision hold → продолжение → crash или новый рекорд → сравнение `STOP VALUE` и `FINAL VALUE`.

Честная маркировка: `PRE-SELECTED ILLUSTRATIVE RUN`; если peak найден поиском, `SELECTED FROM N RUNS`.

Переиспользование: 90% `survive-500`; добавляются `DecisionCard` и сравнительный state существующего `ResultCard`.

Сложность: **S**.

Acceptance criteria:

- сумма в hook равна bankroll в точке `pauseRound`;
- до паузы ни один элемент не содержит final value;
- hold заметен даже без звука;
- итог явно разделяет гипотетическое значение остановки и фактический финал.

### 4.4 `one-vs-ten` — $1 vs $10

**Kernel:** `duel`  
**Приоритет:** P2  
**Базовый hook:** `SAME $100. SAME SPINS. $1 VS $10.`

Минимальная конфигурация:

```ts
{
  kind: "one-vs-ten",
  formatVersion: "1.0.0",
  roundCount: 500,
  startBankrollMinor: 10_000,
  displayRoundMilestones: [100, 250, 400, 500],
  left: { label: "$1", betMinor: 100, strategy: { id: "flat-1", version: "1.0.0", config: {} } },
  right: { label: "$10", betMinor: 1_000, strategy: { id: "flat-10", version: "1.0.0", config: {} } },
  sharedOutcomeStream: true,
  finish: { mode: "round-limit" }
}
```

`sharedOutcomeStream: true` обязателен для этого формата: оба bankroll получают один и тот же `outcomeId` на каждом раунде. Меняется только ставка и связанное с ней банкротство. Два независимых потока запрещены, потому что hook обещает `SAME SPINS`.

Визуальная грамматика:

- одно колесо по центру; второе колесо не создаётся;
- две lane внутри `DuelHUD`: `$1` и `$10`;
- один вертикальный маркер текущего раунда проходит через оба графика;
- win/loss импульс запускается синхронно, но денежная амплитуда отличается;
- выбывшая сторона визуально приглушается, не исчезая полностью.

Story beats: правила сравнения → одинаковый первый исход → расхождение волатильности → лидер меняется → один близок к bust → reveal `WHO LASTED LONGER` + оба финала.

Честная маркировка: `SAME ILLUSTRATIVE OUTCOME STREAM`; нельзя писать `better strategy` по одному прогону — только `lasted longer in this run`.

Переиспользование: общий `HeroWheel`, два экземпляра `BankCard`, `RoundCard`, общий graph engine с двумя series.

Сложность: **M-**.

Acceptance criteria:

- для каждого общего раунда `left.outcomeId === right.outcomeId`;
- обе линии синхронизированы одним `visibleThroughRound`;
- stake и bankroll каждой стороны читаются без опоры на цвет;
- после bust одной стороны другая может продолжить, а замороженный trace больше не изменяется;
- proof показывает два финальных значения и число пережитых раундов.

### 4.5 `impossible-target` — Can $1 Become $10,000?

**Kernel:** `population`  
**Приоритет:** P3  
**Базовый hook:** `CAN $1 BECOME $10,000?`

Минимальная конфигурация:

```ts
{
  kind: "impossible-target",
  formatVersion: "1.0.0",
  roundCount: 500,
  startBankrollMinor: 100,
  displayRoundMilestones: [50, 100, 250, 500],
  populationSize: 100_000,
  betMinor: 100,
  strategy: { id: "target-sprint", version: "1.0.0", config: {} },
  targetMinor: 1_000_000,
  targetMilestonesMinor: [1_000, 10_000, 100_000, 1_000_000],
  stopWhenFirstTargetReached: false
}
```

Визуальная грамматика:

- `CandidateCounter` — главный показатель;
- `PopulationFunnel` ретроспективно показывает frozen batch `100,000 → N` по возрастающим денежным порогам; каждая ступень отсутствует до своего reveal, а не вычисляется из будущего во время render;
- колесо остаётся физическим якорем отдельных переломных событий и показывает outcome явно подписанного highlight-кандидата, а не общий исход всей популяции;
- для последнего кандидата можно переключиться на обычный single-run HUD;
- target всегда визуально отделён как цель, а не обещанный результат.

Story beats: невероятная цель → запуск 100k → быстрое сжатие на первых порогах → несколько кандидатов → последний кандидат → target hit или extinction → полная funnel-summary.

Честная маркировка: `100,000 INDEPENDENT RUNS • ILLUSTRATIVE MODEL`; если никто не достиг цели, reveal должен говорить `0 REACHED $10,000`, а не создавать ложную победу.

Переиспользование: batch simulator и `PopulationFunnel` затем используются в Last Man Standing.

Сложность: **M** после batch engine.

Acceptance criteria:

- каждый следующий milestone count не больше предыдущего;
- counters соответствуют сохранённым run summaries;
- ноль кандидатов является валидным, корректно отрендеренным исходом;
- до фактического перехода порога будущий count отсутствует в DOM/scene data, а не просто скрыт opacity;
- selected candidate trace принадлежит тому же batch и проходит показанные пороги.

### 4.6 `last-man-standing` — Last Man Standing

**Kernel:** `population`  
**Приоритет:** P3  
**Базовый hook:** `1,000 PLAYERS START WITH $100. WHO SURVIVES?`

Минимальная конфигурация:

```ts
{
  kind: "last-man-standing",
  formatVersion: "1.0.0",
  roundCount: 500,
  startBankrollMinor: 10_000,
  displayRoundMilestones: [100, 250, 400, 500],
  populationSize: 1_000,
  betMinor: 100,
  strategy: { id: "flat-1", version: "1.0.0", config: {} },
  eliminationAtOrBelowMinor: 0,
  stopAtSurvivors: 1
}
```

Визуальная грамматика:

- `SurvivorField` агрегирует 1,000 игроков в 50–100 видимых glyphs; один glyph может представлять группу;
- `CandidateCounter` важнее отдельных аватаров;
- исчезновение — короткий sober fade/drop, не фейерверк на каждой потере;
- в late game группы раскрываются до отдельных финалистов;
- колесо показывает outcome подписанного highlight-кандидата; массовый alive count берётся из независимых прогонов и не приписывается одному spin;
- winner card появляется только после финального сравнения.

Story beats: 1,000 стартуют → первый массовый отсев → фактические контрольные counts (например, 7/3/2, только если они реально случились) → последний выживший или несколько выживших после лимита → winner rule proof.

Честная маркировка:

- если к 500-му раунду выжили несколько, нельзя объявлять буквального last man; применяется и показывается tie-breaker;
- если glyph представляет группу, легенда должна говорить `1 ICON = 10 PLAYERS`;
- setup содержит `1,000 INDEPENDENT ILLUSTRATIVE RUNS`;
- `ILLUSTRATIVE MODEL` обязателен.

Переиспользование: `PopulationFunnel`, batch summaries, выбранные traces и milestone logic из Impossible Target.

Сложность: **M-** после `impossible-target`.

Acceptance criteria:

- alive count монотонно не возрастает;
- число исчезнувших glyphs согласовано с легендой и счётчиком;
- survivor milestone видим только после достижения соответствующего раунда;
- tie-breaker детерминирован и отражён в финальном proof;
- ни один eliminated player не возвращается в более позднем кадре.

### 4.7 `race-to-1000` — Race to $1,000

**Kernel:** `race`  
**Приоритет:** P4, самый визуально отдельный из обязательных форматов.  
**Базовый hook:** `WHO CAN TURN $10 INTO $1,000 FIRST?`

MVP-конфигурация:

```ts
{
  kind: "race-to-1000",
  formatVersion: "1.0.0",
  roundCount: 500,
  startBankrollMinor: 1_000,
  displayRoundMilestones: [50, 100, 250, 500],
  racerCount: 8,
  targetMinor: 100_000,
  sharedOutcomeStream: true,
  racers: [
    { racerId: "safe", label: "SAFE", betMinor: 100, strategy: { id: "flat-1", version: "1.0.0", config: {} } },
    { racerId: "bold", label: "BOLD", betMinor: 300, strategy: { id: "flat-3", version: "1.0.0", config: {} } },
    { racerId: "f10", label: "10%", betMinor: 100, strategy: { id: "fraction-10", version: "1.0.0", config: {} } },
    { racerId: "f20", label: "20%", betMinor: 100, strategy: { id: "fraction-20", version: "1.0.0", config: {} } },
    { racerId: "press", label: "PRESS", betMinor: 100, strategy: { id: "press-wins", version: "1.0.0", config: {} } },
    { racerId: "reduce", label: "REDUCE", betMinor: 100, strategy: { id: "reduce-after-loss", version: "1.0.0", config: {} } },
    { racerId: "guard", label: "GUARD", betMinor: 100, strategy: { id: "stop-loss-5", version: "1.0.0", config: {} } },
    { racerId: "sprint", label: "SPRINT", betMinor: 100, strategy: { id: "target-sprint", version: "1.0.0", config: {} } }
  ]
}
```

Для самого дешёвого честного MVP `sharedOutcomeStream: true`: все участники получают общий outcome stream, но применяют заранее объявленные разные стратегии. Подзаголовок обязателен: `SAME SPINS • 8 BETTING RULES`. Это создаёт расхождение без восьми колёс и делает центральное колесо буквальным источником каждого раунда.

Позднее разрешён `sharedOutcomeStream: false`. Тогда подпись меняется на `8 INDEPENDENT SIMULATIONS`, а центральное колесо является символическим highlight текущего события; смешивать режим и подпись нельзя.

Визуальная грамматика:

- `RaceBars` занимает главную нижнюю область; длина шкалы может быть логарифмической, но это явно подписывается;
- показываются максимум 8 участников;
- топ-3 получают насыщенность, остальные сохраняют читаемый контраст;
- `RaceLeaderBadge` меняется только после подтверждённого пересечения;
- bust lane остаётся внизу с `OUT`, чтобы рейтинг не прыгал непонятно;
- `HeroWheel` уменьшается относительно Base, но остаётся единым центром результата спина.

Story beats: правила и цель → плотный старт → первая смена лидера → массовый risk phase → 2–3 претендента → замедление у goal line → winner или `NO ONE MADE IT` → итоговая таблица.

Честная маркировка: режим потоков, число стратегий/симуляций и иллюстративная модель указываются на setup и в outro.

Переиспользование: bankroll engine, wheel, event detector и result cards; уникален в основном `RaceBars`.

Сложность: **L** относительно остальных форматов; поэтому он последний в MVP-порядке, а не первый proof of concept.

Acceptance criteria:

- rank на каждом кадре вычислен только из bankroll на текущем раунде;
- при равенстве используется стабильный tie-breaker, порядок не дрожит между кадрами;
- режим общего потока подтверждён одинаковым `outcomeId` у всех активных участников;
- winner объявляется только на первом раунде, где bankroll достиг target;
- если цель не достигнута, отрисовывается валидный финал без выдуманного победителя;
- названия/иконки восьми стратегий различимы без чтения мелкого описания.

## 5. Backlog, не входящий в MVP

Эти идеи совместимы с архитектурой, но не должны расширять первую сборку:

| Формат | Kernel | Дешёвая адаптация после MVP |
|---|---|---|
| The Comeback | `single-run` | Выбрать trace по `largest_comeback`, начать монтаж с локального минимума |
| The Curse | `single-run` | Добавить detector серии проигрышей и тревожный state overlay |
| One Bet Only | `single-run` | Новая стратегия фильтра ставки + длинные time-compression участки |
| Beat the Odds | `population` | Goal line и множество агрегированных линий поверх batch summaries |

Ни один backlog-формат не требует нового симуляционного ядра.

## 6. Temporal visibility: единое правило правды во времени

Story compiler передаёт компонентам:

```ts
type VisibilityContext = {
  visibleThroughRound: number;
  revealedMilestones: string[];
  revealPhase: "hidden" | "partial" | "final";
};
```

Компоненты обязаны получать уже обрезанные данные:

- `BankrollGraph.series = trace.filter(point => point.round <= visibleThroughRound)`; стартовую точку round 0 presentation-слой добавляет отдельно;
- `AliveCounter` вычисляется на текущем раунде, не берётся из final summary;
- `RaceBars` сортируются по текущим bankroll;
- milestone value отсутствует до своего reveal;
- final bankroll, winner id и success flag доступны сцене только в `revealPhase: "final"`;
- цвет состояния выводится из текущего bankroll/позиции, а не из будущего `success`.

Скрыть будущий текст через `opacity: 0` недостаточно: будущих данных не должно быть в props компонента до разрешённого кадра.

## 7. Общая проверка готовности формата

Формат считается заложенным, когда выполнены все пункты:

1. Есть зарегистрированный recipe и schema-валидный config.
2. Результат симуляции сохраняется как артефакт и рендер не пересчитывает его.
3. Формат использует один из четырёх kernels без копии bankroll logic.
4. Hook, setup, reveal и disclosure сформированы из фактических данных.
5. Есть минимум шесть golden frames: hook, setup, first event, jeopardy, pre-reveal, result.
6. Golden frames проходят проверку на 270 px, grayscale и отсутствие будущих данных.
7. Есть один smoke render 1080×1920, 30 fps, без сети и недетерминированных API.
8. Acceptance criteria конкретного формата покрыты автоматическими или snapshot-тестами.
9. Публичный скин использует оригинальные материалы и нейминг.
10. Ошибочные сценарии — zero survivors, no winner, early bust, tie, target miss — дают законченный ролик, а не пустой кадр.
