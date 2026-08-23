import {Video, interpolate, staticFile} from 'remotion';
import type {VisualState} from '../../contracts/visual-state';
import {selectHostClip} from '../host-pool';

export const HostOverlay: React.FC<{state: VisualState}> = ({state}) => {
  if (!state.survivalExperience) return null;
  const clip = selectHostClip();
  const enter = interpolate(state.frame, [0, 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const resultLift = state.finalResult ? -28 : 0;

  return <div style={{
    position: 'absolute',
    right: -92,
    bottom: 18 + resultLift,
    width: 610,
    height: 710,
    zIndex: 108,
    opacity: enter,
    transform: `translate(${(1 - enter) * 70}px, ${(1 - enter) * 50}px) scale(${.92 + enter * .08})`,
    transformOrigin: '100% 100%',
    pointerEvents: 'none',
    filter: 'drop-shadow(-18px 24px 22px rgba(0,0,0,.68)) drop-shadow(0 0 22px rgba(247,181,26,.18))',
  }}>
    <Video
      src={staticFile(clip.assetPath)}
      muted
      style={{width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'right bottom'}}
    />
  </div>;
};
