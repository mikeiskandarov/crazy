# Render CLI и выходные артефакты

## Задача

CLI — единственная точка входа для проверки, симуляции, сборки истории и рендера. Он нужен не как будущий пользовательский редактор, а как воспроизводимый конвейер для Codex и локальной работы.

Поток данных фиксирован:

```text
ReelSpec
  -> SimulationResult
  -> StoryPlan
  -> RenderManifest
  -> кадры / MP4 / QA-отчёт
```

Каждый этап читает сохранённый артефакт предыдущего этапа. Это позволяет менять визуал без повторной симуляции, а математику — без переписывания композиции.

## Контракт команд

Предпочтительный интерфейс:

```bash
pnpm reel <command> [options]
```

Если в проекте выбран другой package manager, названия и семантика команд должны сохраниться.

### `validate`

Проверяет сценарий, тему, формат, ассеты и совместимость версий схем.

```bash
pnpm reel validate specs/examples/survive-500.json
```

Должен:

- разобрать вход через версионированные схемы;
- проверить существование `format.kind`, `packs.theme.id`, стратегии и render profile;
- проверить длительности, безопасные диапазоны ставок и обязательные подписи;
- запрещать неизвестные поля в production-конфигах;
- возвращать ненулевой exit code при ошибке и понятный путь до проблемного поля.

### `simulate`

Создаёт детерминированный `SimulationResult` и ничего не рендерит.

```bash
pnpm reel simulate specs/examples/survive-500.json --seed carnival-demo-001
```

Должен сохранять seed, версию approximate-модели, исходную конфигурацию стратегии, события по раундам и агрегаты. Повторный запуск с теми же входами в закреплённом окружении обязан давать тот же semantic payload и `contentHash`; `createdAt` может отличаться.

### `compile`

Превращает результат симуляции в `StoryPlan`: биты, временные окна, акценты, подписи и разрешённый горизонт данных.

```bash
pnpm reel compile output/<reel-id>/<build-id>/data/simulation.json
```

Компиляция не должна сама выбирать новые случайные события. Любой выбор интересного игрока или момента фиксируется в результате и объясняется в manifest.

### `preview`

Открывает локальный preview выбранной композиции или запускает быстрый draft-preview. Это интерфейс разработки, а не сайт и не редактор продукта.

```bash
pnpm reel preview specs/examples/survive-500.json
```

Preview обязан читать те же frozen-артефакты, что и финальный render. В нём не должно быть отдельной «примерной» логики.

### `render`

Рендерит один ролик по `RenderManifest` или по исходному spec с явным созданием промежуточных артефактов.

Если вход — author-draft spec, `--profile` применяется до canonicalization и становится частью сохранённого ReelSpec/hash. Для уже canonical spec override запрещён: нужно создать новый author draft/build.

```bash
pnpm reel render specs/examples/survive-500.json --profile draft
pnpm reel render output/<reel-id>/<build-id>/render-manifest.json
```

`--profile` допустим только при сборке нового manifest из spec. У существующего `RenderManifest` profile, размеры, FPS и output уже frozen; для другого profile CLI создаёт новый build/manifest, а не переопределяет старый.

Рекомендуемые профили:

| Profile | Размер | FPS | Назначение |
| --- | ---: | ---: | --- |
| `draft` | 540×960 | 30 | быстрая проверка движения |
| `final` | 1080×1920 | 30 | финальный вертикальный MP4 |
| `public` | 1080×1920 | 30 | final + provenance/compliance hard gates |

60 FPS можно добавить позже отдельным профилем. Это не условие MVP.

### `batch`

Рендерит набор заранее определённых spec-файлов.

```bash
pnpm reel batch batches/survive-500-smoke.json --profile draft --jobs 2
```

По умолчанию batch использует существующие `SimulationResult` и `StoryPlan`, если совпадают их hashes. Новая симуляция выполняется только при изменении входов или с явным `--resimulate`.

Ошибка одного элемента не должна скрывать остальные результаты. В конце создаётся общий отчёт со статусом каждого run.

### `contact-sheet`

Создаёт набор ключевых кадров и один лист для быстрого дизайн-ревью.

```bash
pnpm reel contact-sheet output/<reel-id>/<build-id>/render-manifest.json
```

Кадры выбираются по story beats, а не только через равный временной интервал: hook, постановка условия, первый spin, перелом, пик suspense, reveal, result.

### `doctor`

Проверяет локальное окружение до дорогостоящего рендера.

```bash
pnpm reel doctor
```

Минимальные проверки:

- поддерживаемая версия Node и package manager;
- lockfile установлен без расхождений;
- доступны Chromium/Remotion и FFmpeg/ffprobe;
- загружаются шрифты;
- GPU/WebGL имеет рабочий fallback;
- есть права на каталоги output/cache;
- обязательные ассеты находятся и проходят hash-проверку.

## Структура output

```text
output/<reel-id>/<build-id>/
  run-manifest.json
  render-manifest.json
  input/
    reel-spec.json
  data/
    simulation.json
    story-plan.json
  preview/
    contact-sheet.jpg
    keyframes/
      01-hook.png
      02-condition.png
      03-spin.png
      04-turn.png
      05-suspense.png
      06-reveal.png
      07-result.png
  video/
    draft.mp4
    final.mp4
  qa/
    report.json
    ffprobe.json
  logs/
    pipeline.jsonl
```

Не каждый запуск обязан создавать все файлы. Manifest должен явно перечислять созданные и пропущенные артефакты.

## Run manifest

`run-manifest.json` — журнал воспроизводимости, а не просто список файлов. Он содержит:

- `buildId`, `reelId`, `createdAt` и статус этапов;
- `specVersion`, `simulationVersion`, `storyCompilerVersion`, `rendererVersion`;
- `formatKind`, `themeId`, `seed`, `simulationModel: approximate-v0`;
- hashes входного spec, SimulationResult, StoryPlan и render manifest;
- commit SHA или отметку `dirty/unversioned`;
- версии Node, package manager, Remotion, PixiJS, FFmpeg и ОС;
- профиль рендера: размер, FPS, duration, codec, pixel format, audio settings;
- перечень ассетов с hash, источником, лицензией и разрешённым способом использования;
- warnings, QA gates и пути ко всем выходным файлам.

Время создания допустимо в manifest, но оно не должно влиять на симуляцию, StoryPlan или кадры.

## Правила детерминизма

- Никаких `Math.random()`, `Date.now()`, независимого Pixi ticker или анимации через wall clock в render path.
- Вся случайность проходит через seedable PRNG.
- Анимационное состояние — чистая функция absolute frame, FPS и frozen StoryPlan.
- Версии runtime и зависимостей закрепляются в lockfile и файле версии Node.
- В одном закреплённом окружении одинаковые входы должны давать одинаковый semantic payload/content hash и golden frames в оговорённом допуске. Metadata envelope может отличаться `createdAt`.
- Не требуется bit-identical MP4 на разных машинах: кодеки, GPU и FFmpeg могут менять бинарный поток. Проверяются содержание, длительность, потоки и ключевые кадры.

## Выходной MP4

Базовый контракт финального файла:

- 1080×1920, 9:16;
- constant frame rate 30 FPS;
- H.264, `yuv420p`;
- AAC, 48 kHz, если в ролике есть звук;
- длительность совпадает с manifest в пределах одного кадра;
- нет лишних потоков, rotation metadata и повреждённых кадров.

После render автоматически запускается ffprobe и сохраняет нормализованный отчёт. Публикация в соцсети, загрузка в облако и автопостинг в CLI не входят.

## Критерий готовности

Конвейер считается собранным, когда один spec можно последовательно провести через `validate -> simulate -> compile -> contact-sheet -> render`, получить traceable manifest, валидный MP4 и повторить результат из frozen-артефактов без скрытых решений в preview.
