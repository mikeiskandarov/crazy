import {readdir} from 'node:fs/promises';
import path from 'node:path';
import type {DeepReadonly} from '../contracts/common';
import type {FormatKind, ReelSpecV1} from '../contracts/reel-spec';
import {pathExists, readJson} from '../core/files';
import {deriveSeed} from '../game/approximate/prng';

export const DEFAULT_ATTEMPT_NUMBER = 1;

export function parseAttemptNumber(value: string | number): number {
  const attempt = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(attempt) || attempt < 1 || attempt > 1_000_000) throw new Error(`Try number must be an integer from 1 to 1,000,000, received: ${value}`);
  return attempt;
}

export function attemptNumberFor(spec: Pick<ReelSpecV1, 'experiment'> | {experiment?: {attempt: number}}): number {
  return parseAttemptNumber(spec.experiment?.attempt ?? DEFAULT_ATTEMPT_NUMBER);
}

export function simulationSeedForAttempt(baseSeed: string, attempt: number): string {
  const normalizedAttempt = parseAttemptNumber(attempt);
  return normalizedAttempt === DEFAULT_ATTEMPT_NUMBER ? baseSeed : deriveSeed(baseSeed, `try:${normalizedAttempt}`);
}

export function simulationSeedForSpec(spec: Pick<ReelSpecV1, 'experiment' | 'game'> | {experiment?: {attempt: number}; game: {seed: string}}): string {
  return simulationSeedForAttempt(spec.game.seed, attemptNumberFor(spec));
}

export function formatFileStem(kind: FormatKind): string {
  return kind.replace(/[^a-z0-9]/g, '');
}

export function attemptVideoFileName(kind: FormatKind, attempt: number): string {
  return `${formatFileStem(kind)}-try${parseAttemptNumber(attempt)}.mp4`;
}

export async function nextAttemptNumber(input: {workspaceRoot: string; format: FormatKind}): Promise<number> {
  const outputRoot = path.join(input.workspaceRoot, 'output');
  let highest = 0;
  if (await pathExists(outputRoot)) {
    const reels = await readdir(outputRoot, {withFileTypes: true});
    for (const reel of reels) {
      if (!reel.isDirectory() || reel.name === 'batches') continue;
      const reelRoot = path.join(outputRoot, reel.name);
      const builds = await readdir(reelRoot, {withFileTypes: true});
      for (const build of builds) {
        if (!build.isDirectory()) continue;
        const specPath = path.join(reelRoot, build.name, 'input', 'reel-spec.json');
        if (!await pathExists(specPath)) continue;
        const spec = await readJson<DeepReadonly<ReelSpecV1>>(specPath);
        if (spec.format.kind === input.format) highest = Math.max(highest, attemptNumberFor(spec));
      }
    }
  }
  const acceptedRoot = path.join(input.workspaceRoot, 'final-videos', input.format);
  if (await pathExists(acceptedRoot)) {
    const accepted = await readdir(acceptedRoot, {withFileTypes: true});
    for (const entry of accepted) {
      if (!entry.isFile()) continue;
      const match = entry.name.match(/-try(\d+)\.(?:mp4|json)$/);
      if (match) highest = Math.max(highest, parseAttemptNumber(match[1]!));
    }
  }
  return highest + 1;
}
