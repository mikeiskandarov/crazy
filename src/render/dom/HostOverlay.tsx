import {Sequence, Video, interpolate, staticFile} from 'remotion';
import type {VisualState} from '../../contracts/visual-state';
import {selectHostClip} from '../host-pool';

export const HostOverlay: React.FC<{state: VisualState}> = ({state}) => {
  if (!state.survivalExperience || state.beatKind === 'hook') return null;
  const clip = selectHostClip();
  const localFrame = state.frame - state.beatStartFrame;
  const enter = interpolate(localFrame, [0, 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const resultLift = state.finalResult ? -42 : 0;

  return <div style={{
    position: 'absolute',
    right: -126,
    bottom: 18 + resultLift,
    width: 500,
    height: 670,
    zIndex: 108,
    opacity: enter,
    transform: `translate(${(1 - enter) * 70}px, ${(1 - enter) * 50}px) scale(${.92 + enter * .08})`,
    transformOrigin: '100% 100%',
    pointerEvents: 'none',
    filter: 'drop-shadow(-18px 24px 22px rgba(0,0,0,.68)) drop-shadow(0 0 22px rgba(247,181,26,.18))',
  }}>
    <Sequence from={190} layout="none">
      <Video
        src={staticFile(clip.assetPath)}
        muted
        style={{width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'right bottom'}}
      />
    </Sequence>
  </div>;
};
