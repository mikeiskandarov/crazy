import path from 'node:path';
import type {ArtifactRef, DeepReadonly} from '../contracts/common';
import type {ReelSpecV1} from '../contracts/reel-spec';
import type {RenderManifestV1} from '../contracts/render-manifest';
import type {SimulationResultV1} from '../contracts/simulation';
import type {StoryPlanV1} from '../contracts/story-plan';
import {buildArtifact} from '../core/artifact';
import {resolveAssets} from '../assets/asset-resolver';
import {createPackRegistry} from '../packs/registry';

function artifactRef(artifact: {artifactId: string; contentHash: string; schemaVersion: string}, artifactPath: string): ArtifactRef {
  return {artifactId: artifact.artifactId, path: artifactPath, contentHash: artifact.contentHash, schemaVersion: artifact.schemaVersion};
}

export async function buildRenderManifest(input: {
  workspaceRoot: string;
  buildDirectoryRelative: string;
  spec: DeepReadonly<ReelSpecV1>;
  simulation: DeepReadonly<SimulationResultV1>;
  story: DeepReadonly<StoryPlanV1>;
}): Promise<DeepReadonly<RenderManifestV1>> {
  const packs = createPackRegistry();
  const layout = packs.resolveLayout(input.spec.packs.layout.id, input.spec.packs.layout.version);
  const theme = packs.resolveTheme(input.spec.packs.theme.id, input.spec.packs.theme.version);
  const motion = packs.resolveMotionAudio(input.spec.packs.motionAudio.id, input.spec.packs.motionAudio.version);
  const profile = input.spec.render.profile;
  const width = profile === 'draft' ? 540 : 1080;
  const height = profile === 'draft' ? 960 : 1920;
  const root = input.buildDirectoryRelative;
  const videoName = profile === 'draft' ? 'draft.mp4' : 'final.mp4';
  return buildArtifact<RenderManifestV1>({
    artifactId: `render-${input.spec.reelId}-${profile}`,
    schemaVersion: 'render-manifest/1',
    parentHashes: [input.spec.contentHash, input.simulation.contentHash, input.story.contentHash],
    payload: {
      refs: {
        reelSpec: artifactRef(input.spec, path.posix.join(root, 'input/reel-spec.json')),
        simulation: artifactRef(input.simulation, path.posix.join(root, 'data/simulation.json')),
        storyPlan: artifactRef(input.story, path.posix.join(root, 'data/story-plan.json')),
      },
      packs: {
        layout: {...input.spec.packs.layout, contentHash: packs.hash(layout)},
        theme: {...input.spec.packs.theme, contentHash: packs.hash(theme)},
        motionAudio: {...input.spec.packs.motionAudio, contentHash: packs.hash(motion)},
      },
      composition: {id: 'CasinoReel', width, height, fps: 30, durationInFrames: input.story.durationInFrames},
      assets: await resolveAssets(input.workspaceRoot, profile),
      profile,
      output: {
        directory: root,
        previewPath: path.posix.join(root, 'preview/keyframes/preview.png'),
        videoPath: path.posix.join(root, `video/${videoName}`),
        contactSheetPath: path.posix.join(root, 'preview/contact-sheet.jpg'),
        qaReportPath: path.posix.join(root, 'qa/report.json'),
      },
    },
  });
}
