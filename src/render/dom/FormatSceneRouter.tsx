import type {ReelSpecV1} from '../../contracts/reel-spec';
import type {VisualState} from '../../contracts/visual-state';
import {BankrollGraph, MilestoneStrip} from './BankrollGraph';
import {DecisionCard, DuelHud, PopulationPanel, RaceBars, ResultCard, SuspenseCallout} from './FormatPanels';
import {SingleRunHud} from './Hud';
import {SurvivalExperience} from './SurvivalExperience';

export const FormatSceneRouter: React.FC<{state: VisualState; spec: ReelSpecV1}> = ({state, spec}) => {
  const single = spec.format.kind === 'luckiest-player' || spec.format.kind === 'stop-or-continue';
  const decision = spec.format.kind === 'stop-or-continue' && state.beatKind === 'decision';
  return <>
    {single && !decision ? <><SingleRunHud state={state} spec={spec} /><BankrollGraph state={state} spec={spec} /><MilestoneStrip state={state} spec={spec} /></> : null}
    <SurvivalExperience state={state} spec={spec} />
    <DecisionCard state={state} spec={spec} />
    <DuelHud state={state} spec={spec} />
    <PopulationPanel state={state} spec={spec} />
    <RaceBars state={state} spec={spec} />
    <SuspenseCallout state={state} />
    {!state.survivalExperience ? <ResultCard state={state} /> : null}
  </>;
};
