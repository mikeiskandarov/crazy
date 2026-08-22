import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {FORMAT_KINDS} from '../src/contracts/reel-spec';
import {loadAuthorReelSpec} from '../src/contracts/reel-spec-loader';
import {ApproxGameAdapter} from '../src/game/approximate/adapter';
import {resolveVisualState} from '../src/render/visual-state';
import {createFormatRegistry} from '../src/story/format-registry';
import {assertTemporalTruth} from '../src/story/temporal-truth';

describe('StoryPlan and temporal truth', () => {
  it('compiles all registered formats deterministically', async () => {
    const adapter = new ApproxGameAdapter();
    const formats = createFormatRegistry();
    expect(formats.list()).toHaveLength(7);
    for (const kind of FORMAT_KINDS) {
      const spec = await loadAuthorReelSpec(path.resolve(`specs/examples/${kind}.json`));
      const simulation = await adapter.simulate({spec, config: adapter.validateConfig(spec.game.config)});
      const definition = formats.resolve(spec.format.kind, spec.format.formatVersion);
      const config = definition.validate(spec.format);
      const first = definition.compile({spec, simulation, config});
      const second = definition.compile({spec, simulation, config});
      expect(first.contentHash, kind).toBe(second.contentHash);
      expect(first.compileAudit.futureDataCheck).toBe('passed');
      expect(first.beats[0]?.kind).toBe('hook');
      expect(first.beats.some((beat) => beat.kind === 'reveal')).toBe(true);
      expect(first.beats.at(-1)?.kind).toBe('outro');
      assertTemporalTruth(first, simulation);
    }
  }, 120_000);

  it('never projects future trajectory or final result before reveal', async () => {
    const spec = await loadAuthorReelSpec(path.resolve('specs/examples/survive-500.json'));
    const adapter = new ApproxGameAdapter();
    const simulation = await adapter.simulate({spec, config: adapter.validateConfig(spec.game.config)});
    const definition = createFormatRegistry().resolve(spec.format.kind, spec.format.formatVersion);
    const story = definition.compile({spec, simulation, config: definition.validate(spec.format)});
    const revealFrame = story.revealRegistry.find((rule) => rule.revealId === 'final-result')!.earliestFrame;
    for (const frame of [0, 20, 54, 137, 188, 245, 335, revealFrame - 1]) {
      const state = resolveVisualState({frame, spec, simulation, story});
      expect(state.finalResult, `frame ${frame}`).toBeUndefined();
      for (const run of state.runs) {
        expect(run.points.every((point) => point.round <= state.currentRound), `frame ${frame}`).toBe(true);
        expect(run.visiblePeakMinor).toBe(run.points.reduce((peak, point) => Math.max(peak, point.bankrollAfterMinor), run.startBankrollMinor));
      }
      expect(state.populationMilestones.every((milestone) => milestone.round <= state.currentRound)).toBe(true);
      expect(state.targetThresholds).toEqual([]);
    }
    const revealed = resolveVisualState({frame: revealFrame, spec, simulation, story});
    expect(revealed.finalResult?.headline).toMatch(/BEST FINAL|BUSTED/);
    expect(revealed.runs[0]?.points.at(-1)?.round).toBeLessThanOrEqual(revealed.currentRound);
  });

  it('keeps selected-run disclosure factual and complete', async () => {
    const spec = await loadAuthorReelSpec(path.resolve('specs/examples/survive-500.json'));
    const adapter = new ApproxGameAdapter();
    const simulation = await adapter.simulate({spec, config: adapter.validateConfig(spec.game.config)});
    expect(simulation.selectionAudit).toMatchObject({
      consideredCount: 1000,
      disclosedAs: 'BEST FINAL BANKROLL ACROSS 1,000 ILLUSTRATIVE RUNS',
      selectedParticipantIds: [simulation.featuredRuns[0]!.participantId],
    });
    expect(simulation.population?.rankedCandidates[0]?.participantId).toBe(simulation.featuredRuns[0]!.participantId);
    expect(simulation.population?.rankedCandidates[0]?.scoreId).toBe('highest-final-bankroll');
  });

  it('keeps the survival verdict positive-realistic and highlights the biggest hit in the best run', async () => {
    const spec = await loadAuthorReelSpec(path.resolve('specs/examples/survive-500.json'));
    const adapter = new ApproxGameAdapter();
    const simulation = await adapter.simulate({spec, config: adapter.validateConfig(spec.game.config)});
    const finalMilestone = simulation.population?.milestones.at(-1);
    const selectedRun = simulation.featuredRuns[0]!;
    const eventIds = new Set(selectedRun.points.map((point) => point.outcomeEventId));
    const bestOutcome = simulation.outcomeStreams.flatMap((stream) => stream.events)
      .filter((event) => eventIds.has(event.eventId))
      .sort((left, right) => right.grossMultiplierBps - left.grossMultiplierBps)[0];
    expect(finalMilestone?.aliveCount).toBeGreaterThanOrEqual(600);
    expect(finalMilestone?.aliveCount).toBeLessThanOrEqual(700);
    expect(selectedRun.summary.finalBankrollMinor).toBe(106_200);
    expect(bestOutcome?.outcomeLabel).toBe('500×');
    expect(bestOutcome?.segmentId).toBe('f500');
  });

  it('settles every material wheel cue on its exact visible outcome', async () => {
    const spec = await loadAuthorReelSpec(path.resolve('specs/examples/survive-500.json'));
    const adapter = new ApproxGameAdapter();
    const simulation = await adapter.simulate({spec, config: adapter.validateConfig(spec.game.config)});
    const definition = createFormatRegistry().resolve(spec.format.kind, spec.format.formatVersion);
    const story = definition.compile({spec, simulation, config: definition.validate(spec.format)});
    const segments = resolveVisualState({frame: 0, spec, simulation, story}).wheel.segments;
    for (const cue of story.tracks.wheel) {
      const event = simulation.outcomeStreams.flatMap((stream) => stream.events).find((candidate) => candidate.eventId === cue.eventId)!;
      const before = resolveVisualState({frame: cue.settleFrame - 1, spec, simulation, story});
      const settled = resolveVisualState({frame: cue.settleFrame, spec, simulation, story});
      expect(before.wheel.spinning, cue.cueId).toBe(true);
      expect(settled.wheel.spinning, cue.cueId).toBe(false);
      expect(settled.currentRound, cue.cueId).toBeGreaterThanOrEqual(event.round);
      expect(settled.wheel.currentOutcome?.segmentId, cue.cueId).toBe(cue.targetSegmentId);
      const index = segments.findIndex((segment) => segment.segmentId === cue.targetSegmentId);
      const slice = Math.PI * 2 / segments.length;
      const pointerDelta = settled.wheel.rotationRadians + (index + .5) * slice + Math.PI / 2;
      const normalized = ((pointerDelta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      expect(Math.min(normalized, Math.PI * 2 - normalized), cue.cueId).toBeLessThan(1e-8);
    }
  });
});
