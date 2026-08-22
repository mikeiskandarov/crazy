# Data contracts

Статус: нормативные TypeScript-контракты между слоями. Примеры сокращены, но перечисленные поля и инварианты обязательны.

## 1. Общие правила

1. Любой persisted artifact содержит schemaVersion, artifactId, createdAt, contentHash и provenance.
2. В render-path используются только deep-readonly данные.
3. Деньги хранятся целым числом minor units. Для USD: 100 = $1.00.
4. Раунды в persisted данных нумеруются с 1. Кадры — с 0.
5. Длительности хранятся в frames, не в floating seconds.
6. Все ids стабильны, состоят из lowercase kebab-case и не выводятся из array index.
7. Любой optional default материализуется до freeze.
8. NaN, Infinity, отрицательная ставка и неизвестный enum — schema error.
9. Full simulation output сохраняется; seed не является заменой SimulationResult.
10. Денежное форматирование выполняется presentation-слоем, никогда не хранится как источник истины.

Базовые branded-типы:

    type ArtifactId = string;
    type ContentHash = string;
    type SemVer = string;
    type Frame = number;
    type RoundNumber = number;
    type MoneyMinor = number;
    type Probability = number;
    type Seed = string;

    type DeepReadonly<T> =
      T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;

Runtime schema обязана проверять integer/range, а не полагаться только на TypeScript.

## 2. ArtifactEnvelope

Каждый JSON-артефакт реализует:

    interface ArtifactEnvelope {
      schemaVersion: string;
      artifactId: ArtifactId;
      createdAt: string;       // ISO-8601; metadata, не источник анимации
      contentHash: ContentHash;
      provenance: {
        producer: string;
        producerVersion: SemVer;
        parentHashes: ContentHash[];
      };
    }

`createdAt` и само поле `contentHash` исключаются из вычисления `contentHash`; иначе hash был бы самореферентным. Canonical JSON использует стабильный порядок ключей и одинаковое представление чисел.

Детерминизм сравнивается по `contentHash` и semantic payload без metadata envelope. Два честно созданных файла могут отличаться `createdAt`, но обязаны иметь одинаковый semantic payload и `contentHash` при одинаковых входах и закреплённых версиях.

## 3. ReelSpec

ReelSpec — единственный авторский вход. После parse/defaults он замораживается.

    interface ReelSpecV1 extends ArtifactEnvelope {
      schemaVersion: "reel-spec/1";
      reelId: string;
      locale: "en-US" | "ru-RU";
      currency: "USD";

      format: FormatConfigV1;

      game: {
        adapterId: string;
        requestedModelVersion: string;
        seed: Seed;
        config: Record<string, unknown>;
      };

      editorial: {
        headline: string;
        subhook?: string;
        disclosure: string;
        selectionDisclosure?: string;
        tone: "tension" | "spectacle" | "analytical";
      };

      compliance: {
        ageLabel?: string;
        modelDisclosure: string;
        responsiblePlay?: string;
        affiliateDisclosure?: string;
        geoRestriction?: string;
        noGuaranteeNotice?: string;
      };

      packs: {
        layout: PackRef;
        theme: PackRef;
        motionAudio: PackRef;
      };

      render: {
        profile: "draft" | "final" | "public";
        fps: 30;
        targetDurationFrames?: Frame;
      };
    }

    interface PackRef {
      id: string;
      version: SemVer;
    }

    interface StrategyRef {
      id: string;
      version: SemVer;
      config: Record<string, unknown>;
    }

    interface ResolvedStrategyRef extends StrategyRef {
      configHash: ContentHash;
    }

### 3.1 FormatConfigV1

Форматы — discriminated union. Произвольный Record вместо union запрещён.

    type FormatConfigV1 =
      | SurviveFormatConfig
      | LuckiestPlayerFormatConfig
      | StopOrContinueFormatConfig
      | OneVsTenFormatConfig
      | ImpossibleTargetFormatConfig
      | LastManStandingFormatConfig
      | RaceTo1000FormatConfig;

    interface CommonFormatConfig {
      formatVersion: SemVer;
      roundCount: number;
      startBankrollMinor: MoneyMinor;
      displayRoundMilestones: RoundNumber[];
    }

    interface SurviveFormatConfig extends CommonFormatConfig {
      kind: "survive-500";
      populationSize: number;
      betMinor: MoneyMinor;
      strategy: StrategyRef;
      selection:
        | { mode: "fixed-run"; participantId: string }
        | { mode: "median-ending" }
        | { mode: "editorial-score"; scoreId: string };
    }

    interface LuckiestPlayerFormatConfig extends CommonFormatConfig {
      kind: "luckiest-player";
      populationSize: number;
      betMinor: MoneyMinor;
      strategy: StrategyRef;
      rankingMetric: RankingMetric;
      discloseSelection: true;
    }

    type RankingMetric =
      | "highest-final-bankroll"
      | "highest-peak"
      | "longest-survival"
      | "largest-comeback";

    interface StopOrContinueFormatConfig extends CommonFormatConfig {
      kind: "stop-or-continue";
      betMinor: MoneyMinor;
      strategy: StrategyRef;
      decisionPoint:
        | { mode: "first-peak-over"; thresholdMinor: MoneyMinor }
        | { mode: "round"; round: RoundNumber }
        | { mode: "editorial-event"; eventType: string };
      pauseFrames: Frame;
      revealAlternative?: boolean;
    }

    interface OneVsTenFormatConfig extends CommonFormatConfig {
      kind: "one-vs-ten";
      left: { label: string; betMinor: MoneyMinor; strategy: StrategyRef };
      right: { label: string; betMinor: MoneyMinor; strategy: StrategyRef };
      sharedOutcomeStream: true;
      finish: { mode: "round-limit" };
    }

    interface ImpossibleTargetFormatConfig extends CommonFormatConfig {
      kind: "impossible-target";
      populationSize: number;
      betMinor: MoneyMinor;
      strategy: StrategyRef;
      targetMinor: MoneyMinor;
      targetMilestonesMinor: MoneyMinor[];
      stopWhenFirstTargetReached: boolean;
    }

    interface LastManStandingFormatConfig extends CommonFormatConfig {
      kind: "last-man-standing";
      populationSize: number;
      betMinor: MoneyMinor;
      strategy: StrategyRef;
      eliminationAtOrBelowMinor: MoneyMinor;
      stopAtSurvivors: number;
    }

    interface RaceTo1000FormatConfig extends CommonFormatConfig {
      kind: "race-to-1000";
      racerCount: number;
      targetMinor: MoneyMinor;
      racers: Array<{
        racerId: string;
        label: string;
        betMinor: MoneyMinor;
        strategy: StrategyRef;
      }>;
      sharedOutcomeStream: boolean;
    }

### 3.2 ReelSpec validation

Hard rules:

- roundCount: integer 1–100000;
- startBankrollMinor > 0;
- каждая ставка > 0;
- populationSize/racerCount согласованы со списками;
- survive-500 populationSize может быть 1, но golden fixture использует 1,000, чтобы поддержать честный survivor context из референса;
- round milestones уникальны, отсортированы и не больше roundCount;
- impossible-target targetMilestonesMinor строго возрастают от start bankroll до target;
- stop-or-continue decision round находится внутри run;
- one-vs-ten sharedOutcomeStream в v1 всегда true;
- one-vs-ten всегда рассчитывает обе стороны до их собственного terminal state или round limit; банкротство первой стороны не обрывает вторую;
- public profile требует непустой disclosure;
- compliance.modelDisclosure обязателен во всех профилях; остальные compliance-поля проверяются policy выбранной площадки/юрисдикции, а не хардкодятся в компонентах;
- target должен быть выше start bankroll для target/race formats;
- headline проходит length budget из LayoutPack на следующей стадии.

## 4. GameAdapter

    interface GameAdapter<TConfig = unknown> {
      readonly id: string;
      readonly version: SemVer;
      readonly modelLabel: string;

      validateConfig(input: unknown): TConfig;

      simulate(input: {
        spec: DeepReadonly<ReelSpecV1>;
        config: DeepReadonly<TConfig>;
        signal?: AbortSignal;
      }): Promise<DeepReadonly<SimulationResultV1>>;

      describeAssumptions(config: DeepReadonly<TConfig>): ModelAssumption[];
    }

    interface ModelAssumption {
      id: string;
      label: string;
      detail: string;
      material: boolean;
    }

Adapter не получает ThemePack, fps или StoryPlan.

## 5. SimulationResult

SimulationResult хранит весь результат, необходимый для повторного story compile и аудита. Для больших populations сырые chunks могут храниться sidecar-файлами, но их hashes и индексы обязательны.

    interface SimulationResultV1 extends ArtifactEnvelope {
      schemaVersion: "simulation-result/1";
      reelSpecHash: ContentHash;

      model: {
        adapterId: string;
        adapterVersion: SemVer;
        modelVersion: string;
        modelLabel: string;
        configHash: ContentHash;
        seed: Seed;
        assumptions: ModelAssumption[];
      };

      run: {
        roundCount: number;
        populationSize: number;
        sharedOutcomeStream: boolean;
      };

      outcomeStreams: OutcomeStream[];
      featuredRuns: ParticipantRun[];
      population?: PopulationResult;
      selectionAudit?: SelectionAudit;
      chunks?: SimulationChunkRef[];
      invariants: SimulationInvariantSummary;
    }

### 5.1 Outcome streams

    interface OutcomeStream {
      streamId: string;
      events: OutcomeEvent[];
    }

    interface OutcomeEvent {
      eventId: string;
      round: RoundNumber;
      outcomeId: string;
      outcomeLabel: string;
      segmentId: string;
      grossMultiplierBps: number;
      eventClass: "loss" | "refund" | "win" | "feature";
      intensity: 0 | 1 | 2 | 3;
      tags: string[];
      sourceRoll: number; // integer PRNG output or canonical bucket
    }

Gross multiplier хранится в basis points: `10000 = 1×`, `15000 = 1.5×`. Расчёт выплаты обязан определять rounding policy в gameConfig.

### 5.2 Participant runs

    interface ParticipantRun {
      participantId: string;
      label: string;
      streamId: string;
      strategy: ResolvedStrategyRef;
      startBankrollMinor: MoneyMinor;
      points: BankrollPoint[];
      summary: RunSummary;
    }

    interface BankrollPoint {
      round: RoundNumber;
      bankrollBeforeMinor: MoneyMinor;
      stakeMinor: MoneyMinor;
      bankrollAfterMinor: MoneyMinor;
      netChangeMinor: MoneyMinor;
      outcomeEventId: string;
      alive: boolean;
      tags: string[];
    }

    interface RunSummary {
      finalBankrollMinor: MoneyMinor;
      peakBankrollMinor: MoneyMinor;
      peakRound: RoundNumber;
      maxDrawdownMinor: MoneyMinor;
      bankruptcyRound?: RoundNumber;
      longestLossStreak: number;
      targetReachedRound?: RoundNumber;
    }

Для video path точка на каждый показанный раунд обязательна. Sparse trajectory допустима только для участника, который никогда не показывается индивидуально, и должна быть помечена storageMode: aggregate-only в population index.

### 5.3 Population results

    interface PopulationResult {
      populationId: string;
      size: number;
      milestones: PopulationMilestone[];
      targetThresholds: TargetThresholdSummary[];
      selectedParticipantIds: string[];
      rankedCandidates: RankedCandidate[];
      participantIndex: PopulationParticipantIndexEntry[];
      storage: {
        mode: "inline" | "chunked";
        rawParticipantCount: number;
      };
    }

    interface PopulationParticipantIndexEntry {
      participantId: string;
      storageMode: "inline" | "chunked" | "aggregate-only";
      featuredRunParticipantId?: string;
      chunkId?: string;
      chunkOrdinal?: number;
      summaryHash: ContentHash;
    }

    interface PopulationMilestone {
      round: RoundNumber;
      aliveCount: number;
      targetReachedCount: number;
      bankrollBands: Array<{
        fromMinor: MoneyMinor;
        toMinor?: MoneyMinor;
        count: number;
      }>;
    }

    interface TargetThresholdSummary {
      thresholdMinor: MoneyMinor;
      everReachedCount: number;
      firstReachedRound?: RoundNumber;
    }

`targetThresholds` хранит retrospective funnel для Impossible Target: сколько независимых runs хотя бы раз достигли каждого денежного порога. Counts у более высокого порога не могут превышать counts низкого. StoryPlan раскрывает эти готовые факты последовательно; highlight-кандидат при этом имеет собственный `visibleThroughRound`.

    interface RankedCandidate {
      participantId: string;
      rank: number;
      scoreId: string;
      scoreMilli: number;
      reasonCodes: string[];
    }

    interface SelectionAudit {
      policyId: string;
      policyVersion: SemVer;
      consideredCount: number;
      selectedParticipantIds: string[];
      rankingMetric?: RankingMetric;
      scoreId?: string;
      disclosedAs: string;
    }

### 5.4 Chunked storage

    interface SimulationChunkRef {
      chunkId: string;
      path: string;
      sha256: ContentHash;
      participantIdFrom: string;
      participantIdTo: string;
      participantCount: number;
      encoding: "jsonl-gzip" | "msgpack";
    }

Seed-only reconstruction запрещена. Chunked artifact считается полным только когда все referenced chunks существуют и проходят hash check.

### 5.5 Simulation invariants

    interface SimulationInvariantSummary {
      checked: number;
      failures: number;
      checkIds: string[];
    }

Обязательные checks:

- rounds строго возрастают;
- outcomeEventId существует;
- bankrollAfter = bankrollBefore − stake + payout по policy;
- следующий bankrollBefore равен предыдущему bankrollAfter;
- после bankruptcy участник не возвращается без явно поддержанного rebuy;
- population counts монотонно не растут для alive;
- selected participants существуют в raw/chunk index;
- каждый selected participant имеет `storageMode: inline | chunked` и полный trace; `aggregate-only` нельзя выбрать для показа;
- любой median/editorial/ranked выбор создаёт SelectionAudit с фактическим consideredCount, policy и экранной disclosure;
- все money fields integers.

## 6. FormatDefinition и FormatRegistry

    interface FormatDefinition<TConfig extends FormatConfigV1> {
      readonly kind: TConfig["kind"];
      readonly version: SemVer;
      readonly kernel: "single-run" | "duel" | "population" | "race";

      validate(config: unknown): TConfig;

      compile(input: {
        spec: DeepReadonly<ReelSpecV1>;
        simulation: DeepReadonly<SimulationResultV1>;
        config: DeepReadonly<TConfig>;
        durationBudgetFrames?: Frame;
      }): DeepReadonly<StoryPlanV1>;
    }

    interface FormatRegistry {
      register(definition: FormatDefinition<FormatConfigV1>): void;
      resolve(kind: FormatConfigV1["kind"], version: SemVer): FormatDefinition<FormatConfigV1>;
      list(): Array<{ kind: string; version: SemVer; kernel: string }>;
    }

Регистрация двух реализаций с одинаковыми kind/version — hard error.

## 7. StoryPlan

StoryPlan содержит драматургию и семантические visual instructions, но не React nodes, CSS, Pixi objects или theme colors.

    interface StoryPlanV1 extends ArtifactEnvelope {
      schemaVersion: "story-plan/1";
      reelSpecHash: ContentHash;
      simulationHash: ContentHash;
      format: {
        kind: FormatConfigV1["kind"];
        version: SemVer;
        kernel: "single-run" | "duel" | "population" | "race";
      };
      fps: 30;
      durationInFrames: Frame;
      beats: StoryBeat[];
      tracks: StoryTracks;
      metricBindings: MetricBinding[];
      revealRegistry: RevealRule[];
      compileAudit: StoryCompileAudit;
    }

### 7.1 Beats

    interface StoryBeat {
      beatId: string;
      kind:
        | "hook"
        | "setup"
        | "progress"
        | "threat"
        | "hope"
        | "decision"
        | "climax"
        | "reveal"
        | "outro";
      startFrame: Frame;
      endFrameExclusive: Frame;
      focalElementId: string;
      intent: string;
      visibility: VisibilityWindow;
      layoutVariant: string;
      motionPresetId: string;
      audioCueIds: string[];
    }

    interface VisibilityWindow {
      visibleRoundFrom: RoundNumber;
      visibleThroughRound: RoundNumber;
      allowedMetricIds: string[];
      allowedRevealIds: string[];
      hiddenElementIds: string[];
    }

Инварианты:

- beats отсортированы;
- первый beat начинается на frame 0;
- endFrameExclusive > startFrame;
- допустимы overlaps только для явно разных tracks;
- focalElementId ровно один на beat;
- reveal не предшествует данным, на которых основан.

### 7.2 Tracks

    interface StoryTracks {
      text: TextCue[];
      camera: CameraCue[];
      wheel: WheelCue[];
      emphasis: EmphasisCue[];
      audio: AudioCue[];
    }

    interface TextCue {
      cueId: string;
      elementId: string;
      startFrame: Frame;
      endFrameExclusive: Frame;
      role: "headline" | "subhook" | "callout" | "caption" | "result";
      text: string;
      semanticTone: "neutral" | "positive" | "warning" | "danger";
    }

    interface CameraCue {
      cueId: string;
      startFrame: Frame;
      endFrameExclusive: Frame;
      presetId: string;
      targetElementId: string;
      intensityMilli: number;
    }

    interface WheelCue {
      cueId: string;
      eventId: string;
      startFrame: Frame;
      settleFrame: Frame;
      targetSegmentId: string;
      totalTurnsMilli: number;
      easingId: string;
    }

    interface EmphasisCue {
      cueId: string;
      elementId: string;
      frame: Frame;
      semanticEvent: "gain" | "loss" | "danger" | "elimination" | "target" | "reveal";
      magnitudeMilli: number;
    }

    interface AudioCue {
      cueId: string;
      assetId: string;
      startFrame: Frame;
      endFrameExclusive?: Frame;
      role: "music" | "spin" | "impact" | "ui" | "ambience";
      gainMilli: number;
      duckGroup?: string;
    }

### 7.3 Metric bindings

    interface MetricBinding {
      metricId: string;
      source:
        | { kind: "participant-bankroll"; participantId: string }
        | { kind: "alive-count"; populationId: string }
        | { kind: "target-count"; populationId: string; thresholdMinor: MoneyMinor }
        | { kind: "round" }
        | { kind: "static"; valueMinor: number };
      presentation:
        | "money"
        | "integer"
        | "multiplier"
        | "percentage";
      revealId?: string;
    }

    interface RevealRule {
      revealId: string;
      earliestFrame: Frame;
      earliestRound?: RoundNumber;
      sourceEventId?: string;
    }

VisualStateResolver использует binding + active VisibilityWindow и возвращает только разрешённый срез.

### 7.4 Compile audit

    interface StoryCompileAudit {
      candidateEventIds: string[];
      selectedEventIds: string[];
      rejected: Array<{ eventId: string; reason: string }>;
      futureDataCheck: "passed";
      disclosureCheck: "passed";
    }

## 8. VisualState

VisualState — эфемерный read model одного кадра. Он не persistится и является единственным источником данных для render components.

    interface VisualState {
      frame: Frame;
      activeBeatIds: string[];
      focalElementId: string;
      currentRound: RoundNumber;
      headline?: TextCue;
      callouts: TextCue[];
      metrics: Record<string, VisibleMetric>;
      graphSeries: Record<string, VisibleSeries>;
      survivors?: VisibleSurvivorState;
      wheel?: VisibleWheelState;
      semanticEvents: EmphasisCue[];
      camera: CameraTransform2D;
    }

    interface VisibleSeries {
      visibleThroughRound: RoundNumber;
      points: Array<{ round: RoundNumber; valueMinor: number }>;
    }

Render components не принимают SimulationResult даже как optional prop.

## 9. Pack contracts

### 9.1 LayoutPack

    interface LayoutPack {
      readonly id: string;
      readonly version: SemVer;
      readonly supportedAspectRatios: string[];
      readonly regions: Record<string, LayoutRegion>;
      readonly variants: Record<string, LayoutVariant>;

      resolve(input: {
        width: number;
        height: number;
        variantId: string;
        contentMetrics: ContentMetrics;
      }): ResolvedLayout;

      validate(layout: ResolvedLayout): LayoutIssue[];
    }

    interface LayoutRegion {
      regionId: string;
      purpose: "hook" | "hero" | "hud" | "evidence" | "footer" | "overlay";
      normalizedBounds: { x: number; y: number; width: number; height: number };
      safeInsets: { top: number; right: number; bottom: number; left: number };
      zLayer: number;
    }

### 9.2 ThemePack

    interface ThemePack {
      readonly id: string;
      readonly version: SemVer;
      readonly tokens: {
        color: SemanticColorTokens;
        typography: TypographyTokens;
        material: MaterialTokens;
        stroke: StrokeTokens;
        shadow: ShadowTokens;
        fx: FxTokens;
      };
      readonly assets: ThemeAssetRef[];
      validate(): ThemeIssue[];
    }

    interface SemanticColorTokens {
      background: string;
      surface: string;
      textPrimary: string;
      textSecondary: string;
      positive: string;
      warning: string;
      danger: string;
      neutral: string;
      gold: string;
    }

    interface ThemeAssetRef {
      assetId: string;
      path: string;
      sha256: ContentHash;
      role: string;
      provenanceId: string;
    }

### 9.3 MotionAudioPack

    interface MotionAudioPack {
      readonly id: string;
      readonly version: SemVer;
      readonly durations: Record<string, Frame>;
      readonly easings: Record<string, EasingDefinition>;
      readonly motionPresets: Record<string, MotionPreset>;
      readonly audioCues: Record<string, AudioAssetCue>;
      readonly loudness: {
        targetLufs: number;
        truePeakDb: number;
      };
    }

MotionPreset оперирует semantic events и нормализованным progress, а не конкретным DOM class.

## 10. RenderManifest

    interface RenderManifestV1 extends ArtifactEnvelope {
      schemaVersion: "render-manifest/1";
      refs: {
        reelSpec: ArtifactRef;
        simulation: ArtifactRef;
        storyPlan: ArtifactRef;
      };
      packs: {
        layout: ResolvedPackRef;
        theme: ResolvedPackRef;
        motionAudio: ResolvedPackRef;
      };
      composition: {
        id: string;
        width: number;
        height: number;
        fps: number;
        durationInFrames: Frame;
      };
      assets: ResolvedAsset[];
      profile: "draft" | "final" | "public";
      output: {
        directory: string;
        previewPath?: string;
        videoPath: string;
        contactSheetPath: string;
        qaReportPath: string;
      };
    }

    interface ArtifactRef {
      artifactId: string;
      path: string;
      contentHash: ContentHash;
      schemaVersion: string;
    }

    interface ResolvedPackRef extends PackRef {
      contentHash: ContentHash;
    }

    interface ResolvedAsset {
      assetId: string;
      path: string;
      sha256: ContentHash;
      mediaType: string;
      required: boolean;
      usage: "render" | "audio" | "font";
      provenance: AssetProvenance;
    }

## 11. AssetProvenance

    interface AssetProvenance {
      provenanceId: string;
      sourceType:
        | "original"
        | "generated"
        | "licensed"
        | "public-domain"
        | "reference-only";
      sourceUri?: string;
      author?: string;
      license?: string;
      allowedUsage: Array<"internal" | "public" | "commercial">;
      notes?: string;
    }

Правила:

- reference-only запрещён в public profile;
- unknown license — hard fail для public;
- generated asset хранит tool/model/prompt hash, если доступно;
- изменение файла без обновления sha256 блокирует render;
- логотипы и извлечённые UI assets известных игр не допускаются в CarnivalNight.

## 12. QaReport

    interface QaReportV1 extends ArtifactEnvelope {
      schemaVersion: "qa-report/1";
      renderManifestHash: ContentHash;
      status: "passed" | "passed-with-warnings" | "failed";
      checks: QaCheckResult[];
      inspectedFrames: Frame[];
      contactSheetHash?: ContentHash;
    }

    interface QaCheckResult {
      checkId: string;
      severity: "info" | "minor" | "major" | "blocker";
      status: "passed" | "failed" | "skipped";
      frame?: Frame;
      beatId?: string;
      elementId?: string;
      message: string;
      suggestedFix?: string;
    }

Persisted severity использует lowercase enum. В review/UI он отображается как `Blocker`, `Major`, `Minor`, `Info`; отдельного конкурирующего уровня `hard` нет. Любой failed `blocker` и failed `major` запрещают статус ready/final acceptance.

## 13. Versioning и migrations

- schemaVersion меняется только при изменении persisted shape/semantics.
- pack version — SemVer.
- formatVersion независим от StoryPlan schemaVersion.
- adapterVersion описывает код, modelVersion — математическую модель/таблицу.
- loader поддерживает только текущую и предыдущую major schema.
- migration — чистая функция old artifact → new draft; затем validation, new hash и provenance parent hash.
- автоматическая silent migration во время final render запрещена.

## 14. Contract acceptance fixtures

В репозитории должны быть минимальные fixtures:

    specs/examples/survive-500.json
    specs/examples/luckiest-player.json
    specs/examples/stop-or-continue.json
    specs/examples/one-vs-ten.json
    specs/examples/impossible-target.json
    specs/examples/last-man-standing.json
    specs/examples/race-to-1000.json

Для каждого fixture:

1. schema parse проходит;
2. GameAdapter compatibility проходит;
3. simulation дважды даёт тот же hash;
4. StoryPlan имеет обязательные beats;
5. temporal truth check проходит;
6. RenderManifest разрешает все packs/assets.

Только survive-500 обязан иметь full render snapshot в MVP; остальные проходят contract compile.

## 15. Минимальный survive-500 spec

    {
      "schemaVersion": "reel-spec/1",
      "reelId": "survive-500-demo",
      "locale": "en-US",
      "currency": "USD",
      "format": {
        "kind": "survive-500",
        "formatVersion": "1.0.0",
        "roundCount": 500,
        "startBankrollMinor": 10000,
        "populationSize": 1000,
        "betMinor": 100,
        "strategy": {
          "id": "flat-1",
          "version": "1.0.0",
          "config": {}
        },
        "displayRoundMilestones": [1, 100, 250, 400, 500],
        "selection": {
          "mode": "editorial-score",
          "scoreId": "tension-arc-v1"
        }
      },
      "game": {
        "adapterId": "approx-wheel",
        "requestedModelVersion": "approximate-v0",
        "seed": "survive-500-demo-001",
        "config": {
          "presetRef": { "id": "carnival-wheel-v0", "version": "1.0.0" },
          "rounding": { "decimals": 2, "mode": "half_away_from_zero" }
        }
      },
      "editorial": {
        "headline": "CAN $100 SURVIVE 500 ROUNDS?",
        "disclosure": "Approximate simulation",
        "selectionDisclosure": "Selected illustrative run from 1,000",
        "tone": "tension"
      },
      "compliance": {
        "modelDisclosure": "Illustrative simulation • approximate model • not real game odds"
      },
      "packs": {
        "layout": { "id": "vertical-show", "version": "1.0.0" },
        "theme": { "id": "carnival-night", "version": "1.0.0" },
        "motionAudio": { "id": "tension-show", "version": "1.0.0" }
      },
      "render": {
        "profile": "draft",
        "fps": 30,
        "targetDurationFrames": 480
      }
    }

artifactId, createdAt, contentHash и provenance добавляются canonicalizer после author input; автор не вводит их вручную.
