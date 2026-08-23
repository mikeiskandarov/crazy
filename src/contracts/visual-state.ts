import type {BankrollPoint, OutcomeEvent, PopulationMilestone, RunSummary, TargetThresholdSummary} from './simulation';
import type {StoryBeatKind, TextCue} from './story-plan';

export interface VisibleRunState {
  participantId: string;
  label: string;
  startBankrollMinor: number;
  currentBankrollMinor: number;
  visiblePeakMinor: number;
  points: BankrollPoint[];
  alive: boolean;
}

export interface VisibleWheelSegment {
  segmentId: string;
  label: string;
  eventClass: OutcomeEvent['eventClass'];
  intensity: OutcomeEvent['intensity'];
}

export interface VisibleWheelState {
  rotationRadians: number;
  angularVelocity: number;
  spinning: boolean;
  settling: boolean;
  pointerEngaged: boolean;
  mode: 'ambient' | 'verdict';
  currentOutcome?: OutcomeEvent;
  segments: VisibleWheelSegment[];
}

export interface SurvivalExperienceState {
  phase: 'hook' | 'batch' | 'distribution' | 'verdict' | 'result';
  phaseProgress: number;
  populationSize: number;
  processedCount: number;
  survivedCount: number;
  bustedCount: number;
  finalSurvivedCount: number;
  finalBustedCount: number;
  finalBands: Array<{label: string; count: number}>;
  selectedFinalBankrollMinor?: number;
  bestFinalOutcomeLabel?: string;
  resultCategories?: Array<{
    id: 'rare-lucky' | 'very-lucky' | 'best-of-population';
    label: string;
    rangeLabel: string;
    count?: number;
    amountMinor?: number;
  }>;
}

export interface FinalResultState {
  revealStartFrame: number;
  headline: string;
  tone: 'positive' | 'danger' | 'neutral' | 'warning';
  summaries: Array<{participantId: string; label: string; summary: RunSummary}>;
  proofLines: string[];
}

export interface VisualState {
  frame: number;
  activeBeatId: string;
  beatStartFrame: number;
  beatEndFrameExclusive: number;
  beatKind: StoryBeatKind;
  focalElementId: string;
  layoutVariant: string;
  currentRound: number;
  visibleThroughRound: number;
  headline?: TextCue;
  callouts: TextCue[];
  runs: VisibleRunState[];
  populationMilestones: PopulationMilestone[];
  targetThresholds: TargetThresholdSummary[];
  selectionDisclosure?: string;
  wheel: VisibleWheelState;
  survivalExperience?: SurvivalExperienceState;
  finalResult?: FinalResultState;
}
