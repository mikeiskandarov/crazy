import {z} from 'zod';
import type {DeepReadonly} from '../../contracts/common';
import type {OutcomeEvent, OutcomeStream} from '../../contracts/simulation';
import {contentHash} from '../../core/canonical-json';
import {SeededPrng} from './prng';

export interface ApproxOutcomeDefinition {
  id: string;
  weight: number;
  grossMultiplierBps: number;
  segmentId: string;
  eventClass: 'loss' | 'refund' | 'win' | 'feature';
  intensity: 0 | 1 | 2 | 3;
}

export interface ApproxGameConfig {
  modelVersion: 'approximate-v0';
  currency: 'USD';
  outcomeTable: ApproxOutcomeDefinition[];
  resolvedPreset?: {id: string; version: string; contentHash: string};
  rounding: {decimals: 2; mode: 'half_away_from_zero'};
  minimumStakeMinor: number;
  bankrollFloorMinor: 0;
  allowFinalAllIn: boolean;
}

export const approximateV0Preset: ApproxGameConfig = {
  modelVersion: 'approximate-v0',
  currency: 'USD',
  minimumStakeMinor: 100,
  bankrollFloorMinor: 0,
  allowFinalAllIn: false,
  rounding: {decimals: 2, mode: 'half_away_from_zero'},
  outcomeTable: [
    {id: 'miss', weight: 5_700, grossMultiplierBps: 0, segmentId: 's0', eventClass: 'loss', intensity: 0},
    {id: 'return', weight: 2_300, grossMultiplierBps: 10_000, segmentId: 's1', eventClass: 'refund', intensity: 0},
    {id: 'double', weight: 1_000, grossMultiplierBps: 20_000, segmentId: 's2', eventClass: 'win', intensity: 1},
    {id: 'triple', weight: 500, grossMultiplierBps: 30_000, segmentId: 's3', eventClass: 'win', intensity: 1},
    {id: 'five', weight: 300, grossMultiplierBps: 50_000, segmentId: 's5', eventClass: 'win', intensity: 2},
    {id: 'ten', weight: 150, grossMultiplierBps: 100_000, segmentId: 's10', eventClass: 'win', intensity: 2},
    {id: 'feature-15', weight: 40, grossMultiplierBps: 150_000, segmentId: 'f1', eventClass: 'feature', intensity: 3},
    {id: 'feature-30', weight: 10, grossMultiplierBps: 300_000, segmentId: 'f2', eventClass: 'feature', intensity: 3},
  ],
};

/**
 * A collapsed, editorial forecast for a $1 total unit bet in Crazy Time.
 *
 * This is deliberately not a reconstruction of Evolution's internal math. It
 * resolves the main wheel, Top Slot and any bonus into one gross-return bucket
 * so the existing bankroll engine can model a complete round. The one-million
 * weights produce a 0.9600 mean gross return and make the very high tail rare
 * enough to read honestly as a best-of-1,000 event over 500-round runs.
 */
export const crazyTimeForecastV1Preset: ApproxGameConfig = {
  modelVersion: 'approximate-v0',
  currency: 'USD',
  minimumStakeMinor: 100,
  bankrollFloorMinor: 0,
  allowFinalAllIn: false,
  rounding: {decimals: 2, mode: 'half_away_from_zero'},
  outcomeTable: [
    {id: 'miss', weight: 582_723, grossMultiplierBps: 0, segmentId: 'ct-miss', eventClass: 'loss', intensity: 0},
    {id: 'return', weight: 200_000, grossMultiplierBps: 10_000, segmentId: 'ct-return', eventClass: 'refund', intensity: 0},
    {id: 'double', weight: 122_250, grossMultiplierBps: 20_000, segmentId: 'ct-2', eventClass: 'win', intensity: 1},
    {id: 'triple', weight: 60_000, grossMultiplierBps: 30_000, segmentId: 'ct-3', eventClass: 'win', intensity: 1},
    {id: 'five', weight: 25_000, grossMultiplierBps: 50_000, segmentId: 'ct-5', eventClass: 'win', intensity: 1},
    {id: 'ten', weight: 8_000, grossMultiplierBps: 100_000, segmentId: 'ct-10', eventClass: 'win', intensity: 2},
    {id: 'twenty', weight: 1_500, grossMultiplierBps: 200_000, segmentId: 'ct-20', eventClass: 'feature', intensity: 2},
    {id: 'fifty', weight: 400, grossMultiplierBps: 500_000, segmentId: 'ct-50', eventClass: 'feature', intensity: 2},
    {id: 'hundred', weight: 100, grossMultiplierBps: 1_000_000, segmentId: 'ct-100', eventClass: 'feature', intensity: 3},
    {id: 'rare-500', weight: 12, grossMultiplierBps: 5_000_000, segmentId: 'ct-500', eventClass: 'feature', intensity: 3},
    {id: 'rare-1000', weight: 6, grossMultiplierBps: 10_000_000, segmentId: 'ct-1000', eventClass: 'feature', intensity: 3},
    {id: 'rare-1500', weight: 3, grossMultiplierBps: 15_000_000, segmentId: 'ct-1500', eventClass: 'feature', intensity: 3},
    {id: 'very-3000', weight: 2, grossMultiplierBps: 30_000_000, segmentId: 'ct-3000', eventClass: 'feature', intensity: 3},
    {id: 'very-5000', weight: 1, grossMultiplierBps: 50_000_000, segmentId: 'ct-5000', eventClass: 'feature', intensity: 3},
    {id: 'very-8000', weight: 1, grossMultiplierBps: 80_000_000, segmentId: 'ct-8000', eventClass: 'feature', intensity: 3},
    {id: 'jackpot-15000', weight: 1, grossMultiplierBps: 150_000_000, segmentId: 'ct-15000', eventClass: 'feature', intensity: 3},
    {id: 'jackpot-20000', weight: 1, grossMultiplierBps: 200_000_000, segmentId: 'ct-20000', eventClass: 'feature', intensity: 3},
  ],
};

const PRESETS = new Map<string, ApproxGameConfig>([
  ['carnival-wheel-v0@1.0.0', approximateV0Preset],
  ['crazy-time-forecast-v1@1.0.0', crazyTimeForecastV1Preset],
]);

const outcomeDefinitionSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  weight: z.number().int().positive(),
  grossMultiplierBps: z.number().int().nonnegative().max(200_000_000),
  segmentId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  eventClass: z.enum(['loss', 'refund', 'win', 'feature']),
  intensity: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
});

const configSchema = z.strictObject({
  modelVersion: z.literal('approximate-v0').optional(),
  currency: z.literal('USD').optional(),
  rounding: z.strictObject({decimals: z.literal(2), mode: z.literal('half_away_from_zero')}).optional(),
  minimumStakeMinor: z.number().int().positive().max(1_000_000).optional(),
  bankrollFloorMinor: z.literal(0).optional(),
  allowFinalAllIn: z.boolean().optional(),
  presetRef: z.strictObject({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
  }).optional(),
  outcomeTable: z.array(outcomeDefinitionSchema).min(1).max(100).optional(),
}).superRefine((config, context) => {
  if ((config.presetRef ? 1 : 0) + (config.outcomeTable ? 1 : 0) !== 1) {
    context.addIssue({code: 'custom', path: [], message: 'exactly one of presetRef or outcomeTable is required'});
  }
  if (config.presetRef && !PRESETS.has(`${config.presetRef.id}@${config.presetRef.version}`)) {
    context.addIssue({code: 'custom', path: ['presetRef'], message: `unknown approximate model preset: ${config.presetRef.id}@${config.presetRef.version}`});
  }
  const table = config.outcomeTable;
  if (table) {
    if (new Set(table.map((entry) => entry.id)).size !== table.length) {
      context.addIssue({code: 'custom', path: ['outcomeTable'], message: 'outcome ids must be unique'});
    }
    if (new Set(table.map((entry) => entry.segmentId)).size !== table.length) {
      context.addIssue({code: 'custom', path: ['outcomeTable'], message: 'segment ids must be unique'});
    }
    const weightSum = table.reduce((sum, entry) => sum + entry.weight, 0);
    if (!Number.isSafeInteger(weightSum)) {
      context.addIssue({code: 'custom', path: ['outcomeTable'], message: 'weight sum exceeds the safe integer range'});
    }
  }
});

export function resolveApproxGameConfig(input: unknown): ApproxGameConfig {
  const parsed = configSchema.parse(input);
  const preset = parsed.presetRef ? PRESETS.get(`${parsed.presetRef.id}@${parsed.presetRef.version}`) : undefined;
  const table = parsed.outcomeTable ?? preset?.outcomeTable;
  if (!table) throw new Error('Approximate model config did not resolve an outcome table');
  const resolvedPreset = parsed.presetRef
    ? {id: parsed.presetRef.id, version: parsed.presetRef.version, contentHash: contentHash(table)}
    : undefined;
  return {
    modelVersion: 'approximate-v0',
    currency: 'USD',
    outcomeTable: table.map((entry) => ({...entry})),
    ...(resolvedPreset ? {resolvedPreset} : {}),
    rounding: parsed.rounding ?? {decimals: 2, mode: 'half_away_from_zero'},
    minimumStakeMinor: parsed.minimumStakeMinor ?? 100,
    bankrollFloorMinor: 0,
    allowFinalAllIn: parsed.allowFinalAllIn ?? false,
  };
}

function labelForOutcome(outcome: ApproxOutcomeDefinition): string {
  if (outcome.grossMultiplierBps === 0) return 'MISS';
  if (outcome.grossMultiplierBps === 10_000) return 'RETURN';
  return `${outcome.grossMultiplierBps / 10_000}×`;
}

export function generateOutcomeStream(input: {
  seed: string;
  rounds: number;
  streamId: string;
  config: DeepReadonly<ApproxGameConfig>;
}): OutcomeStream {
  const prng = new SeededPrng(input.seed);
  const totalWeight = input.config.outcomeTable.reduce((sum, entry) => sum + entry.weight, 0);
  const events: OutcomeEvent[] = [];
  for (let round = 1; round <= input.rounds; round += 1) {
    const sourceRoll = prng.nextUint32();
    const bucket = sourceRoll % totalWeight;
    let cursor = 0;
    let selected = input.config.outcomeTable[input.config.outcomeTable.length - 1]!;
    for (const candidate of input.config.outcomeTable) {
      cursor += candidate.weight;
      if (bucket < cursor) {
        selected = candidate;
        break;
      }
    }
    const tags: string[] = [selected.eventClass];
    if (selected.intensity >= 2) tags.push('big-hit');
    if (selected.eventClass === 'feature') tags.push('feature');
    events.push({
      eventId: `${input.streamId}-round-${String(round).padStart(5, '0')}`,
      round,
      outcomeId: selected.id,
      outcomeLabel: labelForOutcome(selected),
      segmentId: selected.segmentId,
      grossMultiplierBps: selected.grossMultiplierBps,
      eventClass: selected.eventClass,
      intensity: selected.intensity,
      tags,
      sourceRoll,
    });
  }
  return {streamId: input.streamId, events};
}
