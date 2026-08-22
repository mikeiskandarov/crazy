import type {ReelSpecV1} from '../../contracts/reel-spec';
import type {VisibleRunState, VisualState} from '../../contracts/visual-state';
import {formatMoney} from '../../core/money';
import {carnivalNightTokens as tokens} from '../../theme/carnival-night/tokens';
import {PanelShell} from './primitives';

function pathFor(run: VisibleRunState, roundCount: number, width: number, height: number): string {
  const allValues = [run.startBankrollMinor, ...run.points.map((point) => point.bankrollAfterMinor)];
  const maximum = Math.max(run.startBankrollMinor * 1.15, ...allValues);
  const minimum = Math.min(0, ...allValues);
  const span = Math.max(1, maximum - minimum);
  const points = [{round: 0, value: run.startBankrollMinor}, ...run.points.map((point) => ({round: point.round, value: point.bankrollAfterMinor}))];
  return points.map((point, index) => {
    const x = (point.round / roundCount) * width;
    const y = height - ((point.value - minimum) / span) * height;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

export const BankrollGraph: React.FC<{state: VisualState; spec: ReelSpecV1}> = ({state, spec}) => {
  const run = state.runs[0];
  if (!run || state.finalResult || state.beatKind === 'hook' || state.beatKind === 'setup') return null;
  const color = run.currentBankrollMinor <= run.startBankrollMinor * .15 ? tokens.color.danger : run.currentBankrollMinor < run.startBankrollMinor ? tokens.color.warning : tokens.color.positive;
  return <PanelShell quiet style={{position: 'absolute', left: 58, top: 1292, width: 872, height: 242, zIndex: 61, padding: '24px 28px'}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: tokens.typography.condensed, letterSpacing: 2, fontSize: 25, color: tokens.color.textSecondary}}><span>BANKROLL PATH • THROUGH ROUND {state.currentRound}</span><span style={{color}}>{formatMoney(run.currentBankrollMinor, spec.locale)}</span></div>
    <svg viewBox="0 0 816 150" width="816" height="150" style={{display: 'block', marginTop: 12, overflow: 'visible'}}>
      <line x1="0" y1="84" x2="816" y2="84" stroke="rgba(255,255,255,.13)" strokeWidth="2" strokeDasharray="8 10" />
      <path d={pathFor(run, spec.format.roundCount, 816, 145)} fill="none" stroke="rgba(0,0,0,.7)" strokeWidth="12" strokeLinejoin="round" strokeLinecap="round" />
      <path d={pathFor(run, spec.format.roundCount, 816, 145)} fill="none" stroke={color} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
      {run.points.at(-1) ? <circle cx={(run.points.at(-1)!.round / spec.format.roundCount) * 816} cy={145 - ((run.points.at(-1)!.bankrollAfterMinor) / Math.max(run.visiblePeakMinor * 1.15, 1)) * 145} r="8" fill={tokens.color.champagne} stroke={color} strokeWidth="5" /> : null}
    </svg>
  </PanelShell>;
};

export const MilestoneStrip: React.FC<{state: VisualState; spec: ReelSpecV1}> = ({state, spec}) => {
  if (spec.format.kind !== 'survive-500' || state.finalResult || state.beatKind === 'hook') return null;
  const reached = state.populationMilestones;
  return <div style={{position: 'absolute', left: 64, top: 1552, width: 858, height: 92, display: 'flex', gap: 10, zIndex: 62}}>
    {reached.length === 0 ? <div style={{width: '100%', textAlign: 'center', fontFamily: tokens.typography.condensed, color: tokens.color.textSecondary, fontSize: 24, letterSpacing: 2.5}}>SURVIVOR EVIDENCE UNLOCKS WITH EACH ROUND</div> : reached.map((milestone) => <div key={milestone.round} style={{flex: 1, minWidth: 0, borderTop: `3px solid ${tokens.color.gold}`, paddingTop: 10, textAlign: 'center'}}>
      <div style={{fontFamily: tokens.typography.ui, color: tokens.color.textPrimary, fontWeight: 800, fontSize: 28, fontVariantNumeric: 'tabular-nums'}}>{milestone.aliveCount.toLocaleString('en-US')}</div>
      <div style={{fontFamily: tokens.typography.condensed, color: tokens.color.textSecondary, fontSize: 19, letterSpacing: 1.2}}>ALIVE · R{milestone.round}</div>
    </div>)}
  </div>;
};
