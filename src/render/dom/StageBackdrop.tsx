import type {CSSProperties} from 'react';
import {staticFile} from 'remotion';
import type {VisualState} from '../../contracts/visual-state';
import {carnivalNightTokens as tokens} from '../../theme/carnival-night/tokens';

export const StageBackdrop: React.FC<{state: VisualState}> = ({state}) => {
  const danger = state.beatKind === 'threat';
  const result = state.beatKind === 'reveal' || state.beatKind === 'outro';
  const style: CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    background: tokens.color.background,
  };
  return <div style={style}>
    <img
      src={staticFile('assets/backgrounds/crazy-time-wonderland-v1.png')}
      style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.08)', filter: 'saturate(1.06) contrast(1.04) brightness(.76)'}}
    />
    <div style={{position: 'absolute', inset: 0, background: `linear-gradient(${danger ? 'rgba(91,16,26,.30)' : result ? 'rgba(61,32,16,.20)' : 'rgba(32,8,37,.12)'}, ${danger ? 'rgba(40,2,10,.40)' : 'rgba(6,3,12,.26)'})`, mixBlendMode: 'multiply'}} />
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 43%, rgba(19,4,25,.08) 0%, rgba(12,3,17,.26) 42%, rgba(2,1,5,.82) 100%)'}} />
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(2,1,5,.66), transparent 18%, transparent 82%, rgba(2,1,5,.68))'}} />
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(2,1,5,.30), transparent 18%, transparent 72%, rgba(2,1,5,.72))'}} />
    <div style={{position: 'absolute', left: 120, right: 120, bottom: 100, height: 450, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(247,181,26,.13), rgba(7,6,11,0) 67%)'}} />
    <div style={{position: 'absolute', inset: 0, opacity: .08, backgroundImage: 'repeating-radial-gradient(circle at 30% 20%, #fff 0 .8px, transparent 1px 4px)', mixBlendMode: 'soft-light'}} />
  </div>;
};

export const MarqueeFrame: React.FC<{frame: number}> = ({frame}) => {
  const frameInset = 44;
  const frameWidth = 1080 - frameInset * 2;
  const frameHeight = 1920 - frameInset * 2;
  const bulbSize = 14;
  const bulbInset = 14;
  const horizontalCount = 12;
  const verticalCount = 10;
  const horizontalTravel = frameWidth - bulbInset * 2 - bulbSize;
  const verticalTravel = frameHeight - bulbInset * 2 - bulbSize;
  const positions = [
    ...Array.from({length: horizontalCount}, (_, index) => ({left: bulbInset + index / (horizontalCount - 1) * horizontalTravel, top: bulbInset})),
    ...Array.from({length: verticalCount}, (_, index) => ({left: frameWidth - bulbInset - bulbSize, top: bulbInset + (index + 1) / (verticalCount + 1) * verticalTravel})),
    ...Array.from({length: horizontalCount}, (_, index) => ({left: bulbInset + (horizontalCount - 1 - index) / (horizontalCount - 1) * horizontalTravel, top: frameHeight - bulbInset - bulbSize})),
    ...Array.from({length: verticalCount}, (_, index) => ({left: bulbInset, top: bulbInset + (verticalCount - index) / (verticalCount + 1) * verticalTravel})),
  ];
  const bulbs = positions.map(({left, top}, index) => {
    const wave = .5 + .5 * Math.sin(frame * .12 - index * .55);
    return <span key={index} style={{position: 'absolute', left, top, width: bulbSize, height: bulbSize, borderRadius: '50%', background: wave > .45 ? tokens.color.champagne : '#9A6815', opacity: .55 + wave * .45, boxShadow: `0 0 ${7 + wave * 17}px rgba(255,231,163,${.2 + wave * .52})`}} />;
  });
  return <div style={{position: 'absolute', left: frameInset, top: frameInset, width: frameWidth, height: frameHeight, boxSizing: 'border-box', pointerEvents: 'none', zIndex: 120}}>{bulbs}</div>;
};
