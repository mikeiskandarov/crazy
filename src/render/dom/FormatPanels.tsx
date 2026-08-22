import type {ReelSpecV1} from '../../contracts/reel-spec';
import type {VisualState} from '../../contracts/visual-state';
import {formatMoney} from '../../core/money';
import {carnivalNightTokens as tokens} from '../../theme/carnival-night/tokens';
import {MetricLabel, MetricValue, PanelShell} from './primitives';

export const SuspenseCallout: React.FC<{state: VisualState}> = ({state}) => {
  const cue = state.callouts[0];
  if (!cue || state.finalResult || state.beatKind === 'decision') return null;
  const color = cue.semanticTone === 'danger' ? tokens.color.danger : cue.semanticTone === 'positive' ? tokens.color.positive : tokens.color.warning;
  return <div style={{position: 'absolute', left: 124, top: 990, width: 722, zIndex: 76, textAlign: 'center', fontFamily: tokens.typography.impact, fontSize: 38, lineHeight: 1, letterSpacing: -.5, color, textShadow: '0 5px 16px rgba(0,0,0,.88)'}}>{cue.text}</div>;
};

export const DuelHud: React.FC<{state: VisualState; spec: ReelSpecV1}> = ({state, spec}) => {
  if (spec.format.kind !== 'one-vs-ten' || state.finalResult || state.beatKind === 'hook') return null;
  const format = spec.format;
  return <div style={{position: 'absolute', left: 58, top: 1080, width: 872, height: 440, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, zIndex: 68}}>
    {state.runs.map((run, index) => {
      const actor = index === 0 ? format.left : format.right;
      const accent = index === 0 ? tokens.color.accentViolet : tokens.color.warning;
      return <PanelShell key={run.participantId} accent={accent} style={{padding: 28}}>
        <MetricLabel>{actor.label} BET • SAME SPINS</MetricLabel>
        <MetricValue color={run.alive ? tokens.color.textPrimary : tokens.color.danger} size={68}>{formatMoney(run.currentBankrollMinor, spec.locale)}</MetricValue>
        <div style={{fontFamily: tokens.typography.condensed, fontSize: 25, color: tokens.color.textSecondary, marginTop: 12}}>STAKE {formatMoney(actor.betMinor)} • {run.alive ? 'ACTIVE' : 'OUT'}</div>
        <svg width="376" height="180" viewBox="0 0 376 180" style={{marginTop: 20}}>
          <polyline points={run.points.map((point) => `${(point.round / format.roundCount) * 376},${174 - (point.bankrollAfterMinor / Math.max(run.visiblePeakMinor, 1)) * 160}`).join(' ')} fill="none" stroke={accent} strokeWidth="6" strokeLinejoin="round" />
        </svg>
      </PanelShell>;
    })}
  </div>;
};

export const DecisionCard: React.FC<{state: VisualState; spec: ReelSpecV1}> = ({state, spec}) => {
  if (spec.format.kind !== 'stop-or-continue' || state.beatKind !== 'decision' || state.finalResult) return null;
  const run = state.runs[0]!;
  return <PanelShell accent={tokens.color.accentViolet} style={{position: 'absolute', left: 82, top: 1120, width: 824, height: 380, zIndex: 82, padding: 38}}>
    <div style={{fontFamily: tokens.typography.impact, fontSize: 62, textAlign: 'center', color: tokens.color.textPrimary}}>STOP OR CONTINUE?</div>
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 34}}>
      <div style={{border: `3px solid ${tokens.color.positive}`, borderRadius: 22, padding: 24, textAlign: 'center'}}><MetricLabel>Take now</MetricLabel><MetricValue size={52}>{formatMoney(run.currentBankrollMinor)}</MetricValue></div>
      <div style={{border: `3px solid ${tokens.color.accentViolet}`, borderRadius: 22, padding: 24, textAlign: 'center'}}><MetricLabel>Frozen outcome</MetricLabel><MetricValue size={52}>CONTINUE</MetricValue></div>
    </div>
    <div style={{fontFamily: tokens.typography.ui, fontSize: 22, color: tokens.color.textSecondary, textAlign: 'center', marginTop: 22}}>This exported video is not interactive.</div>
  </PanelShell>;
};

export const PopulationPanel: React.FC<{state: VisualState; spec: ReelSpecV1}> = ({state, spec}) => {
  if ((spec.format.kind !== 'impossible-target' && spec.format.kind !== 'last-man-standing') || state.finalResult || state.beatKind === 'hook') return null;
  const size = spec.format.populationSize;
  const latest = state.populationMilestones.at(-1);
  const alive = latest?.aliveCount ?? size;
  const isTarget = spec.format.kind === 'impossible-target';
  const main = isTarget ? latest?.targetReachedCount ?? 0 : alive;
  return <div style={{position: 'absolute', left: 58, top: 1070, width: 872, height: 500, zIndex: 68}}>
    <PanelShell accent={isTarget ? tokens.color.accentViolet : tokens.color.warning} style={{height: 244, padding: '30px 36px', textAlign: 'center'}}>
      <MetricLabel>{isTarget ? `REACHED A VISIBLE CHECKPOINT • ROUND ${state.currentRound}` : `PLAYERS STILL ACTIVE • ROUND ${state.currentRound}`}</MetricLabel>
      <MetricValue size={122} color={main === 0 && isTarget ? tokens.color.textPrimary : tokens.color.champagne}>{main.toLocaleString('en-US')}</MetricValue>
      <div style={{fontFamily: tokens.typography.condensed, color: tokens.color.textSecondary, fontSize: 26, letterSpacing: 2}}>OF {size.toLocaleString('en-US')} INDEPENDENT ILLUSTRATIVE RUNS</div>
    </PanelShell>
    {isTarget ? <div style={{display: 'flex', gap: 12, marginTop: 22}}>{state.targetThresholds.length > 0 ? state.targetThresholds.map((threshold) => <div key={threshold.thresholdMinor} style={{flex: 1, padding: '18px 8px', textAlign: 'center', borderTop: `3px solid ${tokens.color.gold}`, fontFamily: tokens.typography.condensed, color: tokens.color.textPrimary, fontSize: 25}}><div>{formatMoney(threshold.thresholdMinor)}</div><div style={{color: tokens.color.textSecondary, fontSize: 20}}>{threshold.everReachedCount.toLocaleString('en-US')} REACHED</div></div>) : <div style={{width: '100%', textAlign: 'center', color: tokens.color.textSecondary, fontFamily: tokens.typography.condensed, fontSize: 24, letterSpacing: 2, paddingTop: 22}}>FULL THRESHOLD FUNNEL UNLOCKS AT REVEAL</div>}</div> : <div style={{display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gap: 8, padding: '26px 20px 0'}}>{Array.from({length: 80}, (_, index) => <span key={index} style={{height: 12, borderRadius: 6, background: index < Math.ceil((alive / size) * 80) ? tokens.color.champagne : '#342B37', opacity: index < Math.ceil((alive / size) * 80) ? .88 : .34}} />)}<div style={{gridColumn: '1 / -1', textAlign: 'center', fontFamily: tokens.typography.condensed, color: tokens.color.textSecondary, fontSize: 21, letterSpacing: 2}}>1 GLYPH ≈ {Math.ceil(size / 80)} PLAYERS • EXACT COUNT ABOVE</div></div>}
  </div>;
};

export const RaceBars: React.FC<{state: VisualState; spec: ReelSpecV1}> = ({state, spec}) => {
  if (spec.format.kind !== 'race-to-1000' || state.finalResult || state.beatKind === 'hook') return null;
  const format = spec.format;
  const ranked = [...state.runs].sort((left, right) => right.currentBankrollMinor - left.currentBankrollMinor || left.participantId.localeCompare(right.participantId));
  const rowHeight = ranked.length <= 8 ? 55 : Math.max(36, Math.floor(480 / ranked.length) - 5);
  const compact = ranked.length > 8;
  return <PanelShell style={{position: 'absolute', left: 58, top: 1028, width: 872, height: 570, zIndex: 68, padding: '24px 30px'}}>
    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}><MetricLabel>Race to {formatMoney(format.targetMinor)}</MetricLabel><MetricLabel>Round {state.currentRound}</MetricLabel></div>
    {ranked.map((run, index) => {
      const progress = Math.min(1, run.currentBankrollMinor / format.targetMinor);
      const accent = [tokens.color.champagne, tokens.color.accentViolet, tokens.color.warning][index] ?? tokens.color.neutral;
      return <div key={run.participantId} style={{height: rowHeight, marginBottom: 5, display: 'grid', gridTemplateColumns: '36px 110px 1fr 126px', gap: 12, alignItems: 'center', fontFamily: tokens.typography.condensed}}>
        <span style={{fontSize: compact ? 23 : 26, color: tokens.color.textSecondary}}>#{index + 1}</span><span style={{fontSize: compact ? 23 : 25, color: tokens.color.textPrimary}}>{run.label}</span>
        <div style={{height: compact ? 18 : 21, borderRadius: 11, background: '#241E28', overflow: 'hidden'}}><div style={{height: '100%', width: `${Math.max(run.alive ? 2 : 0, progress * 100)}%`, borderRadius: 11, background: run.alive ? `linear-gradient(90deg, ${accent}88, ${accent})` : tokens.color.danger}} /></div>
        <span style={{fontSize: compact ? 22 : 24, textAlign: 'right', color: run.alive ? tokens.color.textPrimary : tokens.color.danger}}>{run.alive ? formatMoney(run.currentBankrollMinor) : 'OUT'}</span>
      </div>;
    })}
  </PanelShell>;
};

export const ResultCard: React.FC<{state: VisualState}> = ({state}) => {
  const result = state.finalResult;
  if (!result) return null;
  const accent = result.tone === 'positive' ? tokens.color.positive : result.tone === 'danger' ? tokens.color.danger : tokens.color.champagne;
  const progress = Math.min(1, (state.frame - result.revealStartFrame) / 10);
  return <PanelShell accent={accent} style={{position: 'absolute', left: 72, top: 1140, width: 840, minHeight: 420, zIndex: 90, padding: '42px 42px 34px', transform: `scale(${.9 + progress * .1})`, opacity: progress}}>
    <div style={{fontFamily: tokens.typography.condensed, fontSize: 27, letterSpacing: 4, color: accent, textAlign: 'center'}}>THE FROZEN RESULT</div>
    <div style={{fontFamily: tokens.typography.impact, fontSize: result.headline.length > 32 ? 68 : 86, lineHeight: .98, letterSpacing: -2.2, color: tokens.color.textPrimary, textAlign: 'center', marginTop: 16, textShadow: '0 8px 24px rgba(0,0,0,.72)'}}>{result.headline}</div>
    <div style={{height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, margin: '26px 0 20px'}} />
    {result.proofLines.slice(0, 4).map((line, index) => <div key={index} style={{fontFamily: tokens.typography.condensed, color: index === result.proofLines.length - 1 ? tokens.color.champagne : tokens.color.textSecondary, textAlign: 'center', fontSize: index === 0 ? 29 : 23, letterSpacing: index === 0 ? 1 : 1.8, marginTop: 7}}>{line}</div>)}
  </PanelShell>;
};
