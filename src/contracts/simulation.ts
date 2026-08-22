import type {
  ArtifactEnvelope,
  ContentHash,
  MoneyMinor,
  ResolvedStrategyRef,
  RoundNumber,
  Seed,
  SemVer,
} from './common';
import type {RankingMetric} from './reel-spec';

export interface ModelAssumption {
  id: string;
  label: string;
  detail: string;
  material: boolean;
}

export interface OutcomeEvent {
  eventId: string;
  round: RoundNumber;
  outcomeId: string;
  outcomeLabel: string;
  segmentId: string;
  grossMultiplierBps: number;
  eventClass: 'loss' | 'refund' | 'win' | 'feature';
  intensity: 0 | 1 | 2 | 3;
  tags: string[];
  sourceRoll: number;
}

export interface OutcomeStream {
  streamId: string;
  events: OutcomeEvent[];
}

export interface BankrollPoint {
  round: RoundNumber;
  bankrollBeforeMinor: MoneyMinor;
  stakeMinor: MoneyMinor;
  bankrollAfterMinor: MoneyMinor;
  netChangeMinor: MoneyMinor;
  outcomeEventId: string;
  alive: boolean;
  tags: string[];
}

export interface RunSummary {
  finalBankrollMinor: MoneyMinor;
  peakBankrollMinor: MoneyMinor;
  peakRound: RoundNumber;
  maxDrawdownMinor: MoneyMinor;
  bankruptcyRound?: RoundNumber;
  longestLossStreak: number;
  targetReachedRound?: RoundNumber;
}

export interface ParticipantRun {
  participantId: string;
  label: string;
  streamId: string;
  strategy: ResolvedStrategyRef;
  startBankrollMinor: MoneyMinor;
  points: BankrollPoint[];
  summary: RunSummary;
}

export interface PopulationParticipantIndexEntry {
  participantId: string;
  storageMode: 'inline' | 'chunked' | 'aggregate-only';
  featuredRunParticipantId?: string;
  chunkId?: string;
  chunkOrdinal?: number;
  summaryHash: ContentHash;
}

export interface PopulationMilestone {
  round: RoundNumber;
  aliveCount: number;
  targetReachedCount: number;
  bankrollBands: Array<{fromMinor: MoneyMinor; toMinor?: MoneyMinor; count: number}>;
}

export interface TargetThresholdSummary {
  thresholdMinor: MoneyMinor;
  everReachedCount: number;
  firstReachedRound?: RoundNumber;
}

export interface RankedCandidate {
  participantId: string;
  rank: number;
  scoreId: string;
  scoreMilli: number;
  reasonCodes: string[];
}

export interface PopulationResult {
  populationId: string;
  size: number;
  milestones: PopulationMilestone[];
  targetThresholds: TargetThresholdSummary[];
  selectedParticipantIds: string[];
  rankedCandidates: RankedCandidate[];
  participantIndex: PopulationParticipantIndexEntry[];
  storage: {mode: 'inline' | 'chunked'; rawParticipantCount: number};
}

export interface SelectionAudit {
  policyId: string;
  policyVersion: SemVer;
  consideredCount: number;
  selectedParticipantIds: string[];
  rankingMetric?: RankingMetric;
  scoreId?: string;
  disclosedAs: string;
}

export interface SimulationChunkRef {
  chunkId: string;
  path: string;
  sha256: ContentHash;
  participantIdFrom: string;
  participantIdTo: string;
  participantCount: number;
  encoding: 'jsonl-gzip' | 'msgpack';
}

export interface SimulationInvariantSummary {
  checked: number;
  failures: number;
  checkIds: string[];
}

export interface SimulationResultV1 extends ArtifactEnvelope {
  schemaVersion: 'simulation-result/1';
  reelSpecHash: ContentHash;
  model: {
    adapterId: string;
    adapterVersion: SemVer;
    modelVersion: string;
    modelLabel: string;
    configHash: ContentHash;
    seed: Seed;
    assumptions: ModelAssumption[];
  };
  run: {
    roundCount: number;
    populationSize: number;
    sharedOutcomeStream: boolean;
  };
  outcomeStreams: OutcomeStream[];
  featuredRuns: ParticipantRun[];
  population?: PopulationResult;
  selectionAudit?: SelectionAudit;
  chunks?: SimulationChunkRef[];
  invariants: SimulationInvariantSummary;
}
