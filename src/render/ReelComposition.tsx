import {AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {RenderRootProps} from './types';
import {resolveVisualState} from './visual-state';
import {StageBackdrop, MarqueeFrame} from './dom/StageBackdrop';
import {ImpactTitle, TopOutcome} from './dom/ImpactTitle';
import {ComplianceBlock, SelectionDisclosure} from './dom/Hud';
import {FormatSceneRouter} from './dom/FormatSceneRouter';
import {PixiStage} from './pixi/PixiStage';
import {AudioBus} from './audio/AudioBus';
import {carnivalNightTokens as tokens} from '../theme/carnival-night/tokens';
import {WinMathLogo} from './dom/Branding';
import {HostOverlay} from './dom/HostOverlay';
import {AttemptBadge} from './dom/AttemptBadge';

const FontFaces: React.FC = () => <style>{`
  @font-face { font-family: 'Archivo Black'; src: url('${staticFile('assets/fonts/archivo-black-latin-400-normal.woff2')}') format('woff2'); font-style: normal; font-weight: 400; font-display: block; }
  @font-face { font-family: 'Barlow Condensed'; src: url('${staticFile('assets/fonts/barlow-condensed-latin-700-normal.woff2')}') format('woff2'); font-style: normal; font-weight: 700; font-display: block; }
  @font-face { font-family: 'Inter'; src: url('${staticFile('assets/fonts/inter-latin-600-normal.woff2')}') format('woff2'); font-style: normal; font-weight: 600 800; font-display: block; }
`}</style>;

const DiagnosticFrame: React.FC = () => <AbsoluteFill style={{background: tokens.color.background, color: tokens.color.textPrimary, alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', textAlign: 'center', padding: 80}}>
  <div style={{fontSize: 54, fontWeight: 800}}>CASINO REEL BUILDER</div>
  <div style={{fontSize: 28, marginTop: 20, color: tokens.color.textSecondary}}>Load frozen artifacts through <code>pnpm reel preview</code> or <code>pnpm reel render</code>.</div>
</AbsoluteFill>;

export const ReelComposition: React.FC<RenderRootProps> = ({payload}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  if (!payload) return <DiagnosticFrame />;
  const state = resolveVisualState({frame, spec: payload.spec, simulation: payload.simulation, story: payload.story});
  const scale = Math.max(width / 1080, height / 1920);
  const offsetX = (width - 1080 * scale) / 2;
  const offsetY = (height - 1920 * scale) / 2;
  return <AbsoluteFill style={{background: tokens.color.background, overflow: 'hidden'}}>
    <FontFaces />
    <div data-render-root="casino-reel" data-active-beat={state.activeBeatId} data-visible-through-round={state.visibleThroughRound} style={{position: 'absolute', left: offsetX, top: offsetY, width: 1080, height: 1920, transformOrigin: 'top left', transform: `scale(${scale})`, overflow: 'hidden'}}>
      <StageBackdrop state={state} />
      <PixiStage state={state} />
      <MarqueeFrame frame={frame} />
      <AttemptBadge spec={payload.spec} />
      <WinMathLogo state={state} />
      <ImpactTitle state={state} spec={payload.spec} />
      <TopOutcome state={state} />
      {payload.spec.format.kind !== 'survive-500' ? <SelectionDisclosure state={state} /> : null}
      <FormatSceneRouter state={state} spec={payload.spec} />
      <HostOverlay state={state} />
      {payload.spec.format.kind !== 'survive-500' ? <ComplianceBlock spec={payload.spec} /> : null}
    </div>
    <AudioBus story={payload.story} />
  </AbsoluteFill>;
};
