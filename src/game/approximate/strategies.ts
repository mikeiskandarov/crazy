import type {DeepReadonly} from '../../contracts/common';
import type {BankrollPoint} from '../../contracts/simulation';
import {contentHash} from '../../core/canonical-json';
import type {ResolvedStrategyRef, StrategyRef} from '../../contracts/common';

export interface StrategyContext {
  round: number;
  bankrollMinor: number;
  startBankrollMinor: number;
  baseBetMinor: number;
  minimumStakeMinor: number;
  targetMinor?: number;
  history: DeepReadonly<BankrollPoint[]>;
}

export interface StrategyDecision {
  requestedStakeMinor: number;
  stop?: boolean;
  reason?: string;
}

export interface Strategy {
  idPattern: RegExp;
  decide(context: StrategyContext, ref: DeepReadonly<StrategyRef>): StrategyDecision;
}

const strategies: Strategy[] = [
  {
    idPattern: /^flat-\d+$/,
    decide: (context) => ({requestedStakeMinor: context.baseBetMinor}),
  },
  {
    idPattern: /^fraction-(\d+)$/,
    decide: (context, ref) => {
      const match = /^fraction-(\d+)$/.exec(ref.id);
      const percent = Number(ref.config.percent ?? match?.[1] ?? 10);
      const maximum = Number(ref.config.maxMinor ?? Number.MAX_SAFE_INTEGER);
      const requested = Math.round((context.bankrollMinor * percent) / 100);
      return {requestedStakeMinor: Math.min(maximum, Math.max(context.minimumStakeMinor, requested))};
    },
  },
  {
    idPattern: /^press-wins$/,
    decide: (context) => {
      const previous = context.history[context.history.length - 1];
      const didWin = previous?.tags.includes('win') || previous?.tags.includes('feature');
      return {requestedStakeMinor: didWin ? Math.min(context.baseBetMinor * 2, Math.floor(context.bankrollMinor / 4)) : context.baseBetMinor};
    },
  },
  {
    idPattern: /^reduce-after-loss$/,
    decide: (context) => {
      const previous = context.history[context.history.length - 1];
      return {requestedStakeMinor: previous?.tags.includes('loss') ? Math.max(context.minimumStakeMinor, Math.floor(context.baseBetMinor / 2)) : context.baseBetMinor};
    },
  },
  {
    idPattern: /^stop-loss-(\d+)$/,
    decide: (context, ref) => {
      const match = /^stop-loss-(\d+)$/.exec(ref.id);
      const threshold = Number(ref.config.thresholdMinor ?? Number(match?.[1] ?? 0) * 100);
      return context.bankrollMinor <= threshold
        ? {requestedStakeMinor: 0, stop: true, reason: `stop-loss-${threshold}`}
        : {requestedStakeMinor: context.baseBetMinor};
    },
  },
  {
    idPattern: /^target-sprint$/,
    decide: (context) => ({
      requestedStakeMinor: Math.max(context.baseBetMinor, Math.floor(context.bankrollMinor / 4)),
    }),
  },
];

export function resolveStrategy(ref: DeepReadonly<StrategyRef>): Strategy {
  if (ref.version !== '1.0.0') throw new Error(`Unsupported strategy version: ${ref.id}@${ref.version}`);
  const strategy = strategies.find((entry) => entry.idPattern.test(ref.id));
  if (!strategy) throw new Error(`Unknown strategy: ${ref.id}@${ref.version}`);
  return strategy;
}

export function resolveStrategyRef(ref: DeepReadonly<StrategyRef>): ResolvedStrategyRef {
  resolveStrategy(ref);
  return {...ref, config: {...ref.config}, configHash: contentHash(ref.config)};
}
