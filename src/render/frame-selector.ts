import type {DeepReadonly} from '../contracts/common';
import type {StoryPlanV1} from '../contracts/story-plan';

export interface SelectedFrame {
  name: string;
  frame: number;
}

function frameInside(start: number, end: number, progress: number): number {
  return Math.min(end - 1, Math.max(start, Math.round(start + (end - start - 1) * progress)));
}

export function selectGoldenFrames(story: DeepReadonly<StoryPlanV1>): SelectedFrame[] {
  const byKind = (kind: string, occurrence = 0) => story.beats.filter((beat) => beat.kind === kind)[occurrence];
  const hook = byKind('hook') ?? story.beats[0]!;
  const setup = byKind('setup') ?? hook;
  const progress = byKind('progress') ?? setup;
  const threat = byKind('threat') ?? byKind('hope') ?? progress;
  const climax = byKind('climax') ?? story.beats.at(-3) ?? progress;
  const reveal = byKind('reveal') ?? story.beats.at(-2) ?? climax;
  const outro = byKind('outro') ?? story.beats.at(-1)!;
  return [
    {name: '01-hook', frame: frameInside(hook.startFrame, hook.endFrameExclusive, .55)},
    {name: '02-condition', frame: frameInside(setup.startFrame, setup.endFrameExclusive, .62)},
    {name: '03-spin', frame: frameInside(progress.startFrame, progress.endFrameExclusive, .42)},
    {name: '04-turn', frame: frameInside(threat.startFrame, threat.endFrameExclusive, .58)},
    {name: '05-suspense', frame: Math.max(climax.startFrame, climax.endFrameExclusive - 8)},
    {name: '06-reveal', frame: frameInside(reveal.startFrame, reveal.endFrameExclusive, .24)},
    {name: '07-result', frame: frameInside(outro.startFrame, outro.endFrameExclusive, .56)},
  ];
}
