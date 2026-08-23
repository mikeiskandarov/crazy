# Handoff — Casino Reel Builder 0.1.2

Дата проверки: 2026-08-22. Релизные метаданны package, CLI producer и artifact provenance синхронизированы на `0.1.2`.

## Что сделано

- Реализованы versioned contracts и строгая Zod-валидация для ReelSpec, SimulationResult, StoryPlan, packs, VisualState, RenderManifest, QA и run manifest.
- Все semantic artifacts canonicalized, self-hashed, deep-frozen и записываются с защитой от несовместимого overwrite.
- Реализован `approximate-v0`: xoshiro128ss-v1, integer cents, half-away rounding, weighted outcomes, bankroll engine, семь стратегий, single/duel/population/race kernels, shared и independent streams.
- P0 `survive-500` считает 1,000 independent illustrative runs по preset `crazy-time-forecast-v1@1.0.0`, выбирает `participant-00107` и показывает фактические `$15,057 / 15000×`.
- Story compiler строит 540-frame canonical timeline; TemporalTruthGuard и VisualState скрывают result tiers, trajectory, peak и final reveal до разрешённого frame/round.
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

Internal review master: `output/survive-500-demo/b-30c3b4440d72/`

- `video/final.mp4` — SHA-256 `f584ab884a2a351811c60b7efe32431fafe82ef8a9b71b7cb6d6ada253a01e40`;
- `preview/contact-sheet.jpg`;
- `preview/contact-sheet.grayscale.jpg`;
- `preview/keyframes/*.png`, `*.360.png`, `*.270.png`;
- `qa/report.json`, `qa/ffprobe.json`, `qa/audio.json`, `qa/frame-sanity.json`;
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
| Vitest | 4 files, 17 tests passed |
| Doctor | Node/pnpm/lockfile/Chrome/FFmpeg/write-access passed; public asset gate и sandboxed WebGL ожидаемо blocked |
| All-format batch | 7/7 passed |
| Draft QA | 21/21 passed |
| Final QA | 19 passed; `asset-provenance` и `brand-collision` blocked external release |
| Temporal truth | все 540 frames passed |
| Contact sheet | SHA-256 `e93860864cd42d179a7e1d83b683bde3dbb64ad595332bec8ef1121507c8c97c` |
| Final delivery | 1080×1920, H.264, yuv420p TV/BT.709, 30 CFR, 18.000 s, AAC stereo 48 kHz |
| Audio | −14.3 LUFS, −1.3 dBFS measured true peak |
| Visual spot-check | result frame verified: `$15,057`, `15000×`, 7 rare and 2 very-lucky runs |

## Acceptance criteria

| # | Статус | Evidence |
| --- | --- | --- |
| 1 | implemented and verified | frozen-lock reinstall и doctor 9/9 |
| 2 | implemented and verified | explicit validate → simulate → compile → contact-sheet; draft/final render commands passed |
| 3 | implemented, internal only | final MP4 и 7× master/360/270 golden frames собраны; rights blockers остаются |
| 4 | implemented and verified | TemporalTruthGuard, VisualState slicing и all-540-frame QA |
| 5 | implemented and verified | repeat semantic hashes и exact repeated draft contact-sheet hash |
| 6 | implemented and verified | format registry 7/7 и batch 7/7 |
| 7 | implemented and verified | шесть P1 previews созданы и визуально проверены как scaffolds |
| 8 | implemented and verified | `$1 vs $10` shared stream assertion в tests и frozen simulation |
| 9 | implemented and verified | factual 10,000 / 5,000 / 1,000 sample sizes и selection audit/disclosures |
| 10 | implemented and verified | codec/dimensions/CFR/duration/audio/decode/frame-sanity passed |
| 11 | blocked for external release | provenance записан; Crazy Time logo, presenter reference и ElevenLabs Free assets требуют clearance/replacement |
| 12 | implemented and verified | этот handoff |

Технически release-ready; external publication намеренно не release-ready до очистки прав.

## Осознанные ограничения и следующий шаг

- `approximate-v0` и legacy `crazy-time-forecast-v1` не являются реальной математикой игры. Нормативная публичная реконструкция `crazy-time-global-reconstruction-v1@1.0.0` зафиксирована в `docs/12-game-model-forecasts.md`; чтобы сделать её executable, нужен отдельный causal `GameAdapter` в `src/game/` и регистрация в `src/game/registry.ts`. Даже после этого статус модели остаётся reconstructed, а не official PAR sheet; контракт `SimulationResultV1` сохраняется.
- Для historical content нужен отдельный replay adapter, который не делает probability claims.
- Шесть P1 — намеренно shared-primitives scaffolds, а не семь дорогих уникальных motion systems. Следующая продуктовая задача — выбрать один P1 и дать ему собственную polished motion grammar.
- Текущий doctor/render runner закреплён под локальный macOS Chrome path. Портирование browser discovery на Linux/Windows не входило в one-shot scope.
- Platform/jurisdiction-specific affiliate, geo и responsible-play тексты остаются конфигурируемыми placeholders до выбора площадки и юридической проверки.
