import type {DeepReadonly} from '../contracts/common';
import type {SimulationResultV1} from '../contracts/simulation';
import type {StoryPlanV1} from '../contracts/story-plan';

export class TemporalTruthError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'TemporalTruthError';
  }
}

export function assertTemporalTruth(plan: DeepReadonly<StoryPlanV1>, simulation: DeepReadonly<SimulationResultV1>): void {
  if (plan.beats.length === 0 || plan.beats[0]?.startFrame !== 0) throw new TemporalTruthError('Story must start at frame 0');
  let previousEnd = 0;
  let previousRound = 0;
  for (const beat of plan.beats) {
    if (beat.startFrame !== previousEnd) throw new TemporalTruthError(`Unexpected gap/overlap before ${beat.beatId}`);
    if (beat.endFrameExclusive <= beat.startFrame || beat.endFrameExclusive > plan.durationInFrames) throw new TemporalTruthError(`Invalid frame range for ${beat.beatId}`);
    if (beat.visibility.visibleRoundFrom < previousRound || beat.visibility.visibleThroughRound < beat.visibility.visibleRoundFrom) throw new TemporalTruthError(`Non-monotonic visibility in ${beat.beatId}`);
    if (beat.visibility.visibleThroughRound > simulation.run.roundCount) throw new TemporalTruthError(`Visibility exceeds simulation at ${beat.beatId}`);
    for (const revealId of beat.visibility.allowedRevealIds) {
      const rule = plan.revealRegistry.find((entry) => entry.revealId === revealId);
      if (!rule || beat.startFrame < rule.earliestFrame) throw new TemporalTruthError(`Reveal ${revealId} is early in ${beat.beatId}`);
    }
    previousEnd = beat.endFrameExclusive;
    previousRound = beat.visibility.visibleThroughRound;
  }
  if (previousEnd !== plan.durationInFrames) throw new TemporalTruthError('Story beats do not fill composition duration');
  const resultCues = plan.tracks.text.filter((cue) => cue.role === 'result');
  const resultRule = plan.revealRegistry.find((rule) => rule.revealId === 'final-result');
  if (!resultRule || resultCues.some((cue) => cue.startFrame < resultRule.earliestFrame)) throw new TemporalTruthError('Final result text is visible before reveal');
}
