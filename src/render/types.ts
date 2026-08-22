import type {ReelSpecV1} from '../contracts/reel-spec';
import type {RenderManifestV1} from '../contracts/render-manifest';
import type {SimulationResultV1} from '../contracts/simulation';
import type {StoryPlanV1} from '../contracts/story-plan';

export interface RenderInputProps {
  spec: ReelSpecV1;
  simulation: SimulationResultV1;
  story: StoryPlanV1;
  manifest: RenderManifestV1;
}

export interface RenderRootProps {
  payload?: RenderInputProps;
}
