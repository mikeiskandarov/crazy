# Приблизительная симуляция `approximate-v0`

Статус документа: технический контракт временной математической модели. Она нужна для разработки сюжетов, компонентов и motion. Она **не воспроизводит и не заявляет реальные вероятности Crazy Time или любой другой коммерческой игры**.

## 1. Назначение и границы

`approximate-v0` должна:

- детерминированно создавать достаточно разнообразные bankroll-траектории;
- поддерживать один прогон, дуэль, популяцию и гонку;
- давать события, из которых story compiler строит честный сюжет;
- позволять заменить математику позже без переделки визуальных компонентов;
- работать локально без сети и без привязки к рендереру.

Она не должна:

- выдавать реальные названия, публичные пределы выплат или RTP за доказательство внутренних вероятностей конкретной игры;
- называться эмуляцией реального казино-продукта;
- подгонять исход прямо во время рендера;
- скрывать факт отбора самого интересного прогона;
- обещать доходность или представлять результат как финансовую рекомендацию.

Публичная маркировка по умолчанию:

```text
Illustrative simulation • approximate model • not real game odds
```

## 2. Граница замены: `GameAdapter`

Остальной проект зависит не от `approximate-v0`, а от интерфейса:

```ts
type GameAdapter<TConfig = unknown> = {
  readonly id: string;
  readonly version: string;
  readonly modelLabel: string;
  validateConfig(input: unknown): TConfig;
  simulate(input: {
    spec: DeepReadonly<ReelSpecV1>;
    config: DeepReadonly<TConfig>;
    signal?: AbortSignal;
  }): Promise<DeepReadonly<SimulationResultV1>>;
  describeAssumptions(config: DeepReadonly<TConfig>): ModelAssumption[];
};
```

- `simulate` — единственный публичный путь из frozen ReelSpec в frozen SimulationResult;
- внутри `ApproxGameAdapter` он делегирует чистым `OutcomeGenerator`, `settleRound`, `BankrollEngine` и `BatchSimulator`, но эти helpers не становятся межслойным контрактом;
- outcome сохраняет нейтральные visual tokens (`segmentId`, `label`, `eventClass`), но не React-компоненты;
- стратегии, story selection и render не импортируют внутренности адаптера.

Поздняя реальная математика подключается как новый adapter, например `verified-game-v1`. `FormatDefinition`, StoryPlan и визуальные компоненты при этом не меняются; меняются только config и сохранённые simulation artifacts.

## 3. Конфигурация outcome table

MVP использует взвешенную таблицу дискретных исходов. `weight` — относительный вес, а не опубликованная вероятность. Нормализация выполняется внутри адаптера.

```ts
type ApproxOutcomeDefinition = {
  id: string;
  weight: number;
  grossMultiplierBps: number;
  segmentId: string;
  eventClass: "loss" | "refund" | "win" | "feature";
  intensity: 0 | 1 | 2 | 3;
};

type ApproxGameConfigInput = {
  modelVersion?: "approximate-v0";
  currency?: "USD";
  rounding?: { decimals: 2; mode: "half_away_from_zero" };
  minimumStakeMinor?: number;
  bankrollFloorMinor?: 0;
  allowFinalAllIn?: boolean;
} & (
  | { presetRef: { id: string; version: string }; outcomeTable?: never }
  | { presetRef?: never; outcomeTable: ApproxOutcomeDefinition[] }
);

type ApproxGameConfig = {
  modelVersion: "approximate-v0";
  currency: "USD";
  outcomeTable: ApproxOutcomeDefinition[];
  resolvedPreset?: { id: string; version: string; contentHash: string };
  rounding: { decimals: 2; mode: "half_away_from_zero" };
  minimumStakeMinor: number;
  bankrollFloorMinor: 0;
  allowFinalAllIn: boolean;
};
```

`validateConfig()` принимает `ApproxGameConfigInput`, разрешает `presetRef` только через versioned local registry и материализует все defaults в полный `ApproxGameConfig` до симуляции. Inline table и preset одновременно запрещены. Persisted model section сохраняет hash разрешённого preset либо inline table, поэтому изменение preset под тем же ID не проходит незаметно.

Стартовый **синтетический** preset:

```ts
const approximateV0 = {
  modelVersion: "approximate-v0",
  currency: "USD",
  minimumStakeMinor: 100,
  bankrollFloorMinor: 0,
  allowFinalAllIn: false,
  rounding: { decimals: 2, mode: "half_away_from_zero" },
  outcomeTable: [
    { id: "miss",       weight: 5700, grossMultiplierBps:      0, segmentId: "s0",  eventClass: "loss",    intensity: 0 },
    { id: "return",     weight: 2300, grossMultiplierBps:  10000, segmentId: "s1",  eventClass: "refund",  intensity: 0 },
    { id: "double",     weight: 1000, grossMultiplierBps:  20000, segmentId: "s2",  eventClass: "win",     intensity: 1 },
    { id: "triple",     weight:  500, grossMultiplierBps:  30000, segmentId: "s3",  eventClass: "win",     intensity: 1 },
    { id: "five",       weight:  300, grossMultiplierBps:  50000, segmentId: "s5",  eventClass: "win",     intensity: 2 },
    { id: "ten",        weight:  150, grossMultiplierBps: 100000, segmentId: "s10", eventClass: "win",     intensity: 2 },
    { id: "feature-15", weight:   40, grossMultiplierBps: 150000, segmentId: "f1",  eventClass: "feature", intensity: 3 },
    { id: "feature-30", weight:   10, grossMultiplierBps: 300000, segmentId: "f2",  eventClass: "feature", intensity: 3 }
  ]
} as const;
```

Сумма весов этого preset равна 10,000. Расчётное среднее gross return равно 0.97 на единицу ставки. Это исключительно удобный baseline для разработки: значения можно менять в config, а любое видео обязано сохранять `configHash`.

Никакая часть UI не должна выводить эти веса как реальные шансы.

Кроме нейтрального baseline registry содержит legacy editorial preset `crazy-time-forecast-v1@1.0.0`. Он сворачивает main wheel, Top Slot и завершившийся bonus в один synthetic gross-return bucket, целится в mean gross `0.9600` и сохраняется только для воспроизведения уже собранных artifacts. Для новых расчётов Crazy Time он запрещён: нормативная публичная реконструкция `crazy-time-global-reconstruction-v1@1.0.0`, stake-vector contract, источники и четыре пока не подключённых forecast-модели приведены в [12-game-model-forecasts.md](12-game-model-forecasts.md). До появления отдельного causal adapter эта реконструкция является source of truth для аналитики, но ещё не executable preset текущего `approximate-v0`.

## 4. Семантика bankroll

Все деньги внутри engine хранятся в integer minor units, например центах. Любой удобный author-input с десятичными значениями нормализуется до integer/basis points до freeze; simulation path не делает денежную арифметику в floating-point.

Для активного игрока на раунде `r`:

```text
requestedStakeMinor = strategy(bankrollBeforeMinor, history, config)
actualStakeMinor    = min(requestedStakeMinor, bankrollBeforeMinor)
grossReturnMinor    = round(actualStakeMinor × grossMultiplierBps / 10000)
bankrollAfterMinor  = max(0, bankrollBeforeMinor - actualStakeMinor + grossReturnMinor)
netChangeMinor      = bankrollAfterMinor - bankrollBeforeMinor
```

Правила:

1. Если `bankrollBeforeMinor < minimumStakeMinor`, игрок считается `busted` до следующего спина.
2. Если разрешён all-in, `actualStakeMinor` может быть меньше `minimumStakeMinor` только как последняя ставка; это отдельный config flag, по умолчанию `false`.
3. После `busted`, `stopped`, `targetReached` или `maxRoundsReached` bankroll больше не меняется.
4. Bankroll никогда не бывает отрицательным.
5. `grossMultiplierBps: 10000` возвращает ставку и даёт `netChangeMinor = 0`.
6. Комиссии, side bets, сложные bonus-механики и изменение правил внутри раунда отсутствуют в `approximate-v0`.

Статус прогона:

```ts
type RunStatus =
  | "active"
  | "busted"
  | "stopped"
  | "target_reached"
  | "max_rounds_reached";
```

## 5. Детерминированный PRNG

Запрещены `Math.random`, системное время и случайность рендера.

Контракт:

```ts
type RandomSource = {
  algorithm: "xoshiro128ss-v1";
  seed: string;
  nextUint32(): number;
  nextFloat01(): number; // [0, 1)
  fork(channel: string): RandomSource;
};
```

Требования реализации:

- строковый seed переводится в четыре `uint32` закреплённой hash-функцией, версия которой входит в `algorithm`;
- выбор исхода выполняется integer cumulative weights, чтобы не зависеть от ошибок float;
- seed отдельного batch run равен `hash(batchSeed + ":run:" + runIndex)`, поэтому параллелизм и порядок выполнения не меняют результат;
- дополнительная случайность feature-события берётся из `fork("round:N:feature")`, чтобы добавление нового subevent не сдвигало все последующие спины;
- алгоритм, hash и первые тестовые значения фиксируются golden fixture;
- simulation artifact сохраняет материализованный результат, а не только seed. Рендер никогда не пересимулирует данные.

## 6. Outcome stream

```ts
type ApproxOutcomeDraft = {
  eventId: string;
  round: number;
  outcomeId: string;
  outcomeLabel: string;
  tableIndex: number;
  segmentId: string;
  grossMultiplierBps: number;
  eventClass: "loss" | "refund" | "win" | "feature";
  intensity: 0 | 1 | 2 | 3;
  tags: string[];
  sourceRoll: number;
};

type ApproxOutcomeStreamDraft = {
  id: string;
  seed: string;
  configHash: string;
  outcomes: ApproxOutcomeDraft[];
};
```

`grossMultiplierBps` хранит multiplier в basis points: `10000 = 1x`, `20000 = 2x`. Это исключает неоднозначное округление.

### Обязательное правило для `$1 vs $10`

Обе стороны получают **один и тот же** `ApproxOutcomeStreamDraft`:

```ts
settleTrace({ player: left,  outcomeStream: shared });
settleTrace({ player: right, outcomeStream: shared });
```

Инвариант на каждом раунде, пока обе стороны активны:

```ts
left.rounds[r].outcomeId === right.rounds[r].outcomeId
```

Если одна сторона обанкротилась, её trace замораживается. Вторая продолжает читать тот же поток по номеру раунда. Создавать отдельный seed для каждой стороны запрещено.

Для MVP `race-to-1000` также может использовать общий поток и разные стратегии. Режим должен быть записан в artifact и показан в видео.

## 7. Стратегии

Стратегия определяет только requested stake и добровольную остановку. Она не может менять исход колеса.

```ts
type StrategyDecision = {
  requestedStakeMinor: number;
  stop?: boolean;
  reason?: string;
};

type Strategy<TConfig = unknown> = {
  id: string;
  version: string;
  validateConfig(input: unknown): TConfig;
  decide(context: Readonly<StrategyContext>, config: Readonly<TConfig>): StrategyDecision;
};
```

Разрешённый набор MVP:

| ID | Правило | Для чего |
|---|---|---|
| `flat-N` | Постоянная ставка N | Base, $1 vs $10, Last Man Standing |
| `fraction-P` | P% текущего bankroll с min/max | Race, Impossible Target |
| `press-wins` | Увеличить ставку после win, сбросить после loss | Race |
| `reduce-after-loss` | Снижать риск после loss | Race |
| `stop-loss-X` | Остановиться при bankroll ≤ X | Race/будущие истории |
| `target-sprint` | Выбирать агрессивный размер до target | Impossible Target/Race |

Каждая стратегия:

- является чистой функцией;
- читает только историю до текущего раунда;
- возвращает значение в minor units;
- имеет версию и schema-валидный config;
- не знает будущих outcomes и не получает batch rank.

`stop-or-continue` не требует умной стратегии: decision point выбирается story layer после симуляции. Фактический trace продолжает исходную стратегию.

## 8. Single run result

```ts
type ApproxRoundSettlementDraft = {
  round: number;
  outcomeEventId: string;
  outcomeId: string;
  bankrollBeforeMinor: number;
  requestedStakeMinor: number;
  actualStakeMinor: number;
  grossReturnMinor: number;
  netChangeMinor: number;
  bankrollAfterMinor: number;
  statusAfter: RunStatus;
};

type ApproxRunSummaryDraft = {
  participantId: string;
  finalStatus: RunStatus;
  roundsPlayed: number;
  finalBankrollMinor: number;
  peakBankrollMinor: number;
  peakRound: number;
  minimumBankrollMinor: number;
  largestDrawdownMinor: number;
  largestComebackMinor: number;
  longestLossStreak: number;
  targetReachedRound?: number;
};

type ApproxRunDraft = {
  participantId: string;
  modelVersion: "approximate-v0";
  configHash: string;
  outcomeStreamId: string;
  strategy: ResolvedStrategyRef;
  startBankrollMinor: number;
  rounds: ApproxRoundSettlementDraft[];
  summary: ApproxRunSummaryDraft;
};
```

Summary всегда пересчитывается и проверяется по trace при создании artifact. UI не должен вычислять финансовые значения самостоятельно.

## 9. Batch result

```ts
type ApproxRoundAggregateDraft = {
  round: number;
  activeCount: number;
  bustedCount: number;
  targetReachedCount: number;
  stoppedCount: number;
  p10BankrollMinor: number | null;
  p50BankrollMinor: number | null;
  p90BankrollMinor: number | null;
  maxBankrollMinor: number | null;
};

type ApproxBatchDraft = {
  artifactVersion: 1;
  batchId: string;
  modelVersion: "approximate-v0";
  batchSeed: string;
  configHash: string;
  populationSize: number;
  outcomeStreams: Record<string, ApproxOutcomeStreamDraft>;
  runSummaries: ApproxRunSummaryDraft[];
  roundAggregates: ApproxRoundAggregateDraft[];
  selectedParticipants: Record<string, ApproxRunDraft>;
  rankingIndexes: Record<RankingMetric, string[]>;
  integrityHash: string;
};
```

Правило материализации:

- `single-run`, `duel` и `race` сохраняют полный per-round trace каждого показанного игрока;
- большой `population` сохраняет materialized summary каждого run, агрегаты каждого раунда и полные traces всех выбранных для экрана кандидатов;
- если нужен полный аудит 100,000×500, дополнительные traces сохраняются компактным columnar artifact, но рендер его не читает;
- seed сам по себе не считается результатом и не может быть единственным сохранённым артефактом.

Эти `Approx*Draft`-типы — внутренние структуры вычислителя, не второй persisted-контракт. Перед записью adapter обязан преобразовать их в нормативный `SimulationResultV1` из `02-data-contracts.md`:

- `ApproxOutcomeStreamDraft.id/outcomes` → `OutcomeStream.streamId/events`, включая `eventId`, `outcomeLabel`, `segmentId`, `sourceRoll`, tags и BPS multiplier;
- показанные `ApproxRunDraft` → `featuredRuns: ParticipantRun[]`, settlements → `BankrollPoint[]`, а resolved strategy version/config/hash сохраняются целиком;
- batch aggregates → `PopulationResult.milestones`, `targetThresholds` и `participantIndex`;
- полные непоказанные traces → hashed chunks, а summary-only записи → `participantIndex.storageMode = aggregate-only`;
- selection receipt → `selectionAudit`.

Schema validation и invariants выполняются уже над собранным `SimulationResultV1`. Story compiler читает только сохранённый `SimulationResultV1` и никогда не импортирует `Approx*Draft` и не запускает batch повторно.

## 10. Selection и честная маркировка

Разрешённые selectors:

```ts
type RunSelector =
  | { mode: "fixed-run"; participantId: string }
  | { mode: "median-ending" }
  | { mode: "editorial-score"; scoreId: string }
  | { mode: "rank"; metric: RankingMetric; rank: number }
  | { mode: "closest-to-target"; targetMinor: number }
  | { mode: "largest-local-peak"; minimumRound: number }
  | { mode: "largest-comeback" };
```

Selector возвращает:

```ts
type SelectionReceipt = {
  selector: RunSelector;
  selectedParticipantId: string;
  populationSize: number;
  metricValue?: number;
  rank?: number;
  disclosureText: string;
};
```

Нормативный `SurviveFormatConfig.selection` отображается в первые три selector modes без переименования. `median-ending` сортирует по `finalBankrollMinor asc`, затем `participantId asc`; при чётном N берётся нижний из двух центральных элементов. `editorial-score` разрешает `scoreId` только через immutable/versioned scorer registry и сортирует `score desc → roundsPlayed desc → participantId asc`. Selector и его фактический tie-break сохраняются в `SelectionAudit`; тихий fallback на другой режим запрещён.

Примеры корректного disclosure:

- `HIGHEST PEAK OUT OF 10,000 ILLUSTRATIVE RUNS`;
- `SELECTED FROM 1,000 RUNS FOR THE BIGGEST COMEBACK`;
- `ONE SEEDED ILLUSTRATIVE RUN`.

Некорректно: `random player`, если run отобран; `average result`, если показан rank #1; `real odds`, пока используется этот adapter.

## 11. Temporal visibility

Математический artifact содержит полный результат, но сцена не получает его целиком. Story compiler создаёт покадровый view:

```ts
type VisibleSimulationView = {
  visibleThroughRound: number;
  traces: Array<{
    participantId: string;
    points: BankrollPoint[]; // уже отфильтрованы по point.round <= visibleThroughRound
    currentBankrollMinor: number;
    currentStatus: RunStatus;
  }>;
  aggregates: PopulationMilestone[]; // уже отфильтрованы по round
  allowedMilestones: string[];
  finalReveal?: {
    summaries: RunSummary[];
    winnerParticipantId?: string;
  };
};
```

Запреты:

- не передавать `finalReveal` до reveal phase;
- не строить полный график и не маскировать его прямоугольником;
- не окрашивать текущий HUD по будущему winner/success flag;
- не показывать будущий survivor count, rank или goal result;
- не использовать final summary для сортировки текущих race bars.

Temporal truth проверяется snapshot-тестами на нескольких контрольных кадрах каждого формата.

## 12. Валидация входа

Config отклоняется до запуска, если:

- outcome table пустая;
- `id` или `segmentId` дублируется;
- weight не является целым положительным числом;
- сумма весов выходит за safe integer;
- multiplier отрицательный, бесконечный или не переводится точно в basis points;
- start bankroll, stake, target или max rounds вне заданных bounds;
- неизвестны strategy/model versions;
- population превышает установленный resource limit без явного batch profile;
- в shared stream участникам заданы разные `outcomeStreamId`.

Рекомендуемые safe bounds MVP:

```ts
{
  maxRounds: 10_000,
  maxPopulationInteractive: 10_000,
  maxPopulationBatch: 250_000,
  maxEntrantsRace: 10,
  maxMoneyMinor: 100_000_000_000
}
```

## 13. Инварианты и тесты

### Unit invariants

- `bankrollAfter = bankrollBefore - actualStake + grossReturn`;
- все monetary values — integer;
- bankroll ≥ 0;
- `actualStake ≤ bankrollBefore`;
- после terminal status нет новых settlements;
- summary точно соответствует trace;
- одинаковые config + seed + version дают один integrity hash.

### Shared-stream invariants

- `$1 vs $10`: outcome ids равны на каждом общем раунде;
- shared race: outcome ids равны у всех активных участников;
- стратегия не влияет на PRNG и не сдвигает outcome stream;
- изменение визуальной темы не меняет simulation hash.

### Population invariants

- `activeCount` монотонно не возрастает, если нет механики re-entry;
- сумма terminal/active категорий равна population size;
- milestone counts согласованы с run summaries;
- ranking index содержит каждый run ровно один раз;
- tie-breaker стабилен: metric desc → rounds desc → participantId asc.

### Statistical smoke tests

Это тесты стабильности модели, не проверка реальных odds:

- частоты outcomes на большом fixture близки к настроенным весам в заданном допуске;
- средний gross return близок к синтетическому config expectation;
- присутствуют both bust и survive cases для тестовых presets;
- selectors находят валидные runs для всех обязательных историй или возвращают typed `NoCandidateError`;
- изменение seed меняет sample, изменение только render config — нет.

### Temporal tests

Для round `r` ни один scene prop не содержит settlement/aggregate с round > `r`. На pre-reveal кадре сериализованный scene payload не содержит winner id, final bankroll или final survivor count.

## 14. Ошибочные и крайние сценарии

Engine должен возвращать явный результат для:

- bust до первого визуально значимого события;
- target reached на первом раунде;
- никто не достиг target;
- все участники race обанкротились;
- несколько участников достигли target на одном раунде;
- несколько survivors после round limit;
- selector не нашёл trace, удовлетворяющий фильтру;
- bankroll упёрся в `maxMoneyMinor`;
- повреждённый или несовместимый artifact version.

Story layer обязан иметь финальные карточки `NO ONE MADE IT`, `TIE`, `BUSTED EARLY` и `NO MATCHING RUN`; он не должен молча подменять seed.

## 15. Переход к реальной математике

Когда появится проверенная модель:

1. Создать новый `GameAdapter` с новым `modelVersion`; `approximate-v0` не перезаписывать.
2. Добавить источник и provenance математических данных вне публичного ролика.
3. Зафиксировать payout/rounding/bonus semantics golden fixtures.
4. Перегенерировать simulation artifacts; старые ролики продолжают ссылаться на старый hash.
5. Прогнать те же schema, determinism, bankroll, shared-stream и temporal tests.
6. Обновить disclosure только после независимой проверки модели.

Предусмотрены два независимых production-пути:

- `verified-game-v1` — адаптер проверенной математики игры из разрешённого источника. Он обязан фиксировать версию таблиц, правила, контрольные примеры и хеш исходного набора.
- `historical-replay-v1` — адаптер истории раундов, которую предоставит владелец проекта. Он воспроизводит фактическую последовательность без заявления, что выборка раскрывает истинные вероятности; manifest фиксирует хеш датасета, диапазон времени и применённые фильтры.

Исторические данные нельзя незаметно использовать как «реальную математику»: replay отвечает на вопрос «что было в этой выборке», а verified adapter — «как устроена заявленная модель игры».

Визуальные темы, story kernels, selectors и компоненты при этом остаются прежними. Это и есть главный критерий правильной границы `GameAdapter`.
