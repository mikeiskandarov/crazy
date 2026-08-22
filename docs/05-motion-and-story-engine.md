# 05. Motion и story engine

## 1. Задача

Симуляция выдаёт сотни или тысячи раундов. Ролик должен превратить их в одну понятную историю за 14–18 секунд, не подделывая результат и не раскрывая будущее. Story engine не «монтажит красивые эффекты», а компилирует факты симуляции в семантические beats.

```text
SimulationResult
→ EventDetector
→ candidate events
→ StoryCompiler(format definition)
→ EventSelection + BeatBudgeter + CueCompiler
→ StoryPlanV1(beats + visibility + frame ranges + cues)
```

`StoryPlanV1` из `02-data-contracts.md` — единственный persisted результат. `EventSelection`, `BeatBudgeter` и `CueCompiler` — внутренние чистые фазы StoryCompiler, а не дополнительные межслойные DTO.

## 2. Абсолютное время и детерминизм

Каждое состояние вычисляется только из `absoluteFrame`, `fps` и замороженных данных.

Запрещены `Math.random()` во время render, `Date.now()`, `requestAnimationFrame()` как источник состояния, Pixi ticker, накопление `deltaTime` и физика, зависящая от порядка вызова кадров.

Разрешены seed-derived параметры, скомпилированные заранее: положение частицы, delay, rotation, lifespan. Кадр 437 должен выглядеть одинаково при одиночном запросе и при последовательном рендере.

## 3. Vocabulary beats

| Canonical beat | Что сообщает | Типичная визуальная доминанта |
|---|---|---|
| `hook` | вопрос и ставка эксперимента | impact title |
| `setup` | start bank, players, target, strategy | чистый HUD + wheel |
| `progress` | прошло много раундов или milestones | wheel speed + current count + graph trim |
| `threat` | near-death, резкое выбывание | bank/count в danger state |
| `hope` | recovery или новый peak | trajectory + restrained win accent |
| `decision` | stop или continue | freeze + two-choice card |
| `climax` | решающий spin, rare event или target approach | pointer/wheel/goal line |
| `reveal` | честный ответ на hook: bust, survival, target или winner | verdict + receipt |
| `outro` | маркировка модели/следующий вопрос | compact footer |

Новый формат сначала собирается из этих beats. Уникальная анимация добавляется только если существующий vocabulary не передаёт его центральную идею.

## 4. EventDetector

Detector проходит только по frozen `SimulationResult` и создаёт кандидатов:

```ts
type StoryEvent = {
  type: 'near_death' | 'recovery' | 'new_peak' | 'big_hit' |
        'mass_elimination' | 'leader_change' | 'bust' | 'target_hit';
  round: number;
  actorIds: string[];
  before: Record<string, number>;
  after: Record<string, number>;
  magnitude: number;
  rarityEstimate?: number;
};
```

Примерные правила `approximate-v0`:

- `near_death`: bankroll ≤ max(3 bets, 15% start bank);
- `recovery`: рост ≥ 2.5× от локального минимума в ограниченном окне;
- `new_peak`: новый максимум минимум на 20% выше предыдущего заметного peak;
- `big_hit`: net change ≥ 5 ставок;
- `mass_elimination`: убывание population на ≥15% между milestones;
- `leader_change`: смена лидера race с визуально значимым отрывом.

Порог хранится в format config и калибруется на batch, а не зашивается в UI.

## 5. StoryCompiler

Compiler выбирает минимальный набор событий, который отвечает на hook:

1. Зарезервировать `hook`, `setup`, `reveal`.
2. Отбросить кандидатов, слишком близких по времени/смыслу.
3. Оценить кандидаты по `magnitude`, `rarity`, visual variety и causal relevance.
4. Выбрать 2–4 средних beats с контрастом состояний.
5. Проверить, что причинный порядок сохранён.
6. Если драматичных событий нет, использовать честный `steady_decline`/`quiet_survival`, а не выдумывать comeback.
7. Скомпилировать `visibility` и frame ranges.

Ограничения:

- один ролик — одна основная дуга;
- не больше двух reversals;
- новый hook/CTA не появляется перед ответом на первый вопрос;
- финальная карточка держится не менее 0.9 секунды;
- число на экране не опережает соответствующий outcome.

## 6. Temporal truth: защита от спойлеров

У каждого beat есть `visibleThroughRound`. Любой компонент получает не полный результат, а projection:

```ts
const visible = projectAtRound(simulation, beat.visibleThroughRound);
```

Обязательные правила:

- график содержит только persisted points с `point.round <= visibleThroughRound`; необязательная стартовая точка round 0 создаётся отдельно в presentation projection;
- current round совпадает с раскрытым событием/milestone;
- survivor milestones появляются только после их прохождения;
- `peak` равен максимуму видимого диапазона;
- final bankroll, winner и target status скрыты до canonical beat `reveal`;
- callout не использует знание будущего (`THIS WILL SAVE THE RUN`) — только допустимое ожидание (`CAN THIS SAVE THE RUN?`).

Это исправляет главную проблему poster-референса: нельзя одновременно показывать `ROUND 327 / 500` и уже готовый график/число выживших после 500 раундов.

## 7. Motion grammar

Главная последовательность физического события:

```text
anticipation → action → deceleration → micro-pause → reveal → reaction → reset
```

Правила:

- **Anticipation:** 8–24 кадра, scale/lighting/riser, но результат ещё скрыт.
- **Action:** ясное физическое движение объекта; UI становится тише.
- **Deceleration:** wheel ticks становятся различимыми, blur уменьшается.
- **Micro-pause:** 4–10 кадров перед reveal; минимум частиц.
- **Reveal:** число/результат появляется за 6–12 кадров с одним overshoot.
- **Reaction:** 18–45 кадров света/частиц по величине события.
- **Reset:** быстрый возврат к чистому layout, без накопления мусора.

Каждый эффект должен иметь причину. Confetti только после подтверждённого сильного win/target; shake только на impact/bust; красный pulse только при реальном danger.

## 8. Golden timeline: `survive-500-v1`

Master duration: 16 секунд. В MVP тайминги компилируются в целые кадры строго под 30 fps. 60 fps — будущая новая версия render profile и StoryPlan, а не runtime-переключатель готового плана.

| Время | Beat | Картинка | Звук |
|---:|---|---|---|
| 0.00–0.70 | `hook` | `CAN $100 SURVIVE 500 ROUNDS?`, колесо появляется из темноты | impact + short reverse |
| 0.70–1.80 | `setup` | `$1/ROUND · APPROXIMATE MODEL`, банк `$100`, round `0/500` | 2–3 UI ticks |
| 1.80–4.60 | `progress` | колесо ускоряется, round jumps, graph только до current | rhythmic ticks, music lift |
| 4.60–6.30 | `threat` | выбранный near-death; банк становится доминантой | music duck + low pulse |
| 6.30–8.20 | `hope` или `climax` | замедление, micro-pause, подтверждённый hit | mechanical ticks + sting |
| 8.20–11.20 | `progress` | сжатый второй участок; peak обновляется по факту | beat resumes |
| 11.20–13.10 | `threat`/`hope` | recovery, new peak, second danger или честный steady state | event-specific cue |
| 13.10–14.70 | `reveal` | финал → `SURVIVED WITH $…` или `BUST AT ROUND …` | final impact |
| 14.70–16.00 | `outro` | receipt: start/bet/peak/final + `approximate-v0` | short resolve |

Это структура, а не заранее заданный сюжет. Compiler выбирает реальные события конкретного seed. Если run умер на 87-м раунде, он не притворяется 500-round survival.

## 9. Камера и глубина

Использовать три плоскости:

- `back`: stage plate, curtains, distant bulbs, медленный parallax;
- `hero`: wheel/goal/race bars;
- `front`: HUD, hook, callouts, foreground particles.

`CameraRig2D` имеет только presets `wide`, `hero`, `detail`, `result`. Максимальный push обычно 1.10–1.16×. Не делать постоянный handheld shake или бесконечный zoom. Переход чаще строится через изменение фокуса, света и масштаба, а не full-screen transition.

## 10. Числа и графики в движении

- Денежные значения tween-ить только между уже подтверждёнными состояниями.
- Крупный скачок можно показывать через `old → delta → new`, чтобы была ясна причина.
- Round counter может пропускать числа в fast mode, но на паузе совпадает с событием.
- График рисуется progressive reveal; будущий путь не показывается даже полупрозрачно.
- Race bars сохраняют identity/color; reorder занимает 12–20 кадров и не скрывает значения.
- Survivor count меняется синхронно с исчезновением glyphs и settle до точного числа.

## 11. Audio cue sheet

Sound не запускается из Pixi/Lottie. `StoryPlan` компилируется в единый cue sheet:

```ts
type AudioCue = {
  cueId: string;
  assetId: string;
  startFrame: number;
  endFrameExclusive?: number;
  role: 'music' | 'spin' | 'impact' | 'ui' | 'ambience';
  gainMilli: number;
  duckGroup?: string;
};
```

Если авторский audio pack задаёт gain/ducking в dB, CueCompiler один раз переводит его в нормативный integer `gainMilli`; renderer не получает второй вариант контракта.

MVP использует один royalty-cleared music bed и 6–8 SFX: hook impact, UI tick, wheel tick, riser, warning pulse, reveal, result, restrained celebration. Перед reveal музыка ducked на 3–6 dB, чтобы пауза ощущалась физически.

## 12. Story acceptance gate

StoryPlan принимается, если:

- hook получает однозначный ответ;
- каждый callout подтверждён frozen simulation;
- есть не более одного героя на beat;
- ни один компонент не видит будущие данные;
- сюжет работает и без звука;
- звук усиливает, но не создаёт отсутствующее событие;
- seed selection и `luckiest/out of N` честно маркированы;
- frame ranges не пересекаются непредусмотренно;
- повторный compile из тех же frozen inputs даёт тот же plan.
