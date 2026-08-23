import type {DeepReadonly} from '../contracts/common';
import type {ReelSpecV1} from '../contracts/reel-spec';
import type {OutcomeEvent, ParticipantRun, SimulationResultV1} from '../contracts/simulation';
import type {StoryBeat, StoryPlanV1, WheelCue} from '../contracts/story-plan';
import type {FinalResultState, VisibleRunState, VisibleWheelSegment, VisualState} from '../contracts/visual-state';
import {formatMoney} from '../core/money';

const TAU = Math.PI * 2;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function activeBeat(plan: DeepReadonly<StoryPlanV1>, frame: number): DeepReadonly<StoryBeat> {
  return plan.beats.find((beat) => frame >= beat.startFrame && frame < beat.endFrameExclusive) ?? plan.beats.at(-1)!;
}

function visibleRoundForBeat(beat: DeepReadonly<StoryBeat>, frame: number): number {
  if (beat.visibility.visibleRoundFrom === beat.visibility.visibleThroughRound) return beat.visibility.visibleThroughRound;
  const denominator = Math.max(1, beat.endFrameExclusive - beat.startFrame - 1);
  const progress = clamp((frame - beat.startFrame) / denominator, 0, 1);
  return Math.floor(beat.visibility.visibleRoundFrom + (beat.visibility.visibleThroughRound - beat.visibility.visibleRoundFrom) * progress);
}

function visibleRun(run: DeepReadonly<ParticipantRun>, currentRound: number): VisibleRunState {
  const points = run.points.filter((point) => point.round <= currentRound).map((point) => ({...point, tags: [...point.tags]}));
  const last = points.at(-1);
  const currentBankrollMinor = last?.bankrollAfterMinor ?? run.startBankrollMinor;
  const visiblePeakMinor = points.reduce((peak, point) => Math.max(peak, point.bankrollAfterMinor), run.startBankrollMinor);
  return {
    participantId: run.participantId,
    label: run.label,
    startBankrollMinor: run.startBankrollMinor,
    currentBankrollMinor,
    visiblePeakMinor,
    points,
    alive: last?.alive ?? true,
  };
}

function uniqueWheelSegments(simulation: DeepReadonly<SimulationResultV1>): VisibleWheelSegment[] {
  const found = new Map<string, VisibleWheelSegment>();
  for (const event of simulation.outcomeStreams.flatMap((stream) => stream.events)) {
    if (!found.has(event.segmentId)) {
      found.set(event.segmentId, {segmentId: event.segmentId, label: event.outcomeLabel, eventClass: event.eventClass, intensity: event.intensity});
    }
  }
  const observed = [...found.values()];
  if (observed.length === 0) return [{segmentId: 'empty', label: '—', eventClass: 'refund', intensity: 0}];
  const expanded: VisibleWheelSegment[] = [];
  while (expanded.length < Math.max(8, observed.length)) expanded.push({...observed[expanded.length % observed.length]!});
  return expanded;
}

function easedDeceleration(progress: number): number {
  return 1 - Math.pow(1 - clamp(progress, 0, 1), 4);
}

function targetAngle(startAngle: number, cue: DeepReadonly<WheelCue>, segments: readonly VisibleWheelSegment[]): number {
  const index = Math.max(0, segments.findIndex((segment) => segment.segmentId === cue.targetSegmentId));
  const segmentAngle = TAU / segments.length;
  const desiredModulo = -Math.PI / 2 - (index + 0.5) * segmentAngle;
  const moduloDelta = ((desiredModulo - startAngle) % TAU + TAU) % TAU;
  return startAngle + Math.floor(cue.totalTurnsMilli / 1_000) * TAU + moduloDelta;
}

function wheelAngleAtFrame(frame: number, cues: readonly DeepReadonly<WheelCue>[], segments: readonly VisibleWheelSegment[], ambient = false): number {
  const ambientRadiansPerFrame = .0125;
  let angle = -0.2;
  let cursorFrame = 0;
  for (const cue of cues) {
    if (ambient) angle += Math.max(0, Math.min(frame, cue.startFrame) - cursorFrame) * ambientRadiansPerFrame;
    const target = targetAngle(angle, cue, segments);
    if (frame < cue.startFrame) return angle;
    if (frame <= cue.settleFrame) {
      const progress = (frame - cue.startFrame) / Math.max(1, cue.settleFrame - cue.startFrame);
      return angle + (target - angle) * easedDeceleration(progress);
    }
    angle = target;
    cursorFrame = cue.settleFrame;
  }
  return ambient && cues.length === 0 ? angle + frame * ambientRadiansPerFrame : angle;
}

function currentOutcome(simulation: DeepReadonly<SimulationResultV1>, currentRound: number): OutcomeEvent | undefined {
  const found = simulation.outcomeStreams[0]?.events.find((event) => event.round === currentRound)
    ?? (currentRound > 0 ? simulation.outcomeStreams[0]?.events.filter((event) => event.round <= currentRound).at(-1) : undefined);
  return found ? {...found, tags: [...found.tags]} : undefined;
}

function proofLines(spec: DeepReadonly<ReelSpecV1>, simulation: DeepReadonly<SimulationResultV1>): string[] {
  const lines = simulation.featuredRuns.slice(0, 3).map((run) => `${run.label}: FINAL ${formatMoney(run.summary.finalBankrollMinor)} • PEAK ${formatMoney(run.summary.peakBankrollMinor)} • ${run.points.length} ROUNDS`);
  if (simulation.selectionAudit) lines.push(simulation.selectionAudit.disclosedAs);
  if (spec.format.kind === 'one-vs-ten') lines.push('SAME ILLUSTRATIVE OUTCOME STREAM');
  if (spec.format.kind === 'race-to-1000') lines.push(spec.format.sharedOutcomeStream ? 'SAME SPINS • 8 BETTING RULES' : 'INDEPENDENT ILLUSTRATIVE RUNS');
  return lines;
}

function resultTone(spec: DeepReadonly<ReelSpecV1>, simulation: DeepReadonly<SimulationResultV1>): FinalResultState['tone'] {
  const first = simulation.featuredRuns[0]!;
  if (spec.format.kind === 'survive-500') return first.summary.bankruptcyRound === undefined && first.points.length >= spec.format.roundCount ? 'positive' : 'danger';
  if (spec.format.kind === 'luckiest-player') return 'positive';
  if (spec.format.kind === 'stop-or-continue') return first.summary.finalBankrollMinor >= first.startBankrollMinor ? 'positive' : 'danger';
  if (spec.format.kind === 'impossible-target') return (simulation.population?.targetThresholds.at(-1)?.everReachedCount ?? 0) > 0 ? 'positive' : 'neutral';
  if (spec.format.kind === 'race-to-1000') return simulation.featuredRuns.some((run) => run.summary.targetReachedRound !== undefined) ? 'positive' : 'neutral';
  return 'neutral';
}

function survivalResultCategories(simulation: DeepReadonly<SimulationResultV1>, populationSize: number): NonNullable<NonNullable<VisualState['survivalExperience']>['resultCategories']> {
  const finalScores = (simulation.population?.rankedCandidates ?? [])
    .filter((candidate) => candidate.scoreId === 'highest-final-bankroll')
    .map((candidate) => candidate.scoreMilli);
  const selectedFinal = simulation.featuredRuns[0]?.summary.finalBankrollMinor ?? finalScores[0] ?? 0;
  return [
    {
      id: 'rare-lucky',
      label: 'RARE LUCKY',
      rangeLabel: '$500–$2,000',
      count: finalScores.filter((value) => value >= 50_000 && value <= 200_000).length,
    },
    {
      id: 'very-lucky',
      label: 'VERY LUCKY',
      rangeLabel: '$3,000–$10,000',
      count: finalScores.filter((value) => value >= 300_000 && value <= 1_000_000).length,
    },
    {
      id: 'best-of-population',
      label: `BEST OF ${populationSize.toLocaleString('en-US')}`,
      rangeLabel: '$10,000–$30,000 FORECAST',
      amountMinor: selectedFinal,
    },
  ];
}

export function resolveVisualState(input: {
  frame: number;
  spec: DeepReadonly<ReelSpecV1>;
  simulation: DeepReadonly<SimulationResultV1>;
  story: DeepReadonly<StoryPlanV1>;
}): VisualState {
  const frame = clamp(Math.floor(input.frame), 0, input.story.durationInFrames - 1);
  const beat = activeBeat(input.story, frame);
  const currentRound = visibleRoundForBeat(beat, frame);
  const segments = uniqueWheelSegments(input.simulation);
  const isSurvivalExperience = input.spec.format.kind === 'survive-500';
  const angle = wheelAngleAtFrame(frame, input.story.tracks.wheel, segments, isSurvivalExperience);
  const priorAngle = wheelAngleAtFrame(Math.max(0, frame - 1), input.story.tracks.wheel, segments, isSurvivalExperience);
  const activeWheelCue = input.story.tracks.wheel.find((cue) => frame >= cue.startFrame && frame <= cue.settleFrame);
  const roundOutcome = currentOutcome(input.simulation, currentRound);
  const revealAllowed = beat.visibility.allowedRevealIds.includes('final-result');
  const headlineCue = input.story.tracks.text.find((cue) => cue.role === 'headline' && frame >= cue.startFrame && frame < cue.endFrameExclusive);
  const resultCue = input.story.tracks.text.find((cue) => cue.role === 'result' && frame >= cue.startFrame && frame < cue.endFrameExclusive);
  const finalResult = revealAllowed && resultCue
    ? {
        revealStartFrame: resultCue.startFrame,
        headline: resultCue.text,
        tone: resultTone(input.spec, input.simulation),
        summaries: input.simulation.featuredRuns.map((run) => ({participantId: run.participantId, label: run.label, summary: {...run.summary}})),
        proofLines: proofLines(input.spec, input.simulation),
      }
    : undefined;
  const beatProgress = clamp((frame - beat.startFrame) / Math.max(1, beat.endFrameExclusive - beat.startFrame - 1), 0, 1);
  const finalPopulation = input.simulation.population?.milestones.at(-1);
  const selectedRun = input.simulation.featuredRuns[0];
  const selectedEventIds = new Set(selectedRun?.points.map((point) => point.outcomeEventId) ?? []);
  const selectedBestOutcome = input.simulation.outcomeStreams
    .flatMap((stream) => stream.events)
    .filter((event) => selectedEventIds.has(event.eventId))
    .sort((left, right) => right.grossMultiplierBps - left.grossMultiplierBps || left.round - right.round)[0];
  const outcomeSource = isSurvivalExperience && (beat.kind === 'climax' || beat.kind === 'reveal' || beat.kind === 'outro')
    ? selectedBestOutcome ?? roundOutcome
    : roundOutcome;
  const outcome = outcomeSource ? {...outcomeSource, tags: [...outcomeSource.tags]} : undefined;
  const populationSize = input.spec.format.kind === 'survive-500' ? input.spec.format.populationSize : 0;
  const processedCount = beat.kind === 'hook' ? 0 : beat.kind === 'setup' ? Math.round(populationSize * beatProgress) : populationSize;
  const finalAlive = finalPopulation?.aliveCount ?? populationSize;
  const survivedCount = populationSize > 0 ? Math.round(processedCount * finalAlive / populationSize) : 0;
  const survivalPhase = beat.kind === 'hook' ? 'hook' : beat.kind === 'setup' ? 'batch' : beat.kind === 'threat' ? 'distribution' : beat.kind === 'climax' ? 'verdict' : 'result';
  return {
    frame,
    activeBeatId: beat.beatId,
    beatStartFrame: beat.startFrame,
    beatEndFrameExclusive: beat.endFrameExclusive,
    beatKind: beat.kind,
    focalElementId: beat.focalElementId,
    layoutVariant: beat.layoutVariant,
    currentRound,
    visibleThroughRound: currentRound,
    ...(headlineCue ? {headline: {...headlineCue}} : {}),
    callouts: input.story.tracks.text.filter((cue) => cue.role === 'callout' && frame >= cue.startFrame && frame < cue.endFrameExclusive).map((cue) => ({...cue})),
    runs: input.simulation.featuredRuns.map((run) => visibleRun(run, currentRound)),
    populationMilestones: (input.simulation.population?.milestones ?? []).filter((milestone) => milestone.round <= currentRound).map((milestone) => ({...milestone, bankrollBands: milestone.bankrollBands.map((band) => ({...band}))})),
    targetThresholds: revealAllowed ? (input.simulation.population?.targetThresholds ?? []).map((threshold) => ({...threshold})) : [],
    ...(input.simulation.selectionAudit ? {selectionDisclosure: input.simulation.selectionAudit.disclosedAs} : {}),
    wheel: {
      rotationRadians: angle,
      angularVelocity: angle - priorAngle,
      spinning: Boolean(activeWheelCue && frame < activeWheelCue.settleFrame),
      settling: Boolean(activeWheelCue && frame >= activeWheelCue.startFrame + (activeWheelCue.settleFrame - activeWheelCue.startFrame) * 0.72),
      pointerEngaged: true,
      mode: isSurvivalExperience && beat.kind !== 'climax' && beat.kind !== 'reveal' && beat.kind !== 'outro' ? 'ambient' : 'verdict',
      ...(outcome ? {currentOutcome: outcome} : {}),
      segments,
    },
    ...(isSurvivalExperience ? {survivalExperience: {
      phase: survivalPhase,
      phaseProgress: beatProgress,
      populationSize,
      processedCount,
      survivedCount,
      bustedCount: processedCount - survivedCount,
      finalSurvivedCount: finalAlive,
      finalBustedCount: populationSize - finalAlive,
      finalBands: (finalPopulation?.bankrollBands ?? []).map((band) => ({
        label: band.toMinor === undefined ? `${formatMoney(band.fromMinor)}+` : band.fromMinor === 0 ? `<${formatMoney(band.toMinor)}` : `${formatMoney(band.fromMinor)}–${formatMoney(band.toMinor)}`,
        count: band.count,
      })),
      ...(revealAllowed ? {
        selectedFinalBankrollMinor: input.simulation.featuredRuns[0]?.summary.finalBankrollMinor ?? 0,
        bestFinalOutcomeLabel: selectedBestOutcome?.outcomeLabel ?? '—',
        resultCategories: survivalResultCategories(input.simulation, populationSize),
      } : {}),
    }} : {}),
    ...(finalResult ? {finalResult} : {}),
  };
}
