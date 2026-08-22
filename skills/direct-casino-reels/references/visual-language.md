# Visual language

## Thesis

Build a compact premium live game show, not a generic casino collage. Combine one physical-feeling hero mechanism, restrained broadcast HUD, theatrical depth, and a single oversized result. Richness comes from hierarchy, material response, and event timing—not from filling empty space.

## Composition

- Use a 1080×1920 master and configurable platform safe areas.
- Reserve a conservative critical inset: left 56, top 160, right 150, bottom 310.
- Assign one focal hero per beat. Reduce competing layers by scale, opacity, blur, or removal.
- Use `HookZone`, `HeroZone`, `StoryZone`, `ResultZone`, and `ComplianceZone`; do not position important content ad hoc.
- Treat a dense poster reference as an inventory, not as the always-on motion layout.
- Make the silhouette recognizable at 25% size: hook, mechanism, main number.

## Original `Carnival Night` direction

- Atmosphere: nocturnal theatre, black lacquer, deep plum/oxblood, warm marquee bulbs, champagne highlights.
- Hero: an original data-driven wheel with a thick rim, authored segment geometry, physical pointer, and original center emblem.
- HUD: raised black-lacquer panels with thin warm-metal edges, consistent radius and padding.
- Status: green only for confirmed positive outcomes, amber for risk, red for bust/danger, violet for choice/unknown.
- Effects: brief glint, light sweep, dust, restrained coin/confetti; never a permanent glow storm.
- Depth: back stage plate, hero mechanism, front HUD/FX. Use a small set of camera presets.

Suggested semantic palette:

```ts
{
  stageVoid: '#07060B',
  stageOxblood: '#2B0814',
  stagePlum: '#2B0D4A',
  surface: '#0E0D12',
  surfaceRaised: '#17141C',
  gold: '#F7B51A',
  champagne: '#FFE7A3',
  textPrimary: '#F7F2EA',
  textMuted: '#AAA5AE',
  win: '#45D65E',
  warning: '#FFB21C',
  danger: '#FF4438',
  accentViolet: '#8E5CFF'
}
```

## Type

- Keep independent `display`, `impact`, `condensed`, and `ui` roles.
- Use local licensed fonts; enable tabular numerals for money, counts, and rounds.
- Keep hooks to two or three lines and subordinate labels to one line.
- Avoid copying brand lettering. Avoid AI-generated text.
- At 1080 px width, start near 88–136 px for hooks, 112–220 px for result numbers, 64–88 px for primary HUD numbers, and at least 24 px for required labels. Adjust optically, then verify at 270 px preview width.

## Materials

Limit the library to a few repeatable materials:

- black lacquer: near-black vertical gradient, tight reflected highlight, soft contact shadow;
- warm metal: multi-tone gold with a narrow specular highlight, never a flat yellow outline;
- velvet stage: low-frequency color gradient plus restrained grain;
- emissive bulb: warm core, small bloom, corresponding reflection.

Give each element at most one bevel, one contact shadow, and one controlled glow. Maintain a consistent light direction across wheel, panels, and title.

## Wheel credibility

- Generate segment geometry and labels from data.
- Keep rim thickness and pointer contact visible.
- Link tick cadence and pointer flex to wheel velocity.
- Remove motion blur before the answer is readable.
- Use a 4–10 frame micro-pause before reveal.
- Keep `$1 vs $10` on one shared wheel/outcome stream; the story is the bankroll difference, not two fake worlds.

## Data visuals

- Slice graphs to the current visibility horizon.
- Keep start line, current dot, and exact current value visible.
- Color trajectory by semantic state, not a decorative rainbow.
- Pair every population glyph field with an exact numeric count; clarify when glyphs are representative.
- Do not reveal final survivors, winner, target success, or full trajectory early.

## AI asset policy

Use generated assets for original empty stage plates, ornaments, surface textures, bokeh, and transparent particle variants. Ask for no typography, logos, branded hosts, recognizable studio, central wheel, or baked lighting that conflicts with compositing.

Build the final wheel, HUD, labels, graph, and numbers programmatically. Record asset ID, source/model, prompt or URL, date, license/permission, author, hash, and allowed use. Treat unknown provenance as draft-only.

## IP boundary

Borrow genre-level principles: physical wheel, carnival/live-show staging, semantic outcome colors, anticipation, deceleration, reveal, and celebration. Do not copy Crazy Time/Evolution logos, footage, hosts, bonus artwork, signature door, exact studio, audio, typography, or wheel art without permission. Public output must be recognizable as the original `Carnival Night` system, not an official game skin.

## Reject these patterns

- generic SaaS cards over a stock casino background;
- equal emphasis on hook, wheel, graph, survivor strip, and receipt;
- cheap cyberpunk neon on every edge;
- random glows, shake, lens flares, coins, and confetti unrelated to events;
- flat yellow borders pretending to be gold;
- future graph path or final counters visible during an earlier round;
- green styling on a clearly negative outcome;
- tiny labels that only work in a desktop screenshot;
- pixel-level imitation of a reference brand.

