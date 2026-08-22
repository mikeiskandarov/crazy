import type {DeepReadonly, StrategyRef} from '../../contracts/common';
import type {BankrollPoint, OutcomeStream, ParticipantRun, RunSummary} from '../../contracts/simulation';
import {grossReturnMinor} from '../../core/money';
import {resolveStrategy, resolveStrategyRef} from './strategies';

export interface SettledRun {
  run: ParticipantRun;
  metrics: {
    roundsPlayed: number;
    minimumBankrollMinor: number;
    largestComebackMinor: number;
  };
}

export function summarizeRun(startBankrollMinor: number, points: DeepReadonly<BankrollPoint[]>, targetMinor?: number): RunSummary {
  let peakBankrollMinor = startBankrollMinor;
  let peakRound = 1;
  let runningPeak = startBankrollMinor;
  let maxDrawdownMinor = 0;
  let longestLossStreak = 0;
  let lossStreak = 0;
  let targetReachedRound: number | undefined;
  for (const point of points) {
    if (point.bankrollAfterMinor > peakBankrollMinor) {
      peakBankrollMinor = point.bankrollAfterMinor;
      peakRound = point.round;
    }
    runningPeak = Math.max(runningPeak, point.bankrollAfterMinor);
    maxDrawdownMinor = Math.max(maxDrawdownMinor, runningPeak - point.bankrollAfterMinor);
    if (point.netChangeMinor < 0) {
      lossStreak += 1;
      longestLossStreak = Math.max(longestLossStreak, lossStreak);
    } else {
      lossStreak = 0;
    }
    if (targetMinor !== undefined && targetReachedRound === undefined && point.bankrollAfterMinor >= targetMinor) {
      targetReachedRound = point.round;
    }
  }
  const last = points[points.length - 1];
  const bankruptcyRound = last && !last.alive && last.bankrollAfterMinor === 0 ? last.round : undefined;
  return {
    finalBankrollMinor: last?.bankrollAfterMinor ?? startBankrollMinor,
    peakBankrollMinor,
    peakRound,
    maxDrawdownMinor,
    ...(bankruptcyRound !== undefined ? {bankruptcyRound} : {}),
    longestLossStreak,
    ...(targetReachedRound !== undefined ? {targetReachedRound} : {}),
  };
}

export function settleRun(input: {
  participantId: string;
  label: string;
  stream: DeepReadonly<OutcomeStream>;
  strategyRef: DeepReadonly<StrategyRef>;
  startBankrollMinor: number;
  baseBetMinor: number;
  minimumStakeMinor: number;
  allowFinalAllIn: boolean;
  targetMinor?: number;
  stopOnTarget?: boolean;
}): SettledRun {
  const strategy = resolveStrategy(input.strategyRef);
  const points: BankrollPoint[] = [];
  let bankroll = input.startBankrollMinor;
  let trough = bankroll;
  let largestComebackMinor = 0;
  for (const event of input.stream.events) {
    if (bankroll < input.minimumStakeMinor && !(input.allowFinalAllIn && bankroll > 0)) break;
    const decision = strategy.decide({
      round: event.round,
      bankrollMinor: bankroll,
      startBankrollMinor: input.startBankrollMinor,
      baseBetMinor: input.baseBetMinor,
      minimumStakeMinor: input.minimumStakeMinor,
      ...(input.targetMinor !== undefined ? {targetMinor: input.targetMinor} : {}),
      history: points,
    }, input.strategyRef);
    if (decision.stop) break;
    const allowedAllIn = input.allowFinalAllIn && bankroll < input.minimumStakeMinor;
    const requested = Math.max(0, Math.floor(decision.requestedStakeMinor));
    if (requested <= 0) break;
    const stake = allowedAllIn ? bankroll : Math.min(bankroll, Math.max(input.minimumStakeMinor, requested));
    const payout = grossReturnMinor(stake, event.grossMultiplierBps);
    const after = Math.max(0, bankroll - stake + payout);
    const reachedTarget = input.targetMinor !== undefined && after >= input.targetMinor;
    const alive = after >= input.minimumStakeMinor && !(reachedTarget && input.stopOnTarget);
    points.push({
      round: event.round,
      bankrollBeforeMinor: bankroll,
      stakeMinor: stake,
      bankrollAfterMinor: after,
      netChangeMinor: after - bankroll,
      outcomeEventId: event.eventId,
      alive,
      tags: [...event.tags, ...(reachedTarget ? ['target-reached'] : [])],
    });
    bankroll = after;
    trough = Math.min(trough, bankroll);
    largestComebackMinor = Math.max(largestComebackMinor, bankroll - trough);
    if (!alive || (reachedTarget && input.stopOnTarget)) break;
  }
  const summary = summarizeRun(input.startBankrollMinor, points, input.targetMinor);
  return {
    run: {
      participantId: input.participantId,
      label: input.label,
      streamId: input.stream.streamId,
      strategy: resolveStrategyRef(input.strategyRef),
      startBankrollMinor: input.startBankrollMinor,
      points,
      summary,
    },
    metrics: {
      roundsPlayed: points.length,
      minimumBankrollMinor: points.reduce((minimum, point) => Math.min(minimum, point.bankrollAfterMinor), input.startBankrollMinor),
      largestComebackMinor,
    },
  };
}
