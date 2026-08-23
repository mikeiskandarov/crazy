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
  const categories = experience.resultCategories ?? [];

  return <div style={{position: 'absolute', left: 40, top: 445, width: 1000, height: 510, zIndex: 92, pointerEvents: 'none', textAlign: 'center', opacity: enter, transform: `translateY(${(1 - enter) * 70}px) scale(${.92 + enter * .08})`}}>
    <div style={{display: 'inline-block', padding: '12px 28px 14px', borderRadius: 18, border: `2px solid ${tokens.color.gold}88`, background: 'rgba(18,8,27,.88)', boxShadow: '0 10px 24px rgba(0,0,0,.72)', fontFamily: tokens.typography.condensed, fontSize: 31, letterSpacing: 6.5, color: tokens.color.champagne, textShadow: '0 5px 16px rgba(0,0,0,.9)'}}>RESULT TIERS • 1,000 RUNS</div>
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1.18fr', gap: 14, marginTop: 24}}>
      {categories.map((category, index) => {
        const progress = easeOutCubic((localFrame - 4 - index * 5) / 14);
        const isBest = category.id === 'best-of-population';
        const accent = isBest ? tokens.color.champagne : index === 1 ? tokens.color.positive : tokens.color.accentViolet;
        const winnings = category.amountMinor !== undefined ? formatMoney(category.amountMinor, spec.locale) : category.rangeLabel;
        const detail = category.amountMinor !== undefined ? category.rangeLabel : `${category.count ?? 0} RUNS IN TIER`;
        const biggestHit = experience.bestFinalOutcomeLabel?.replace(/x$/i, '×') ?? '—';
        return <div key={category.id} style={{height: 322, padding: isBest ? '22px 16px' : '27px 16px 22px', borderRadius: 24, border: `3px solid ${accent}`, background: 'linear-gradient(180deg, rgba(45,18,56,.97), rgba(18,10,29,.98))', boxShadow: `0 12px 30px rgba(0,0,0,.72), inset 0 1px rgba(255,255,255,.13), 0 0 24px ${accent}33`, opacity: progress, transform: `translateY(${(1 - progress) * 48}px) scale(${.9 + progress * .1})`}}>
          {isBest ? <>
            <div style={{fontFamily: tokens.typography.condensed, fontSize: 22, letterSpacing: 3.2, color: tokens.color.textSecondary}}>BEST FINAL</div>
            <div style={{fontFamily: tokens.typography.impact, fontSize: 55, lineHeight: 1, marginTop: 5, color: tokens.color.champagne, fontVariantNumeric: 'tabular-nums', textShadow: '0 5px 0 #4A1707, 0 12px 25px rgba(0,0,0,.86)'}}>{winnings}</div>
            <div style={{height: 2, margin: '20px 22px 17px', background: `linear-gradient(90deg, transparent, ${accent}, transparent)`}} />
            <div style={{fontFamily: tokens.typography.condensed, fontSize: 22, letterSpacing: 3.2, color: tokens.color.textSecondary}}>BIGGEST HIT</div>
            <div style={{fontFamily: tokens.typography.impact, fontSize: 52, lineHeight: 1, marginTop: 5, color: tokens.color.positive, textShadow: '0 5px 0 #10331E, 0 12px 25px rgba(0,0,0,.86)'}}>{biggestHit}</div>
          </> : <>
            <div style={{fontFamily: tokens.typography.impact, fontSize: 43, lineHeight: .98, minHeight: 78, display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: -1.2, color: '#FFF8D8', fontVariantNumeric: 'tabular-nums', textShadow: '0 5px 0 #4A1707, 0 12px 25px rgba(0,0,0,.86)'}}>{winnings}</div>
            <div style={{fontFamily: tokens.typography.condensed, fontSize: 24, lineHeight: 1.1, minHeight: 50, marginTop: 18, letterSpacing: 1.5, color: tokens.color.textSecondary}}>{detail}</div>
            <div style={{height: 2, margin: '18px 18px 20px', background: `linear-gradient(90deg, transparent, ${accent}, transparent)`}} />
            <div style={{fontFamily: tokens.typography.condensed, fontSize: 27, lineHeight: 1, letterSpacing: 3.2, color: accent}}>{category.label}</div>
          </>}
        </div>;
      })}
    </div>
  </div>;
};

export const SurvivalExperience: React.FC<{state: VisualState; spec: ReelSpecV1}> = ({state, spec}) => {
  const experience = state.survivalExperience;
  if (!experience || spec.format.kind !== 'survive-500' || experience.phase === 'hook') return null;
  const finalBustCount = experience.finalBustedCount;
  const bestFinalDisplay = experience.selectedFinalBankrollMinor === undefined ? '—' : formatMoney(experience.selectedFinalBankrollMinor, spec.locale);
  const biggestHitDisplay = experience.bestFinalOutcomeLabel?.replace(/x$/i, '×') ?? '—';

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
    const settled = experience.phase === 'verdict' || experience.phase === 'result';
    const revealed = experience.phase === 'result';
    const chartProgress = settled ? 1 : experience.phaseProgress;
    const max = Math.max(1, ...experience.finalBands.map((band) => band.count));
    return <>
      <PanelShell accent={settled ? tokens.color.gold : tokens.color.accentViolet} style={{position: 'absolute', left: 40, top: 1070, width: 1000, height: 560, zIndex: 72, padding: '28px 42px'}}>
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
            {revealed ? <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14}}>
              <div><div style={{fontSize: 21, letterSpacing: 2.2, color: tokens.color.textSecondary}}>BEST FINAL</div><div style={{fontSize: 49, lineHeight: 1.04, color: tokens.color.champagne}}>{bestFinalDisplay}</div></div>
              <div><div style={{fontSize: 21, letterSpacing: 2.2, color: tokens.color.textSecondary}}>BIGGEST HIT</div><div style={{fontSize: 49, lineHeight: 1.04, color: tokens.color.positive}}>{biggestHitDisplay}</div></div>
            </div> : <>
              <div style={{fontSize: 23, letterSpacing: 2.4, color: tokens.color.textSecondary}}>{settled ? 'THREE RESULT TIERS' : 'SEARCHING BEST RUN'}</div>
              <div style={{fontSize: 56, lineHeight: 1, color: tokens.color.champagne}}>{settled ? <span style={{color: tokens.color.warning}}>LOCKED</span> : <span style={{color: tokens.color.accentViolet}}>SCANNING…</span>}</div>
              <div style={{fontSize: 21, color: tokens.color.textSecondary}}>{settled ? 'RARE • VERY LUCKY • BEST' : 'RANKING ALL FINAL BANKROLLS'}</div>
            </>}
          </div>
          <div />
        </div>
      </PanelShell>
      <FinalSpinReveal state={state} spec={spec} />
    </>;
  }
  return null;
};
