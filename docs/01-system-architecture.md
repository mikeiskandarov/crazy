# Системная архитектура

Статус: нормативная архитектура MVP. Имена папок можно уточнять, границы ответственности — нельзя менять без ADR.

## 1. Архитектурная цель

Один и тот же замороженный ReelSpec должен:

- давать воспроизводимую симуляцию;
- компилироваться в историю без знания деталей рендера;
- рендериться с другой темой или layout без повторной симуляции;
- принимать другой GameAdapter без переписывания форматов;
- проверяться до дорогого final render.

Система строится как последовательность чистых преобразований с сохранением артефакта после каждого этапа.

## 2. Поток данных

    author config
      ↓ parse + schema validation
    Frozen<ReelSpec>
      ↓ GameAdapter.simulate()
    Frozen<SimulationResult>
      ↓ StoryCompiler.compile()
    Frozen<StoryPlan>
      ↓ ManifestBuilder.resolve()
    Frozen<RenderManifest>
      ↓ Remotion composition
    absoluteFrame → VisualState
      ↓ DOM/SVG + one Pixi canvas + Audio
    frames → MP4
      ↓ QA
    QaReport + ContactSheet

Ни один нижний слой не изменяет артефакт верхнего. Любая нормализация выполняется до freeze и отражается в hash.

## 3. Четыре независимых plug-in контракта

### 3.1 GameAdapter

Владеет только механикой игры и симуляцией:

- проверяет gameConfig;
- генерирует outcome stream из seed;
- применяет ставки и выплаты;
- создаёт полные player/batch trajectories;
- возвращает modelVersion и математические допущения.

Не знает о кадрах, шрифтах, цветах, stories и Remotion.

MVP implementation: ApproxGameAdapter с modelVersion approximate-v0.

### 3.2 LayoutPack

Владеет геометрией и responsive-правилами:

- semantic regions;
- safe zones;
- anchors и bounds;
- варианты compact/standard/split;
- допустимые размеры текста и hero object;
- правила столкновений.

Не содержит брендовые цвета, игровые вероятности или easing.

MVP implementation: VerticalShowLayout, 1080 × 1920.

### 3.3 ThemePack

Владеет визуальным языком:

- palette и semantic colors;
- typography roles;
- material tokens;
- borders, shadows, glow budgets;
- иконки, текстуры и asset references;
- Pixi material/fx presets.

Не задаёт позиции, длительности beats или payouts.

MVP implementation: CarnivalNight — оригинальная black/gold/wine/purple тема без брендовых assets.

### 3.4 MotionAudioPack

Владеет временным характером:

- duration tokens;
- easing/spring presets;
- transition recipes;
- camera motion;
- semantic response для win/loss/danger/reveal;
- audio cues, ducking и loudness targets.

Не выбирает story beats и не знает математику игры.

MVP implementation: TensionShow-v0.

## 4. Владение timeline и графикой

### 4.1 Remotion — единственный clock

Remotion владеет:

- composition registration;
- fps, duration и dimensions;
- absoluteFrame;
- монтажом StoryPlan beats;
- audio sequencing;
- render profiles;
- frame rendering и encoding.

Любая анимация вычисляется как функция:

    visualState = f(absoluteFrame, storyPlan, motionPack)

Запрещено:

- Date.now;
- Math.random;
- requestAnimationFrame;
- setInterval/setTimeout как источник визуального времени;
- Pixi Ticker в render-path;
- физика, зависящая от количества вызовов render.

### 4.2 DOM/SVG

DOM/SVG обязателен для:

- hook, captions, numeric HUD;
- cards и badges;
- axes, labels и bankroll lines;
- survivor milestones и result cards;
- compliance text.

Причина: предсказуемая типографика, доступный layout, простые snapshot-тесты и чёткий рендер текста.

### 4.3 Один PixiJS canvas

Один canvas используется для:

- HeroWheel;
- сценического света и глубины;
- bulbs;
- массовых survivor particles/avatars при большой плотности;
- конфетти, sparks и локальных GPU effects.

PixiStage получает absoluteFrame и готовое VisualState. Он не читает SimulationResult напрямую и не принимает story-решения.

Canvas имеет прозрачный фон и находится между StageBackdrop и DOM HUD. Второй canvas в MVP запрещён.

## 5. Предлагаемая структура кода

    src/
      contracts/
        reel-spec.ts
        simulation.ts
        story-plan.ts
        render-manifest.ts
        packs.ts
        schemas.ts
      core/
        freeze-artifact.ts
        content-hash.ts
        money.ts
        prng.ts
        invariant.ts
      game/
        game-adapter.ts
        approximate/
          adapter.ts
          outcome-table.ts
          bankroll-engine.ts
          strategies.ts
          batch-simulator.ts
      story/
        format-registry.ts
        story-compiler.ts
        event-detector.ts
        interestingness.ts
        temporal-truth.ts
        formats/
          survive-500.ts
          luckiest-player.ts
          stop-or-continue.ts
          one-vs-ten.ts
          impossible-target.ts
          last-man-standing.ts
          race-to-1000.ts
      layout/
        vertical-show/
          pack.ts
          regions.ts
          collision-checks.ts
      theme/
        carnival-night/
          pack.ts
          tokens.ts
          assets.ts
      motion/
        tension-show/
          pack.ts
          transitions.ts
          cues.ts
      render/
        Root.tsx
        ReelComposition.tsx
        StoryTimeline.tsx
        visual-state.ts
        dom/
        pixi/
        audio/
      qa/
        contract-checks.ts
        temporal-checks.ts
        layout-checks.ts
        contact-sheet.ts
        qa-report.ts
      cli/
        index.ts
        commands/
    specs/
      examples/
    assets/
      original/
      licensed/
    output/

Форматы регистрируются через FormatRegistry; прямые imports конкретного формата из generic render-компонентов запрещены.

## 6. Слои и разрешённые зависимости

| Слой | Может зависеть от | Не может зависеть от |
|---|---|---|
| contracts | ничего или Zod | React, Remotion, Pixi, конкретные packs |
| core | contracts | render, formats |
| game | contracts, core | story, layout, theme, motion, render |
| story | contracts, core | React, Pixi, конкретная theme |
| layout | contracts | game implementation, theme assets |
| theme | contracts, asset metadata | game, story compiler |
| motion | contracts | game implementation, React component tree |
| render | contracts + pack interfaces | approximate adapter internals |
| qa | contracts и read-only render metadata | мутация артефактов |
| cli | public APIs всех слоёв | приватные component internals |

Циклические зависимости считаются build error.

## 7. Pipeline по стадиям

### Stage A — Parse

Вход: JSON или TS object.

Действия:

1. schema parse;
2. defaults;
3. canonical ordering;
4. path normalization;
5. deep freeze;
6. content hash.

Выход: Frozen ReelSpec.

Ошибки содержат JSON path и человекочитаемое исправление.

### Stage B — Simulate

Вход: Frozen ReelSpec + выбранный GameAdapter.

Действия:

1. adapter compatibility check;
2. deterministic PRNG creation;
3. full outcome generation;
4. bankroll/batch processing;
5. invariant checks;
6. serialize + freeze + hash.

Выход: полный SimulationResult, не только seed.

Полный результат хранится потому, что изменение реализации PRNG или adapter не должно менять старый утверждённый render.

### Stage C — Compile story

Вход: ReelSpec + SimulationResult + FormatDefinition.

Действия:

1. EventDetector извлекает peaks, drawdowns, eliminations, streaks и targets;
2. format-specific selector выбирает события;
3. InterestingnessScorer ранжирует кандидатов;
4. StoryCompiler строит beats и shot tracks;
5. TemporalTruthGuard рассчитывает visibility horizon;
6. compile-time invariants проверяют длительность и reveal order.

Выход: StoryPlan, независимый от темы.

### Stage D — Resolve render

Вход: StoryPlan + ids четырёх packs.

Действия:

1. загрузить LayoutPack, ThemePack, MotionAudioPack;
2. проверить их версии и совместимость;
3. разрешить assets;
4. сформировать durationInFrames;
5. вычислить render hash.

Выход: RenderManifest.

### Stage E — Render

На каждом кадре:

1. Remotion передаёт absoluteFrame;
2. StoryTimeline находит активные beats;
3. VisualStateResolver вычисляет только видимые значения;
4. DOM/SVG рисует текст и данные;
5. PixiStage синхронно рисует wheel/stage/fx;
6. AudioBus получает frame-accurate cues.

### Stage F — QA

До final encode:

- schema and hash checks;
- temporal truth;
- semantic color checks;
- safe-zone and overflow checks;
- missing asset checks;
- selected frame snapshots;
- contact sheet.

Final encode блокируется только hard-fail проверками; warnings сохраняются в qa-report.

## 8. Temporal truth как системная гарантия

Temporal truth не является соглашением компонентов. Это отдельный слой.

StoryPlan для каждого beat содержит VisibilityWindow:

- roundStart/roundEnd;
- visibleThroughRound;
- allowedMetrics;
- revealIds;
- hiddenUntilFrame.

VisualStateResolver отдаёт компонентам уже обрезанные данные:

- BankrollGraph получает points только до visibleThroughRound;
- SurvivorField получает только достигнутые milestones;
- ResultCard не монтируется до reveal frame;
- Peak label появляется лишь после фактического достижения peak;
- callout не может процитировать будущий outcome.

Компонентам запрещено принимать полный SimulationResult. Исключение — QA-инструменты вне render tree.

Hard-fail примеры:

- RoundCard показывает 327, а график содержит point 500;
- milestone “alive after 500” виден на раунде 100;
- итоговый банк попал в accessibility tree до reveal;
- future peak используется для окраски текущего HUD.

## 9. Детерминированность Pixi и motion

### 9.1 Wheel

StoryPlan хранит:

- spinStartFrame;
- settleFrame;
- targetSegmentId;
- totalTurns;
- easingId.

Угол на кадре выводится аналитически. Нельзя интегрировать velocity между render-вызовами.

### 9.2 Particles

Для каждого eventId создаётся локальный derived seed. Позиция частицы в кадре вычисляется из:

- event seed;
- particle index;
- elapsed frames;
- MotionAudioPack preset.

### 9.3 Camera

CameraRig2D выдаёт transform по tracks в StoryPlan. Камера не должна менять DOM safe zones; крупные zoom применяются внутри hero region либо имеют заранее проверенный layout variant.

## 10. Кэш и идентичность

Ключи:

- specHash = hash(canonical ReelSpec);
- simulationHash = hash(specHash + adapter id/version + SimulationResult);
- storyHash = hash(specHash + simulationHash + format version + StoryPlan);
- renderHash = hash(storyHash + pack ids/versions + asset hashes + render profile);

Правила:

- изменение копирайта меняет specHash;
- изменение theme не требует повторной симуляции;
- изменение format selector требует новой story compilation;
- изменение encode bitrate не меняет storyHash, но меняет renderHash;
- hash и version записываются рядом с каждым артефактом.

## 11. Error model

Все публичные стадии возвращают Result либо бросают типизированную ошибку:

| Error | Когда | Severity |
|---|---|---|
| SpecValidationError | невалидный ReelSpec | hard |
| AdapterCompatibilityError | gameConfig не поддержан | hard |
| SimulationInvariantError | NaN, отрицательная ставка, broken trajectory | hard |
| StoryCompileError | невозможно собрать обязательные beats | hard |
| TemporalTruthError | future data leak | hard |
| AssetResolutionError | отсутствует required asset | hard |
| LayoutOverflowError | важный элемент вне safe area | hard в final |
| VisualQaWarning | слабый contrast/focus heuristic | warning |
| ProvenanceError | нет license/source | hard для public profile |

Ошибки всегда содержат artifact id, path/beat/frame и suggested fix.

## 12. Render profiles

### draft

- 540 × 960;
- 30 fps;
- быстрый codec;
- reduced particles;
- watermarked approximate;
- contact sheet включён.

### final

- 1080 × 1920;
- 30 fps;
- production bitrate;
- full particles;
- audio loudness pass;
- все hard checks обязательны.

### public

Расширяет final:

- provenance hard gate;
- compliance copy;
- запрет reference-only assets;
- brand collision review.

## 13. Test strategy

### Unit

- PRNG vectors;
- payout application;
- strategy decisions;
- event detection;
- temporal slicing;
- interpolation/easing;
- schema migrations.

### Contract

Каждый GameAdapter, LayoutPack, ThemePack и MotionAudioPack запускается против общего compatibility suite.

### Golden data

Фиксированные ReelSpec → ожидаемые hashes и выбранные story events. Обновление golden files требует осознанного review.

### Visual

- snapshots ключевых DOM/SVG компонентов;
- Pixi snapshots на фиксированных frames;
- full-frame screenshots для hook, threat, peak, final;
- contact sheet review на ширине 360 px.

### Render smoke

Короткая composition на 90–150 frames проверяет startup, fonts, assets, canvas и audio без полного encode.

## 14. Нефункциональные требования

- Сборка не требует сети после установки зависимостей и assets.
- Все шрифты локальны и загружаются до render.
- На module import нет side effects, влияющих на seed/time.
- Компоненты не читают process.env напрямую; конфиг проходит через manifest.
- Любой build можно восстановить из сохранённых артефактов и asset hashes.
- Draft contact sheet должен строиться быстрее полного final render.
- Пиковое потребление памяти контролируется числом batch trajectories; aggregate modes могут хранить sampled paths плюс проверяемые агрегаты.

## 15. Архитектурные проверки в CI/локальном check

- dependency boundary check;
- typecheck;
- schema examples parse;
- deterministic double-run;
- temporal truth fixtures;
- no forbidden clock/random APIs in src/render и src/game;
- missing asset/provenance scan;
- render smoke;
- component inventory coverage.

## 16. Extension points после MVP

Разрешённые:

- RealGameAdapter;
- новые FormatDefinition;
- новый ThemePack без изменения stories;
- горизонтальный/квадратный LayoutPack;
- альтернативный MotionAudioPack;
- дополнительные render profiles;
- Rive/Lottie как asset renderer внутри существующего слоя.

Не разрешается превращать extension point в скрытую связь: например, format не должен проверять themeId, а theme не должен содержать payouts.

## 17. Основание технологического выбора и лицензии

Решение проверено по первичным источникам 22 августа 2026 года:

- Remotion `renderMedia()` программно принимает composition, JSON props, codec и output path, поэтому подходит как внешний batch/timeline orchestrator: [официальная документация](https://www.remotion.dev/docs/renderer/render-media).
- PixiJS рекомендует WebGL для production, пока WebGPU ещё имеет browser-specific inconsistencies: [официальный renderer guide](https://pixijs.com/8.x/guides/components/renderers).
- Pixi Ticker основан на `requestAnimationFrame` и elapsed time, поэтому render-path сознательно управляет сценой от absolute frame и не запускает ticker: [официальный render-loop guide](https://pixijs.com/8.x/guides/concepts/render-loop).

Почему не другие основы:

- весь кадр в Pixi ухудшит типографику, layout и тестируемость;
- Three.js добавит стоимость 3D-арта и headless GPU QA раньше, чем это улучшит первый ролик;
- Rive/Lottie полезны как authored assets, но не должны владеть общим timeline;
- Motion Canvas можно пересмотреть, если лицензия Remotion станет ограничением, но текущий batch/API путь проще построить вокруг Remotion.

Remotion использует не MIT, а собственную лицензионную модель. На дату проверки free license заявлена для individuals и компаний до трёх человек; для компании от четырёх человек и разных режимов автоматизации действуют платные условия. Перед ростом команды, продажей самой тулзы, SaaS или большим batch-production обязательно повторно проверить [актуальную страницу License & Pricing](https://www.remotion.dev/docs/license/pricing) и LICENSE закреплённой версии. Это архитектурный/legal checkpoint, не блокер локального MVP.

FFmpeg для локального пайплайна не создаёт отдельной продуктовой задачи, но перед распространением собственного desktop/server binary нужно отдельно проверить выбранный build, codecs и [официальные legal notes FFmpeg](https://ffmpeg.org/legal.html); не считать все сборки FFmpeg одинаковыми по лицензии.
