import {interpolate, useCurrentFrame} from 'remotion';
import type {ReelSpecV1} from '../../contracts/reel-spec';
import {carnivalNightTokens as tokens} from '../../theme/carnival-night/tokens';

export const AttemptBadge: React.FC<{spec: ReelSpecV1}> = ({spec}) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pulse = .5 + Math.sin(frame * .12) * .5;
  // Keep the Remotion bundle browser-only. The shared attempt helper also
  // contains filesystem utilities used by the CLI, so importing it here would
  // pull Node built-ins into Webpack.
  const attempt = spec.experiment?.attempt ?? 1;
  return <div aria-label={`Try number ${attempt}`} style={{position: 'absolute', right: 66, top: 52, width: 170, height: 82, zIndex: 112, opacity: enter, transform: `translateY(${(1 - enter) * -18}px) rotate(${(1 - enter) * 3}deg) scale(${.9 + enter * .1})`, transformOrigin: 'right center'}}>
    <div style={{position: 'absolute', inset: 0, borderRadius: 19, border: `3px solid ${tokens.color.gold}`, background: 'linear-gradient(145deg, rgba(84,28,104,.98), rgba(26,10,43,.98) 55%, rgba(91,27,52,.98))', boxShadow: `inset 0 2px rgba(255,255,255,.18), inset 0 -5px rgba(0,0,0,.32), 0 8px 20px rgba(0,0,0,.66), 0 0 ${12 + pulse * 10}px rgba(247,181,26,.24)`}} />
    <div style={{position: 'absolute', left: 12, top: 12, width: 12, height: 12, transform: 'rotate(45deg)', background: tokens.color.champagne, boxShadow: `0 0 ${6 + pulse * 5}px rgba(255,231,163,.7)`}} />
    <div style={{position: 'absolute', right: 12, bottom: 12, width: 12, height: 12, transform: 'rotate(45deg)', background: tokens.color.champagne, boxShadow: `0 0 ${6 + pulse * 5}px rgba(255,231,163,.7)`}} />
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 7, paddingTop: 19, color: tokens.color.champagne, textShadow: '0 3px 0 #4A1707, 0 7px 12px rgba(0,0,0,.9)'}}>
      <span style={{fontFamily: tokens.typography.condensed, fontSize: 25, letterSpacing: 3.3}}>TRY</span>
      <span style={{fontFamily: tokens.typography.impact, fontSize: 41, letterSpacing: -1}}>#{attempt}</span>
    </div>
  </div>;
};
