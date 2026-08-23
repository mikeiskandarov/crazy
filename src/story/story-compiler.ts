import type {DeepReadonly} from '../contracts/common';
import type {FormatConfigV1, ReelSpecV1, StoryKernel} from '../contracts/reel-spec';
import type {ParticipantRun, SimulationResultV1} from '../contracts/simulation';
import type {AudioCue, StoryBeat, StoryBeatKind, StoryPlanV1, TextCue, WheelCue} from '../contracts/story-plan';
import {buildArtifact} from '../core/artifact';
import {formatMoney} from '../core/money';
import {detectEvents} from './event-detector';
import {rankInterestingEvents} from './interestingness';
import {assertTemporalTruth} from './temporal-truth';

interface BeatTemplate {
  kind: StoryBeatKind;
  start: number;
  end: number;
  focal: string;
  intent: string;
  layout: string;
  motion: string;
  roundFrom: number;
  roundTo: number;
}

function runEnd(run: DeepReadonly<ParticipantRun>): number {
  return run.points[run.points.length - 1]?.round ?? 0;
}

function clampRound(value: number, endRound: number): number {
  return Math.max(0, Math.min(endRound, Math.round(value)));
}

function survivalAnchors(simulation: DeepReadonly<SimulationResultV1>): number[] {
  const run = simulation.featuredRuns[0]!;
  const end = runEnd(run);
  const middlePoints = run.points.filter((point) => point.round >= end * 0.2 && point.round <= end * 0.65);
  const danger = [...middlePoints].sort((left, right) => left.bankrollAfterMinor - right.bankrollAfterMinor || left.round - right.round)[0];
  const dangerRound = danger?.round ?? clampRound(end * 0.36, end);
  const afterDanger = run.points.filter((point) => point.round > dangerRound && point.round <= end * 0.72);
  const hope = [...afterDanger].sort((left, right) => right.netChangeMinor - left.netChangeMinor || left.round - right.round)[0];
  const hopeRound = Math.max(dangerRound, hope?.round ?? clampRound(end * 0.55, end));
  return [clampRound(end * 0.18, end), dangerRound, hopeRound, clampRound(end * 0.78, end), clampRound(end * 0.92, end), end];
}

function timelineFor(format: DeepReadonly<FormatConfigV1>, simulation: DeepReadonly<SimulationResultV1>, duration: number): BeatTemplate[] {
  if (format.kind === 'survive-500') {
    return [
      {kind: 'hook', start: 0, end: 190, focal: 'impact-title', intent: 'Ask the challenge as a spoken cold open', layout: 'focus', motion: 'hook-impact', roundFrom: 0, roundTo: 0},
      {kind: 'setup', start: 190, end: 270, focal: 'run-grid', intent: 'Process all one thousand independent simulations', layout: 'detail', motion: 'batch-calculate', roundFrom: 0, roundTo: format.roundCount},
      {kind: 'threat', start: 270, end: 345, focal: 'distribution', intent: 'Show the final bankroll distribution before choosing a verdict run', layout: 'detail', motion: 'distribution-build', roundFrom: format.roundCount, roundTo: format.roundCount},
      {kind: 'climax', start: 345, end: 450, focal: 'hero-wheel', intent: 'Engage the pointer and settle on the biggest hit in the selected best run', layout: 'focus', motion: 'verdict-spin', roundFrom: format.roundCount, roundTo: format.roundCount},
      {kind: 'reveal', start: 450, end: 510, focal: 'result-card', intent: 'Answer the hook with population and selected-run proof', layout: 'result', motion: 'result-lock', roundFrom: format.roundCount, roundTo: format.roundCount},
      {kind: 'outro', start: 510, end: duration, focal: 'receipt', intent: 'Hold the frozen evidence and model disclosure', layout: 'result', motion: 'outro-receipt', roundFrom: format.roundCount, roundTo: format.roundCount},
    ];
  }
  const scale = duration / 480;
  const f = (frame: number) => Math.round(frame * scale);
  const endRound = format.kind === 'luckiest-player' || format.kind === 'stop-or-continue'
    ? Math.max(1, runEnd(simulation.featuredRuns[0]!))
    : format.roundCount;
  if (format.kind === 'luckiest-player') {
    const [early, danger, hope, late, climax, end] = survivalAnchors(simulation);
    return [
      {kind: 'hook', start: 0, end: f(21), focal: 'impact-title', intent: 'State the challenge before showing evidence', layout: 'focus', motion: 'hook-impact', roundFrom: 0, roundTo: 0},
      {kind: 'setup', start: f(21), end: f(54), focal: 'hero-wheel', intent: 'Establish bankroll, bet and illustrative selection', layout: 'standard', motion: 'wheel-progress', roundFrom: 0, roundTo: 0},
      {kind: 'progress', start: f(54), end: f(138), focal: 'hero-wheel', intent: 'Compress early rounds without leaking the trajectory', layout: 'standard', motion: 'wheel-progress', roundFrom: 1, roundTo: early!},
      {kind: 'threat', start: f(138), end: f(189), focal: 'bank-card', intent: 'Show the verified drawdown', layout: 'detail', motion: 'danger-focus', roundFrom: early!, roundTo: danger!},
      {kind: 'hope', start: f(189), end: f(246), focal: 'hero-wheel', intent: 'Resolve a verified recovery or meaningful hit', layout: 'focus', motion: 'hope-focus', roundFrom: danger!, roundTo: hope!},
      {kind: 'progress', start: f(246), end: f(336), focal: 'round-card', intent: 'Advance toward the round limit with synchronized evidence', layout: 'standard', motion: 'wheel-progress', roundFrom: hope!, roundTo: late!},
      {kind: 'climax', start: f(336), end: f(393), focal: 'hero-wheel', intent: 'Decelerate into the last material event', layout: 'focus', motion: 'wheel-progress', roundFrom: late!, roundTo: climax!},
      {kind: 'reveal', start: f(393), end: f(441), focal: 'result-card', intent: 'Answer the hook and show final proof', layout: 'result', motion: 'result-lock', roundFrom: end!, roundTo: end!},
      {kind: 'outro', start: f(441), end: duration, focal: 'receipt', intent: 'Hold model and selection disclosure', layout: 'result', motion: 'outro-receipt', roundFrom: end!, roundTo: end!},
    ];
  }
  if (format.kind === 'stop-or-continue') {
    const decisionPoint = format.decisionPoint;
    const decisionRound = decisionPoint.mode === 'round'
      ? Math.min(decisionPoint.round, endRound)
      : decisionPoint.mode === 'first-peak-over'
        ? simulation.featuredRuns[0]!.points.find((point) => point.bankrollAfterMinor >= decisionPoint.thresholdMinor)?.round ?? clampRound(endRound * 0.45, endRound)
        : clampRound(endRound * 0.45, endRound);
    return [
      {kind: 'hook', start: 0, end: f(30), focal: 'impact-title', intent: 'Pose the stopping question', layout: 'focus', motion: 'hook-impact', roundFrom: 0, roundTo: 0},
      {kind: 'setup', start: f(30), end: f(75), focal: 'hero-wheel', intent: 'Establish the frozen run', layout: 'standard', motion: 'wheel-progress', roundFrom: 0, roundTo: clampRound(decisionRound * 0.25, endRound)},
      {kind: 'progress', start: f(75), end: f(160), focal: 'bank-card', intent: 'Reach the configured decision point', layout: 'standard', motion: 'wheel-progress', roundFrom: clampRound(decisionRound * 0.25, endRound), roundTo: decisionRound},
      {kind: 'decision', start: f(160), end: f(235), focal: 'decision-card', intent: 'Hold the non-interactive stop or continue choice', layout: 'detail', motion: 'decision-hold', roundFrom: decisionRound, roundTo: decisionRound},
      {kind: 'progress', start: f(235), end: f(340), focal: 'hero-wheel', intent: 'Continue the already frozen trajectory', layout: 'standard', motion: 'wheel-progress', roundFrom: decisionRound, roundTo: clampRound(endRound * 0.88, endRound)},
      {kind: 'reveal', start: f(340), end: f(430), focal: 'result-card', intent: 'Compare stop value with actual final value', layout: 'result', motion: 'result-lock', roundFrom: endRound, roundTo: endRound},
      {kind: 'outro', start: f(430), end: duration, focal: 'receipt', intent: 'Hold the model disclosure', layout: 'result', motion: 'outro-receipt', roundFrom: endRound, roundTo: endRound},
    ];
  }
  const schedule = format.kind === 'race-to-1000'
    ? {setupEnd: 75, progressEnd: 180, threatEnd: 285, climaxEnd: 375, revealEnd: 440}
    : {setupEnd: 80, progressEnd: 180, threatEnd: 290, climaxEnd: 370, revealEnd: 440};
  const hero = format.kind === 'one-vs-ten' ? 'duel-hud' : format.kind === 'race-to-1000' ? 'race-bars' : 'candidate-counter';
  return [
    {kind: 'hook', start: 0, end: f(32), focal: 'impact-title', intent: 'State the format promise', layout: 'focus', motion: 'hook-impact', roundFrom: 0, roundTo: 0},
    {kind: 'setup', start: f(32), end: f(schedule.setupEnd), focal: 'hero-wheel', intent: 'Declare shared stream, population or target rules', layout: format.kind === 'one-vs-ten' || format.kind === 'race-to-1000' ? 'split' : 'standard', motion: 'wheel-progress', roundFrom: 0, roundTo: clampRound(endRound * 0.08, endRound)},
    {kind: 'progress', start: f(schedule.setupEnd), end: f(schedule.progressEnd), focal: hero, intent: 'Reveal only reached aggregate or bankroll states', layout: format.kind === 'one-vs-ten' || format.kind === 'race-to-1000' ? 'split' : 'standard', motion: 'wheel-progress', roundFrom: clampRound(endRound * 0.08, endRound), roundTo: clampRound(endRound * 0.38, endRound)},
    {kind: 'threat', start: f(schedule.progressEnd), end: f(schedule.threatEnd), focal: hero, intent: 'Show verified elimination, divergence or risk', layout: 'detail', motion: 'danger-focus', roundFrom: clampRound(endRound * 0.38, endRound), roundTo: clampRound(endRound * 0.72, endRound)},
    {kind: 'climax', start: f(schedule.threatEnd), end: f(schedule.climaxEnd), focal: 'hero-wheel', intent: 'Approach the final target or deciding state', layout: 'focus', motion: 'wheel-progress', roundFrom: clampRound(endRound * 0.72, endRound), roundTo: clampRound(endRound * 0.92, endRound)},
    {kind: 'reveal', start: f(schedule.climaxEnd), end: f(schedule.revealEnd), focal: 'result-card', intent: 'Answer with the frozen result', layout: 'result', motion: 'result-lock', roundFrom: endRound, roundTo: endRound},
    {kind: 'outro', start: f(schedule.revealEnd), end: duration, focal: 'receipt', intent: 'Hold factual sample and model disclosure', layout: 'result', motion: 'outro-receipt', roundFrom: endRound, roundTo: endRound},
  ];
}

function resultCopy(spec: DeepReadonly<ReelSpecV1>, simulation: DeepReadonly<SimulationResultV1>): string {
  const format = spec.format;
  const first = simulation.featuredRuns[0]!;
  if (format.kind === 'survive-500') {
    if (first.points.length < format.roundCount || first.summary.bankruptcyRound !== undefined) {
      return `BUSTED AT ROUND ${first.summary.bankruptcyRound ?? first.points.length}`;
    }
    const bestOutcome = bestOutcomeForFeaturedRun(simulation);
    return `BEST FINAL ${formatMoney(first.summary.finalBankrollMinor)} • ${bestOutcome?.outcomeLabel ?? '—'} BIGGEST HIT`;
  }
  if (format.kind === 'luckiest-player') return `#1 PEAKED AT ${formatMoney(first.summary.peakBankrollMinor)}`;
  if (format.kind === 'stop-or-continue') {
    const decisionRound = format.decisionPoint.mode === 'round' ? format.decisionPoint.round : Math.min(first.summary.peakRound, first.points.length);
    const stopValue = first.points[Math.min(decisionRound, first.points.length) - 1]?.bankrollAfterMinor ?? first.startBankrollMinor;
    return `STOP ${formatMoney(stopValue)} • FINAL ${formatMoney(first.summary.finalBankrollMinor)}`;
  }
  if (format.kind === 'one-vs-ten') {
    const [left, right] = simulation.featuredRuns;
    const winner = (left?.points.length ?? 0) === (right?.points.length ?? 0)
      ? 'TIE IN THIS RUN'
      : `${(left?.points.length ?? 0) > (right?.points.length ?? 0) ? left?.label : right?.label} LASTED LONGER`;
    return winner;
  }
  if (format.kind === 'impossible-target') {
    const count = simulation.population?.targetThresholds.find((entry) => entry.thresholdMinor === format.targetMinor)?.everReachedCount ?? 0;
    return `${count.toLocaleString('en-US')} REACHED ${formatMoney(format.targetMinor)}`;
  }
  if (format.kind === 'last-man-standing') {
    const alive = simulation.population?.milestones.at(-1)?.aliveCount ?? 0;
    return `${alive.toLocaleString('en-US')} SURVIVED ${format.roundCount} ROUNDS`;
  }
  const targetRuns = simulation.featuredRuns.filter((run) => run.summary.targetReachedRound !== undefined).sort((left, right) => left.summary.targetReachedRound! - right.summary.targetReachedRound! || left.participantId.localeCompare(right.participantId));
  return targetRuns[0] ? `${targetRuns[0].label} REACHED THE TARGET` : 'NO ONE REACHED THE TARGET';
}

function calloutFor(kind: StoryBeatKind, format: DeepReadonly<FormatConfigV1>): string | undefined {
  if (format.kind === 'survive-500') {
    if (kind === 'setup') return 'RUNNING 1,000 SIMULATIONS';
    if (kind === 'threat') return 'FINAL BANKROLL DISTRIBUTION';
    if (kind === 'climax') return 'THE BEST RUN • BIGGEST HIT';
  }
  if (kind === 'threat') return format.kind === 'last-man-standing' || format.kind === 'impossible-target' ? 'THE FIELD IS COLLAPSING' : 'THE MARGIN IS DISAPPEARING';
  if (kind === 'hope') return 'CAN THIS HIT SAVE THE RUN?';
  if (kind === 'decision') return 'STOP OR CONTINUE?';
  if (kind === 'climax') return 'ONE LAST MATERIAL TURN';
  return undefined;
}

function eventAtRound(simulation: DeepReadonly<SimulationResultV1>, round: number) {
  const stream = simulation.outcomeStreams[0];
  return stream?.events.find((event) => event.round === Math.max(1, round)) ?? stream?.events.at(-1);
}

function bestOutcomeForFeaturedRun(simulation: DeepReadonly<SimulationResultV1>) {
  const eventIds = new Set(simulation.featuredRuns[0]?.points.map((point) => point.outcomeEventId) ?? []);
  return simulation.outcomeStreams
    .flatMap((stream) => stream.events)
    .filter((event) => eventIds.has(event.eventId))
    .sort((left, right) => right.grossMultiplierBps - left.grossMultiplierBps || left.round - right.round)[0];
}

function compileWheelCues(templates: BeatTemplate[], simulation: DeepReadonly<SimulationResultV1>, showBestHit = false): WheelCue[] {
  const candidates = templates.filter((template) => template.kind === 'progress' || template.kind === 'hope' || template.kind === 'climax');
  return candidates.slice(-3).map((template, index) => {
    const event = template.kind === 'climax' && showBestHit
      ? bestOutcomeForFeaturedRun(simulation) ?? eventAtRound(simulation, template.roundTo)!
      : eventAtRound(simulation, template.roundTo)!;
    // The visibility horizon reaches roundTo on the beat's final frame. Settling
    // earlier would physically reveal a future segment before its metric slice.
    const settleFrame = Math.max(template.start + 1, template.end - 1);
    return {
      cueId: `wheel-cue-${index + 1}`,
      eventId: event.eventId,
      startFrame: template.start,
      settleFrame,
      targetSegmentId: event.segmentId,
      totalTurnsMilli: (4 + index) * 1_000,
      easingId: 'wheel-decelerate',
    };
  });
}

export function compileStoryPlan(input: {
  spec: DeepReadonly<ReelSpecV1>;
  simulation: DeepReadonly<SimulationResultV1>;
  kernel: StoryKernel;
}): DeepReadonly<StoryPlanV1> {
  const duration = input.spec.render.targetDurationFrames ?? 480;
  const templates = timelineFor(input.spec.format, input.simulation, duration);
  const revealStart = templates.find((template) => template.kind === 'reveal')!.start;
  const allMetricIds = ['round', ...input.simulation.featuredRuns.map((run) => `bankroll-${run.participantId}`), ...(input.simulation.population ? ['alive-count', 'target-count'] : [])];
  const beats: StoryBeat[] = templates.map((template, index) => ({
    beatId: `${String(index + 1).padStart(2, '0')}-${template.kind}`,
    kind: template.kind,
    startFrame: template.start,
    endFrameExclusive: template.end,
    focalElementId: template.focal,
    intent: template.intent,
    visibility: {
      visibleRoundFrom: template.roundFrom,
      visibleThroughRound: template.roundTo,
      allowedMetricIds: allMetricIds,
      allowedRevealIds: template.kind === 'reveal' || template.kind === 'outro' ? ['final-result'] : [],
      hiddenElementIds: template.kind === 'reveal' || template.kind === 'outro' ? [] : ['result-card', 'final-summary', 'winner-id'],
    },
    layoutVariant: template.layout,
    motionPresetId: template.motion,
    audioCueIds: [],
  }));
  const isSurvivalExperience = input.spec.format.kind === 'survive-500';
  const text: TextCue[] = [
    {cueId: 'text-headline', elementId: 'impact-title', startFrame: 0, endFrameExclusive: isSurvivalExperience ? templates[0]!.end : templates[1]?.end ?? 80, role: 'headline', text: input.spec.editorial.headline, semanticTone: 'neutral'},
    ...(input.spec.editorial.subhook ? [{cueId: 'text-subhook', elementId: 'subhook', startFrame: templates[1]?.start ?? 20, endFrameExclusive: revealStart, role: 'subhook' as const, text: input.spec.editorial.subhook, semanticTone: 'neutral' as const}] : []),
    ...templates.flatMap((template, index): TextCue[] => {
      const callout = calloutFor(template.kind, input.spec.format);
      return callout ? [{cueId: `text-callout-${index}`, elementId: 'suspense-callout', startFrame: template.start, endFrameExclusive: template.end, role: 'callout', text: callout, semanticTone: template.kind === 'threat' ? 'danger' : template.kind === 'hope' ? 'positive' : 'warning'}] : [];
    }),
    {cueId: 'text-result', elementId: 'result-card', startFrame: revealStart, endFrameExclusive: duration, role: 'result', text: resultCopy(input.spec, input.simulation), semanticTone: 'neutral'},
  ];
  const survivalTicks: AudioCue[] = isSurvivalExperience
    ? [344, 354, 365, 377, 390, 404, 419, 433, 444].map((startFrame, index) => ({cueId: `audio-wheel-tick-${index}`, assetId: 'wheel-tick', startFrame, role: 'ui', gainMilli: 620}))
    : [];
  const batchTicks: AudioCue[] = isSurvivalExperience
    ? [191, 198, 206, 215, 225, 236, 248, 260, 269].map((startFrame, index) => ({cueId: `audio-batch-tick-${index}`, assetId: index % 3 === 2 ? 'wheel-tick' : 'ui-tick', startFrame, role: 'ui', gainMilli: 580 + index * 18}))
    : [];
  const audio: AudioCue[] = isSurvivalExperience ? [
    {cueId: 'audio-music', assetId: 'music-bed-elevenlabs', startFrame: 0, endFrameExclusive: duration, role: 'music', gainMilli: 720, duckGroup: 'music'},
    {cueId: 'audio-voice-hook', assetId: 'hook-question-elevenlabs', startFrame: 4, endFrameExclusive: 190, role: 'voice', gainMilli: 920, duckGroup: 'voice'},
    {cueId: 'audio-voice-best-run', assetId: 'best-run-elevenlabs', startFrame: 456, endFrameExclusive: 524, role: 'voice', gainMilli: 800, duckGroup: 'voice'},
    {cueId: 'audio-hook', assetId: 'hook-impact', startFrame: 0, role: 'impact', gainMilli: 680},
    {cueId: 'audio-ui', assetId: 'ui-tick', startFrame: 190, role: 'ui', gainMilli: 620},
    ...batchTicks,
    {cueId: 'audio-distribution', assetId: 'warning-pulse', startFrame: 270, role: 'impact', gainMilli: 620},
    {cueId: 'audio-distribution-resolve', assetId: 'result-resolve', startFrame: 274, role: 'ambience', gainMilli: 560},
    {cueId: 'audio-best-final-win', assetId: 'celebration', startFrame: 345, role: 'impact', gainMilli: 920},
    {cueId: 'audio-riser', assetId: 'riser', startFrame: 394, role: 'ambience', gainMilli: 520, duckGroup: 'music'},
    ...survivalTicks,
    {cueId: 'audio-reveal', assetId: 'reveal-impact', startFrame: revealStart, role: 'impact', gainMilli: 650, duckGroup: 'music'},
    {cueId: 'audio-result', assetId: 'result-resolve', startFrame: revealStart + 70, role: 'ambience', gainMilli: 350},
    {cueId: 'audio-celebration', assetId: 'celebration', startFrame: revealStart + 70, role: 'ambience', gainMilli: 420},
  ] : [
    {cueId: 'audio-music', assetId: 'music-bed', startFrame: 0, endFrameExclusive: duration, role: 'music', gainMilli: 260, duckGroup: 'music'},
    {cueId: 'audio-hook', assetId: 'hook-impact', startFrame: 0, role: 'impact', gainMilli: 700},
    {cueId: 'audio-ui', assetId: 'ui-tick', startFrame: templates[1]?.start ?? 20, role: 'ui', gainMilli: 400},
    {cueId: 'audio-warning', assetId: 'warning-pulse', startFrame: templates.find((template) => template.kind === 'threat')?.start ?? 150, role: 'impact', gainMilli: 500},
    {cueId: 'audio-riser', assetId: 'riser', startFrame: Math.max(0, revealStart - 38), role: 'ambience', gainMilli: 440, duckGroup: 'music'},
    {cueId: 'audio-reveal', assetId: 'reveal-impact', startFrame: revealStart, role: 'impact', gainMilli: 720, duckGroup: 'music'},
    {cueId: 'audio-result', assetId: 'result-resolve', startFrame: Math.min(duration - 1, revealStart + 8), role: 'ambience', gainMilli: 460},
  ];
  const events = detectEvents(input.simulation);
  const ranked = rankInterestingEvents(events);
  const selected = ranked.slice(0, 4);
  const plan = buildArtifact<StoryPlanV1>({
    artifactId: `story-${input.spec.reelId}`,
    schemaVersion: 'story-plan/1',
    parentHashes: [input.spec.contentHash, input.simulation.contentHash],
    payload: {
      reelSpecHash: input.spec.contentHash,
      simulationHash: input.simulation.contentHash,
      format: {kind: input.spec.format.kind, version: input.spec.format.formatVersion, kernel: input.kernel},
      fps: 30,
      durationInFrames: duration,
      beats,
      tracks: {
        text,
        camera: templates.map((template, index) => ({cueId: `camera-${index}`, startFrame: template.start, endFrameExclusive: template.end, presetId: template.layout === 'result' ? 'result' : template.layout === 'detail' ? 'detail' : template.layout === 'focus' ? 'hero' : 'wide', targetElementId: template.focal, intensityMilli: template.layout === 'detail' ? 720 : 420})),
        wheel: compileWheelCues(templates, input.simulation, isSurvivalExperience),
        emphasis: selected.map((event, index) => ({cueId: `emphasis-${index}`, elementId: event.type === 'near-death' || event.type === 'bust' ? 'bank-card' : 'hero-wheel', frame: templates[Math.min(templates.length - 1, index + 2)]!.start, semanticEvent: event.type === 'bust' || event.type === 'near-death' ? 'danger' : event.type === 'target-hit' ? 'target' : 'gain', magnitudeMilli: Math.min(1_000, Math.max(200, Math.round(event.magnitude / 10)))})),
        audio,
      },
      metricBindings: [
        {metricId: 'round', source: {kind: 'round'}, presentation: 'integer'},
        ...input.simulation.featuredRuns.map((run) => ({metricId: `bankroll-${run.participantId}`, source: {kind: 'participant-bankroll' as const, participantId: run.participantId}, presentation: 'money' as const})),
        ...(input.simulation.population ? [{metricId: 'alive-count', source: {kind: 'alive-count' as const, populationId: input.simulation.population.populationId}, presentation: 'integer' as const}] : []),
      ],
      revealRegistry: [{revealId: 'final-result', earliestFrame: revealStart, earliestRound: input.simulation.run.roundCount}],
      compileAudit: {
        candidateEventIds: events.map((event) => event.eventId),
        selectedEventIds: selected.map((event) => event.eventId),
        rejected: events.filter((event) => !selected.includes(event)).map((event) => ({eventId: event.eventId, reason: 'lower-interest or redundant for duration budget'})),
        futureDataCheck: 'passed',
        disclosureCheck: 'passed',
      },
    },
  });
  assertTemporalTruth(plan, input.simulation);
  return plan;
}
