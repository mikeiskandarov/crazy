# Scope и MVP: движок вертикальных casino-reels

Статус: исполнимая спецификация первого релиза.

## 1. Что строим

Локальную TypeScript-тулзу, которая по декларативному сценарию:

1. детерминированно симулирует последовательность раундов;
2. выбирает и упаковывает драматические события в историю;
3. собирает вертикальный ролик из переиспользуемых компонентов;
4. рендерит MP4 и диагностические артефакты;
5. позволяет менять игру, компоновку, визуальную тему и motion/audio независимо.

Это производственный каркас для серии роликов, а не единичный монтаж. Первая контрольная работа — формат **Can $100 survive 500 rounds?** в оригинальной carnival-night эстетике, вдохновлённой жанром live game show, но без копирования фирменных материалов Crazy Time.

## 2. Результат MVP

MVP считается полезным, если из одной команды и одного валидного ReelSpec получаются:

- 1080 × 1920 MP4, 30 fps, H.264, с корректной длительностью и звуком;
- полностью анимированный golden reel для формата **survive-500**;
- JSON-артефакты simulation, story plan и render manifest;
- contact sheet из ключевых кадров;
- отчёт автоматических проверок;
- воспроизводимый результат: одинаковый spec и seed дают одинаковые кадры.

Дополнительно в MVP должны существовать типизированные конфигурационные каркасы для:

- luckiest-player;
- stop-or-continue;
- one-vs-ten;
- impossible-target;
- last-man-standing;
- race-to-1000.

Эти шесть форматов не обязаны иметь собственную законченную режиссуру и уникальную анимацию в первой сборке. Их задача в MVP — доказать, что архитектура не зашита в один сюжет.

## 3. Главный принцип сокращения

Сначала создаётся один убедительный вертикальный срез:

    frozen ReelSpec
        → approximate simulation
        → StoryPlan
        → fully animated survive-500 composition
        → final render + QA

Все решения, не улучшающие этот путь или не предотвращающие архитектурный тупик, откладываются.

## 4. Что входит в MVP

### 4.1 Обязательная функциональность

- TypeScript-монорепозиторий или единый пакет с ясными модулями.
- Remotion как владелец timeline, composition, audio и render.
- React DOM/SVG для текста, HUD, графиков и точной типографики.
- Один PixiJS canvas для колеса, сцены, частиц и массовых объектов.
- Детерминированный PRNG; запрет Math.random, Date.now, requestAnimationFrame и автономного Pixi ticker в render-path.
- Версионированный ReelSpec, валидируемый до симуляции.
- ApproxGameAdapter с явно указанной моделью approximate-v0.
- BankrollEngine и базовые стратегии ставок.
- StoryCompiler с visibility horizon: кадр не может показать данные из будущего.
- FormatRegistry и четыре независимых контракта:
  - GameAdapter;
  - LayoutPack;
  - ThemePack;
  - MotionAudioPack.
- Draft и final render profiles.
- Asset manifest с источником и лицензией каждого внешнего ассета.
- CLI для validate, simulate, compile, preview, render, batch, contact-sheet и doctor; QA запускается конвейером и может иметь отдельную служебную команду.

### 4.2 Обязательный визуальный уровень

- Один ясный фокус в каждом story beat.
- Читаемость на физическом экране телефона без зума.
- Иерархия: hook → hero wheel/event → live state → supporting evidence.
- Материалы и свет выглядят намеренно: тёмный лак, тёплое золото, лампы, контролируемый цветовой акцент.
- Анимация объясняет состояние: anticipation, spin, slowdown, result, consequence.
- Конфетти, glow, shake и zoom используются только как реакция на событие.
- Числа и графики семантически окрашены: positive, warning, danger, neutral.
- Финал не раскрывается до соответствующего story beat.

### 4.3 Golden format: survive-500

Минимальный сюжет:

1. Hook: “Can $100 survive 500 rounds?”
2. Setup: стартовый банк, ставка, число симуляций или текущий игрок.
3. Early run: быстрые раунды и объяснение механики.
4. First threat: заметная просадка.
5. False hope или peak: краткое восстановление/максимум.
6. Final stretch: ускорение к 500-му раунду с высокой тревогой.
7. Reveal: итоговый bankroll и survival/failure.
8. End card: честная маркировка approximate simulation и seed/participant id.

Golden format обязан продемонстрировать:

- управляемое колесо с фазами spin/slowdown/settle;
- синхронное изменение BankCard и BankrollGraph;
- RoundCard;
- хотя бы один драматический callout;
- temporal truth на графике и статистике;
- финальный result state;
- базовый sound design.

## 5. Что явно не входит

- публичный сайт, аккаунты, база данных или cloud-render farm;
- drag-and-drop редактор и универсальная no-code UI;
- CMS, очередь публикаций и интеграции с соцсетями;
- точная реальная математика Crazy Time;
- автоматическая загрузка исторических данных;
- все десять сюжетов из референса в полном production-качестве;
- уникальная анимация для каждого формата;
- множество законченных скинов;
- 3D-пайплайн и обязательный Three.js;
- мобильное приложение;
- копирование логотипов, персонажей, UI, музыки или брендовых ассетов Crazy Time/Evolution.

## 6. Границы approximate math

До появления проверенной математики:

- каждый рендер хранит simulationModel: approximate-v0;
- вероятности и выплаты живут только внутри GameAdapter/config, не в визуальных компонентах;
- деньги хранятся целыми minor units, например cents;
- все результаты получают seed и modelVersion;
- публичный текст не утверждает, что это реальные шансы конкретной игры;
- замена ApproxGameAdapter на RealGameAdapter не требует менять StoryCompiler, форматы или UI.

Approximate-v0 нужна для разработки драматургии и визуальной системы, а не для статистических выводов.

## 7. Базовые продуктовые ограничения

| Ограничение | Решение MVP |
|---|---|
| Формат кадра | 1080 × 1920, safe zones задаются LayoutPack |
| Частота | 30 fps |
| Длительность | конфигурируемая; golden target 16 секунд, допустимо 14–18 |
| Вход | один ReelSpec JSON/TS + локальные assets |
| Выход | MP4, manifests, contact sheet, QA report |
| Среда | локальный Node.js/Remotion |
| Математика | approximate-v0, детерминированная |
| Браузерная графика | DOM/SVG + один Pixi canvas |
| Редактирование | код, конфиги и Remotion Studio |
| Темы | одна production-ready, остальные только контракт |

## 8. Артефакты одной сборки

Каждый run создаёт неизменяемую папку:

    output/{reelId}/{buildId}/
      run-manifest.json
      render-manifest.json
      input/reel-spec.json
      data/simulation.json
      data/story-plan.json
      preview/contact-sheet.jpg
      preview/keyframes/*.png
      video/draft.mp4
      video/final.mp4
      qa/report.json
      qa/ffprobe.json
      logs/pipeline.jsonl

RenderManifest обязан содержать хэши spec, simulation, story plan, theme и assets. Финальный MP4 без render/run manifests не считается воспроизводимым артефактом.

## 9. Definition of Done

### 9.1 Функциональный DoD

- Команда validate отвергает неизвестные версии, отсутствующие assets и некорректные деньги/раунды.
- Два запуска с одинаковым ReelSpec дают идентичные simulation/story hashes.
- Draft render проходит без сети и без runtime-randomness.
- Pixi-объекты зависят от absoluteFrame, а не от накопленного времени.
- График, раунд, банк и callouts согласованы на каждом контрольном кадре.
- Golden reel собирается на чистом checkout по документированной команде.

### 9.2 Визуальный DoD

- Hook читается за один стоп-кадр длительностью 0,5 секунды.
- Ключевой bankroll читается на ширине предпросмотра 360 px.
- Ни один важный элемент не пересекает safe zones.
- На пяти контрольных кадрах нет конкурирующих равносильных фокусов.
- Wheel result, HUD и audio cue совпадают по кадру.
- Финальный результат отсутствует во всех кадрах до reveal.
- Contact sheet выглядит как одна система, а не набор разных шаблонов.

### 9.3 Честность и provenance

- На ролике или end card есть понятная маркировка simulation/approximate model.
- Lucky/wildest выбор никогда не называется “случайным типичным игроком”.
- Все внешние assets имеют source, license и allowedUsage.
- Публичный theme не содержит защищённых логотипов или извлечённых игровых assets.

## 10. Порядок реализации MVP

1. **Contracts first** — схемы, validation, frozen artifacts, hashes.
2. **Golden still** — один безупречный кадр из реальных компонентов.
3. **Deterministic wheel** — spin/slowdown/settle по absoluteFrame.
4. **Single-run simulation** — bankroll path и события.
5. **Story compilation** — beats, visibility horizon, callouts.
6. **Golden motion** — полный survive-500 с audio.
7. **Derived configs** — каркасы шести обязательных форматов.
8. **Render and QA** — profiles, contact sheet, invariant checks.

Переход к следующему пункту разрешён только после сохранённого артефакта и короткой проверки предыдущего. Это уменьшает риск собрать сложную систему вокруг слабого визуального ядра.

## 11. Решения, которые нельзя тихо менять

Следующие изменения требуют отдельного architecture decision record:

- второй canvas или перенос HUD в Pixi;
- недетерминированная симуляция/анимация;
- смешивание game math с story/visual code;
- зависимость ThemePack от конкретной игры;
- добавление сайта, облака или редактора в MVP;
- публикация точного брендового клона;
- хранение только seed без полного SimulationResult.

## 12. Критерий перехода после MVP

Следующий этап начинается, когда golden reel прошёл DoD и новый формат можно собрать без изменения базовых visual primitives. Первый разумный пакет расширения:

1. luckiest-player;
2. stop-or-continue;
3. one-vs-ten;
4. impossible-target и last-man-standing;
5. race-to-1000.

Порядок отражает объём новой механики, а не маркетинговую ценность формата.
