import type {DeepReadonly} from '../contracts/common';
import type {SimulationResultV1} from '../contracts/simulation';

export type StoryEventType =
  | 'near-death'
  | 'recovery'
  | 'new-peak'
  | 'big-hit'
  | 'mass-elimination'
  | 'leader-change'
  | 'bust'
  | 'target-hit';

export interface CandidateEvent {
  eventId: string;
  type: StoryEventType;
  round: number;
  actorIds: string[];
  before: Record<string, number>;
  after: Record<string, number>;
  magnitude: number;
  rarityEstimateMilli: number;
}

export function detectEvents(simulation: DeepReadonly<SimulationResultV1>): CandidateEvent[] {
  const events: CandidateEvent[] = [];
  for (const run of simulation.featuredRuns) {
    let notablePeak = run.startBankrollMinor;
    let trough = run.startBankrollMinor;
    for (const point of run.points) {
      const stake = Math.max(1, point.stakeMinor);
      if (point.bankrollAfterMinor <= Math.max(stake * 3, run.startBankrollMinor * 0.15) && point.alive) {
        events.push({
          eventId: `event-near-death-${run.participantId}-${point.round}`,
          type: 'near-death',
          round: point.round,
          actorIds: [run.participantId],
          before: {bankrollMinor: point.bankrollBeforeMinor},
          after: {bankrollMinor: point.bankrollAfterMinor},
          magnitude: run.startBankrollMinor - point.bankrollAfterMinor,
          rarityEstimateMilli: 800,
        });
      }
      trough = Math.min(trough, point.bankrollAfterMinor);
      if (trough > 0 && point.bankrollAfterMinor >= trough * 2.5 && point.bankrollAfterMinor - trough >= stake * 5) {
        events.push({
          eventId: `event-recovery-${run.participantId}-${point.round}`,
          type: 'recovery',
          round: point.round,
          actorIds: [run.participantId],
          before: {bankrollMinor: trough},
          after: {bankrollMinor: point.bankrollAfterMinor},
          magnitude: point.bankrollAfterMinor - trough,
          rarityEstimateMilli: 700,
        });
      }
      if (point.bankrollAfterMinor >= notablePeak * 1.2) {
        events.push({
          eventId: `event-new-peak-${run.participantId}-${point.round}`,
          type: 'new-peak',
          round: point.round,
          actorIds: [run.participantId],
          before: {bankrollMinor: notablePeak},
          after: {bankrollMinor: point.bankrollAfterMinor},
          magnitude: point.bankrollAfterMinor - notablePeak,
          rarityEstimateMilli: 520,
        });
        notablePeak = point.bankrollAfterMinor;
      }
      if (point.netChangeMinor >= stake * 5) {
        events.push({
          eventId: `event-big-hit-${run.participantId}-${point.round}`,
          type: 'big-hit',
          round: point.round,
          actorIds: [run.participantId],
          before: {bankrollMinor: point.bankrollBeforeMinor},
          after: {bankrollMinor: point.bankrollAfterMinor},
          magnitude: point.netChangeMinor,
          rarityEstimateMilli: 600,
        });
      }
      if (point.tags.includes('target-reached')) {
        events.push({
          eventId: `event-target-${run.participantId}-${point.round}`,
          type: 'target-hit',
          round: point.round,
          actorIds: [run.participantId],
          before: {bankrollMinor: point.bankrollBeforeMinor},
          after: {bankrollMinor: point.bankrollAfterMinor},
          magnitude: point.netChangeMinor,
          rarityEstimateMilli: 950,
        });
      }
    }
    if (run.summary.bankruptcyRound !== undefined) {
      events.push({
        eventId: `event-bust-${run.participantId}-${run.summary.bankruptcyRound}`,
        type: 'bust',
        round: run.summary.bankruptcyRound,
        actorIds: [run.participantId],
        before: {bankrollMinor: run.points[run.points.length - 1]?.bankrollBeforeMinor ?? 0},
        after: {bankrollMinor: 0},
        magnitude: run.startBankrollMinor,
        rarityEstimateMilli: 700,
      });
    }
  }
  const milestones = simulation.population?.milestones ?? [];
  let priorAlive = simulation.population?.size ?? 0;
  for (const milestone of milestones) {
    const eliminated = priorAlive - milestone.aliveCount;
    if (priorAlive > 0 && eliminated / priorAlive >= 0.15) {
      events.push({
        eventId: `event-mass-elimination-${milestone.round}`,
        type: 'mass-elimination',
        round: milestone.round,
        actorIds: [],
        before: {aliveCount: priorAlive},
        after: {aliveCount: milestone.aliveCount},
        magnitude: eliminated,
        rarityEstimateMilli: 500,
      });
    }
    priorAlive = milestone.aliveCount;
  }
  if (simulation.featuredRuns.length > 1) {
    let previousLeader: string | undefined;
    for (let round = 1; round <= simulation.run.roundCount; round += 1) {
      const ranked = simulation.featuredRuns
        .map((run) => ({run, point: run.points[Math.min(round, run.points.length) - 1]}))
        .map(({run, point}) => ({participantId: run.participantId, bankrollMinor: point?.bankrollAfterMinor ?? run.startBankrollMinor}))
        .sort((left, right) => right.bankrollMinor - left.bankrollMinor || left.participantId.localeCompare(right.participantId));
      const leader = ranked[0]?.participantId;
      if (previousLeader && leader && leader !== previousLeader) {
        events.push({
          eventId: `event-leader-change-${round}-${leader}`,
          type: 'leader-change',
          round,
          actorIds: [leader],
          before: {},
          after: {leaderBankrollMinor: ranked[0]!.bankrollMinor},
          magnitude: Math.abs(ranked[0]!.bankrollMinor - (ranked[1]?.bankrollMinor ?? 0)),
          rarityEstimateMilli: 420,
        });
      }
      previousLeader = leader;
    }
  }
  return events.sort((left, right) => left.round - right.round || left.eventId.localeCompare(right.eventId));
}
