import type {ReelSpecV1} from '../../contracts/reel-spec';
import type {VisualState} from '../../contracts/visual-state';
import {formatMoney} from '../../core/money';
import {carnivalNightTokens as tokens} from '../../theme/carnival-night/tokens';

function revealStyle(localFrame: number, delay: number): React.CSSProperties {
  const progress = Math.max(0, Math.min(1, (localFrame - delay) / 9));
  const eased = 1 - Math.pow(1 - progress, 3);
  return {opacity: eased, transform: `translateY(${(1 - eased) * 24}px) scale(${.92 + eased * .08})`};
}

const TypewriterText: React.FC<{
  text: string;
  frame: number;
  startFrame: number;
  framesPerCharacter?: number;
  numberColor?: string;
  holdCursor?: boolean;
}> = ({text, frame, startFrame, framesPerCharacter = 1.7, numberColor, holdCursor = false}) => {
  const characters = Array.from(text);
  const typingEnd = startFrame + characters.length * framesPerCharacter;
  const showCursor = frame >= startFrame && (holdCursor || frame <= typingEnd + 5);
  return <>
    {characters.map((character, index) => {
      const progress = Math.max(0, Math.min(1, (frame - startFrame - index * framesPerCharacter) / 3));
      const isNumber = /[$0-9,]/.test(character);
      const pop = isNumber ? 1 + Math.sin(progress * Math.PI) * .18 : 1;
      return <span key={`${character}-${index}`} style={{
        display: 'inline-block',
        minWidth: character === ' ' ? '.28em' : undefined,
        opacity: progress,
        color: isNumber && numberColor ? numberColor : undefined,
        transform: `translateY(${(1 - progress) * 20}px) scale(${(.76 + progress * .24) * pop})`,
        transformOrigin: '50% 80%',
        filter: isNumber && progress > 0 ? `drop-shadow(0 0 ${4 + progress * 13}px rgba(255,220,108,${.24 + progress * .48}))` : undefined,
      }}>{character === ' ' ? '\u00A0' : character}</span>;
    })}
    {showCursor ? <span style={{display: 'inline-block', width: '.09em', height: '.78em', marginLeft: '.08em', borderRadius: 4, verticalAlign: '-.02em', background: tokens.color.warning, opacity: Math.floor(frame / 6) % 2 === 0 ? 1 : .16, boxShadow: '0 0 18px rgba(255,220,108,.78)'}} /> : null}
  </>;
};

export const ImpactTitle: React.FC<{state: VisualState; spec: ReelSpecV1}> = ({state, spec}) => {
  if (!state.headline) return null;
  const local = state.frame - state.beatStartFrame;
  const enter = Math.min(1, local / 9);
  if (state.survivalExperience && spec.format.kind === 'survive-500') {
    const gameTitle = state.headline.text.match(/\bIN\s+(.+?)\??$/i)?.[1]?.toUpperCase() ?? 'CRAZY TIME';
    return <div style={{position: 'absolute', left: 76, top: 1024, width: 650, zIndex: 70, textAlign: 'left', textTransform: 'uppercase'}}>
      <div style={{fontFamily: tokens.typography.condensed, fontSize: 27, letterSpacing: 5.2, color: tokens.color.champagne, marginBottom: 14}}><TypewriterText text="WINMATH PRESENTS • ONE THOUSAND RUNS" frame={local} startFrame={0} framesPerCharacter={.82} /></div>
      <div style={{fontFamily: tokens.typography.impact, fontSize: 108, lineHeight: .88, letterSpacing: -4.5, color: tokens.color.textPrimary, textShadow: '0 3px 0 #F7B51A, 0 7px 0 #7A2B0D, 0 13px 0 #250A08, 0 24px 38px rgba(0,0,0,.78)', WebkitTextStroke: '4px #FFF2C2', paintOrder: 'stroke fill'}}><TypewriterText text={`CAN ${formatMoney(spec.format.startBankrollMinor)}`} frame={local} startFrame={5} framesPerCharacter={2.2} numberColor={tokens.color.champagne} /></div>
      <div style={{fontFamily: tokens.typography.impact, fontSize: 91, lineHeight: .91, letterSpacing: -3.8, color: tokens.color.champagne, textShadow: '0 4px 0 #7A2B0D, 0 10px 24px rgba(0,0,0,.7)'}}><TypewriterText text={`SURVIVE ${spec.format.roundCount}`} frame={local} startFrame={24} framesPerCharacter={2.35} numberColor={tokens.color.warning} /></div>
      <div style={{fontFamily: tokens.typography.impact, fontSize: 91, lineHeight: .91, letterSpacing: -3.8, color: tokens.color.champagne, textShadow: '0 4px 0 #7A2B0D, 0 10px 24px rgba(0,0,0,.7)'}}><TypewriterText text="ROUNDS" frame={local} startFrame={54} framesPerCharacter={2.15} /></div>
      <div style={{display: 'inline-flex', alignItems: 'center', gap: 18, marginTop: 22, padding: '11px 26px 13px', borderRadius: 18, border: `3px solid ${tokens.color.gold}`, background: 'linear-gradient(110deg, rgba(58,14,72,.96), rgba(126,30,87,.92), rgba(26,13,52,.96))', boxShadow: 'inset 0 1px rgba(255,255,255,.2), 0 10px 28px rgba(0,0,0,.45), 0 0 26px rgba(142,92,255,.3)', ...revealStyle(local, 66)}}>
        <span style={{fontFamily: tokens.typography.condensed, fontSize: 31, letterSpacing: 5, color: tokens.color.textSecondary}}>IN</span>
        <span style={{fontFamily: tokens.typography.impact, fontSize: 52, letterSpacing: -1.5, color: '#FFF5C7', textShadow: '0 3px 0 #7A2B0D'}}><TypewriterText text={gameTitle} frame={local} startFrame={72} framesPerCharacter={2.3} holdCursor /></span>
      </div>
    </div>;
  }
  return <div style={{position: 'absolute', left: 74, top: 142, width: 790, zIndex: 70, transform: `translateY(${(1 - enter) * 28}px) scale(${0.94 + enter * 0.06})`, opacity: enter}}>
    <div style={{fontFamily: tokens.typography.condensed, fontSize: 26, letterSpacing: 5, color: tokens.color.champagne, textTransform: 'uppercase', marginBottom: 10}}>CARNIVAL NIGHT • ILLUSTRATIVE MODEL</div>
    <div style={{fontFamily: tokens.typography.impact, fontSize: state.headline.text.length > 36 ? 86 : 108, lineHeight: .92, letterSpacing: -3.5, color: tokens.color.champagne, textTransform: 'uppercase', textShadow: '0 3px 0 #F7B51A, 0 7px 0 #7A2B0D, 0 13px 0 #250A08, 0 24px 38px rgba(0,0,0,.78)', WebkitTextStroke: '3px #FFF2C2', paintOrder: 'stroke fill'}}>{state.headline.text}</div>
  </div>;
};

export const TopOutcome: React.FC<{state: VisualState}> = ({state}) => {
  const outcome = state.wheel.currentOutcome;
  if (!outcome || !state.wheel.pointerEngaged || state.wheel.spinning || state.currentRound === 0 || state.beatKind === 'hook' || state.finalResult) return null;
  const color = outcome.eventClass === 'loss' ? tokens.color.danger : outcome.eventClass === 'refund' ? tokens.color.neutral : tokens.color.champagne;
  return <div style={{position: 'absolute', top: 892, left: 368, width: 250, textAlign: 'center', zIndex: 64, fontFamily: tokens.typography.impact, fontSize: 60, lineHeight: 1, color, textShadow: '0 4px 0 #190B08, 0 0 18px rgba(255,231,163,.3)'}}>{outcome.outcomeLabel}</div>;
};
