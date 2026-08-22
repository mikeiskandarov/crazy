import type {ReelSpecV1} from '../../contracts/reel-spec';
import type {VisualState} from '../../contracts/visual-state';
import {formatMoney} from '../../core/money';
import {carnivalNightTokens as tokens} from '../../theme/carnival-night/tokens';
import {distributedCellMask} from '../distributed-cells';
import {PanelShell} from './primitives';

function processedCellColor(index: number, busted: boolean): string {
  const palette = busted
    ? ['#7A1627', '#A82034', '#D43643', tokens.color.danger]
    : ['#0F542F', '#177243', '#209754', tokens.color.positive];
  let tone = Math.imul(index + 1, 0x45d9f3b) >>> 0;
  tone = (tone ^ (tone >>> 16)) >>> 0;
  return palette[tone % palette.length]!;
}

const PhaseLabel: React.FC<{children: React.ReactNode}> = ({children}) => <div style={{fontFamily: tokens.typography.condensed, fontSize: 29, letterSpacing: 4.6, color: tokens.color.champagne, textAlign: 'center'}}>{children}</div>;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const easeOutCubic = (value: number): number => 1 - Math.pow(1 - clamp01(value), 3);

const FinalSpinReveal: React.FC<{state: VisualState; spec: ReelSpecV1}> = ({state, spec}) => {
  const experience = state.survivalExperience;
  const result = state.finalResult;
  if (!experience || !result || experience.phase !== 'result') return null;

  const localFrame = state.frame - result.revealStartFrame;
  const enter = easeOutCubic(localFrame / 15);
  const count = easeOutCubic((localFrame - 2) / 23);
  const countStepMinor = experience.selectedFinalBankrollMinor % 100 === 0 ? 100 : 1;
  const displayedBankrollMinor = Math.round(experience.selectedFinalBankrollMinor * count / countStepMinor) * countStepMinor;
  const multiplier = experience.bestFinalOutcomeLabel.replace(/x$/i, '×');
  const label = 'BEST RUN · BIGGEST HIT';
  const visibleCharacters = Math.max(0, Math.min(label.length, Math.floor((localFrame - 9) / 1.35)));

  return <div style={{position: 'absolute', left: 40, top: 500, width: 1000, height: 380, zIndex: 92, pointerEvents: 'none', textAlign: 'center'}}>
    <div style={{position: 'absolute', left: 0, top: 16, width: '100%', opacity: enter, transform: `translateY(${(1 - enter) * 150}px) scale(${.7 + enter * .3})`, transformOrigin: '50% 65%'}}>
      <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'center', whiteSpace: 'nowrap', fontFamily: tokens.typography.impact, lineHeight: .9, letterSpacing: -7, fontVariantNumeric: 'tabular-nums', filter: `drop-shadow(0 ${14 + (1 - enter) * 10}px 18px rgba(0,0,0,.9))`}}>
        <span style={{fontSize: 142, color: '#FFF8D8', WebkitTextStroke: '7px #7A2B0D', paintOrder: 'stroke fill', textShadow: '0 4px 0 #F7B51A, 0 9px 0 #B15B0C, 0 16px 0 #4A1707, 0 25px 30px rgba(0,0,0,.82)'}}>{formatMoney(displayedBankrollMinor, spec.locale)}</span>
        <span style={{fontSize: 112, color: tokens.color.positive, marginLeft: 24, letterSpacing: -5, WebkitTextStroke: '6px #123C1D', paintOrder: 'stroke fill', textShadow: '0 4px 0 #8BFF9C, 0 9px 0 #16752A, 0 16px 0 #092A10, 0 22px 28px rgba(0,0,0,.82)'}}>· {multiplier}</span>
      </div>
      <div style={{height: 62, marginTop: 30, overflow: 'hidden', fontFamily: tokens.typography.condensed, fontSize: 43, lineHeight: '56px', letterSpacing: 7, color: tokens.color.champagne, WebkitTextStroke: '2px #4A1707', paintOrder: 'stroke fill', textShadow: '0 4px 0 #160705, 0 9px 18px rgba(0,0,0,.92)'}}>
        <span style={{position: 'relative', display: 'inline-block', opacity: visibleCharacters === 0 ? 0 : 1}}>
          <span style={{display: 'inline-block', clipPath: `inset(0 ${100 - visibleCharacters / label.length * 100}% 0 0)`}}>{label}</span>
          {visibleCharacters > 0 && visibleCharacters < label.length ? <span style={{position: 'absolute', left: `${visibleCharacters / label.length * 100}%`, top: 8, width: 4, height: 39, marginLeft: 2, background: tokens.color.champagne, boxShadow: `0 0 12px ${tokens.color.champagne}`}} /> : null}
        </span>
      </div>
    </div>
  </div>;
};

export const SurvivalExperience: React.FC<{state: VisualState; spec: ReelSpecV1}> = ({state, spec}) => {
  const experience = state.survivalExperience;
  if (!experience || spec.format.kind !== 'survive-500' || experience.phase === 'hook') return null;
  const finalBustCount = experience.finalBustedCount;

  if (experience.phase === 'batch') {
    const bustMask = distributedCellMask({cellCount: experience.populationSize, markedCount: finalBustCount});
    let processedBusts = 0;
    for (let index = 0; index < experience.processedCount; index += 1) if (bustMask[index]) processedBusts += 1;
    const processedSurvivors = experience.processedCount - processedBusts;
    return <PanelShell accent={tokens.color.gold} style={{position: 'absolute', left: 40, top: 1090, width: 1000, height: 520, zIndex: 72, padding: '28px 38px 30px'}}>
      <PhaseLabel>RUNNING 1,000 INDEPENDENT SIMULATIONS</PhaseLabel>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(50, 1fr)', gap: 3, marginTop: 22}}>
        {Array.from({length: experience.populationSize}, (_, index) => {
          const processed = index < experience.processedCount;
          const busted = processed && bustMask[index] === true;
          return <span key={index} style={{height: 11, borderRadius: 2, background: !processed ? '#28212E' : processedCellColor(index, busted), opacity: processed ? .94 : .28, boxShadow: processed && index === experience.processedCount - 1 ? `0 0 12px ${tokens.color.champagne}` : 'inset 0 0 0 1px rgba(255,255,255,.035)'}} />;
        })}
      </div>
      <div style={{height: 5, borderRadius: 3, background: '#2A2330', marginTop: 20, overflow: 'hidden'}}><div style={{height: '100%', width: `${experience.phaseProgress * 100}%`, background: `linear-gradient(90deg, ${tokens.color.gold}, ${tokens.color.champagne})`}} /></div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 18, fontFamily: tokens.typography.condensed, textAlign: 'center'}}>
        <div><div style={{fontSize: 19, letterSpacing: 2, color: tokens.color.textSecondary}}>PROCESSED</div><div style={{fontSize: 42, color: tokens.color.textPrimary}}>{experience.processedCount.toLocaleString('en-US')}</div></div>
        <div><div style={{fontSize: 19, letterSpacing: 2, color: tokens.color.textSecondary}}>SURVIVING</div><div style={{fontSize: 42, color: tokens.color.positive}}>{processedSurvivors.toLocaleString('en-US')}</div></div>
        <div><div style={{fontSize: 19, letterSpacing: 2, color: tokens.color.textSecondary}}>BUST</div><div style={{fontSize: 42, color: tokens.color.danger}}>{processedBusts.toLocaleString('en-US')}</div></div>
      </div>
      <div style={{fontFamily: tokens.typography.ui, fontSize: 18, color: tokens.color.textSecondary, textAlign: 'center', marginTop: 5}}>1 cell = 1 aggregate run • green survived all 500 rounds • final rate {(experience.finalSurvivedCount / experience.populationSize * 100).toFixed(1)}%</div>
    </PanelShell>;
  }

  if (experience.phase === 'distribution' || experience.phase === 'verdict' || experience.phase === 'result') {
    const verdict = experience.phase === 'verdict' || experience.phase === 'result';
    const chartProgress = verdict ? 1 : experience.phaseProgress;
    const max = Math.max(1, ...experience.finalBands.map((band) => band.count));
    return <>
      <PanelShell accent={verdict ? tokens.color.gold : tokens.color.accentViolet} style={{position: 'absolute', left: 40, top: 1070, width: 1000, height: 560, zIndex: 72, padding: '28px 42px'}}>
        <PhaseLabel>FINAL BANKROLL DISTRIBUTION</PhaseLabel>
        <div style={{marginTop: 14}}>{experience.finalBands.map((band, index) => {
          const selected = index === experience.finalBands.length - 1;
          const width = Math.max(4, band.count / max * 100 * chartProgress);
          return <div key={band.label} style={{display: 'grid', gridTemplateColumns: '145px 1fr 86px', alignItems: 'center', gap: 18, height: 61, fontFamily: tokens.typography.condensed}}>
            <span style={{fontSize: 26, color: selected ? tokens.color.champagne : tokens.color.textSecondary}}>{band.label}</span>
            <div style={{height: 29, borderRadius: 15, background: '#28212E', overflow: 'hidden'}}><div style={{height: '100%', width: `${width}%`, borderRadius: 15, background: selected ? `linear-gradient(90deg, ${tokens.color.gold}, ${tokens.color.champagne})` : `linear-gradient(90deg, #542D86, ${tokens.color.accentViolet})`, boxShadow: selected ? '0 0 20px rgba(247,181,26,.4)' : 'none'}} /></div>
            <span style={{fontSize: 32, textAlign: 'right', color: tokens.color.textPrimary}}>{Math.round(band.count * chartProgress)}</span>
          </div>;
        })}</div>
        <div style={{height: 2, background: `linear-gradient(90deg, transparent, ${tokens.color.gold}, transparent)`, margin: '10px 0 12px'}} />
        <div style={{display: 'grid', gridTemplateColumns: '330px 430px 1fr', gap: 12, fontFamily: tokens.typography.condensed, textAlign: 'center'}}>
          <div>
            <div style={{fontSize: 23, letterSpacing: 2.4, color: tokens.color.textSecondary}}>SURVIVED 500</div>
            <div style={{fontSize: 56, lineHeight: 1, color: tokens.color.positive}}>{experience.finalSurvivedCount}<span style={{fontSize: 27, color: tokens.color.textSecondary}}> / {experience.populationSize.toLocaleString('en-US')}</span></div>
            <div style={{fontSize: 21, color: tokens.color.textSecondary}}>{(experience.finalSurvivedCount / experience.populationSize * 100).toFixed(1)}% SURVIVAL RATE</div>
          </div>
          <div>
            <div style={{fontSize: 23, letterSpacing: 2.4, color: tokens.color.textSecondary}}>{verdict ? 'BEST FINAL' : 'SEARCHING BEST RUN'}</div>
            <div style={{fontSize: 56, lineHeight: 1, color: tokens.color.champagne}}>{verdict ? <>{formatMoney(experience.selectedFinalBankrollMinor, spec.locale)} <span style={{color: tokens.color.positive}}>· {experience.bestFinalOutcomeLabel.replace(/x$/i, '×')}</span></> : <span style={{color: tokens.color.accentViolet}}>SCANNING…</span>}</div>
            <div style={{fontSize: 21, color: tokens.color.textSecondary}}>{verdict ? `HIGHEST FINAL • BIGGEST HIT` : 'RANKING ALL FINAL BANKROLLS'}</div>
          </div>
          <div />
        </div>
      </PanelShell>
      <FinalSpinReveal state={state} spec={spec} />
    </>;
  }
  return null;
};
