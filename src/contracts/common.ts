export type ArtifactId = string;
export type ContentHash = string;
export type Frame = number;
export type MoneyMinor = number;
export type RoundNumber = number;
export type Seed = string;
export type SemVer = string;

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T extends object
      ? {readonly [K in keyof T]: DeepReadonly<T[K]>}
      : T;

export interface ArtifactProvenance {
  producer: string;
  producerVersion: SemVer;
  parentHashes: ContentHash[];
}

export interface ArtifactEnvelope {
  schemaVersion: string;
  artifactId: ArtifactId;
  createdAt: string;
  contentHash: ContentHash;
  provenance: ArtifactProvenance;
}

export interface ArtifactRef {
  artifactId: string;
  path: string;
  contentHash: ContentHash;
  schemaVersion: string;
}

export interface PackRef {
  id: string;
  version: SemVer;
}

export interface StrategyRef {
  id: string;
  version: SemVer;
  config: Record<string, unknown>;
}

export interface ResolvedStrategyRef extends StrategyRef {
  configHash: ContentHash;
}
