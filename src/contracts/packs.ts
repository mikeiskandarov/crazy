import type {ContentHash, Frame, PackRef, SemVer} from './common';

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LayoutRegion {
  regionId: string;
  purpose: 'hook' | 'hero' | 'hud' | 'evidence' | 'footer' | 'overlay';
  normalizedBounds: {x: number; y: number; width: number; height: number};
  safeInsets: SafeAreaInsets;
  zLayer: number;
}

export interface ResolvedLayout {
  width: number;
  height: number;
  variantId: string;
  regions: Record<string, {x: number; y: number; width: number; height: number; zLayer: number}>;
  criticalInsets: SafeAreaInsets;
}

export interface LayoutIssue {
  issueId: string;
  severity: 'minor' | 'major' | 'blocker';
  message: string;
}

export interface ContentMetrics {
  headlineLength: number;
  primaryDigits: number;
}

export interface LayoutPack {
  readonly id: string;
  readonly version: SemVer;
  readonly supportedAspectRatios: string[];
  readonly regions: Record<string, LayoutRegion>;
  readonly variants: Record<string, {id: string; description: string}>;
  resolve(input: {width: number; height: number; variantId: string; contentMetrics: ContentMetrics}): ResolvedLayout;
  validate(layout: ResolvedLayout): LayoutIssue[];
}

export interface SemanticColorTokens {
  background: string;
  stageOxblood: string;
  stagePlum: string;
  surface: string;
  surfaceRaised: string;
  textPrimary: string;
  textSecondary: string;
  positive: string;
  warning: string;
  danger: string;
  neutral: string;
  gold: string;
  champagne: string;
  accentViolet: string;
}

export interface ThemeAssetRef {
  assetId: string;
  path: string;
  sha256: ContentHash;
  role: string;
  provenanceId: string;
}

export interface ThemePack {
  readonly id: string;
  readonly version: SemVer;
  readonly tokens: {
    color: SemanticColorTokens;
    typography: {display: string; impact: string; condensed: string; ui: string};
    material: Record<string, string | number>;
    stroke: Record<string, string | number>;
    shadow: Record<string, string | number>;
    fx: Record<string, string | number>;
  };
  readonly assets: ThemeAssetRef[];
  validate(): Array<{issueId: string; severity: 'minor' | 'major' | 'blocker'; message: string}>;
}

export interface MotionAudioPack {
  readonly id: string;
  readonly version: SemVer;
  readonly durations: Record<string, Frame>;
  readonly easings: Record<string, {id: string; controlPoints: [number, number, number, number]}>;
  readonly motionPresets: Record<string, {id: string; description: string}>;
  readonly audioCues: Record<string, {assetId: string; role: string; gainMilli: number}>;
  readonly loudness: {targetLufs: number; truePeakDb: number};
}

export interface ResolvedPackRef extends PackRef {
  contentHash: ContentHash;
}
