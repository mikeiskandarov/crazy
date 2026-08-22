import {z} from 'zod';
import type {AuthorReelSpecV1} from './reel-spec';

const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lowercase kebab-case');
const semver = z.string().regex(/^\d+\.\d+\.\d+$/, 'must be a SemVer');
const positiveMoney = z.number().int().positive().max(100_000_000_000);
const nonNegativeMoney = z.number().int().nonnegative().max(100_000_000_000);
const roundCount = z.number().int().min(1).max(10_000);
const milestones = z.array(z.number().int().positive()).min(1);
const configRecord = z.record(z.string(), z.unknown());

const strategyRef = z.strictObject({id, version: semver, config: configRecord});
const common = {
  formatVersion: semver,
  roundCount,
  startBankrollMinor: positiveMoney,
  displayRoundMilestones: milestones,
};

const survive = z.strictObject({
  kind: z.literal('survive-500'),
  ...common,
  populationSize: z.number().int().min(1).max(10_000),
  betMinor: positiveMoney,
  strategy: strategyRef,
  selection: z.discriminatedUnion('mode', [
    z.strictObject({mode: z.literal('fixed-run'), participantId: id}),
    z.strictObject({mode: z.literal('median-ending')}),
    z.strictObject({mode: z.literal('editorial-score'), scoreId: id}),
    z.strictObject({mode: z.literal('ranking'), metric: z.enum(['highest-final-bankroll', 'highest-peak', 'longest-survival', 'largest-comeback'])}),
  ]),
});

const luckiest = z.strictObject({
  kind: z.literal('luckiest-player'),
  ...common,
  populationSize: z.number().int().min(2).max(10_000),
  betMinor: positiveMoney,
  strategy: strategyRef,
  rankingMetric: z.enum(['highest-final-bankroll', 'highest-peak', 'longest-survival', 'largest-comeback']),
  discloseSelection: z.literal(true),
});

const stopOrContinue = z.strictObject({
  kind: z.literal('stop-or-continue'),
  ...common,
  betMinor: positiveMoney,
  strategy: strategyRef,
  decisionPoint: z.discriminatedUnion('mode', [
    z.strictObject({mode: z.literal('first-peak-over'), thresholdMinor: positiveMoney}),
    z.strictObject({mode: z.literal('round'), round: z.number().int().positive()}),
    z.strictObject({mode: z.literal('editorial-event'), eventType: id}),
  ]),
  pauseFrames: z.number().int().min(12).max(180),
  revealAlternative: z.boolean().optional().default(false),
});

const duelActor = z.strictObject({label: z.string().min(1).max(20), betMinor: positiveMoney, strategy: strategyRef});
const oneVsTen = z.strictObject({
  kind: z.literal('one-vs-ten'),
  ...common,
  left: duelActor,
  right: duelActor,
  sharedOutcomeStream: z.literal(true),
  finish: z.strictObject({mode: z.literal('round-limit')}),
});

const impossibleTarget = z.strictObject({
  kind: z.literal('impossible-target'),
  ...common,
  populationSize: z.number().int().min(2).max(250_000),
  betMinor: positiveMoney,
  strategy: strategyRef,
  targetMinor: positiveMoney,
  targetMilestonesMinor: z.array(positiveMoney).min(1),
  stopWhenFirstTargetReached: z.boolean(),
});

const lastMan = z.strictObject({
  kind: z.literal('last-man-standing'),
  ...common,
  populationSize: z.number().int().min(2).max(250_000),
  betMinor: positiveMoney,
  strategy: strategyRef,
  eliminationAtOrBelowMinor: nonNegativeMoney,
  stopAtSurvivors: z.number().int().min(1),
});

const racer = z.strictObject({
  racerId: id,
  label: z.string().min(1).max(20),
  betMinor: positiveMoney,
  strategy: strategyRef,
});
const race = z.strictObject({
  kind: z.literal('race-to-1000'),
  ...common,
  racerCount: z.number().int().min(2).max(10),
  targetMinor: positiveMoney,
  racers: z.array(racer).min(2).max(10),
  sharedOutcomeStream: z.boolean(),
});

const formatConfig = z.discriminatedUnion('kind', [survive, luckiest, stopOrContinue, oneVsTen, impossibleTarget, lastMan, race]);

export const authorReelSpecSchema = z.strictObject({
  schemaVersion: z.literal('reel-spec/1'),
  reelId: id,
  locale: z.enum(['en-US', 'ru-RU']),
  currency: z.literal('USD'),
  format: formatConfig,
  game: z.strictObject({
    adapterId: id,
    requestedModelVersion: id,
    seed: z.string().min(1).max(200),
    config: configRecord,
  }),
  editorial: z.strictObject({
    headline: z.string().min(1).max(90),
    subhook: z.string().min(1).max(90).optional(),
    disclosure: z.string().min(1).max(160),
    selectionDisclosure: z.string().min(1).max(160).optional(),
    tone: z.enum(['tension', 'spectacle', 'analytical']),
  }),
  compliance: z.strictObject({
    ageLabel: z.string().min(1).max(20).optional(),
    modelDisclosure: z.string().min(1).max(200),
    responsiblePlay: z.string().min(1).max(160).optional(),
    affiliateDisclosure: z.string().min(1).max(160).optional(),
    geoRestriction: z.string().min(1).max(160).optional(),
    noGuaranteeNotice: z.string().min(1).max(160).optional(),
  }),
  packs: z.strictObject({
    layout: z.strictObject({id, version: semver}),
    theme: z.strictObject({id, version: semver}),
    motionAudio: z.strictObject({id, version: semver}),
  }),
  render: z.strictObject({
    profile: z.enum(['draft', 'final', 'public']),
    fps: z.literal(30),
    targetDurationFrames: z.number().int().min(420).max(540).optional().default(480),
  }),
}).superRefine((spec, context) => {
  const format = spec.format;
  const sorted = [...format.displayRoundMilestones].sort((a, b) => a - b);
  if (new Set(sorted).size !== sorted.length || sorted.some((value, index) => value !== format.displayRoundMilestones[index])) {
    context.addIssue({code: 'custom', path: ['format', 'displayRoundMilestones'], message: 'milestones must be unique and sorted'});
  }
  if (sorted.some((value) => value > format.roundCount)) {
    context.addIssue({code: 'custom', path: ['format', 'displayRoundMilestones'], message: 'milestones cannot exceed roundCount'});
  }
  if (format.kind === 'stop-or-continue' && format.decisionPoint.mode === 'round' && format.decisionPoint.round > format.roundCount) {
    context.addIssue({code: 'custom', path: ['format', 'decisionPoint', 'round'], message: 'decision round must be inside the run'});
  }
  if (format.kind === 'impossible-target') {
    const thresholds = format.targetMilestonesMinor;
    if (format.targetMinor <= format.startBankrollMinor) {
      context.addIssue({code: 'custom', path: ['format', 'targetMinor'], message: 'target must exceed the start bankroll'});
    }
    if (thresholds.some((value, index) => index > 0 && value <= thresholds[index - 1]!)) {
      context.addIssue({code: 'custom', path: ['format', 'targetMilestonesMinor'], message: 'target milestones must be strictly increasing'});
    }
    if (thresholds[thresholds.length - 1] !== format.targetMinor) {
      context.addIssue({code: 'custom', path: ['format', 'targetMilestonesMinor'], message: 'last target milestone must equal targetMinor'});
    }
  }
  if (format.kind === 'last-man-standing' && format.stopAtSurvivors > format.populationSize) {
    context.addIssue({code: 'custom', path: ['format', 'stopAtSurvivors'], message: 'stopAtSurvivors cannot exceed populationSize'});
  }
  if (format.kind === 'race-to-1000') {
    if (format.racerCount !== format.racers.length) {
      context.addIssue({code: 'custom', path: ['format', 'racerCount'], message: 'racerCount must match racers.length'});
    }
    if (format.targetMinor <= format.startBankrollMinor) {
      context.addIssue({code: 'custom', path: ['format', 'targetMinor'], message: 'target must exceed the start bankroll'});
    }
    if (new Set(format.racers.map((entry) => entry.racerId)).size !== format.racers.length) {
      context.addIssue({code: 'custom', path: ['format', 'racers'], message: 'racer ids must be unique'});
    }
  }
  if (spec.render.profile === 'public' && spec.editorial.disclosure.trim().length === 0) {
    context.addIssue({code: 'custom', path: ['editorial', 'disclosure'], message: 'public profile requires disclosure'});
  }
});

export function parseAuthorReelSpec(input: unknown): AuthorReelSpecV1 {
  return authorReelSpecSchema.parse(input) as AuthorReelSpecV1;
}
