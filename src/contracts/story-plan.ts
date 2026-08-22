import type {ArtifactEnvelope, ContentHash, Frame, MoneyMinor, RoundNumber} from './common';
import type {FormatKind, StoryKernel} from './reel-spec';

export type StoryBeatKind =
  | 'hook'
  | 'setup'
  | 'progress'
  | 'threat'
  | 'hope'
  | 'decision'
  | 'climax'
  | 'reveal'
  | 'outro';

export interface VisibilityWindow {
  visibleRoundFrom: RoundNumber;
  visibleThroughRound: RoundNumber;
  allowedMetricIds: string[];
  allowedRevealIds: string[];
  hiddenElementIds: string[];
}

export interface StoryBeat {
  beatId: string;
  kind: StoryBeatKind;
  startFrame: Frame;
  endFrameExclusive: Frame;
  focalElementId: string;
  intent: string;
  visibility: VisibilityWindow;
  layoutVariant: string;
  motionPresetId: string;
  audioCueIds: string[];
}

export interface TextCue {
  cueId: string;
  elementId: string;
  startFrame: Frame;
  endFrameExclusive: Frame;
  role: 'headline' | 'subhook' | 'callout' | 'caption' | 'result';
  text: string;
  semanticTone: 'neutral' | 'positive' | 'warning' | 'danger';
}

export interface CameraCue {
  cueId: string;
  startFrame: Frame;
  endFrameExclusive: Frame;
  presetId: string;
  targetElementId: string;
  intensityMilli: number;
}

export interface WheelCue {
  cueId: string;
  eventId: string;
  startFrame: Frame;
  settleFrame: Frame;
  targetSegmentId: string;
  totalTurnsMilli: number;
  easingId: string;
}

export interface EmphasisCue {
  cueId: string;
  elementId: string;
  frame: Frame;
  semanticEvent: 'gain' | 'loss' | 'danger' | 'elimination' | 'target' | 'reveal';
  magnitudeMilli: number;
}

export interface AudioCue {
  cueId: string;
  assetId: string;
  startFrame: Frame;
  endFrameExclusive?: Frame;
  role: 'music' | 'voice' | 'spin' | 'impact' | 'ui' | 'ambience';
  gainMilli: number;
  duckGroup?: string;
}

export interface StoryTracks {
  text: TextCue[];
  camera: CameraCue[];
  wheel: WheelCue[];
  emphasis: EmphasisCue[];
  audio: AudioCue[];
}

export interface MetricBinding {
  metricId: string;
  source:
    | {kind: 'participant-bankroll'; participantId: string}
    | {kind: 'alive-count'; populationId: string}
    | {kind: 'target-count'; populationId: string; thresholdMinor: MoneyMinor}
    | {kind: 'round'}
    | {kind: 'static'; valueMinor: number};
  presentation: 'money' | 'integer' | 'multiplier' | 'percentage';
  revealId?: string;
}

export interface RevealRule {
  revealId: string;
  earliestFrame: Frame;
  earliestRound?: RoundNumber;
  sourceEventId?: string;
}

export interface StoryCompileAudit {
  candidateEventIds: string[];
  selectedEventIds: string[];
  rejected: Array<{eventId: string; reason: string}>;
  futureDataCheck: 'passed';
  disclosureCheck: 'passed';
}

export interface StoryPlanV1 extends ArtifactEnvelope {
  schemaVersion: 'story-plan/1';
  reelSpecHash: ContentHash;
  simulationHash: ContentHash;
  format: {kind: FormatKind; version: string; kernel: StoryKernel};
  fps: 30;
  durationInFrames: Frame;
  beats: StoryBeat[];
  tracks: StoryTracks;
  metricBindings: MetricBinding[];
  revealRegistry: RevealRule[];
  compileAudit: StoryCompileAudit;
}
