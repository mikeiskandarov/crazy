# Handoff — Casino Reel Builder 0.1.1

Дата проверки: 2026-08-22. Репозиторий не инициализирован в git, поэтому run manifests честно помечены `unversioned`.

## Что сделано

- Реализованы versioned contracts и строгая Zod-валидация для ReelSpec, SimulationResult, StoryPlan, packs, VisualState, RenderManifest, QA и run manifest.
- Все semantic artifacts canonicalized, self-hashed, deep-frozen и записываются с защитой от несовместимого overwrite.
- Реализован `approximate-v0`: xoshiro128ss-v1, integer cents, half-away rounding, weighted outcomes, bankroll engine, семь стратегий, single/duel/population/race kernels, shared и independent streams.
- P0 `survive-500` считает 1,000 independent illustrative runs и честно показывает выбранного `participant-00763`: `SELECTED ILLUSTRATIVE RUN FROM 1,000`.
- Story compiler строит 480-frame canonical timeline; TemporalTruthGuard и VisualState режут trajectory, peak, milestones и final reveal по текущему frame/round.
- Wheel settle, pointer, linked outcome, HUD visibility и result cue синхронизированы на одном кадре и покрыты регрессионным тестом.
- Renderer использует Remotion, DOM/SVG для критических данных и ровно один Pixi WebGL canvas с `autoStart:false`, `sharedTicker:false` и ручным `app.render()`.
- Программно созданы оригинальные Carnival Night visuals и девять stereo 48 kHz WAV; три OFL-шрифта и все аудио имеют hashes, licenses и public/commercial provenance.
- Реализованы все CLI-команды из brief, failure-isolated batch, macOS Chrome/SwiftShader doctor, golden frames, downscales, contact sheets, full decode, ffprobe, EBU R128/true-peak analysis и двухпроходная final loudness normalization.
- Все семь форматов зарегистрированы. Шесть P1 используют shared primitives, но показывают собственные meaningful states: selection, decision, duel, population funnel, survivor field и race leaderboard.

## Как запустить

```bash
pnpm install --frozen-lockfile
pnpm assets:generate
pnpm reel doctor
pnpm check

pnpm reel render specs/examples/survive-500.json --profile draft
pnpm reel render specs/examples/survive-500.json --profile final
pnpm reel batch batches/all-formats-smoke.json --profile draft --jobs 2
```

Явный happy path также проверен:

```bash
pnpm reel validate specs/examples/survive-500.json
pnpm reel simulate specs/examples/survive-500.json
pnpm reel compile output/survive-500-demo/b-9893ffa67c23/data/simulation.json
pnpm reel contact-sheet output/survive-500-demo/b-9893ffa67c23
```

## Ключевые артефакты

Final build: `output/survive-500-demo/b-050b7893f9f1/`

- `video/final.mp4` — SHA-256 `cc216d48727e67d5d67b21ae3e3a363cc4e0090f543ed276b0914b0a97902d24`;
- `preview/contact-sheet.jpg`;
- `preview/contact-sheet.grayscale.jpg`;
- `preview/keyframes/*.png`, `*.360.png`, `*.270.png`;
- `qa/report.json`, `qa/ffprobe.json`, `qa/audio.json`, `qa/frame-sanity.json`;
- `qa/timeline-contact-sheet.jpg`, `qa/visual-review.json`;
- `run-manifest.json`, `render-manifest.json`, `logs/pipeline.jsonl`.

Draft build: `output/survive-500-demo/b-9893ffa67c23/`.

All-format report: `output/batches/all-formats-smoke/report.json`.

## Проверки

| Проверка | Результат |
| --- | --- |
| Чистая установка | `pnpm install --frozen-lockfile` passed после полного recreate `node_modules` |
| Generated assets | 12/12, hashes и provenance resolved |
| TypeScript | passed |
| ESLint | passed |
| Vitest | 3 files, 11 tests passed |
| Doctor | 9/9 passed, включая Chrome SwiftShader WebGL |
| All-format batch | 7/7 passed |
| Draft QA | 21/21 passed |
| Final QA | 21/21 passed, без failed checks |
| Temporal truth | все 480 frames passed |
| Golden determinism | повторный contact-sheet SHA-256 остался `d639f0c861abdc88464751611270e72a6061e315f32761f9ad24b2597d963b5d` |
| Final delivery | 1080×1920, H.264, yuv420p TV/BT.709, 30 CFR, 16.000 s, AAC stereo 48 kHz |
| Audio | −14.8 LUFS, −0.9 dBFS measured true peak |
| Manual visual review | APPROVED, 39/40, no Blocker/Major |

## Acceptance criteria

| # | Статус | Evidence |
| --- | --- | --- |
| 1 | implemented and verified | frozen-lock reinstall и doctor 9/9 |
| 2 | implemented and verified | explicit validate → simulate → compile → contact-sheet; draft/final render commands passed |
| 3 | implemented and verified | оба MP4, 7× master/360/270 golden frames, QA без Blocker/Major |
| 4 | implemented and verified | TemporalTruthGuard, VisualState slicing и all-480-frame QA |
| 5 | implemented and verified | repeat semantic hashes и exact repeated draft contact-sheet hash |
| 6 | implemented and verified | format registry 7/7 и batch 7/7 |
| 7 | implemented and verified | шесть P1 previews созданы и визуально проверены как scaffolds |
| 8 | implemented and verified | `$1 vs $10` shared stream assertion в tests и frozen simulation |
| 9 | implemented and verified | factual 10,000 / 5,000 / 1,000 sample sizes и selection audit/disclosures |
| 10 | implemented and verified | final ffprobe/decode contract 21/21 |
| 11 | implemented and verified | 12/12 known provenance; brand-collision gate passed |
| 12 | implemented and verified | этот handoff |

Нет feasible requirements со статусом `implemented but not fully verifiable` или `not implemented`.

## Осознанные ограничения и следующий шаг

- `approximate-v0` не является реальной математикой игры. Для verified math добавить новый `GameAdapter` в `src/game/` и зарегистрировать его в `src/game/registry.ts`; контракт `SimulationResultV1` сохраняется.
- Для historical content нужен отдельный replay adapter, который не делает probability claims.
- Шесть P1 — намеренно shared-primitives scaffolds, а не семь дорогих уникальных motion systems. Следующая продуктовая задача — выбрать один P1 и дать ему собственную polished motion grammar.
- Текущий doctor/render runner закреплён под локальный macOS Chrome path. Портирование browser discovery на Linux/Windows не входило в one-shot scope.
- Platform/jurisdiction-specific affiliate, geo и responsible-play тексты остаются конфигурируемыми placeholders до выбора площадки и юридической проверки.
