# Component catalog

Статус: полный inventory первой архитектуры. Этот файл используется как build checklist и ownership map.

## 1. Обозначения

| Метка | Значение |
|---|---|
| MVP-G | обязателен и production-ready для golden survive-500 |
| MVP-C | обязателен как работающий контракт/compile scaffold, визуал может быть упрощён |
| POST | сознательно отложен после MVP |

Под “output” у визуального компонента понимается render subtree или draw commands. Ни один render-компонент не возвращает/изменяет simulation data.

## 2. Contract и artifact components

| Component | Responsibility | Inputs | Outputs | Stage | Dependencies |
|---|---|---|---|---|---|
| ReelSpecSchema | Runtime-проверка author input и discriminated format config | unknown input | parsed ReelSpec draft или path errors | MVP-G | Zod, money/range rules |
| ReelSpecCanonicalizer | Материализовать defaults, упорядочить ключи, нормализовать paths | parsed draft | canonical ReelSpec | MVP-G | ReelSpecSchema |
| ArtifactFreezer | Deep-freeze артефакт перед передачей следующему слою | canonical object | DeepReadonly artifact | MVP-G | core only |
| ContentHasher | Stable hash canonical JSON и файлов | object/file bytes | sha256 | MVP-G | canonical serializer |
| ArtifactStore | Записать/read immutable build artifacts и проверить hash | artifact, build directory | ArtifactRef | MVP-G | ContentHasher |
| SchemaMigrationRegistry | Явные migrations предыдущей major schema | old artifact | migrated draft + audit | POST | schemas |
| FormatRegistry | Resolve FormatDefinition по kind/version | format ref | FormatDefinition | MVP-G | format modules |
| PackRegistry | Resolve Layout/Theme/MotionAudio pack по id/version | PackRef | pack implementation | MVP-G | pack modules |
| BuildIdentity | Собрать spec/simulation/story/render hash chain | parent refs, versions | buildId, hash metadata | MVP-G | ContentHasher |

## 3. Simulation components

| Component | Responsibility | Inputs | Outputs | Stage | Dependencies |
|---|---|---|---|---|---|
| SeededPRNG | Воспроизводимые integer rolls и derived seeds | root seed, namespace | deterministic stream | MVP-G | pure core |
| ApproxGameAdapter | Реализовать GameAdapter для approximate-v0 | Frozen ReelSpec, ApproxGameConfig | SimulationResult | MVP-G | OutcomeGenerator, BankrollEngine, BatchSimulator |
| ApproxGameConfigSchema | Проверить таблицу outcomes, rounding, limits | unknown game config | typed config | MVP-G | schemas |
| OutcomeTable | Хранить weighted outcomes/payout tags вне UI | approximate config | normalized weighted table | MVP-G | no render deps |
| OutcomeGenerator | Превратить PRNG rolls в OutcomeStream | seed/PRNG, table, rounds | OutcomeEvent[] | MVP-G | SeededPRNG, OutcomeTable |
| MoneyMath | Безопасные integer операции и rounding policy | minor units, grossMultiplierBps | MoneyMinor | MVP-G | invariant helpers |
| BankrollEngine | Применить stake/outcome, получить trajectory | initial bank, strategy, outcomes | ParticipantRun | MVP-G | MoneyMath |
| StrategyRegistry | Resolve strategy по id/version | strategy ref | Strategy | MVP-G | strategy modules |
| FlatBetStrategy | Ставка фиксированного размера с clamp на банк | state, betMinor | StakeDecision | MVP-G | MoneyMath |
| Strategy | Общий контракт решения ставки | participant state, visible past | StakeDecision | MVP-G | contracts |
| DuelSimulator | Две стратегии на одном outcome stream | left/right configs, stream | two ParticipantRuns | MVP-C | BankrollEngine |
| BatchSimulator | Детерминированная population simulation, chunking | population config, seed | raw chunks + summaries | MVP-C | OutcomeGenerator, BankrollEngine |
| AggregateBuilder | Alive/target/bankroll bands по milestones | participant results | PopulationResult | MVP-C | BatchSimulator |
| RaceSimulator | N racers, shared/independent streams | racer configs | ParticipantRuns + leader changes | MVP-C | BankrollEngine |
| RunSummaryBuilder | Peak, drawdown, bankruptcy, streak, target | ParticipantRun points | RunSummary | MVP-G | MoneyMath |
| SimulationInvariantChecker | Проверить continuity, payout math, ids, counts | SimulationResult draft | invariant summary/errors | MVP-G | contracts |
| ChunkWriter/Reader | Полное sidecar storage больших populations | participant runs | hashed chunk refs | MVP-C | ArtifactStore |
| VerifiedGameAdapter | Подменить approximate math проверенной моделью | verified config/data + provenance | SimulationResult | POST | GameAdapter contract |
| HistoricalReplayAdapter | Воспроизвести предоставленную историю без заявления о вероятностях | hashed history dataset + filters | SimulationResult | POST | GameAdapter contract |

## 4. Story engine components

| Component | Responsibility | Inputs | Outputs | Stage | Dependencies |
|---|---|---|---|---|---|
| EventDetector | Найти peaks, drops, streaks, eliminations, target hits, lead changes | SimulationResult | CandidateEvent[] | MVP-G | no render deps |
| InterestingnessScorer | Оценить tension, reversal, novelty, clarity | candidate events, format weights | ranked events | MVP-G | EventDetector |
| RunSelector | Честно выбрать fixed/median/editorial/luckiest run | candidates, selection policy | selected ids + SelectionAudit | MVP-G | InterestingnessScorer |
| BeatBudgeter | Разместить обязательные beats в duration budget | beat intents, fps, target frames | beat frame ranges | MVP-G | Motion duration hints |
| StoryCompiler | Собрать общий StoryPlan и audit | spec, simulation, format result | StoryPlan | MVP-G | FormatRegistry, BeatBudgeter, TemporalTruthGuard |
| TemporalTruthGuard | Запретить future values/reveals | StoryPlan draft, simulation | validated visibility windows | MVP-G | MetricBinding resolver |
| VisualStateResolver | Получить безопасный read model конкретного кадра | frame, StoryPlan, sliced data | VisualState | MVP-G | TemporalTruthGuard |
| MetricResolver | Разрешить MetricBinding с current visibility horizon | binding, round/frame | VisibleMetric/VisibleSeries | MVP-G | simulation index |
| CopyFormatter | Форматировать money/count/multiplier и подставить разрешённые значения | locale, VisibleMetric, copy template | display strings | MVP-G | Intl/local rules |
| RevealRegistry | Централизовать earliest frame/round для скрытых фактов | RevealRule[] | reveal decisions | MVP-G | StoryPlan |
| SurviveDirector | Режиссура hook→threat→hope→final | Survive config, selected run | beat intents/cues | MVP-G | EventDetector |
| LuckiestPlayerDirector | Показать честно выбранный wildest run из N | population result, ranking | beat intents + disclosure | MVP-C | RunSelector |
| StopOrContinueDirector | Вставить decision pause и затем outcome | selected run, decision config | decision/reveal beats | MVP-C | EventDetector |
| OneVsTenDirector | Синхронный split-story двух bankroll paths | duel result | comparison beats | MVP-C | DuelSimulator |
| ImpossibleTargetDirector | Сжимать candidate count к target/reveal | population aggregates | elimination funnel beats | MVP-C | AggregateBuilder |
| LastManStandingDirector | Показать падение alive count и survivor | population aggregates | milestone/reveal beats | MVP-C | AggregateBuilder |
| RaceTo1000Director | Лидерства, обгоны, finish | race result | race beats/cues | MVP-C | RaceSimulator |
| ComebackDirector | История от near-bankrupt к recovery | selected run | comeback beats | POST | EventDetector |
| CurseDirector | Нарастающая loss streak | selected run | streak beats | POST | EventDetector |
| OneBetOnlyDirector | Ожидание редкого tagged outcome | tagged outcomes | wait/payoff beats | POST | EventDetector |
| BeatTheOddsDirector | Толпа trajectories против goal line | population result | goal-line beats | POST | AggregateBuilder |

## 5. Render shell и layout

| Component | Responsibility | Inputs | Outputs | Stage | Dependencies |
|---|---|---|---|---|---|
| RemotionRoot | Зарегистрировать compositions и metadata resolver | RenderManifest | composition registrations | MVP-G | Remotion |
| ReelComposition | Общий frame root, layers, fonts, background/audio | manifest, frame | complete frame tree | MVP-G | StoryTimeline, PixiStage, AudioBus |
| StoryTimeline | Активировать beats/cues на absoluteFrame | frame, StoryPlan | active timeline state | MVP-G | Remotion Sequence |
| LayerStack | Фиксировать порядок backdrop→Pixi→HUD→overlay→compliance | resolved layout | layer containers | MVP-G | ReelComposition |
| LayoutResolver | Выбрать regions/variant и проверить bounds | LayoutPack, content metrics | ResolvedLayout | MVP-G | VerticalShowLayout |
| VerticalShowLayout | Основной 9:16 layout и safe zones | dimensions, variant | semantic regions | MVP-G | LayoutPack contract |
| ContentMeasurer | Измерить headline/numbers до final layout | text, font tokens | ContentMetrics | MVP-G | FontLoader |
| CollisionChecker | Найти overlap важных components/safe-zone breach | resolved boxes | LayoutIssue[] | MVP-G | ResolvedLayout |
| CameraRig2D | Вычислить controlled pan/zoom для hero layer | frame, CameraCue[] | 2D transform | MVP-G | MotionAudioPack |
| FormatSceneRouter | Выбрать scene assembly по format kind без math logic | format kind, VisualState | scene subtree | MVP-G | FormatRegistry metadata |

## 6. DOM/SVG visual components

| Component | Responsibility | Inputs | Outputs | Stage | Dependencies |
|---|---|---|---|---|---|
| StageBackdrop | Базовый gradient/vignette/stage depth без тяжёлых FX | theme tokens, layout | background DOM | MVP-G | ThemePack |
| MarqueeFrame | Общая show-frame, gold trim и bulbs boundary | bounds, theme, frame | decorative frame | MVP-G | MotionAudioPack |
| PanelShell | Общая lacquer/metal оболочка HUD без знания метрики | bounds, material/state tokens | panel primitive | MVP-G | ThemePack |
| MetricLabel | Единая служебная подпись HUD | label, typography role | label primitive | MVP-G | ThemePack |
| MetricValue | Деньги/count/round с tabular numerals | VisibleMetric, presentation | value primitive | MVP-G | CopyFormatter |
| StateAccent | Семантический safe/warning/danger/win accent | visible semantic state | border/light primitive | MVP-G | ThemePack |
| ImpactTitle | Главный hook, максимум 2–3 строки, responsive fit | headline cue, title region | title DOM | MVP-G | typography tokens, ContentMeasurer |
| SubhookPill | Краткий контекст: simulations/bet/rounds | text cues | pill row | MVP-G | ThemePack |
| PlayerCard | Identity/selection label текущего run | participant visible data | player HUD | MVP-G | CopyFormatter |
| RoundCard | Текущий round/limit без future leak | currentRound, total allowed | round HUD | MVP-G | VisualState |
| BankCard | Текущий bank + optional achieved peak | visible bankroll metric | money HUD | MVP-G | CopyFormatter, semantic colors |
| TopMultiplier | Крупный текущий wheel outcome/result | visible outcome | multiplier badge | MVP-G | RevealRegistry |
| SuspenseCallout | Одна контекстная фраза/стрелка для угрозы или надежды | active callout cue | overlay callout | MVP-G | StoryTimeline |
| BankrollGraph | SVG-line только до visibleThroughRound | VisibleSeries, axes config | clipped graph SVG | MVP-G | MetricResolver |
| GraphMarker | Current/peak/goal marker, только после разрешённого reveal | visible point, semantic event | SVG marker | MVP-G | BankrollGraph |
| SurvivorField | Сетка/лента alive-eliminated, DOM для малых N | visible survivor state | survivor visualization | MVP-C | MetricResolver |
| MilestoneStrip | 100→250→400→500 или population checkpoints | reached milestones only | evidence strip | MVP-G | TemporalTruthGuard |
| DuelHUD | Две равноправные карточки и shared round | left/right visible states | split HUD | MVP-C | OneVsTenDirector |
| DualBankrollGraph | Две линии с общей шкалой | two VisibleSeries | comparison SVG | MVP-C | BankrollGraph |
| GoalLine | Target line и distance-to-target | visible target, graph scale | SVG overlay | MVP-C | BankrollGraph |
| CandidateCounter | Счётчик N→…→survivors/target achievers | visible aggregate metric | count HUD | MVP-C | AggregateBuilder |
| PopulationFunnel | Последовательность batch/threshold counts без future reveal | visible threshold summaries | funnel DOM/SVG | MVP-C | CandidateCounter, RevealRegistry |
| RaceBars | N horizontal bankroll bars и rank order | visible racer states | bar-race DOM/SVG | MVP-C | RaceTo1000Director |
| RaceLeaderBadge | Текущий лидер без финального spoiler | visible rank state | leader marker | MVP-C | RaceBars |
| DecisionCard | “Stop or continue?” pause state | decision beat, current bank | modal-like overlay | MVP-C | StopOrContinueDirector |
| ResultCard | Финальный банк/survival/target outcome | allowed reveal metrics | result overlay | MVP-G | RevealRegistry |
| SelectionDisclosure | “Luckiest out of 10,000”, не “random player” | selection audit text | disclosure label | MVP-C | RunSelector |
| ComplianceBlock | Approximate simulation/model label | editorial disclosure | footer/end-card copy | MVP-G | ReelSpec |
| EndCard | Итог, participant id, disclosure, optional CTA slot | reveal state, metadata | final frame group | MVP-G | ResultCard, ComplianceBlock |

## 7. PixiJS components

| Component | Responsibility | Inputs | Outputs | Stage | Dependencies |
|---|---|---|---|---|---|
| PixiStage | Единственный canvas и lifecycle без ticker | frame, VisualState, theme, layout | transparent Pixi canvas | MVP-G | @pixi/react или controlled Pixi app |
| HeroWheel | Wheel body, sectors, labels/textures, deterministic rotation | wheel state, target segment, frame | wheel draw tree | MVP-G | WheelGeometry, WheelMotion |
| WheelGeometry | Вычислить sector paths, radii, label anchors | segment definitions, bounds | immutable geometry | MVP-G | pure math |
| WheelMotion | Аналитический angle для spin/slowdown/settle | frame, WheelCue | rotation angle | MVP-G | easing registry |
| WheelPointer | Pointer contact/bounce на segment settle | frame, wheel angle, settle cue | pointer sprite/vector | MVP-G | MotionAudioPack |
| BulbRing | Тёплые лампы с controlled chase pattern | frame, ring geometry, preset | bulb sprites | MVP-G | derived seed |
| StageLights | Световые cones/halos, подчинённые focal state | frame, semantic beat | light sprites/filters | MVP-G | ThemePack fx budget |
| FxLayer | Единый контейнер semantic effects | emphasis cues, frame | FX draw tree | MVP-G | FxPresetRegistry |
| SparkBurst | Локальный impact на positive/reveal | event seed, frame, magnitude | particles | MVP-G | deterministic particles |
| DangerPulse | Controlled vignette/pulse при угрозе | danger cue, frame | overlay filter/sprite | MVP-G | MotionAudioPack |
| ConfettiBurst | Только climax/reveal, не постоянный декор | reveal event seed, frame | confetti particles | MVP-G | deterministic particles |
| DenseSurvivorCloud | GPU-визуализация большой population | visible aggregate/sample | glyph sprites | MVP-C | AggregateBuilder |
| TextureRegistry | Предзагрузка и resolve texture по assetId | RenderManifest assets | loaded textures | MVP-G | AssetResolver |
| PixiSnapshotHarness | Рендер конкретного frame для visual test | manifest, frame | PNG/hash | MVP-G | PixiStage |

## 8. Motion и audio components

| Component | Responsibility | Inputs | Outputs | Stage | Dependencies |
|---|---|---|---|---|---|
| MotionPresetRegistry | Resolve semantic preset и easing | preset id | pure interpolation functions | MVP-G | MotionAudioPack |
| EnterExitAnimator | Применить frame-based enter/hold/exit | cue window, preset | opacity/transform/style | MVP-G | MotionPresetRegistry |
| NumberRoll | Анимировать разрешённое изменение числа без false precision | old/new visible values, frame | display value | MVP-G | CopyFormatter |
| ImpactResponse | Синхронный scale/light/shake на событие | EmphasisCue, frame | component transform | MVP-G | MotionAudioPack |
| AudioBus | Свести music, spin, impacts, UI, ambience | AudioCue[], frame | Remotion Audio tree | MVP-G | AssetResolver |
| AudioCueResolver | Дедупликация, frame offsets, gain/duck | active cues | resolved audio events | MVP-G | MotionAudioPack |
| MusicBed | Тension bed с loop/section points | audio cue, beat intensity | music track | MVP-G | AudioBus |
| LoudnessValidator | Проверить target LUFS/true peak после render | rendered audio | QA result | MVP-G | ffmpeg analysis |
| VoiceoverTrack | Опциональная VO дорожка и caption sync | narration asset/timing | audio + captions | POST | AudioBus |

## 9. Infrastructure, rendering и QA

| Component | Responsibility | Inputs | Outputs | Stage | Dependencies |
|---|---|---|---|---|---|
| AssetResolver | Resolve local assets, hashes и usage permissions | asset refs, profile | ResolvedAsset[] | MVP-G | AssetProvenance |
| AssetProvenanceValidator | Блокировать unknown/reference-only в public | asset manifest, profile | QA checks/errors | MVP-G | AssetResolver |
| FontLoader | Локально загрузить и дождаться fonts | font asset refs | ready promise/metrics | MVP-G | AssetResolver |
| ManifestBuilder | Связать artifact refs, packs, assets и output paths | hashes + registries | RenderManifest | MVP-G | ArtifactStore, PackRegistry |
| RenderProfileResolver | Draft/final/public encoding и effect limits | profile id | render settings | MVP-G | contracts |
| RenderRunner | Запустить Remotion render по manifest | manifest | MP4 + logs | MVP-G | Remotion CLI/API |
| PreviewRunner | Короткий low-res render/smoke | manifest, frame range | preview MP4 | MVP-G | RenderRunner |
| ContactSheetBuilder | Собрать hook/threat/peak/final и равномерные кадры | manifest, frame selectors | contact-sheet.jpg | MVP-G | frame renderer |
| FrameSelector | Выбрать диагностические frames из StoryPlan | beats/cues | frame list | MVP-G | StoryPlan |
| QaRunner | Агрегировать checks и выставить final status | artifacts, screenshots, video | QaReport | MVP-G | all QA checks |
| ContractQa | Schema, hashes, versions, refs | build artifacts | check results | MVP-G | schemas |
| DeterminismQa | Double-run и сравнение hashes/selected frames | spec | check results | MVP-G | pipeline |
| TemporalTruthQa | Future graph/milestone/reveal leaks | StoryPlan, simulation | check results | MVP-G | TemporalTruthGuard |
| LayoutQa | Safe zones, overflow, collision, tiny text | ResolvedLayout, frame boxes | check results | MVP-G | CollisionChecker |
| VisualQaChecklist | Человеческий review focal point/material/taste | contact sheet/video | signed checklist | MVP-G | casino reel design skill |
| AudioQa | Missing cues, clipping, loudness | audio output | check results | MVP-G | LoudnessValidator |
| RenderSmokeTest | 90–150 frame startup test | manifest | pass/fail | MVP-G | PreviewRunner |
| FixtureSuite | Контрактные specs всех обязательных форматов | fixture files | validate/compile report | MVP-C | pipeline |
| ReelCLI | Единая команда validate/simulate/compile/preview/render/batch/contact-sheet/doctor | command args | artifacts/status | MVP-G | public module APIs |
| BuildLogger | Structured logs с artifact/beat/frame context | pipeline events | JSON/text logs | MVP-G | no UI dependency |
| PerformanceProfiler | Frame time/memory и particle budgets | draft render | report | POST | renderer |

## 10. CLI component surface

Минимальные команды:

| Команда | Что вызывает | Успешный output |
|---|---|---|
| reel validate path | ReelSpecSchema, canonicalizer, pack refs | canonical spec + hash |
| reel simulate path | GameAdapter, invariant checker, store | simulation artifact |
| reel compile path | FormatRegistry, StoryCompiler, temporal QA | story-plan artifact |
| reel preview path | ManifestBuilder, PreviewRunner | preview.mp4 |
| reel render path | full pipeline, RenderRunner | final.mp4 |
| reel batch batch.json | batch coordinator, pipeline | per-run status report |
| reel contact-sheet buildId | FrameSelector, builder | contact-sheet.jpg |
| reel doctor | runtime/codec/WebGL/asset checks | environment report |

`qa` и `inspect` допустимы как служебные alias-команды, но не входят в обязательную публичную восьмёрку: QA автоматически запускается конвейером, а inspect может быть внутренним режимом ArtifactStore.

render может запускать пропущенные стадии, но никогда не перезаписывает существующий artifact с тем же id и другим hash.

## 11. Dependency map

~~~mermaid
flowchart TD
  CLI["ReelCLI"] --> SPEC["ReelSpecSchema + Canonicalizer"]
  SPEC --> FROZEN["Frozen ReelSpec"]
  FROZEN --> GAME["GameAdapter"]
  GAME --> SIM["SimulationResult"]
  SIM --> EVENTS["EventDetector + Scorer"]
  FROZEN --> FORMAT["FormatRegistry / Director"]
  EVENTS --> FORMAT
  FORMAT --> STORY["StoryCompiler"]
  STORY --> TRUTH["TemporalTruthGuard"]
  TRUTH --> PLAN["Frozen StoryPlan"]

  PLAN --> MANIFEST["ManifestBuilder"]
  LAYOUT["LayoutPack"] --> MANIFEST
  THEME["ThemePack"] --> MANIFEST
  MOTION["MotionAudioPack"] --> MANIFEST
  ASSETS["AssetResolver"] --> MANIFEST

  MANIFEST --> TIMELINE["Remotion StoryTimeline"]
  PLAN --> STATE["VisualStateResolver"]
  TIMELINE --> STATE
  STATE --> DOM["DOM/SVG Components"]
  STATE --> PIXI["Single PixiStage"]
  STATE --> AUDIO["AudioBus"]
  LAYOUT --> DOM
  THEME --> DOM
  LAYOUT --> PIXI
  THEME --> PIXI
  MOTION --> DOM
  MOTION --> PIXI
  MOTION --> AUDIO

  DOM --> FRAME["Composited Frame"]
  PIXI --> FRAME
  AUDIO --> VIDEO["Encoded MP4"]
  FRAME --> VIDEO
  VIDEO --> QA["QaRunner"]
  PLAN --> QA
  SIM --> QA
~~~

Запрещённые рёбра:

- DOM/Pixi → SimulationResult;
- ThemePack → GameAdapter;
- FormatDirector → ThemePack;
- GameAdapter → Remotion;
- Pixi ticker → timeline state;
- any component → future metric bypassing VisualStateResolver.

## 12. Format-to-component matrix

| Format | Kernel | Required shared components | New/format-specific component | MVP depth |
|---|---|---|---|---|
| survive-500 | single-run | HeroWheel, BankCard, RoundCard, BankrollGraph, callout, ResultCard | SurviveDirector | full animation |
| luckiest-player | single-run + population selection | all survive visuals, SelectionDisclosure | LuckiestPlayerDirector | compile scaffold |
| stop-or-continue | single-run | all survive visuals | DecisionCard, StopOrContinueDirector | compile scaffold |
| one-vs-ten | duel | HeroWheel, RoundCard, graph primitives | DuelHUD, DualBankrollGraph | compile scaffold |
| impossible-target | population | HeroWheel, milestone primitives, ResultCard | CandidateCounter, GoalLine | compile scaffold |
| last-man-standing | population | CandidateCounter, milestones, ResultCard | SurvivorField/DenseSurvivorCloud | compile scaffold |
| race-to-1000 | race | RoundCard, money formatting, result | RaceBars, RaceLeaderBadge | compile scaffold |
| comeback | single-run | survive visuals | ComebackDirector | post-MVP |
| curse | single-run | survive visuals | streak treatment | post-MVP |
| one-bet-only | single-run | HeroWheel, callout | tagged-outcome wait state | post-MVP |
| beat-the-odds | population | graph primitives, GoalLine | multi-trajectory field | post-MVP |

## 13. Golden survive-500 assembly

Golden scene должна использовать ровно этот минимальный путь:

    ReelComposition
      LayerStack
        StageBackdrop
        PixiStage
          StageLights
          HeroWheel
          WheelPointer
          BulbRing
          FxLayer
        MarqueeFrame
        ImpactTitle / SubhookPill
        PlayerCard + RoundCard + BankCard
        BankrollGraph + GraphMarker
        MilestoneStrip
        SuspenseCallout
        ResultCard
        ComplianceBlock
      AudioBus

Если компонент не входит в этот tree и не нужен contract fixtures, он не должен задерживать golden render.

## 14. Ownership rules

- Simulation components отвечают за факты.
- Story components отвечают за выбор и момент показа фактов.
- LayoutPack отвечает за место.
- ThemePack отвечает за внешний вид.
- MotionAudioPack отвечает за характер движения/звука.
- Visual components отвечают только за представление безопасного VisualState.
- QA components имеют read-only доступ и не “чинят” артефакты.

Любая задача, затрагивающая два ownership domain, разбивается на изменение контракта и независимые реализации.

## 15. Build checklist по компоненту

Компонент считается готовым, когда:

1. ответственность помещается в одно предложение;
2. публичные inputs/outputs типизированы;
3. нет запрещённых зависимостей;
4. empty/loading/error или not-applicable state определены;
5. есть fixture или unit test;
6. визуальный компонент имеет screenshot на ключевом frame;
7. frame-based motion детерминирован;
8. semantic colors приходят из ThemePack;
9. layout приходит из LayoutPack;
10. component указан в format matrix или явно помечен POST.

## 16. Сознательно отсутствующие компоненты

До отдельного решения не создавать:

- WebEditor;
- SkinMarketplace;
- CloudRenderQueue;
- UserAccount;
- DatabaseRepository;
- SocialPublisher;
- BrandAssetScraper;
- GenericThreeScene;
- второй PixiStage;
- all-purpose TimelineEditor;
- AI auto-director без проверяемого StoryPlan.

Их отсутствие — часть scope, а не пробел в inventory.
