import {Img, interpolate, staticFile} from 'remotion';
import type {VisualState} from '../../contracts/visual-state';

export const WinMathLogo: React.FC<{state: VisualState}> = ({state}) => {
  if (!state.survivalExperience || state.beatKind === 'hook') return null;
  const localFrame = state.frame - state.beatStartFrame;
  const enter = interpolate(localFrame, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{position: 'absolute', left: 235, top: 48, width: 610, height: 150, zIndex: 72, opacity: enter, transform: `translateY(${(1 - enter) * -14}px) scale(${.96 + enter * .04})`, transformOrigin: 'center'}}>
    <Img src={staticFile('assets/brand/winmath-logo.svg')} style={{width: '100%', height: '100%', objectFit: 'contain'}} />
  </div>;
};
