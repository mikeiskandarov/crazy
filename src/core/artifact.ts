import type {ArtifactEnvelope, ArtifactProvenance, DeepReadonly} from '../contracts/common';
import {artifactContentHash} from './canonical-json';
import {deepFreeze} from './freeze-artifact';

export const PRODUCER = 'casino-reel-builder';
export const PRODUCER_VERSION = '0.1.2';

export function buildArtifact<T extends ArtifactEnvelope>(input: {
  artifactId: string;
  schemaVersion: T['schemaVersion'];
  payload: Omit<T, keyof ArtifactEnvelope>;
  parentHashes?: string[];
  createdAt?: string;
  provenance?: ArtifactProvenance;
}): DeepReadonly<T> {
  const draft = {
    ...input.payload,
    schemaVersion: input.schemaVersion,
    artifactId: input.artifactId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    contentHash: '',
    provenance: input.provenance ?? {
      producer: PRODUCER,
      producerVersion: PRODUCER_VERSION,
      parentHashes: input.parentHashes ?? [],
    },
  } as unknown as T;
  draft.contentHash = artifactContentHash(draft as unknown as Record<string, unknown>);
  return deepFreeze(draft);
}

export function verifyArtifactHash(artifact: DeepReadonly<ArtifactEnvelope>): boolean {
  return artifact.contentHash === artifactContentHash(artifact as unknown as Record<string, unknown>);
}
