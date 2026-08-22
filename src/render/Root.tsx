import {Composition} from 'remotion';
import {ReelComposition} from './ReelComposition';
import type {RenderRootProps} from './types';

export const RemotionRoot: React.FC = () => <Composition
  id="CasinoReel"
  component={ReelComposition}
  width={1080}
  height={1920}
  fps={30}
  durationInFrames={480}
  defaultProps={{} satisfies RenderRootProps}
/>;
