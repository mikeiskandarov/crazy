import type {ReelSpecV1} from '../../contracts/reel-spec';
import type {VisualState} from '../../contracts/visual-state';
import {formatMoney} from '../../core/money';
import {carnivalNightTokens as tokens} from '../../theme/carnival-night/tokens';

function revealStyle(localFrame: number, delay: number): React.CSSProperties {
  const progress = Math.max(0, Math.min(1, (localFrame - delay) / 9));
  const eased = 1 - Math.pow(1 - progress, 3);
  return {opacity: eased, transform: `translateY(${(1 - eased) * 24}px) scale(${.92 + eased * .08})`};
}

export const ImpactTitle: React.FC<{state: VisualState; spec: ReelSpecV1}> = ({state, spec}) => {
  if (!state.headline) return null;
  const local = state.frame - state.beatStartFrame;
  const enter = Math.min(1, local / 9);
  if (state.survivalExperience && spec.format.kind === 'survive-500') {
    const gameTitle = state.headline.text.match(/\bIN\s+(.+?)\??$/i)?.[1]?.toUpperCase() ?? 'CRAZY TIME';
    return <div style={{position: 'absolute', left: 76, top: 1024, width: 650, zIndex: 70, textAlign: 'left', textTransform: 'uppercase'}}>
      <div style={{fontFamily: tokens.typography.condensed, fontSize: 27, letterSpacing: 5.2, color: tokens.color.champagne, marginBottom: 14, ...revealStyle(local, 0)}}>WINMATH PRESENTS • ONE THOUSAND RUNS</div>
      <div style={{fontFamily: tokens.typography.impact, fontSize: 108, lineHeight: .88, letterSpacing: -4.5, color: tokens.color.textPrimary, textShadow: '0 3px 0 #F7B51A, 0 7px 0 #7A2B0D, 0 13px 0 #250A08, 0 24px 38px rgba(0,0,0,.78)', WebkitTextStroke: '4px #FFF2C2', paintOrder: 'stroke fill', ...revealStyle(local, 4)}}>CAN <span style={{color: tokens.color.champagne}}>{formatMoney(spec.format.startBankrollMinor)}</span></div>
      <div style={{fontFamily: tokens.typography.impact, fontSize: 91, lineHeight: .91, letterSpacing: -3.8, color: tokens.color.champagne, textShadow: '0 4px 0 #7A2B0D, 0 10px 24px rgba(0,0,0,.7)', ...revealStyle(local, 9)}}>SURVIVE <span style={{color: tokens.color.warning}}>{spec.format.roundCount}</span></div>
      <div style={{fontFamily: tokens.typography.impact, fontSize: 91, lineHeight: .91, letterSpacing: -3.8, color: tokens.color.champagne, textShadow: '0 4px 0 #7A2B0D, 0 10px 24px rgba(0,0,0,.7)', ...revealStyle(local, 12)}}>ROUNDS</div>
      <div style={{display: 'inline-flex', alignItems: 'center', gap: 18, marginTop: 22, padding: '11px 26px 13px', borderRadius: 18, border: `3px solid ${tokens.color.gold}`, background: 'linear-gradient(110deg, rgba(58,14,72,.96), rgba(126,30,87,.92), rgba(26,13,52,.96))', boxShadow: 'inset 0 1px rgba(255,255,255,.2), 0 10px 28px rgba(0,0,0,.45), 0 0 26px rgba(142,92,255,.3)', ...revealStyle(local, 16)}}>
        <span style={{fontFamily: tokens.typography.condensed, fontSize: 31, letterSpacing: 5, color: tokens.color.textSecondary}}>IN</span>
        <span style={{fontFamily: tokens.typography.impact, fontSize: 52, letterSpacing: -1.5, color: '#FFF5C7', textShadow: '0 3px 0 #7A2B0D'}}>{gameTitle}</span>
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
