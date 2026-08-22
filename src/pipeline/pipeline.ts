import path from 'node:path';
import type {DeepReadonly} from '../contracts/common';
import type {ReelSpecV1} from '../contracts/reel-spec';
import type {RenderManifestV1, RunManifest} from '../contracts/render-manifest';
import type {SimulationResultV1} from '../contracts/simulation';
import type {StoryPlanV1} from '../contracts/story-plan';
import {loadAuthorReelSpec, type ReelSpecOverrides} from '../contracts/reel-spec-loader';
import {PRODUCER_VERSION} from '../core/artifact';
import {verifyArtifactHash} from '../core/artifact';
import {appendJsonLine, ensureDirectory, pathExists, readJson, writeJsonReplace, writeJsonStable} from '../core/files';
import {createGameAdapterRegistry} from '../game/registry';
import {createPackRegistry} from '../packs/registry';
import {buildRenderManifest} from '../render/manifest-builder';
import {createFormatRegistry} from '../story/format-registry';

export interface PipelineContext {
  workspaceRoot: string;
  buildId: string;
  buildDirectory: string;
  buildDirectoryRelative: string;
  spec: DeepReadonly<ReelSpecV1>;
  simulation?: DeepReadonly<SimulationResultV1>;
  story?: DeepReadonly<StoryPlanV1>;
  renderManifest?: DeepReadonly<RenderManifestV1>;
}

export function buildIdForSpec(spec: DeepReadonly<ReelSpecV1>): string {
  return `b-${spec.contentHash.slice(0, 12)}`;
}

function relative(workspaceRoot: string, target: string): string {
  return path.relative(workspaceRoot, target).split(path.sep).join('/');
}

async function logPipeline(context: PipelineContext, event: string, details: Record<string, unknown> = {}): Promise<void> {
  await appendJsonLine(path.join(context.buildDirectory, 'logs', 'pipeline.jsonl'), {
    timestamp: new Date().toISOString(),
    event,
    buildId: context.buildId,
    reelId: context.spec.reelId,
    ...details,
  });
}

function runManifestFor(context: PipelineContext, status: RunManifest['status']): RunManifest {
  return {
    schemaVersion: 'run-manifest/1',
    buildId: context.buildId,
    reelId: context.spec.reelId,
    createdAt: context.spec.createdAt,
    status,
    versions: {
      builderVersion: PRODUCER_VERSION,
      specVersion: context.spec.schemaVersion,
      simulationVersion: context.simulation?.schemaVersion ?? 'pending',
      storyCompilerVersion: context.story?.format.version ?? 'pending',
      rendererVersion: 'remotion-4.0.515',
      pixiVersion: '8.20.0',
      ffmpegVersion: '6.0',
      ffprobeVersion: '4.4',
    },
    formatKind: context.spec.format.kind,
    themeId: context.spec.packs.theme.id,
    seed: context.spec.game.seed,
    simulationModel: context.spec.game.requestedModelVersion,
    hashes: {
      spec: context.spec.contentHash,
      ...(context.simulation ? {simulation: context.simulation.contentHash} : {}),
      ...(context.story ? {story: context.story.contentHash} : {}),
      ...(context.renderManifest ? {render: context.renderManifest.contentHash} : {}),
    },
    environment: {
      node: process.version,
      pnpm: '10.8.1',
      os: `${process.platform}-${process.arch}`,
      git: 'unversioned',
    },
    ...(context.renderManifest ? {
      delivery: {
        profile: context.renderManifest.profile,
        width: context.renderManifest.composition.width,
        height: context.renderManifest.composition.height,
        fps: context.renderManifest.composition.fps,
        durationInFrames: context.renderManifest.composition.durationInFrames,
        videoCodec: 'h264' as const,
        pixelFormat: 'yuv420p' as const,
        colorSpace: 'bt709' as const,
        audioCodec: 'aac' as const,
        audioSampleRate: 48_000 as const,
      },
      assets: context.renderManifest.assets.map((asset) => ({
        assetId: asset.assetId,
        path: asset.path,
        sha256: asset.sha256,
        provenanceId: asset.provenance.provenanceId,
        license: asset.provenance.license ?? 'unknown',
        allowedUsage: [...asset.provenance.allowedUsage],
      })),
    } : {}),
    ...(context.simulation?.selectionAudit ? {
      selection: {
        policyId: context.simulation.selectionAudit.policyId,
        policyVersion: context.simulation.selectionAudit.policyVersion,
        consideredCount: context.simulation.selectionAudit.consideredCount,
        selectedParticipantIds: [...context.simulation.selectionAudit.selectedParticipantIds],
        disclosedAs: context.simulation.selectionAudit.disclosedAs,
      },
    } : {}),
    artifacts: {
      spec: {path: `${context.buildDirectoryRelative}/input/reel-spec.json`, status: 'created'},
      simulation: {path: `${context.buildDirectoryRelative}/data/simulation.json`, status: context.simulation ? 'created' : 'skipped'},
      story: {path: `${context.buildDirectoryRelative}/data/story-plan.json`, status: context.story ? 'created' : 'skipped'},
      renderManifest: {path: `${context.buildDirectoryRelative}/render-manifest.json`, status: context.renderManifest ? 'created' : 'skipped'},
    },
    warnings: ['approximate-v0 is illustrative and is not a verified commercial game model'],
  };
}

async function updateRunManifest(context: PipelineContext, status: RunManifest['status']): Promise<void> {
  await writeJsonReplace(path.join(context.buildDirectory, 'run-manifest.json'), runManifestFor(context, status));
}

export async function preparePipeline(specPath: string, overrides: ReelSpecOverrides = {}): Promise<PipelineContext> {
  const workspaceRoot = process.cwd();
  const spec = await loadAuthorReelSpec(specPath, overrides);
  const packs = createPackRegistry();
  packs.resolveLayout(spec.packs.layout.id, spec.packs.layout.version);
  packs.resolveTheme(spec.packs.theme.id, spec.packs.theme.version);
  packs.resolveMotionAudio(spec.packs.motionAudio.id, spec.packs.motionAudio.version);
  createFormatRegistry().resolve(spec.format.kind, spec.format.formatVersion).validate(spec.format);
  createGameAdapterRegistry().resolve(spec.game.adapterId).validateConfig(spec.game.config);
  const buildId = buildIdForSpec(spec);
  const buildDirectory = path.join(workspaceRoot, 'output', spec.reelId, buildId);
  const buildDirectoryRelative = relative(workspaceRoot, buildDirectory);
  await Promise.all([
    ensureDirectory(path.join(buildDirectory, 'input')),
    ensureDirectory(path.join(buildDirectory, 'data')),
    ensureDirectory(path.join(buildDirectory, 'preview', 'keyframes')),
    ensureDirectory(path.join(buildDirectory, 'video')),
    ensureDirectory(path.join(buildDirectory, 'qa')),
    ensureDirectory(path.join(buildDirectory, 'logs')),
  ]);
  const context: PipelineContext = {workspaceRoot, buildId, buildDirectory, buildDirectoryRelative, spec};
  await writeJsonStable(path.join(buildDirectory, 'input', 'reel-spec.json'), spec);
  await updateRunManifest(context, 'prepared');
  await logPipeline(context, 'prepared', {specHash: spec.contentHash, profile: spec.render.profile});
  return context;
}

export async function simulatePipeline(context: PipelineContext): Promise<PipelineContext> {
  const target = path.join(context.buildDirectory, 'data', 'simulation.json');
  let simulation: DeepReadonly<SimulationResultV1>;
  const cached = await pathExists(target);
  if (cached) {
    simulation = await readJson<SimulationResultV1>(target);
    if (!verifyArtifactHash(simulation) || simulation.reelSpecHash !== context.spec.contentHash) throw new Error(`Invalid cached simulation: ${target}`);
  } else {
    const adapter = createGameAdapterRegistry().resolve(context.spec.game.adapterId);
    const config = adapter.validateConfig(context.spec.game.config);
    simulation = await adapter.simulate({spec: context.spec, config});
    await writeJsonStable(target, simulation);
  }
  const next = {...context, simulation};
  await updateRunManifest(next, 'simulated');
  await logPipeline(next, 'simulated', {simulationHash: simulation.contentHash, cache: cached ? 'hit' : 'miss'});
  return next;
}

export async function compilePipeline(context: PipelineContext): Promise<PipelineContext> {
  const withSimulation = context.simulation ? context : await simulatePipeline(context);
  const target = path.join(withSimulation.buildDirectory, 'data', 'story-plan.json');
  let story: DeepReadonly<StoryPlanV1>;
  const cached = await pathExists(target);
  if (cached) {
    story = await readJson<StoryPlanV1>(target);
    if (!verifyArtifactHash(story) || story.simulationHash !== withSimulation.simulation!.contentHash) throw new Error(`Invalid cached StoryPlan: ${target}`);
  } else {
    const definition = createFormatRegistry().resolve(withSimulation.spec.format.kind, withSimulation.spec.format.formatVersion);
    story = definition.compile({spec: withSimulation.spec, simulation: withSimulation.simulation!, config: definition.validate(withSimulation.spec.format)});
    await writeJsonStable(target, story);
  }
  const next = {...withSimulation, story};
  await updateRunManifest(next, 'compiled');
  await logPipeline(next, 'story-compiled', {storyHash: story.contentHash, cache: cached ? 'hit' : 'miss'});
  return next;
}

export async function manifestPipeline(context: PipelineContext): Promise<PipelineContext> {
  const compiled = context.story ? context : await compilePipeline(context);
  const target = path.join(compiled.buildDirectory, 'render-manifest.json');
  let renderManifest: DeepReadonly<RenderManifestV1>;
  const cached = await pathExists(target);
  if (cached) {
    renderManifest = await readJson<RenderManifestV1>(target);
    if (!verifyArtifactHash(renderManifest) || renderManifest.refs.storyPlan.contentHash !== compiled.story!.contentHash) throw new Error(`Invalid cached RenderManifest: ${target}`);
  } else {
    renderManifest = await buildRenderManifest({workspaceRoot: compiled.workspaceRoot, buildDirectoryRelative: compiled.buildDirectoryRelative, spec: compiled.spec, simulation: compiled.simulation!, story: compiled.story!});
    await writeJsonStable(target, renderManifest);
  }
  const next = {...compiled, renderManifest};
  await updateRunManifest(next, 'compiled');
  await logPipeline(next, 'render-manifest-built', {renderManifestHash: renderManifest.contentHash, cache: cached ? 'hit' : 'miss'});
  return next;
}

export async function loadPipelineContext(target: string): Promise<PipelineContext> {
  const workspaceRoot = process.cwd();
  const resolved = path.resolve(target);
  let buildDirectory: string;
  const basename = path.basename(resolved);
  if (basename === 'render-manifest.json' || basename === 'run-manifest.json') buildDirectory = path.dirname(resolved);
  else if (basename === 'simulation.json' || basename === 'story-plan.json') buildDirectory = path.dirname(path.dirname(resolved));
  else if (await pathExists(path.join(resolved, 'input', 'reel-spec.json'))) buildDirectory = resolved;
  else throw new Error(`Cannot resolve build directory from ${target}`);
  const spec = await readJson<ReelSpecV1>(path.join(buildDirectory, 'input', 'reel-spec.json'));
  if (!verifyArtifactHash(spec)) throw new Error('Cached ReelSpec hash is invalid');
  const context: PipelineContext = {
    workspaceRoot,
    buildId: path.basename(buildDirectory),
    buildDirectory,
    buildDirectoryRelative: relative(workspaceRoot, buildDirectory),
    spec,
  };
  const simulationPath = path.join(buildDirectory, 'data', 'simulation.json');
  const storyPath = path.join(buildDirectory, 'data', 'story-plan.json');
  const renderPath = path.join(buildDirectory, 'render-manifest.json');
  if (await pathExists(simulationPath)) context.simulation = await readJson<SimulationResultV1>(simulationPath);
  if (await pathExists(storyPath)) context.story = await readJson<StoryPlanV1>(storyPath);
  if (await pathExists(renderPath)) context.renderManifest = await readJson<RenderManifestV1>(renderPath);
  return context;
}

export async function finalizePipeline(context: PipelineContext, qaStatus: Exclude<RunManifest['qaStatus'], undefined>): Promise<void> {
  const manifest = runManifestFor(context, 'rendered');
  manifest.qaStatus = qaStatus;
  manifest.artifacts.video = {path: context.renderManifest?.output.videoPath ?? '', status: 'created'};
  manifest.artifacts.contactSheet = {path: context.renderManifest?.output.contactSheetPath ?? '', status: 'created'};
  manifest.artifacts.qa = {path: context.renderManifest?.output.qaReportPath ?? '', status: 'created'};
  manifest.artifacts.ffprobe = {path: `${context.buildDirectoryRelative}/qa/ffprobe.json`, status: 'created'};
  manifest.artifacts.audioAnalysis = {path: `${context.buildDirectoryRelative}/qa/audio.json`, status: 'created'};
  manifest.artifacts.frameSanity = {path: `${context.buildDirectoryRelative}/qa/frame-sanity.json`, status: 'created'};
  manifest.artifacts.pipelineLog = {path: `${context.buildDirectoryRelative}/logs/pipeline.jsonl`, status: 'created'};
  if (await pathExists(path.join(context.buildDirectory, 'qa', 'timeline-contact-sheet.jpg'))) {
    manifest.artifacts.timelineContactSheet = {path: `${context.buildDirectoryRelative}/qa/timeline-contact-sheet.jpg`, status: 'created'};
  }
  if (await pathExists(path.join(context.buildDirectory, 'qa', 'visual-review.json'))) {
    manifest.artifacts.visualReview = {path: `${context.buildDirectoryRelative}/qa/visual-review.json`, status: 'created'};
  }
  await writeJsonReplace(path.join(context.buildDirectory, 'run-manifest.json'), manifest);
  await logPipeline(context, 'finalized', {qaStatus, videoPath: context.renderManifest?.output.videoPath});
}
