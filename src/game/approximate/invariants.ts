import type {SimulationInvariantSummary, SimulationResultV1} from '../../contracts/simulation';
import {grossReturnMinor} from '../../core/money';
import {InvariantError} from '../../core/invariant';

export function checkSimulationInvariants(simulation: Omit<SimulationResultV1, 'invariants' | 'contentHash' | 'createdAt'>): SimulationInvariantSummary {
  const failures: string[] = [];
  let checked = 0;
  const events = new Map(simulation.outcomeStreams.flatMap((stream) => stream.events.map((event) => [event.eventId, event] as const)));
  for (const run of simulation.featuredRuns) {
    let previousAfter = run.startBankrollMinor;
    let previousRound = 0;
    for (const point of run.points) {
      checked += 6;
      const event = events.get(point.outcomeEventId);
      if (!event) failures.push(`${run.participantId}: missing event ${point.outcomeEventId}`);
      if (point.round <= previousRound) failures.push(`${run.participantId}: rounds are not increasing`);
      if (point.bankrollBeforeMinor !== previousAfter) failures.push(`${run.participantId}: bankroll continuity failed at round ${point.round}`);
      if (point.stakeMinor > point.bankrollBeforeMinor) failures.push(`${run.participantId}: stake exceeds bankroll at round ${point.round}`);
      if (!Object.values(point).filter((value) => typeof value === 'number').every(Number.isSafeInteger)) failures.push(`${run.participantId}: non-integer money/round at ${point.round}`);
      if (event) {
        const expected = point.bankrollBeforeMinor - point.stakeMinor + grossReturnMinor(point.stakeMinor, event.grossMultiplierBps);
        if (point.bankrollAfterMinor !== expected) failures.push(`${run.participantId}: payout math failed at round ${point.round}`);
      }
      previousAfter = point.bankrollAfterMinor;
      previousRound = point.round;
    }
  }
  if (simulation.population) {
    let previousAlive = simulation.population.size;
    for (const milestone of simulation.population.milestones) {
      checked += 3;
      if (milestone.aliveCount > previousAlive) failures.push(`population alive count increased at round ${milestone.round}`);
      if (milestone.targetReachedCount > simulation.population.size) failures.push(`target count exceeds population at round ${milestone.round}`);
      if (milestone.bankrollBands.reduce((sum, band) => sum + band.count, 0) !== simulation.population.size) failures.push(`bankroll bands do not sum to population at round ${milestone.round}`);
      previousAlive = milestone.aliveCount;
    }
    const indexedIds = new Set(simulation.population.participantIndex.map((entry) => entry.participantId));
    for (const selectedId of simulation.population.selectedParticipantIds) {
      checked += 1;
      if (!indexedIds.has(selectedId)) failures.push(`selected participant missing from index: ${selectedId}`);
    }
  }
  if (failures.length > 0) throw new InvariantError('Simulation invariant check failed', {failures});
  return {
    checked,
    failures: 0,
    checkIds: ['round-order', 'event-reference', 'bankroll-continuity', 'stake-bound', 'money-integers', 'payout-math', 'population-monotonicity', 'selection-integrity'],
  };
}
