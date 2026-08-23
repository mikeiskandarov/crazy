import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {loadAuthorReelSpec} from '../src/contracts/reel-spec-loader';
import {verifyArtifactHash} from '../src/core/artifact';
import {HOST_CLIP_POOL, selectHostClip} from '../src/render/host-pool';
import {writeJsonStable} from '../src/core/files';
import {ApproxGameAdapter} from '../src/game/approximate/adapter';
import {buildRenderManifest} from '../src/render/manifest-builder';
import {createFormatRegistry} from '../src/story/format-registry';
import {simulationSeedForSpec} from '../src/experiment/attempt';

async function sourceFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, {withFileTypes: true});
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name) ? [target] : [];
  }));
  return nested.flat();
}

describe('architecture and frozen artifacts', () => {
  it('uses one fixed female presenter clip', () => {
    expect(HOST_CLIP_POOL).toEqual([{slot: 1, assetPath: 'assets/hosts/host-01.webm'}]);
    expect(selectHostClip()).toEqual(HOST_CLIP_POOL[0]);
  });
  it('keeps wall-clock and unseeded animation APIs out of game and render paths', async () => {
    const files = [...await sourceFiles(path.resolve('src/game')), ...await sourceFiles(path.resolve('src/render'))];
    const forbidden = [
      {label: 'Math.random', expression: /Math\s*\.\s*random\s*\(/},
      {label: 'Date.now', expression: /Date\s*\.\s*now\s*\(/},
      {label: 'requestAnimationFrame', expression: /requestAnimationFrame\s*\(/},
      {label: 'setInterval', expression: /setInterval\s*\(/},
      {label: 'Pixi ticker start', expression: /ticker\s*\.\s*start\s*\(/},
      {label: 'auto-started Pixi', expression: /autoStart\s*:\s*true/},
      {label: 'shared Pixi ticker', expression: /sharedTicker\s*:\s*true/},
    ];
    const failures: string[] = [];
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      for (const guard of forbidden) if (guard.expression.test(source)) failures.push(`${path.relative(process.cwd(), file)}: ${guard.label}`);
    }
    expect(failures).toEqual([]);
  });

  it('keeps simulation independent of React, Remotion, Pixi, story, and rendering', async () => {
    const files = await sourceFiles(path.resolve('src/game'));
    const failures: string[] = [];
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      if (/from\s+['"][^'"]*(?:react|remotion|pixi|\/render\/|\/story\/)/.test(source)) failures.push(path.relative(process.cwd(), file));
    }
    expect(failures).toEqual([]);
  });

  it('builds a deterministic, fully resolved render manifest', async () => {
    const spec = await loadAuthorReelSpec(path.resolve('specs/examples/survive-500.json'));
    const adapter = new ApproxGameAdapter();
    const simulation = await adapter.simulate({spec, config: adapter.validateConfig(spec.game.config), simulationSeed: simulationSeedForSpec(spec)});
    const format = createFormatRegistry().resolve(spec.format.kind, spec.format.formatVersion);
    const story = format.compile({spec, simulation, config: format.validate(spec.format)});
    const input = {workspaceRoot: process.cwd(), buildDirectoryRelative: 'output/test/build', spec, simulation, story};
    const first = await buildRenderManifest(input);
    const second = await buildRenderManifest(input);
    expect(first.contentHash).toBe(second.contentHash);
    expect(verifyArtifactHash(first)).toBe(true);
    expect(first.composition).toEqual({id: 'CasinoReel', width: 540, height: 960, fps: 30, durationInFrames: 540});
    expect(first.output.videoPath).toMatch(/video\/survive500-try1\.mp4$/);
    expect(first.assets).toHaveLength(19);
    expect(first.assets.every((asset) => asset.sha256.length === 64 && asset.provenance.allowedUsage.includes('internal'))).toBe(true);
  }, 120_000);

  it('refuses to overwrite an immutable artifact with different content', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'reel-artifact-test-'));
    const target = path.join(directory, 'artifact.json');
    try {
      await writeJsonStable(target, {schemaVersion: 'fixture/1', value: 1});
      await expect(writeJsonStable(target, {schemaVersion: 'fixture/1', value: 2})).rejects.toThrow(/Refusing to overwrite immutable artifact/);
    } finally {
      await rm(directory, {recursive: true, force: true});
    }
  });
});
