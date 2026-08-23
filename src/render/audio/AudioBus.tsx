import {Audio} from '@remotion/media';
import {Sequence, staticFile} from 'remotion';
import type {StoryPlanV1} from '../../contracts/story-plan';

const audioFiles: Record<string, string> = {
  'music-bed': 'assets/audio/music-bed.wav',
  'music-bed-elevenlabs': 'assets/audio/music-bed-elevenlabs.mp4',
  'hook-question-elevenlabs': 'assets/audio/hook-question-elevenlabs.mp3',
  'best-run-elevenlabs': 'assets/audio/best-run-elevenlabs.mp3',
  'hook-impact': 'assets/audio/hook-impact.wav',
  'ui-tick': 'assets/audio/ui-tick.wav',
  'wheel-tick': 'assets/audio/wheel-tick.wav',
  riser: 'assets/audio/riser.wav',
  'warning-pulse': 'assets/audio/warning-pulse.wav',
  'reveal-impact': 'assets/audio/reveal-impact.wav',
  'result-resolve': 'assets/audio/result-resolve.wav',
  celebration: 'assets/audio/celebration.wav',
};

export const AudioBus: React.FC<{story: StoryPlanV1}> = ({story}) => {
  const revealFrame = story.revealRegistry.find((rule) => rule.revealId === 'final-result')?.earliestFrame ?? story.durationInFrames;
  const voiceCues = story.tracks.audio.filter((cue) => cue.role === 'voice');
  return <>{story.tracks.audio.map((cue) => {
    const file = audioFiles[cue.assetId];
    if (!file) return null;
    const duration = cue.endFrameExclusive ? cue.endFrameExclusive - cue.startFrame : undefined;
    const base = cue.gainMilli / 1_000;
    const volume = cue.role === 'music'
      ? (relativeFrame: number) => {
          const absolute = relativeFrame + cue.startFrame;
          const distance = Math.abs(absolute - revealFrame);
          const underVoice = voiceCues.some((voiceCue) => absolute >= voiceCue.startFrame && absolute < (voiceCue.endFrameExclusive ?? voiceCue.startFrame + 120));
          if (underVoice) return base * .38;
          return base * (distance < 20 ? .34 : 1);
        }
      : base;
    return <Sequence key={cue.cueId} from={cue.startFrame} {...(duration ? {durationInFrames: duration} : {})} name={cue.cueId}>
      <Audio src={staticFile(file)} volume={volume} />
    </Sequence>;
  })}</>;
};
