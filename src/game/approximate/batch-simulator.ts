import type {DeepReadonly, StrategyRef} from '../../contracts/common';
import type {
  ParticipantRun,
  PopulationMilestone,
  PopulationParticipantIndexEntry,
  PopulationResult,
  RankedCandidate,
  RunSummary,
  SelectionAudit,
  TargetThresholdSummary,
} from '../../contracts/simulation';
import type {RankingMetric, SurviveFormatConfig} from '../../contracts/reel-spec';
import {contentHash} from '../../core/canonical-json';
import {settleRun} from './bankroll-engine';
import type {ApproxGameConfig} from './outcome-table';
import {generateOutcomeStream} from './outcome-table';
import {deriveSeed} from './prng';

interface CandidateRecord {
  participantId: string;
  seed: string;
  summary: RunSummary;
  roundsPlayed: number;
  minimumBankrollMinor: number;
  largestComebackMinor: number;
  summaryHash: string;
  scoreMilli: number;
  reasonCodes: string[];
}

export interface PopulationSimulationResult {
  featuredRun: ParticipantRun;
  featuredStream: ReturnType<typeof generateOutcomeStream>;
  population: PopulationResult;
  selectionAudit: SelectionAudit;
}

function bankrollAtRound(run: ParticipantRun, round: number): number {
  if (round <= 0) return run.startBankrollMinor;
  const point = run.points[Math.min(round, run.points.length) - 1];
  return point?.bankrollAfterMinor ?? run.startBankrollMinor;
}

function scoreForMetric(record: CandidateRecord, metric: RankingMetric): number {
  if (metric === 'highest-final-bankroll') return record.summary.finalBankrollMinor;
  if (metric === 'highest-peak') return record.summary.peakBankrollMinor;
  if (metric === 'longest-survival') return record.roundsPlayed * 100_000 + record.summary.finalBankrollMinor;
  return record.largestComebackMinor;
}

function editorialScore(record: CandidateRecord, roundCount: number): number {
  const survived = record.roundsPlayed >= roundCount && record.summary.bankruptcyRound === undefined;
  return (survived ? 5_000_000 : 0)
    + record.largestComebackMinor * 100
    + record.summary.maxDrawdownMinor * 18
    + record.summary.peakBankrollMinor * 4
    + record.roundsPlayed * 250;
}

function selectionLabel(input: {
  populationSize: number;
  selection: PopulationSelection;
  explicitDisclosure?: string;
}): string {
  if (input.explicitDisclosure) return input.explicitDisclosure.toUpperCase();
  const count = input.populationSize.toLocaleString('en-US');
  if (input.selection.mode === 'ranking') {
    const labels: Record<RankingMetric, string> = {
      'highest-final-bankroll': 'HIGHEST FINAL BANKROLL',
      'highest-peak': 'HIGHEST PEAK',
      'longest-survival': 'LONGEST SURVIVAL',
      'largest-comeback': 'LARGEST COMEBACK',
    };
    return `${labels[input.selection.metric]} OUT OF ${count} ILLUSTRATIVE RUNS`;
  }
  if (input.selection.mode === 'fixed-run') return 'ONE SEEDED ILLUSTRATIVE RUN';
  if (input.selection.mode === 'median-ending') return `MEDIAN ENDING FROM ${count} ILLUSTRATIVE RUNS`;
  if (input.selection.mode === 'closest-to-target') return `CLOSEST RUN FROM ${count} INDEPENDENT ILLUSTRATIVE RUNS`;
  return `SELECTED ILLUSTRATIVE RUN FROM ${count}`;
}

type PopulationSelection =
  | {mode: 'fixed-run'; participantId: string}
  | {mode: 'median-ending'}
  | {mode: 'editorial-score'; scoreId: string}
  | {mode: 'ranking'; metric: RankingMetric}
  | {mode: 'closest-to-target'; targetMinor: number};

function normalizeSurviveSelection(selection: SurviveFormatConfig['selection']): PopulationSelection {
  if (selection.mode === 'fixed-run') return selection;
  if (selection.mode === 'median-ending') return selection;
  if (selection.mode === 'ranking') return selection;
  return {mode: 'editorial-score', scoreId: selection.scoreId};
}

export function populationSelectionFor(input:
  | {kind: 'survive'; selection: SurviveFormatConfig['selection']}
  | {kind: 'luckiest'; rankingMetric: RankingMetric}
  | {kind: 'impossible'; targetMinor: number}
  | {kind: 'last-man'}
): PopulationSelection {
  if (input.kind === 'survive') return normalizeSurviveSelection(input.selection);
  if (input.kind === 'luckiest') return {mode: 'ranking', metric: input.rankingMetric};
  if (input.kind === 'impossible') return {mode: 'closest-to-target', targetMinor: input.targetMinor};
  return {mode: 'ranking', metric: 'longest-survival'};
}

function orderCandidates(records: CandidateRecord[], selection: PopulationSelection, roundCount: number): CandidateRecord[] {
  const ordered = [...records];
  if (selection.mode === 'fixed-run') {
    return ordered.sort((left, right) => left.participantId.localeCompare(right.participantId));
  }
  if (selection.mode === 'median-ending') {
    return ordered.sort((left, right) => left.summary.finalBankrollMinor - right.summary.finalBankrollMinor || left.participantId.localeCompare(right.participantId));
  }
  if (selection.mode === 'editorial-score') {
    return ordered.sort((left, right) => editorialScore(right, roundCount) - editorialScore(left, roundCount) || right.roundsPlayed - left.roundsPlayed || left.participantId.localeCompare(right.participantId));
  }
  const metric = selection.mode === 'ranking' ? selection.metric : 'highest-peak';
  return ordered.sort((left, right) => scoreForMetric(right, metric) - scoreForMetric(left, metric) || right.roundsPlayed - left.roundsPlayed || left.participantId.localeCompare(right.participantId));
}

export function simulatePopulation(input: {
  rootSeed: string;
  populationId: string;
  populationSize: number;
  roundCount: number;
  startBankrollMinor: number;
  baseBetMinor: number;
  strategyRef: DeepReadonly<StrategyRef>;
  config: DeepReadonly<ApproxGameConfig>;
  displayRoundMilestones: readonly number[];
  targetMinor?: number;
  targetThresholds?: readonly number[];
  selection: PopulationSelection;
  explicitDisclosure?: string;
  signal?: AbortSignal;
}): PopulationSimulationResult {
  const milestoneRounds = [...new Set(input.displayRoundMilestones)].sort((left, right) => left - right);
  const milestoneAccumulators = new Map<number, {alive: number; target: number; values: number[]}>(
    milestoneRounds.map((round) => [round, {alive: 0, target: 0, values: []}]),
  );
  const thresholdAccumulators = new Map<number, {count: number; firstRound?: number}>(
    (input.targetThresholds ?? []).map((threshold) => [threshold, {count: 0}]),
  );
  const records: CandidateRecord[] = [];
  for (let index = 0; index < input.populationSize; index += 1) {
    if (input.signal?.aborted) throw new Error('Simulation aborted');
    const participantId = `participant-${String(index + 1).padStart(5, '0')}`;
    const seed = deriveSeed(input.rootSeed, `run:${index}`);
    const stream = generateOutcomeStream({seed, rounds: input.roundCount, streamId: `stream-${participantId}`, config: input.config});
    const settled = settleRun({
      participantId,
      label: `PLAYER ${String(index + 1).padStart(4, '0')}`,
      stream,
      strategyRef: input.strategyRef,
      startBankrollMinor: input.startBankrollMinor,
      baseBetMinor: input.baseBetMinor,
      minimumStakeMinor: input.config.minimumStakeMinor,
      allowFinalAllIn: input.config.allowFinalAllIn,
      ...(input.targetMinor !== undefined ? {targetMinor: input.targetMinor} : {}),
      stopOnTarget: false,
    });
    const record: CandidateRecord = {
      participantId,
      seed,
      summary: settled.run.summary,
      roundsPlayed: settled.metrics.roundsPlayed,
      minimumBankrollMinor: settled.metrics.minimumBankrollMinor,
      largestComebackMinor: settled.metrics.largestComebackMinor,
      summaryHash: contentHash(settled.run.summary),
      scoreMilli: 0,
      reasonCodes: [],
    };
    records.push(record);
    for (const round of milestoneRounds) {
      const accumulator = milestoneAccumulators.get(round)!;
      const alive = settled.metrics.roundsPlayed >= round && settled.run.points[round - 1]?.alive !== false;
      if (alive) accumulator.alive += 1;
      if (settled.run.summary.targetReachedRound !== undefined && settled.run.summary.targetReachedRound <= round) accumulator.target += 1;
      accumulator.values.push(bankrollAtRound(settled.run, round));
    }
    for (const [threshold, accumulator] of thresholdAccumulators) {
      const reached = settled.run.points.find((point) => point.bankrollAfterMinor >= threshold);
      if (reached) {
        accumulator.count += 1;
        accumulator.firstRound = accumulator.firstRound === undefined ? reached.round : Math.min(accumulator.firstRound, reached.round);
      }
    }
  }

  const ordered = orderCandidates(records, input.selection, input.roundCount);
  let selected: CandidateRecord | undefined;
  if (input.selection.mode === 'fixed-run') {
    const fixedParticipantId = input.selection.participantId;
    selected = records.find((record) => record.participantId === fixedParticipantId);
  }
  else if (input.selection.mode === 'median-ending') selected = ordered[Math.floor((ordered.length - 1) / 2)];
  else selected = ordered[0];
  if (!selected) throw new Error('No candidate matched the requested population selection');

  const scoreId = input.selection.mode === 'editorial-score'
    ? input.selection.scoreId
    : input.selection.mode === 'ranking'
      ? input.selection.metric
      : input.selection.mode;
  const rankedCandidates: RankedCandidate[] = ordered.map((record, index) => {
    const metricScore = input.selection.mode === 'editorial-score'
      ? editorialScore(record, input.roundCount)
      : input.selection.mode === 'ranking'
        ? scoreForMetric(record, input.selection.metric)
        : input.selection.mode === 'closest-to-target'
          ? record.summary.peakBankrollMinor
          : record.summary.finalBankrollMinor;
    return {
      participantId: record.participantId,
      rank: index + 1,
      scoreId,
      scoreMilli: metricScore,
      reasonCodes: [
        record.roundsPlayed >= input.roundCount ? 'round-limit-reached' : 'terminal-before-limit',
        record.summary.maxDrawdownMinor > input.startBankrollMinor / 2 ? 'deep-drawdown' : 'controlled-drawdown',
        record.largestComebackMinor > input.startBankrollMinor / 2 ? 'large-comeback' : 'limited-comeback',
      ],
    };
  });

  const selectedStream = generateOutcomeStream({
    seed: selected.seed,
    rounds: input.roundCount,
    streamId: `stream-${selected.participantId}`,
    config: input.config,
  });
  const selectedSettled = settleRun({
    participantId: selected.participantId,
    label: `PLAYER ${selected.participantId.slice(-4)}`,
    stream: selectedStream,
    strategyRef: input.strategyRef,
    startBankrollMinor: input.startBankrollMinor,
    baseBetMinor: input.baseBetMinor,
    minimumStakeMinor: input.config.minimumStakeMinor,
    allowFinalAllIn: input.config.allowFinalAllIn,
    ...(input.targetMinor !== undefined ? {targetMinor: input.targetMinor} : {}),
    stopOnTarget: false,
  });

  const participantIndex: PopulationParticipantIndexEntry[] = records.map((record) => ({
    participantId: record.participantId,
    storageMode: record.participantId === selected!.participantId ? 'inline' : 'aggregate-only',
    ...(record.participantId === selected!.participantId ? {featuredRunParticipantId: record.participantId} : {}),
    summaryHash: record.summaryHash,
  }));

  const milestones: PopulationMilestone[] = milestoneRounds.map((round) => {
    const accumulator = milestoneAccumulators.get(round)!;
    const quarter = Math.floor(input.startBankrollMinor * 0.25);
    const threeQuarters = Math.floor(input.startBankrollMinor * 0.75);
    const oneAndHalf = Math.floor(input.startBankrollMinor * 1.5);
    return {
      round,
      aliveCount: accumulator.alive,
      targetReachedCount: accumulator.target,
      bankrollBands: [
        {fromMinor: 0, toMinor: quarter, count: accumulator.values.filter((value) => value < quarter).length},
        {fromMinor: quarter, toMinor: threeQuarters, count: accumulator.values.filter((value) => value >= quarter && value < threeQuarters).length},
        {fromMinor: threeQuarters, toMinor: oneAndHalf, count: accumulator.values.filter((value) => value >= threeQuarters && value < oneAndHalf).length},
        {fromMinor: oneAndHalf, count: accumulator.values.filter((value) => value >= oneAndHalf).length},
      ],
    };
  });
  const targetThresholds: TargetThresholdSummary[] = [...thresholdAccumulators.entries()].map(([thresholdMinor, aggregate]) => ({
    thresholdMinor,
    everReachedCount: aggregate.count,
    ...(aggregate.firstRound !== undefined ? {firstReachedRound: aggregate.firstRound} : {}),
  }));
  const disclosedAs = selectionLabel({
    populationSize: input.populationSize,
    selection: input.selection,
    ...(input.explicitDisclosure ? {explicitDisclosure: input.explicitDisclosure} : {}),
  });
  const selectionAudit: SelectionAudit = {
    policyId: input.selection.mode,
    policyVersion: '1.0.0',
    consideredCount: input.populationSize,
    selectedParticipantIds: [selected.participantId],
    ...(input.selection.mode === 'ranking' ? {rankingMetric: input.selection.metric} : {}),
    ...(input.selection.mode === 'editorial-score' ? {scoreId: input.selection.scoreId} : {}),
    disclosedAs,
  };
  return {
    featuredRun: selectedSettled.run,
    featuredStream: selectedStream,
    population: {
      populationId: input.populationId,
      size: input.populationSize,
      milestones,
      targetThresholds,
      selectedParticipantIds: [selected.participantId],
      rankedCandidates,
      participantIndex,
      storage: {mode: 'inline', rawParticipantCount: input.populationSize},
    },
    selectionAudit,
  };
}
