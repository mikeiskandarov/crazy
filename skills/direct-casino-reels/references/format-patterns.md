# Format patterns

## Select a kernel before designing

Most story formats are skins over four reusable mechanics. Prefer configuration and new beats over a new rendering subsystem.

| Kernel | Required formats | Shared visual system |
|---|---|---|
| `single-run` | Base Survival, Luckiest Player, Stop or Continue | one wheel, one bankroll, one graph, event callouts |
| `duel` | $1 vs $10 | one shared outcome stream, two strategies/bankrolls, split HUD |
| `population` | Impossible Target, Last Man Standing | batch simulator, survivor/qualifier count, representative glyph field |
| `race` | Race to $1,000 | multiple bankrolls, rank changes, goal line, race bars |

## Base Survival

- Promise: `CAN $100 SURVIVE 500 ROUNDS?`
- Hero sequence: hook → wheel/progress → low-bank danger → real recovery/hit if present → final answer.
- Minimum data: start bank, bet, max rounds, current round, current bank, peak, outcomes.
- Allow an optional frozen `contextBatch` (for example, 1,000 runs) to provide survivor milestones and the pool from which the hero run was selected. Keep the hero story `single-run`; show aggregate counts only as a quiet evidence strip and disclose both selection policy and batch size.
- Never imply the hero wheel outcome happened to the whole batch. The wheel belongs to the labeled hero run; aggregate survivor counts come from independent runs.
- If the hook asks **how many** survive rather than whether one bankroll survives, route to the `population` kernel instead.
- Never show the final graph or survivor result before the relevant round.
- Use as the only fully bespoke animated format in the first vertical slice.

## Luckiest Player

- Promise: `WE SIMULATED 10,000 PLAYERS. THIS WAS #1.`
- Reuse `single-run`; select a run by explicit score, freeze its source batch, and label selection.
- Show `#1 / 10,000` early enough to prevent a representative-case interpretation.
- Hero moments: improbable recovery, largest hit, final receipt. Do not invent a lucky arc when the top result is merely steady.

## Stop or Continue

- Promise: `YOU'RE UP $347. WOULD YOU STOP?`
- Reuse `single-run`; locate a visible local peak and insert a `decision` beat.
- Freeze motion briefly, present two clean choices, then continue the already-frozen simulation.
- Do not imply the viewer's input changed the historical outcome unless an actual interactive version exists.

## $1 vs $10

- Promise: `SAME $100. DIFFERENT BETS. WHO LASTS LONGER?`
- Use one wheel and the exact same outcome sequence for both actors.
- Show two bankroll lines or compact mirrored HUDs; emphasize divergence after the same result.
- Keep actor colors stable and distinct from win/danger status colors.
- Final receipt states rounds survived, peak, and final bank for both.

## Impossible Target

- Promise: `CAN $1 BECOME $10,000?`
- Use `population`; show a candidate funnel such as `100,000 → 8,412 → 319 → 7 → ?`, but only from actual milestones.
- Hero is the shrinking qualified count, not thousands of individually simulated sprites.
- State the batch size, target, strategy, and approximate model.
- Reveal `0 reached it` honestly; never force a winner.

## Last Man Standing

- Promise: `1,000 PLAYERS START WITH $100. WHO SURVIVES?`
- Use `population`; declare whether actors have independent outcome streams or a shared stream.
- Combine exact count with representative glyphs and milestone elimination waves.
- The winner/last survivor is hidden until the simulation has reached that point.

## Race to $1,000

- Promise: `WHO CAN TURN $10 INTO $1,000 FIRST?`
- Use `race`; render only the top 5–10 rows and keep identity/color stable through reorders.
- Feature leader changes, busts, and goal crossing; do not animate every round at equal weight.
- If nobody reaches the target, answer with the closest final state.
- Treat as the most visually distinct required format and implement after the shared kernels.

## Backlog formats

- `The Comeback`, `The Curse`, and `One Bet Only` are presets over `single-run` plus different event selection/strategy.
- `Beat the Odds` is a `population` goal-line visualization.

Do not build unique engines for these until the seven required formats compile and validate.

## Adaptation test

Before creating a new component, answer:

1. Which kernel already owns the data flow?
2. Is the difference a strategy, selection rule, story beat, layout pack, or theme token?
3. Can an existing hero component express the idea with a new state?
4. Does the format have one unique visual moment worth bespoke motion?

Create a new subsystem only if none of those layers can represent the format without lying or destroying comprehension.
