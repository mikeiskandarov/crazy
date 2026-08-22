import path from 'node:path';
import type {DeepReadonly} from './common';
import type {AuthorReelSpecV1, ReelSpecV1} from './reel-spec';
import {parseAuthorReelSpec} from './schemas';
import {buildArtifact} from '../core/artifact';
import {readJson} from '../core/files';

export interface ReelSpecOverrides {
  profile?: 'draft' | 'final' | 'public';
  seed?: string;
}

export function canonicalizeReelSpec(input: unknown, overrides: ReelSpecOverrides = {}): DeepReadonly<ReelSpecV1> {
  const draft = structuredClone(input) as Record<string, unknown>;
  if (overrides.profile || overrides.seed) {
    const render = draft.render as Record<string, unknown> | undefined;
    const game = draft.game as Record<string, unknown> | undefined;
    if (overrides.profile && render) render.profile = overrides.profile;
    if (overrides.seed && game) game.seed = overrides.seed;
  }
  const parsed = parseAuthorReelSpec(draft);
  return buildArtifact<ReelSpecV1>({
    artifactId: `reel-spec-${parsed.reelId}`,
    schemaVersion: 'reel-spec/1',
    payload: parsed as Omit<ReelSpecV1, 'schemaVersion' | 'artifactId' | 'createdAt' | 'contentHash' | 'provenance'>,
  });
}

export async function loadAuthorReelSpec(target: string, overrides: ReelSpecOverrides = {}): Promise<DeepReadonly<ReelSpecV1>> {
  const resolved = path.resolve(target);
  return canonicalizeReelSpec(await readJson<AuthorReelSpecV1>(resolved), overrides);
}
