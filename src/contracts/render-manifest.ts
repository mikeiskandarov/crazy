import type {ArtifactEnvelope, ArtifactRef, ContentHash} from './common';
import type {ResolvedPackRef} from './packs';

export interface AssetProvenance {
  provenanceId: string;
  sourceType: 'original' | 'generated' | 'licensed' | 'public-domain' | 'reference-only';
  sourceUri?: string;
  author?: string;
  license?: string;
  allowedUsage: Array<'internal' | 'public' | 'commercial'>;
  notes?: string;
}

export interface ResolvedAsset {
  assetId: string;
  path: string;
  sha256: ContentHash;
  mediaType: string;
  required: boolean;
  usage: 'render' | 'audio' | 'font';
  provenance: AssetProvenance;
}

export interface RenderManifestV1 extends ArtifactEnvelope {
  schemaVersion: 'render-manifest/1';
  refs: {reelSpec: ArtifactRef; simulation: ArtifactRef; storyPlan: ArtifactRef};
  packs: {layout: ResolvedPackRef; theme: ResolvedPackRef; motionAudio: ResolvedPackRef};
  composition: {id: string; width: number; height: number; fps: number; durationInFrames: number};
  assets: ResolvedAsset[];
  profile: 'draft' | 'final' | 'public';
  output: {directory: string; previewPath?: string; videoPath: string; contactSheetPath: string; qaReportPath: string};
}

export interface QaCheckResult {
  checkId: string;
  severity: 'info' | 'minor' | 'major' | 'blocker';
  status: 'passed' | 'failed' | 'skipped';
  frame?: number;
  beatId?: string;
  elementId?: string;
  message: string;
  suggestedFix?: string;
}

export interface QaReportV1 extends ArtifactEnvelope {
  schemaVersion: 'qa-report/1';
  renderManifestHash: ContentHash;
  status: 'passed' | 'passed-with-warnings' | 'failed';
  checks: QaCheckResult[];
  inspectedFrames: number[];
  contactSheetHash?: ContentHash;
}

export interface RunManifest {
  schemaVersion: 'run-manifest/1';
  buildId: string;
  reelId: string;
  createdAt: string;
  status: 'prepared' | 'simulated' | 'compiled' | 'rendered' | 'failed';
  versions: Record<string, string>;
  formatKind: string;
  themeId: string;
  seed: string;
  simulationModel: string;
  hashes: Partial<Record<'spec' | 'simulation' | 'story' | 'render', ContentHash>>;
  environment: Record<string, string>;
  delivery?: {
    profile: RenderManifestV1['profile'];
    width: number;
    height: number;
    fps: number;
    durationInFrames: number;
    videoCodec: 'h264';
    pixelFormat: 'yuv420p';
    colorSpace: 'bt709';
    audioCodec: 'aac';
    audioSampleRate: 48_000;
  };
  assets?: Array<{assetId: string; path: string; sha256: ContentHash; provenanceId: string; license: string; allowedUsage: string[]}>;
  selection?: {
    policyId: string;
    policyVersion: string;
    consideredCount: number;
    selectedParticipantIds: string[];
    disclosedAs: string;
  };
  artifacts: Record<string, {path: string; status: 'created' | 'existing' | 'skipped'}>;
  warnings: string[];
  qaStatus?: QaReportV1['status'];
}
