# Review checklist

## Review setup

Inspect at least the hook-settled frame, setup, peak speed/progress, danger/elimination, pre-reveal, reveal/result, and final receipt/compliance state. Use a contact sheet when possible. Review once at full size, once at 270 px width, once in grayscale, and once with audio muted.

## Must-pass gates

Any failure below blocks approval:

- The first-frame promise is unreadable or ambiguous.
- More than one element competes as the primary hero.
- A graph, peak, survivor count, winner, or final value leaks future information.
- Copy claims real/exact game math when the source is approximate.
- A selected/cherry-picked run is presented as random, typical, or representative.
- Critical content falls in configured platform overlay/safe zones.
- Final assets have unknown rights or provenance.
- Protected logos, footage, hosts, signature artwork, audio, or close trade dress appear without permission.
- Status color/effect contradicts the result.
- The result does not answer the hook.

## Scored review

Score each item `0 = fail`, `1 = usable`, `2 = strong`.

### Comprehension

- Hook understood within roughly half a second.
- Primary number/result readable at 270 px width.
- Labels explain bet, round, players, and target.
- Story remains understandable muted.

### Composition

- One focal hero per reviewed frame.
- Clear hook, hero, story, result, and compliance zones.
- Optical balance survives right/bottom platform insets.
- Result state is calmer and clearer than progress.

### Art direction

- Materials share a believable light direction and surface language.
- Gold reads as metal rather than a yellow outline.
- Color communicates state consistently.
- Frame feels like an original live game show, not SaaS, stock casino, or a brand clone.

### Motion

- Wheel/action has anticipation, deceleration, micro-pause, and reveal.
- Effects are caused by real events and settle before the next beat.
- Counters, glyphs, graph, and audio agree on event timing.
- No real-time or runtime-random animation affects offline rendering.

### Truth and delivery

- Temporal visibility is correct at every sampled keyframe.
- Approximate model and selected-run labels are visible when required.
- Asset provenance and licenses are complete.
- Output meets size, fps, audio, and manifest requirements.

Passing target: every must-pass gate succeeds and the scored review reaches at least `32/40`. A score does not override a must-pass failure.

## Report format

Lead with `BLOCKED`, `NEEDS REVISION`, or `APPROVED`. For each defect include exact frame/component/state, consequence, component/token/timing fix, and priority (`blocker`, `major`, `polish`). End with the strongest preserved quality so revisions do not accidentally remove it.

