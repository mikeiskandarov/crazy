import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import type {RenderManifestV1} from '../src/contracts/render-manifest';
import {loadAuthorReelSpec} from '../src/contracts/reel-spec-loader';
import {acceptRenderedVideo} from '../src/delivery/accepted-video';
import {attemptVideoFileName, simulationSeedForAttempt, simulationSeedForSpec} from '../src/experiment/attempt';
import {ApproxGameAdapter} from '../src/game/approximate/adapter';

describe('experiment attempts and accepted videos', () => {
  it('reruns one mathematical model with a new deterministic random stream per try', async () => {
    const target = path.resolve('specs/examples/stop-or-continue.json');
    const tryOne = await loadAuthorReelSpec(target, {attempt: 1});
    const tryTwo = await loadAuthorReelSpec(target, {attempt: 2});
    const adapter = new ApproxGameAdapter();
    const first = await adapter.simulate({spec: tryOne, config: adapter.validateConfig(tryOne.game.config), simulationSeed: simulationSeedForSpec(tryOne)});
    const second = await adapter.simulate({spec: tryTwo, config: adapter.validateConfig(tryTwo.game.config), simulationSeed: simulationSeedForSpec(tryTwo)});
    const secondRepeat = await adapter.simulate({spec: tryTwo, config: adapter.validateConfig(tryTwo.game.config), simulationSeed: simulationSeedForSpec(tryTwo)});

    expect(first.model).toMatchObject({adapterId: second.model.adapterId, adapterVersion: second.model.adapterVersion, modelVersion: second.model.modelVersion, configHash: second.model.configHash});
    expect(first.model.seed).toBe(simulationSeedForAttempt(tryOne.game.seed, 1));
    expect(second.model.seed).toBe(simulationSeedForAttempt(tryTwo.game.seed, 2));
    expect(second.model.seed).not.toBe(first.model.seed);
    expect(second.contentHash).not.toBe(first.contentHash);
    expect(secondRepeat.contentHash).toBe(second.contentHash);
  });

  it('uses compact stable video names', () => {
    expect(attemptVideoFileName('survive-500', 1)).toBe('survive500-try1.mp4');
    expect(attemptVideoFileName('one-vs-ten', 237)).toBe('onevsten-try237.mp4');
  });

  it('accepts a final video once and refuses a conflicting overwrite', async () => {
    const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'accepted-reel-test-'));
    try {
      const spec = await loadAuthorReelSpec(path.resolve('specs/examples/stop-or-continue.json'), {profile: 'final', attempt: 3});
      const source = path.join(workspaceRoot, 'output', 'video', 'stoporcontinue-try3.mp4');
      const qaPath = path.join(workspaceRoot, 'output', 'qa', 'report.json');
      await Promise.all([mkdir(path.dirname(source), {recursive: true}), mkdir(path.dirname(qaPath), {recursive: true})]);
      await writeFile(source, 'approved-video-v1');
      await writeFile(qaPath, JSON.stringify({status: 'passed', contentHash: 'qa-hash'}));
      const manifest = {
        profile: 'final',
        contentHash: 'render-hash',
        refs: {simulation: {contentHash: 'simulation-hash'}},
        output: {
          videoPath: path.relative(workspaceRoot, source),
          qaReportPath: path.relative(workspaceRoot, qaPath),
        },
      } as unknown as RenderManifestV1;

      const first = await acceptRenderedVideo({workspaceRoot, buildId: 'b-test', spec, manifest});
      const second = await acceptRenderedVideo({workspaceRoot, buildId: 'b-test', spec, manifest});
      expect(first.status).toBe('accepted');
      expect(second.status).toBe('existing');
      expect(first.videoPath).toMatch(/final-videos\/stop-or-continue\/stoporcontinue-try3\.mp4$/);
      expect(JSON.parse(await readFile(first.receiptPath, 'utf8'))).toMatchObject({attempt: 3, model: {adapterId: spec.game.adapterId, version: spec.game.requestedModelVersion}});

      await writeFile(source, 'conflicting-video-v2');
      await expect(acceptRenderedVideo({workspaceRoot, buildId: 'b-test-2', spec, manifest})).rejects.toThrow(/Refusing to overwrite accepted video/);
    } finally {
      await rm(workspaceRoot, {recursive: true, force: true});
    }
  });
});
