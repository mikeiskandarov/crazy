import type {DeepReadonly, StrategyRef} from '../../contracts/common';
import type {FormatConfigV1, ReelSpecV1} from '../../contracts/reel-spec';
import type {ModelAssumption, OutcomeStream, ParticipantRun, SimulationResultV1} from '../../contracts/simulation';
import {buildArtifact, PRODUCER_VERSION} from '../../core/artifact';
import {contentHash} from '../../core/canonical-json';
import type {GameAdapter} from '../game-adapter';
import {settleRun} from './bankroll-engine';
import {populationSelectionFor, simulatePopulation} from './batch-simulator';
import {checkSimulationInvariants} from './invariants';
import type {ApproxGameConfig} from './outcome-table';
import {generateOutcomeStream, resolveApproxGameConfig} from './outcome-table';
import {deriveSeed} from './prng';

function primaryBetAndStrategy(format: DeepReadonly<FormatConfigV1>): {betMinor: number; strategy: DeepReadonly<StrategyRef>} {
  if (format.kind === 'one-vs-ten') return {betMinor: format.left.betMinor, strategy: format.left.strategy};
  if (format.kind === 'race-to-1000') return {betMinor: format.racers[0]!.betMinor, strategy: format.racers[0]!.strategy};
  return {betMinor: format.betMinor, strategy: format.strategy};
}

function simulateSingle(input: {spec: DeepReadonly<ReelSpecV1>; config: DeepReadonly<ApproxGameConfig>}): {
  streams: OutcomeStream[];
  runs: ParticipantRun[];
  populationSize: number;
  shared: boolean;
  selectionAudit?: SimulationResultV1['selectionAudit'];
} {
  const format = input.spec.format;
  const {betMinor, strategy} = primaryBetAndStrategy(format);
  const stream = generateOutcomeStream({
    seed: deriveSeed(input.spec.game.seed, 'single-run'),
    rounds: format.roundCount,
    streamId: 'stream-featured',
    config: input.config,
  });
  const settled = settleRun({
    participantId: 'participant-00001',
    label: 'PLAYER 0001',
    stream,
    strategyRef: strategy,
    startBankrollMinor: format.startBankrollMinor,
    baseBetMinor: betMinor,
    minimumStakeMinor: input.config.minimumStakeMinor,
    allowFinalAllIn: input.config.allowFinalAllIn,
  });
  return {
    streams: [stream],
    runs: [settled.run],
    populationSize: 1,
    shared: false,
    selectionAudit: {
      policyId: 'fixed-seeded-run',
      policyVersion: '1.0.0',
      consideredCount: 1,
      selectedParticipantIds: [settled.run.participantId],
      disclosedAs: input.spec.editorial.selectionDisclosure?.toUpperCase() ?? 'ONE SEEDED ILLUSTRATIVE RUN',
    },
  };
}

function simulateDuel(input: {spec: DeepReadonly<ReelSpecV1>; config: DeepReadonly<ApproxGameConfig>}): {
  streams: OutcomeStream[];
  runs: ParticipantRun[];
  populationSize: number;
  shared: boolean;
} {
  const format = input.spec.format;
  if (format.kind !== 'one-vs-ten') throw new Error('simulateDuel requires one-vs-ten config');
  const stream = generateOutcomeStream({seed: deriveSeed(input.spec.game.seed, 'shared-duel'), rounds: format.roundCount, streamId: 'stream-shared-duel', config: input.config});
  const left = settleRun({participantId: 'duel-left', label: format.left.label, stream, strategyRef: format.left.strategy, startBankrollMinor: format.startBankrollMinor, baseBetMinor: format.left.betMinor, minimumStakeMinor: input.config.minimumStakeMinor, allowFinalAllIn: input.config.allowFinalAllIn});
  const right = settleRun({participantId: 'duel-right', label: format.right.label, stream, strategyRef: format.right.strategy, startBankrollMinor: format.startBankrollMinor, baseBetMinor: format.right.betMinor, minimumStakeMinor: input.config.minimumStakeMinor, allowFinalAllIn: input.config.allowFinalAllIn});
  return {streams: [stream], runs: [left.run, right.run], populationSize: 2, shared: true};
}

function simulateRace(input: {spec: DeepReadonly<ReelSpecV1>; config: DeepReadonly<ApproxGameConfig>}): {
  streams: OutcomeStream[];
  runs: ParticipantRun[];
  populationSize: number;
  shared: boolean;
} {
  const format = input.spec.format;
  if (format.kind !== 'race-to-1000') throw new Error('simulateRace requires race-to-1000 config');
  const streams = format.sharedOutcomeStream
    ? [generateOutcomeStream({seed: deriveSeed(input.spec.game.seed, 'shared-race'), rounds: format.roundCount, streamId: 'stream-shared-race', config: input.config})]
    : format.racers.map((racer) => generateOutcomeStream({seed: deriveSeed(input.spec.game.seed, `race:${racer.racerId}`), rounds: format.roundCount, streamId: `stream-${racer.racerId}`, config: input.config}));
  const runs = format.racers.map((racer, index) => settleRun({
    participantId: racer.racerId,
    label: racer.label,
    stream: format.sharedOutcomeStream ? streams[0]! : streams[index]!,
    strategyRef: racer.strategy,
    startBankrollMinor: format.startBankrollMinor,
    baseBetMinor: racer.betMinor,
    minimumStakeMinor: input.config.minimumStakeMinor,
    allowFinalAllIn: input.config.allowFinalAllIn,
    targetMinor: format.targetMinor,
    stopOnTarget: true,
  }).run);
  return {streams, runs, populationSize: format.racerCount, shared: format.sharedOutcomeStream};
}

export class ApproxGameAdapter implements GameAdapter<ApproxGameConfig> {
  readonly id = 'approx-wheel';
  readonly version = '1.0.0';
  readonly modelLabel = 'Illustrative approximate wheel model';

  validateConfig(input: unknown): ApproxGameConfig {
    return resolveApproxGameConfig(input);
  }

  describeAssumptions(_config: DeepReadonly<ApproxGameConfig>): ModelAssumption[] {
    return [
      {id: 'synthetic-weights', label: 'Synthetic outcome weights', detail: 'Configured weights are illustrative and are not published odds for a commercial game.', material: true},
      {id: 'flat-rounds', label: 'Independent discrete rounds', detail: 'Each outcome is sampled independently from the configured weighted table.', material: true},
      {id: 'integer-money', label: 'Integer money math', detail: 'All bankroll and payout calculations use cents and half-away-from-zero rounding.', material: true},
      {id: 'no-bonus-state', label: 'No persistent bonus state', detail: 'Features settle as configured multipliers without a separate bonus game.', material: true},
    ];
  }

  async simulate({spec, config, signal}: {spec: DeepReadonly<ReelSpecV1>; config: DeepReadonly<ApproxGameConfig>; signal?: AbortSignal}): Promise<DeepReadonly<SimulationResultV1>> {
    if (spec.game.adapterId !== this.id || spec.game.requestedModelVersion !== config.modelVersion) {
      throw new Error(`Adapter compatibility error: requested ${spec.game.adapterId}/${spec.game.requestedModelVersion}`);
    }
    const format = spec.format;
    let streams: OutcomeStream[];
    let runs: ParticipantRun[];
    let population: SimulationResultV1['population'];
    let selectionAudit: SimulationResultV1['selectionAudit'];
    let populationSize: number;
    let shared: boolean;

    if (format.kind === 'survive-500' || format.kind === 'luckiest-player' || format.kind === 'impossible-target' || format.kind === 'last-man-standing') {
      const selection = format.kind === 'survive-500'
        ? populationSelectionFor({kind: 'survive', selection: format.selection})
        : format.kind === 'luckiest-player'
          ? populationSelectionFor({kind: 'luckiest', rankingMetric: format.rankingMetric})
          : format.kind === 'impossible-target'
            ? populationSelectionFor({kind: 'impossible', targetMinor: format.targetMinor})
            : populationSelectionFor({kind: 'last-man'});
      const batch = simulatePopulation({
        rootSeed: spec.game.seed,
        populationId: `population-${spec.reelId}`,
        populationSize: format.populationSize,
        roundCount: format.roundCount,
        startBankrollMinor: format.startBankrollMinor,
        baseBetMinor: format.betMinor,
        strategyRef: format.strategy,
        config,
        displayRoundMilestones: format.displayRoundMilestones,
        ...(format.kind === 'impossible-target' ? {targetMinor: format.targetMinor, targetThresholds: format.targetMilestonesMinor} : {}),
        selection,
        ...(spec.editorial.selectionDisclosure ? {explicitDisclosure: spec.editorial.selectionDisclosure} : {}),
        ...(signal ? {signal} : {}),
      });
      streams = [batch.featuredStream];
      runs = [batch.featuredRun];
      population = batch.population;
      selectionAudit = batch.selectionAudit;
      populationSize = format.populationSize;
      shared = false;
    } else if (format.kind === 'one-vs-ten') {
      ({streams, runs, populationSize, shared} = simulateDuel({spec, config}));
    } else if (format.kind === 'race-to-1000') {
      ({streams, runs, populationSize, shared} = simulateRace({spec, config}));
    } else {
      const single = simulateSingle({spec, config});
      ({streams, runs, populationSize, shared, selectionAudit} = single);
    }

    const payloadWithoutInvariants = {
      schemaVersion: 'simulation-result/1' as const,
      artifactId: `simulation-${spec.reelId}`,
      provenance: {producer: 'casino-reel-builder', producerVersion: PRODUCER_VERSION, parentHashes: [spec.contentHash]},
      reelSpecHash: spec.contentHash,
      model: {
        adapterId: this.id,
        adapterVersion: this.version,
        modelVersion: config.modelVersion,
        modelLabel: this.modelLabel,
        configHash: contentHash(config),
        seed: spec.game.seed,
        assumptions: this.describeAssumptions(config),
      },
      run: {roundCount: format.roundCount, populationSize, sharedOutcomeStream: shared},
      outcomeStreams: streams,
      featuredRuns: runs,
      ...(population ? {population} : {}),
      ...(selectionAudit ? {selectionAudit} : {}),
    };
    const invariants = checkSimulationInvariants(payloadWithoutInvariants);
    return buildArtifact<SimulationResultV1>({
      artifactId: `simulation-${spec.reelId}`,
      schemaVersion: 'simulation-result/1',
      parentHashes: [spec.contentHash],
      payload: {
        reelSpecHash: spec.contentHash,
        model: payloadWithoutInvariants.model,
        run: payloadWithoutInvariants.run,
        outcomeStreams: streams,
        featuredRuns: runs,
        ...(population ? {population} : {}),
        ...(selectionAudit ? {selectionAudit} : {}),
        invariants,
      },
    });
  }
}
