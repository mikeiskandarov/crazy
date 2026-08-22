import type {ArtifactEnvelope, Frame, MoneyMinor, PackRef, RoundNumber, Seed, StrategyRef} from './common';

export const FORMAT_KINDS = [
  'survive-500',
  'luckiest-player',
  'stop-or-continue',
  'one-vs-ten',
  'impossible-target',
  'last-man-standing',
  'race-to-1000',
] as const;

export type FormatKind = (typeof FORMAT_KINDS)[number];
export type StoryKernel = 'single-run' | 'duel' | 'population' | 'race';
export type RankingMetric =
  | 'highest-final-bankroll'
  | 'highest-peak'
  | 'longest-survival'
  | 'largest-comeback';

export interface CommonFormatConfig {
  formatVersion: string;
  roundCount: number;
  startBankrollMinor: MoneyMinor;
  displayRoundMilestones: RoundNumber[];
}

export interface SurviveFormatConfig extends CommonFormatConfig {
  kind: 'survive-500';
  populationSize: number;
  betMinor: MoneyMinor;
  strategy: StrategyRef;
  selection:
    | {mode: 'fixed-run'; participantId: string}
    | {mode: 'median-ending'}
    | {mode: 'editorial-score'; scoreId: string}
    | {mode: 'ranking'; metric: RankingMetric};
}

export interface LuckiestPlayerFormatConfig extends CommonFormatConfig {
  kind: 'luckiest-player';
  populationSize: number;
  betMinor: MoneyMinor;
  strategy: StrategyRef;
  rankingMetric: RankingMetric;
  discloseSelection: true;
}

export interface StopOrContinueFormatConfig extends CommonFormatConfig {
  kind: 'stop-or-continue';
  betMinor: MoneyMinor;
  strategy: StrategyRef;
  decisionPoint:
    | {mode: 'first-peak-over'; thresholdMinor: MoneyMinor}
    | {mode: 'round'; round: RoundNumber}
    | {mode: 'editorial-event'; eventType: string};
  pauseFrames: Frame;
  revealAlternative?: boolean;
}

export interface OneVsTenFormatConfig extends CommonFormatConfig {
  kind: 'one-vs-ten';
  left: {label: string; betMinor: MoneyMinor; strategy: StrategyRef};
  right: {label: string; betMinor: MoneyMinor; strategy: StrategyRef};
  sharedOutcomeStream: true;
  finish: {mode: 'round-limit'};
}

export interface ImpossibleTargetFormatConfig extends CommonFormatConfig {
  kind: 'impossible-target';
  populationSize: number;
  betMinor: MoneyMinor;
  strategy: StrategyRef;
  targetMinor: MoneyMinor;
  targetMilestonesMinor: MoneyMinor[];
  stopWhenFirstTargetReached: boolean;
}

export interface LastManStandingFormatConfig extends CommonFormatConfig {
  kind: 'last-man-standing';
  populationSize: number;
  betMinor: MoneyMinor;
  strategy: StrategyRef;
  eliminationAtOrBelowMinor: MoneyMinor;
  stopAtSurvivors: number;
}

export interface RaceTo1000FormatConfig extends CommonFormatConfig {
  kind: 'race-to-1000';
  racerCount: number;
  targetMinor: MoneyMinor;
  racers: Array<{
    racerId: string;
    label: string;
    betMinor: MoneyMinor;
    strategy: StrategyRef;
  }>;
  sharedOutcomeStream: boolean;
}

export type FormatConfigV1 =
  | SurviveFormatConfig
  | LuckiestPlayerFormatConfig
  | StopOrContinueFormatConfig
  | OneVsTenFormatConfig
  | ImpossibleTargetFormatConfig
  | LastManStandingFormatConfig
  | RaceTo1000FormatConfig;

export interface AuthorReelSpecV1 {
  schemaVersion: 'reel-spec/1';
  reelId: string;
  locale: 'en-US' | 'ru-RU';
  currency: 'USD';
  format: FormatConfigV1;
  game: {
    adapterId: string;
    requestedModelVersion: string;
    seed: Seed;
    config: Record<string, unknown>;
  };
  editorial: {
    headline: string;
    subhook?: string;
    disclosure: string;
    selectionDisclosure?: string;
    tone: 'tension' | 'spectacle' | 'analytical';
  };
  compliance: {
    ageLabel?: string;
    modelDisclosure: string;
    responsiblePlay?: string;
    affiliateDisclosure?: string;
    geoRestriction?: string;
    noGuaranteeNotice?: string;
  };
  packs: {
    layout: PackRef;
    theme: PackRef;
    motionAudio: PackRef;
  };
  render: {
    profile: 'draft' | 'final' | 'public';
    fps: 30;
    targetDurationFrames?: Frame;
  };
}

export interface ReelSpecV1 extends AuthorReelSpecV1, ArtifactEnvelope {
  schemaVersion: 'reel-spec/1';
}
