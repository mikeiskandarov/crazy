import type {ReelSpecV1} from '../../contracts/reel-spec';
import type {VisualState} from '../../contracts/visual-state';
import {formatMoney} from '../../core/money';
import {carnivalNightTokens as tokens} from '../../theme/carnival-night/tokens';
import {MetricLabel, MetricValue, PanelShell} from './primitives';

function bankrollColor(state: VisualState): string {
  const run = state.runs[0];
  if (!run) return tokens.color.textPrimary;
  if (run.currentBankrollMinor <= run.startBankrollMinor * .15) return tokens.color.danger;
  if (run.currentBankrollMinor <= run.startBankrollMinor * .5) return tokens.color.warning;
  if (state.beatKind === 'hope' && run.currentBankrollMinor > run.startBankrollMinor) return tokens.color.positive;
  return tokens.color.textPrimary;
}

export const SingleRunHud: React.FC<{state: VisualState; spec: ReelSpecV1}> = ({state, spec}) => {
  const run = state.runs[0];
  if (!run || state.finalResult || state.beatKind === 'hook') return null;
  return <div style={{position: 'absolute', left: 58, top: 1080, width: 872, height: 186, display: 'grid', gridTemplateColumns: '1.28fr .92fr .9fr', gap: 14, zIndex: 68}}>
    <PanelShell accent={bankrollColor(state)} style={{padding: '28px 28px 22px'}}>
      <MetricLabel>Bankroll</MetricLabel>
      <MetricValue color={bankrollColor(state)} size={72}>{formatMoney(run.currentBankrollMinor, spec.locale)}</MetricValue>
      <div style={{marginTop: 11, fontFamily: tokens.typography.condensed, color: tokens.color.textSecondary, fontSize: 24, letterSpacing: 1.4}}>START {formatMoney(run.startBankrollMinor, spec.locale)}</div>
    </PanelShell>
    <PanelShell style={{padding: '28px 24px 22px'}}>
      <MetricLabel>Round</MetricLabel>
      <MetricValue size={60}>{state.currentRound}<span style={{fontSize: 30, color: tokens.color.textSecondary}}> / {spec.format.roundCount}</span></MetricValue>
    </PanelShell>
    <PanelShell style={{padding: '28px 24px 22px'}}>
      <MetricLabel>Peak so far</MetricLabel>
      <MetricValue size={52}>{formatMoney(run.visiblePeakMinor, spec.locale)}</MetricValue>
    </PanelShell>
  </div>;
};

export const SelectionDisclosure: React.FC<{state: VisualState}> = ({state}) => state.selectionDisclosure && (state.beatKind === 'hook' || state.beatKind === 'setup') ? <div style={{position: 'absolute', left: 82, top: state.beatKind === 'hook' ? 550 : 1015, width: 820, textAlign: 'center', zIndex: 72, fontFamily: tokens.typography.condensed, fontSize: 28, letterSpacing: 2.1, color: tokens.color.champagne, textTransform: 'uppercase', textShadow: '0 3px 8px rgba(0,0,0,.9)'}}>{state.selectionDisclosure}</div> : null;

export const ComplianceBlock: React.FC<{spec: ReelSpecV1}> = ({spec}) => <div style={{position: 'absolute', left: 74, top: 1642, width: 792, zIndex: 95, textAlign: 'center', fontFamily: tokens.typography.ui, color: tokens.color.textSecondary, fontSize: 24, lineHeight: 1.35, letterSpacing: .2}}>
  <div style={{color: tokens.color.champagne, fontFamily: tokens.typography.condensed, fontSize: 27, letterSpacing: 1.4}}>{[spec.compliance.ageLabel, spec.editorial.disclosure.toUpperCase()].filter(Boolean).join(' • ')}</div>
  <div>{spec.compliance.modelDisclosure}</div>
  {spec.compliance.responsiblePlay ? <div>{spec.compliance.responsiblePlay}</div> : null}
</div>;
