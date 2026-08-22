#!/usr/bin/env node
import path from 'node:path';
import {Command} from 'commander';
import {z} from 'zod';
import {PRODUCER_VERSION} from '../core/artifact';
import {writeJsonReplace} from '../core/files';
import {compilePipeline, finalizePipeline, loadPipelineContext, manifestPipeline, preparePipeline, simulatePipeline, type PipelineContext} from '../pipeline/pipeline';
import {runQa} from '../qa/qa-runner';
import {renderContactSheet, renderPreviewStill, renderVideo} from '../render/runner';
import {runDoctor} from './doctor';

const program = new Command();
program.name('reel').description('Deterministic vertical casino/game-show reel pipeline').version(PRODUCER_VERSION);

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function resolveContext(input: string, options: {profile?: string; seed?: string} = {}): Promise<PipelineContext> {
  if (path.basename(input) === 'render-manifest.json' || path.basename(input) === 'simulation.json' || path.basename(input) === 'story-plan.json' || !input.endsWith('.json')) {
    return loadPipelineContext(input);
  }
  return preparePipeline(input, {
    ...(options.profile ? {profile: z.enum(['draft', 'final', 'public']).parse(options.profile)} : {}),
    ...(options.seed ? {seed: options.seed} : {}),
  });
}

async function fullyCompiled(input: string, options: {profile?: string; seed?: string} = {}): Promise<PipelineContext> {
  let context = await resolveContext(input, options);
  context = await simulatePipeline(context);
  context = await compilePipeline(context);
  return manifestPipeline(context);
}

function renderData(context: PipelineContext) {
  if (!context.simulation || !context.story || !context.renderManifest) throw new Error('Pipeline context is not render-ready');
  return {workspaceRoot: context.workspaceRoot, spec: context.spec, simulation: context.simulation, story: context.story, manifest: context.renderManifest};
}

program.command('validate')
  .argument('<spec>', 'author ReelSpec JSON')
  .action(async (spec: string) => {
    const context = await preparePipeline(spec);
    print({status: 'passed', reelId: context.spec.reelId, format: context.spec.format.kind, contentHash: context.spec.contentHash, buildId: context.buildId, canonicalSpec: `${context.buildDirectoryRelative}/input/reel-spec.json`});
  });

program.command('simulate')
  .argument('<spec>', 'author ReelSpec JSON')
  .option('--seed <seed>', 'override seed before canonicalization')
  .action(async (spec: string, options: {seed?: string}) => {
    const context = await simulatePipeline(await preparePipeline(spec, options.seed ? {seed: options.seed} : {}));
    print({status: 'passed', buildId: context.buildId, contentHash: context.simulation!.contentHash, output: `${context.buildDirectoryRelative}/data/simulation.json`});
  });

program.command('compile')
  .argument('<input>', 'author ReelSpec, simulation.json or build directory')
  .action(async (input: string) => {
    let context = await resolveContext(input);
    context = await compilePipeline(context);
    print({status: 'passed', buildId: context.buildId, contentHash: context.story!.contentHash, output: `${context.buildDirectoryRelative}/data/story-plan.json`});
  });

program.command('preview')
  .argument('<input>', 'author ReelSpec or build')
  .action(async (input: string) => {
    const context = await fullyCompiled(input, {profile: 'draft'});
    const output = await renderPreviewStill(renderData(context));
    print({status: 'passed', buildId: context.buildId, preview: path.relative(context.workspaceRoot, output)});
  });

program.command('contact-sheet')
  .argument('<input>', 'author ReelSpec, render-manifest.json or build directory')
  .option('--profile <profile>', 'draft, final or public')
  .action(async (input: string, options: {profile?: string}) => {
    const context = await fullyCompiled(input, options);
    const output = await renderContactSheet(renderData(context));
    print({status: 'passed', buildId: context.buildId, contactSheet: path.relative(context.workspaceRoot, output.contactSheet), frames: output.frames});
  });

program.command('render')
  .argument('<input>', 'author ReelSpec, render-manifest.json or build directory')
  .option('--profile <profile>', 'draft, final or public')
  .action(async (input: string, options: {profile?: string}) => {
    if (path.basename(input) === 'render-manifest.json' && options.profile) throw new Error('--profile cannot override a frozen RenderManifest');
    const context = await fullyCompiled(input, options);
    const data = renderData(context);
    await renderContactSheet(data);
    let lastReported = -10;
    const video = await renderVideo(data, {onProgress: (progress) => {
      const percentage = Math.floor(progress * 100);
      if (percentage >= lastReported + 10 || percentage === 100) {
        lastReported = percentage;
        process.stdout.write(`render ${percentage}%\n`);
      }
    }});
    const qa = await runQa(data);
    await finalizePipeline(context, qa.status);
    print({status: qa.status, buildId: context.buildId, video: path.relative(context.workspaceRoot, video), contactSheet: context.renderManifest!.output.contactSheetPath, qa: context.renderManifest!.output.qaReportPath});
    if (qa.status === 'failed') process.exitCode = 1;
  });

const batchSchema = z.strictObject({schemaVersion: z.literal('reel-batch/1'), batchId: z.string(), specs: z.array(z.string()).min(1)});
program.command('batch')
  .argument('<batch>', 'batch JSON')
  .option('--profile <profile>', 'draft, final or public', 'draft')
  .option('--jobs <jobs>', 'accepted scheduling hint; individual status remains isolated', '1')
  .option('--render', 'encode each full video instead of a representative still')
  .action(async (batchPath: string, options: {profile: string; jobs: string; render?: boolean}) => {
    const ledger = batchSchema.parse(JSON.parse(await (await import('node:fs/promises')).readFile(path.resolve(batchPath), 'utf8')) as unknown);
    const results: Array<Record<string, unknown>> = [];
    for (const spec of ledger.specs) {
      try {
        const context = await fullyCompiled(spec, {profile: options.profile});
        const data = renderData(context);
        const preview = await renderPreviewStill(data);
        const video = options.render ? await renderVideo(data) : undefined;
        results.push({spec, format: context.spec.format.kind, status: 'passed', buildId: context.buildId, simulationHash: context.simulation!.contentHash, storyHash: context.story!.contentHash, preview: path.relative(context.workspaceRoot, preview), ...(video ? {video: path.relative(context.workspaceRoot, video)} : {})});
      } catch (error) {
        results.push({spec, status: 'failed', error: error instanceof Error ? error.message : String(error)});
      }
    }
    const report = {schemaVersion: 'batch-report/1', batchId: ledger.batchId, profile: options.profile, jobsRequested: Number(options.jobs), executionMode: 'sequential-deterministic', results};
    const output = path.resolve('output', 'batches', ledger.batchId, 'report.json');
    await writeJsonReplace(output, report);
    print({...report, output: path.relative(process.cwd(), output)});
    if (results.some((entry) => entry.status === 'failed')) process.exitCode = 1;
  });

program.command('doctor').action(async () => {
  const result = await runDoctor(process.cwd());
  print(result);
  if (result.status === 'failed') process.exitCode = 1;
});

program.parseAsync(process.argv).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
