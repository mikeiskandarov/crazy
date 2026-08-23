import {Img, interpolate, staticFile} from 'remotion';
import type {VisualState} from '../../contracts/visual-state';

export const WinMathLogo: React.FC<{state: VisualState}> = ({state}) => {
  if (!state.survivalExperience || state.beatKind === 'hook') return null;
  const localFrame = state.frame - state.beatStartFrame;
  const enter = interpolate(localFrame, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <>
    <div style={{position: 'absolute', left: 66, top: 54, width: 228, height: 62, zIndex: 72, opacity: enter * .68, transform: `translateY(${(1 - enter) * -10}px) scale(${.96 + enter * .04})`, transformOrigin: 'left center'}}>
      <Img src={staticFile('assets/brand/winmath-logo.svg')} style={{width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'left center'}} />
    </div>
    <div style={{position: 'absolute', left: 326, top: 59, width: 495, height: 66, zIndex: 71, display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid rgba(247,181,26,.32)', borderBottom: '1px solid rgba(247,181,26,.32)', background: 'linear-gradient(90deg, rgba(17,8,26,0), rgba(17,8,26,.62) 14%, rgba(17,8,26,.62) 86%, rgba(17,8,26,0))', fontFamily: 'Barlow Condensed', fontSize: 27, fontWeight: 700, letterSpacing: 2.4, color: '#FFF0B8', textShadow: '0 3px 14px rgba(0,0,0,.9)', opacity: enter, transform: `translateX(${(1 - enter) * 22}px)`}}>
      1,000 SIMULATIONS · $100 → 500 ROUNDS
    </div>
  </>;
};
