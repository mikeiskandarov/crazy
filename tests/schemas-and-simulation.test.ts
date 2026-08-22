import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {FORMAT_KINDS} from '../src/contracts/reel-spec';
import {loadAuthorReelSpec} from '../src/contracts/reel-spec-loader';
import {verifyArtifactHash} from '../src/core/artifact';
import {ApproxGameAdapter} from '../src/game/approximate/adapter';
import {SeededPrng} from '../src/game/approximate/prng';
import {createPackRegistry} from '../src/packs/registry';

const fixturePaths = FORMAT_KINDS.map((kind) => path.resolve(`specs/examples/${kind}.json`));

describe('contracts and approximate-v0', () => {
  it('pins xoshiro128ss-v1 vectors', () => {
    const prng = new SeededPrng('golden-seed');
    expect(Array.from({length: 8}, () => prng.nextUint32())).toEqual([
      805_291_884,
      1_703_087_052,
      1_286_394_904,
      2_024_029_262,
      94_428_454,
      871_571_845,
      3_021_177_917,
      917_298_311,
    ]);
  });

  it('parses every fixture and resolves every pack', async () => {
    const registry = createPackRegistry();
    const kinds: string[] = [];
    for (const fixturePath of fixturePaths) {
      const spec = await loadAuthorReelSpec(fixturePath);
      expect(verifyArtifactHash(spec)).toBe(true);
      expect(registry.resolveLayout(spec.packs.layout.id, spec.packs.layout.version).id).toBe('vertical-show');
      expect(registry.resolveTheme(spec.packs.theme.id, spec.packs.theme.version).validate()).toEqual([]);
      expect(registry.resolveMotionAudio(spec.packs.motionAudio.id, spec.packs.motionAudio.version).id).toBe('tension-show');
      kinds.push(spec.format.kind);
    }
    expect(kinds).toEqual([...FORMAT_KINDS]);
  });

  it('simulates all four kernels deterministically and preserves shared streams', async () => {
    const adapter = new ApproxGameAdapter();
    for (const fixturePath of fixturePaths) {
      const spec = await loadAuthorReelSpec(fixturePath);
      const config = adapter.validateConfig(spec.game.config);
      const first = await adapter.simulate({spec, config});
      const second = await adapter.simulate({spec, config});
      expect(first.contentHash, spec.format.kind).toBe(second.contentHash);
      expect(first.invariants.failures).toBe(0);
      expect(first.model.modelVersion).toBe('approximate-v0');
      if (spec.format.kind === 'one-vs-ten') {
        expect(first.run.sharedOutcomeStream).toBe(true);
        expect(new Set(first.featuredRuns.map((run) => run.streamId)).size).toBe(1);
      }
      if (spec.format.kind === 'race-to-1000' && spec.format.sharedOutcomeStream) {
        expect(new Set(first.featuredRuns.map((run) => run.streamId)).size).toBe(1);
      }
      if (spec.format.kind === 'luckiest-player') {
        expect(first.population?.rankedCandidates[0]?.participantId).toBe(first.featuredRuns[0]?.participantId);
        expect(first.selectionAudit?.consideredCount).toBe(spec.format.populationSize);
      }
      if (first.population) {
        const counts = first.population.milestones.map((milestone) => milestone.aliveCount);
        expect(counts).toEqual([...counts].sort((left, right) => right - left));
      }
    }
  }, 120_000);
});
