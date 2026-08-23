import path from 'node:path';
import {execFile} from 'node:child_process';
import {unlink} from 'node:fs/promises';
import {promisify} from 'node:util';
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, renderStill, selectComposition, type HeadlessBrowser} from '@remotion/renderer';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';
import type {DeepReadonly} from '../contracts/common';
import type {RenderManifestV1} from '../contracts/render-manifest';
import type {ReelSpecV1} from '../contracts/reel-spec';
import type {SimulationResultV1} from '../contracts/simulation';
import type {StoryPlanV1} from '../contracts/story-plan';
import {ensureDirectory} from '../core/files';
import {createPackRegistry} from '../packs/registry';
import {selectGoldenFrames, type SelectedFrame} from './frame-selector';
import type {RenderInputProps} from './types';

const chromeExecutable = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const aacTruePeakSafetyMarginDb = 0.4;
const execFileAsync = promisify(execFile);
let bundlePromise: Promise<string> | undefined;

function mutablePayload(input: {
  spec: DeepReadonly<ReelSpecV1>;
  simulation: DeepReadonly<SimulationResultV1>;
  story: DeepReadonly<StoryPlanV1>;
  manifest: DeepReadonly<RenderManifestV1>;
}): RenderInputProps {
  return structuredClone(input) as RenderInputProps;
}

async function getServeUrl(workspaceRoot: string): Promise<string> {
  bundlePromise ??= bundle({
    entryPoint: path.join(workspaceRoot, 'src', 'render', 'index.ts'),
    outDir: path.join(workspaceRoot, '.cache', 'remotion-bundle'),
    publicDir: path.join(workspaceRoot, 'public'),
    rootDir: workspaceRoot,
    enableCaching: true,
    onProgress: () => undefined,
    ignoreRegisterRootWarning: true,
  });
  return bundlePromise;
}

async function openRenderBrowser(): Promise<HeadlessBrowser> {
  return openBrowser('chrome', {
    browserExecutable: chromeExecutable,
    chromiumOptions: {gl: 'angle', headless: true},
    logLevel: 'warn',
  });
}

async function resolveComposition(input: {
  workspaceRoot: string;
  payload: RenderInputProps;
  manifest: DeepReadonly<RenderManifestV1>;
  browser?: HeadlessBrowser;
}) {
  const serveUrl = await getServeUrl(input.workspaceRoot);
  const selected = await selectComposition({
    serveUrl,
    id: input.manifest.composition.id,
    inputProps: {payload: input.payload},
    browserExecutable: chromeExecutable,
    ...(input.browser ? {puppeteerInstance: input.browser} : {}),
    chromiumOptions: {gl: 'angle', headless: true},
    logLevel: 'warn',
    timeoutInMilliseconds: 120_000,
  });
  return {
    serveUrl,
    composition: {
      ...selected,
      width: input.manifest.composition.width,
      height: input.manifest.composition.height,
      fps: input.manifest.composition.fps,
      durationInFrames: input.manifest.composition.durationInFrames,
    },
  };
}

export interface RenderDataInput {
  workspaceRoot: string;
  spec: DeepReadonly<ReelSpecV1>;
  simulation: DeepReadonly<SimulationResultV1>;
  story: DeepReadonly<StoryPlanV1>;
  manifest: DeepReadonly<RenderManifestV1>;
}

function representativePreviewFrame(input: RenderDataInput): number {
  if (input.spec.format.kind === 'stop-or-continue') {
    const decision = input.story.beats.find((beat) => beat.kind === 'decision');
    if (decision) return Math.floor((decision.startFrame + decision.endFrameExclusive - 1) / 2);
  }
  if (input.spec.format.kind === 'luckiest-player') {
    const setup = input.story.beats.find((beat) => beat.kind === 'setup');
    if (setup) return Math.floor((setup.startFrame + setup.endFrameExclusive - 1) / 2);
  }
  return selectGoldenFrames(input.story)[2]!.frame;
}

export async function renderPreviewStill(input: RenderDataInput, frame?: number): Promise<string> {
  const payload = mutablePayload(input);
  const browser = await openRenderBrowser();
  try {
    const {serveUrl, composition} = await resolveComposition({...input, payload, browser});
    const output = path.join(input.workspaceRoot, input.manifest.output.previewPath ?? `${input.manifest.output.directory}/preview/keyframes/preview.png`);
    await ensureDirectory(path.dirname(output));
    await renderStill({
      serveUrl,
      composition,
      inputProps: {payload},
      output,
      frame: frame ?? representativePreviewFrame(input),
      imageFormat: 'png',
      overwrite: true,
      puppeteerInstance: browser,
      browserExecutable: chromeExecutable,
      chromiumOptions: {gl: 'angle', headless: true},
      logLevel: 'warn',
      timeoutInMilliseconds: 120_000,
    });
    return output;
  } finally {
    await browser.close({silent: true});
  }
}

async function writeDownscales(source: string, baseTarget: string): Promise<{phone: string; strict: string; tile: Buffer}> {
  const phone = `${baseTarget}.360.png`;
  const strict = `${baseTarget}.270.png`;
  await sharp(source).resize(360, 640, {fit: 'fill'}).png().toFile(phone);
  await sharp(source).resize(270, 480, {fit: 'fill'}).png().toFile(strict);
  return {phone, strict, tile: await sharp(source).resize(270, 480, {fit: 'fill'}).png().toBuffer()};
}

export async function renderContactSheet(input: RenderDataInput): Promise<{frames: SelectedFrame[]; keyframes: string[]; contactSheet: string}> {
  const payload = mutablePayload(input);
  const browser = await openRenderBrowser();
  const frames = selectGoldenFrames(input.story);
  const keyframeRoot = path.join(input.workspaceRoot, input.manifest.output.directory, 'preview', 'keyframes');
  await ensureDirectory(keyframeRoot);
  const keyframes: string[] = [];
  const tiles: Buffer[] = [];
  try {
    const {serveUrl, composition} = await resolveComposition({...input, payload, browser});
    for (const selected of frames) {
      const output = path.join(keyframeRoot, `${selected.name}.png`);
      await renderStill({
        serveUrl,
        composition,
        inputProps: {payload},
        output,
        frame: selected.frame,
        imageFormat: 'png',
        overwrite: true,
        puppeteerInstance: browser,
        browserExecutable: chromeExecutable,
        chromiumOptions: {gl: 'angle', headless: true},
        logLevel: 'warn',
        timeoutInMilliseconds: 120_000,
      });
      keyframes.push(output);
      const downscaled = await writeDownscales(output, path.join(keyframeRoot, selected.name));
      tiles.push(downscaled.tile);
    }
  } finally {
    await browser.close({silent: true});
  }
  const contactSheet = path.join(input.workspaceRoot, input.manifest.output.contactSheetPath);
  await ensureDirectory(path.dirname(contactSheet));
  await sharp({create: {width: 810, height: 1440, channels: 3, background: '#07060B'}})
    .composite(tiles.map((tile, index) => ({input: tile, left: (index % 3) * 270, top: Math.floor(index / 3) * 480})))
    .jpeg({quality: 92, chromaSubsampling: '4:4:4'})
    .toFile(contactSheet);
  return {frames, keyframes, contactSheet};
}

export async function renderVideo(input: RenderDataInput, options: {frameRange?: [number, number]; outputOverride?: string; onProgress?: (progress: number) => void} = {}): Promise<string> {
  const payload = mutablePayload(input);
  const {serveUrl, composition} = await resolveComposition({...input, payload});
  const output = options.outputOverride ?? path.join(input.workspaceRoot, input.manifest.output.videoPath);
  const shouldNormalize = input.manifest.profile === 'final' || input.manifest.profile === 'public';
  const remotionOutput = shouldNormalize ? `${output}.remotion.mp4` : output;
  await ensureDirectory(path.dirname(output));
  await renderMedia({
    serveUrl,
    composition,
    inputProps: {payload},
    outputLocation: remotionOutput,
    codec: 'h264',
    audioCodec: 'aac',
    pixelFormat: 'yuv420p',
    colorSpace: 'bt709',
    sampleRate: 48_000,
    videoBitrate: input.manifest.profile === 'draft' ? '4M' : '12M',
    audioBitrate: '192K',
    x264Preset: input.manifest.profile === 'draft' ? 'veryfast' : 'medium',
    concurrency: 1,
    overwrite: true,
    enforceAudioTrack: true,
    browserExecutable: chromeExecutable,
    chromiumOptions: {gl: 'angle', headless: true},
    logLevel: 'warn',
    timeoutInMilliseconds: 120_000,
    ...(options.frameRange ? {frameRange: options.frameRange} : {}),
    ...(options.onProgress ? {onProgress: ({progress}) => options.onProgress!(progress)} : {}),
  });
  if (shouldNormalize) {
    const loudness = createPackRegistry().resolveMotionAudio(input.spec.packs.motionAudio.id, input.spec.packs.motionAudio.version).loudness;
    await normalizeLoudness({
      input: remotionOutput,
      output,
      targetLufs: loudness.targetLufs,
      truePeakDb: loudness.truePeakDb - aacTruePeakSafetyMarginDb,
    });
    await unlink(remotionOutput);
  }
  return output;
}

interface LoudnormAnalysis {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  target_offset: string;
}

async function normalizeLoudness(input: {input: string; output: string; targetLufs: number; truePeakDb: number}): Promise<void> {
  if (!ffmpegPath) throw new Error('ffmpeg-static binary is unavailable for the final loudness pass');
  const baseFilter = `loudnorm=I=${input.targetLufs}:LRA=11:TP=${input.truePeakDb}`;
  const {stderr} = await execFileAsync(ffmpegPath, [
    '-hide_banner', '-nostats', '-i', input.input, '-map', '0:a:0', '-af', `${baseFilter}:print_format=json`, '-f', 'null', '-',
  ], {maxBuffer: 10 * 1024 * 1024});
  const candidates = stderr.match(/\{\s*"input_i"[\s\S]*?\}/g);
  const candidate = candidates?.at(-1);
  if (!candidate) throw new Error('FFmpeg loudnorm analysis did not return a measurement payload');
  const measured = JSON.parse(candidate) as LoudnormAnalysis;
  const measuredFilter = `${baseFilter}:measured_I=${measured.input_i}:measured_LRA=${measured.input_lra}:measured_TP=${measured.input_tp}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true:print_format=summary`;
  await execFileAsync(ffmpegPath, [
    '-y', '-hide_banner', '-nostats', '-i', input.input,
    '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy',
    '-af', measuredFilter, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
    '-movflags', '+faststart', input.output,
  ], {maxBuffer: 10 * 1024 * 1024});
}
