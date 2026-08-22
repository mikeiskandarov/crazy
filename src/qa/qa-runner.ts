import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import sharp from 'sharp';
import type {DeepReadonly} from '../contracts/common';
import type {ReelSpecV1} from '../contracts/reel-spec';
import type {QaCheckResult, QaReportV1, RenderManifestV1} from '../contracts/render-manifest';
import type {SimulationResultV1} from '../contracts/simulation';
import type {StoryPlanV1} from '../contracts/story-plan';
import {buildArtifact, verifyArtifactHash} from '../core/artifact';
import {pathExists, sha256File, writeJsonReplace, writeJsonStable} from '../core/files';
import {createPackRegistry} from '../packs/registry';
import {resolveVisualState} from '../render/visual-state';
import {selectGoldenFrames} from '../render/frame-selector';

const execFileAsync = promisify(execFile);

interface ProbeStream {
  codec_name?: string;
  codec_type?: string;
  width?: number;
  height?: number;
  pix_fmt?: string;
  color_range?: string;
  color_space?: string;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  sample_rate?: string;
  channels?: number;
  duration?: string;
  nb_frames?: string;
  tags?: Record<string, string>;
  side_data_list?: Array<Record<string, unknown>>;
}

interface ProbeResult {
  streams: ProbeStream[];
  format: {duration?: string; size?: string; bit_rate?: string; tags?: Record<string, string>};
}

interface AudioAnalysis {
  integratedLufs: number;
  loudnessRangeLu: number;
  truePeakDbfs: number;
  targetLufs: number;
  targetTruePeakDbfs: number;
}

function check(checkId: string, status: 'passed' | 'failed' | 'skipped', message: string, severity: QaCheckResult['severity'] = 'blocker', suggestedFix?: string): QaCheckResult {
  return {checkId, status, message, severity, ...(suggestedFix ? {suggestedFix} : {})};
}

async function probeVideo(videoPath: string): Promise<ProbeResult> {
  const binary = typeof ffprobeStatic === 'string' ? ffprobeStatic : ffprobeStatic.path;
  const {stdout} = await execFileAsync(binary, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', videoPath], {maxBuffer: 10 * 1024 * 1024});
  return JSON.parse(stdout) as ProbeResult;
}

async function extractAndDecode(input: {videoPath: string; outputRoot: string; frameCount: number}): Promise<string[]> {
  if (!ffmpegPath) throw new Error('ffmpeg-static binary is unavailable');
  const frames = [0, Math.floor((input.frameCount - 1) / 2), input.frameCount - 1];
  const names = ['first', 'middle', 'last'];
  const outputs: string[] = [];
  for (let index = 0; index < frames.length; index += 1) {
    const selector = `select=eq(n${String.fromCharCode(92)},${frames[index]})`;
    const output = path.join(input.outputRoot, `${names[index]}.png`);
    await execFileAsync(ffmpegPath, ['-y', '-v', 'error', '-i', input.videoPath, '-vf', selector, '-frames:v', '1', output], {maxBuffer: 10 * 1024 * 1024});
    outputs.push(output);
  }
  await execFileAsync(ffmpegPath, ['-v', 'error', '-i', input.videoPath, '-f', 'null', '-'], {maxBuffer: 10 * 1024 * 1024});
  return outputs;
}

async function analyzeExtractedFrames(paths: string[]): Promise<Array<{file: string; mean: number; standardDeviation: number}>> {
  return Promise.all(paths.map(async (file) => {
    const statistics = await sharp(file).stats();
    const channels = statistics.channels.slice(0, 3);
    return {
      file: path.basename(file),
      mean: channels.reduce((sum, channel) => sum + channel.mean, 0) / channels.length,
      standardDeviation: channels.reduce((sum, channel) => sum + channel.stdev, 0) / channels.length,
    };
  }));
}

function lastNumericMatch(input: string, expression: RegExp, label: string): number {
  const matches = [...input.matchAll(expression)];
  const value = Number(matches.at(-1)?.[1]);
  if (!Number.isFinite(value)) throw new Error(`Could not parse ${label} from FFmpeg ebur128 output`);
  return value;
}

async function analyzeAudio(videoPath: string, targets: {targetLufs: number; truePeakDb: number}): Promise<AudioAnalysis> {
  if (!ffmpegPath) throw new Error('ffmpeg-static binary is unavailable');
  const {stderr} = await execFileAsync(ffmpegPath, [
    '-hide_banner', '-nostats', '-i', videoPath, '-map', '0:a:0', '-filter:a', 'ebur128=peak=true', '-f', 'null', '-',
  ], {maxBuffer: 10 * 1024 * 1024});
  return {
    integratedLufs: lastNumericMatch(stderr, /I:\s*(-?\d+(?:\.\d+)?)\s+LUFS/g, 'integrated loudness'),
    loudnessRangeLu: lastNumericMatch(stderr, /LRA:\s*(-?\d+(?:\.\d+)?)\s+LU/g, 'loudness range'),
    truePeakDbfs: lastNumericMatch(stderr, /Peak:\s*(-?\d+(?:\.\d+)?)\s+dBFS/g, 'true peak'),
    targetLufs: targets.targetLufs,
    targetTruePeakDbfs: targets.truePeakDb,
  };
}

function temporalChecks(input: {spec: DeepReadonly<ReelSpecV1>; simulation: DeepReadonly<SimulationResultV1>; story: DeepReadonly<StoryPlanV1>}): QaCheckResult[] {
  const failures: string[] = [];
  const revealFrame = input.story.revealRegistry.find((rule) => rule.revealId === 'final-result')?.earliestFrame ?? input.story.durationInFrames;
  for (let frame = 0; frame < input.story.durationInFrames; frame += 1) {
    const state = resolveVisualState({frame, spec: input.spec, simulation: input.simulation, story: input.story});
    for (const run of state.runs) {
      if (run.points.some((point) => point.round > state.currentRound)) failures.push(`future point at frame ${frame}`);
      const expectedPeak = run.points.reduce((peak, point) => Math.max(peak, point.bankrollAfterMinor), run.startBankrollMinor);
      if (run.visiblePeakMinor !== expectedPeak) failures.push(`future peak at frame ${frame}`);
    }
    if (state.populationMilestones.some((milestone) => milestone.round > state.currentRound)) failures.push(`future milestone at frame ${frame}`);
    if (frame < revealFrame && state.finalResult) failures.push(`final result before reveal at frame ${frame}`);
  }
  return [failures.length === 0
    ? check('temporal-truth-all-frames', 'passed', `All ${input.story.durationInFrames} frames expose only current-or-past state.`)
    : check('temporal-truth-all-frames', 'failed', failures.slice(0, 5).join('; '), 'blocker', 'Fix VisualStateResolver slicing/reveal rules.')];
}

function artifactChecks(input: {spec: DeepReadonly<ReelSpecV1>; simulation: DeepReadonly<SimulationResultV1>; story: DeepReadonly<StoryPlanV1>; manifest: DeepReadonly<RenderManifestV1>}): QaCheckResult[] {
  const valid = [input.spec, input.simulation, input.story, input.manifest].every(verifyArtifactHash);
  const linked = input.simulation.reelSpecHash === input.spec.contentHash
    && input.story.reelSpecHash === input.spec.contentHash
    && input.story.simulationHash === input.simulation.contentHash
    && input.manifest.refs.storyPlan.contentHash === input.story.contentHash;
  const requiredUsage = input.manifest.profile === 'public' ? 'public' : 'internal';
  const provenanceValid = input.manifest.assets.every((asset) => Boolean(asset.sha256 && asset.provenance.license && asset.provenance.allowedUsage.includes(requiredUsage)));
  const unknownRights = input.manifest.assets.some((asset) => !asset.provenance.license || asset.provenance.sourceType === 'reference-only');
  const brandCollision = input.manifest.assets.some((asset) => /crazy[ -]?time|evolution/i.test(`${asset.assetId} ${asset.path}`));
  const draftOnlyReference = input.manifest.profile === 'draft';
  const disclosure = input.spec.compliance.modelDisclosure.toLowerCase().includes('approximate')
    && input.spec.compliance.modelDisclosure.toLowerCase().includes('not real game odds');
  const selected = input.simulation.selectionAudit;
  const selectionValid = !selected || (selected.consideredCount > 0 && selected.selectedParticipantIds.length > 0 && /selected|best|highest|median|seeded|closest|independent/i.test(selected.disclosedAs));
  return [
    check('artifact-hashes', valid ? 'passed' : 'failed', valid ? 'All artifact self-hashes verify.' : 'At least one artifact hash is invalid.'),
    check('artifact-chain', linked ? 'passed' : 'failed', linked ? 'Spec → simulation → story → render hash chain is intact.' : 'Artifact parent references do not match.'),
    check('asset-provenance', !unknownRights && provenanceValid ? 'passed' : 'failed', !unknownRights && provenanceValid ? `All ${input.manifest.assets.length} assets have source, license and allowed usage.` : draftOnlyReference && provenanceValid ? 'Internal draft contains a reference-only asset; clear its rights before final/public delivery.' : 'Asset rights/provenance gate failed.', draftOnlyReference ? 'minor' : 'blocker'),
    check('brand-collision', !brandCollision ? 'passed' : 'failed', !brandCollision ? 'No protected Crazy Time/Evolution asset identifiers are present.' : draftOnlyReference ? 'Internal draft contains the explicitly requested temporary Crazy Time brand reference.' : 'Protected brand-like asset detected.', draftOnlyReference ? 'minor' : 'blocker'),
    check('model-disclosure', disclosure ? 'passed' : 'failed', disclosure ? 'Approximate model is explicitly distinguished from real game odds.' : 'Model disclosure is incomplete.', 'major'),
    check('selection-disclosure', selectionValid ? 'passed' : 'failed', selectionValid ? 'Selected/extreme run has factual considered-count disclosure.' : 'Selection disclosure is missing or ambiguous.', 'major'),
  ];
}

function probeChecks(probe: ProbeResult, manifest: DeepReadonly<RenderManifestV1>): QaCheckResult[] {
  const video = probe.streams.find((stream) => stream.codec_type === 'video');
  const audio = probe.streams.find((stream) => stream.codec_type === 'audio');
  const expectedDuration = manifest.composition.durationInFrames / manifest.composition.fps;
  const videoDuration = Number(video?.duration ?? probe.format.duration ?? 0);
  const durationOk = Math.abs(videoDuration - expectedDuration) <= 1 / manifest.composition.fps + 0.0001;
  const noRotation = !video?.tags?.rotate && !(video?.side_data_list ?? []).some((entry) => 'rotation' in entry);
  return [
    check('video-codec', video?.codec_name === 'h264' ? 'passed' : 'failed', `Video codec: ${video?.codec_name ?? 'missing'}`),
    check('video-dimensions', video?.width === manifest.composition.width && video?.height === manifest.composition.height ? 'passed' : 'failed', `Video dimensions: ${video?.width ?? 0}×${video?.height ?? 0}; expected ${manifest.composition.width}×${manifest.composition.height}.`),
    check('video-pixel-format', video?.pix_fmt === 'yuv420p' ? 'passed' : 'failed', `Pixel format: ${video?.pix_fmt ?? 'missing'} (${video?.color_range ?? 'range unknown'}, ${video?.color_space ?? 'space unknown'}).`),
    check('video-cfr', video?.r_frame_rate === '30/1' && video?.avg_frame_rate === '30/1' ? 'passed' : 'failed', `Frame rate: r=${video?.r_frame_rate ?? 'missing'}, avg=${video?.avg_frame_rate ?? 'missing'}.`),
    check('video-duration', durationOk ? 'passed' : 'failed', `Video duration: ${videoDuration.toFixed(3)}s; expected ${expectedDuration.toFixed(3)}s ±1 frame.`),
    check('audio-contract', audio?.codec_name === 'aac' && audio.sample_rate === '48000' ? 'passed' : 'failed', `Audio: ${audio?.codec_name ?? 'missing'} at ${audio?.sample_rate ?? 'missing'} Hz.`),
    check('stream-count', probe.streams.length === 2 ? 'passed' : 'failed', `Stream count: ${probe.streams.length}; expected one video and one audio stream.`),
    check('rotation-metadata', noRotation ? 'passed' : 'failed', noRotation ? 'No rotation metadata.' : 'Unexpected rotation metadata.'),
  ];
}

export async function runQa(input: {
  workspaceRoot: string;
  spec: DeepReadonly<ReelSpecV1>;
  simulation: DeepReadonly<SimulationResultV1>;
  story: DeepReadonly<StoryPlanV1>;
  manifest: DeepReadonly<RenderManifestV1>;
}): Promise<DeepReadonly<QaReportV1>> {
  const checks: QaCheckResult[] = [...artifactChecks(input), ...temporalChecks(input)];
  const keyframes = selectGoldenFrames(input.story);
  const missingFrames: string[] = [];
  for (const selected of keyframes) {
    const base = path.join(input.workspaceRoot, input.manifest.output.directory, 'preview', 'keyframes', selected.name);
    for (const suffix of ['.png', '.360.png', '.270.png']) if (!(await pathExists(`${base}${suffix}`))) missingFrames.push(`${selected.name}${suffix}`);
  }
  checks.push(check('golden-frames', missingFrames.length === 0 ? 'passed' : 'failed', missingFrames.length === 0 ? 'Seven master, 360 px and 270 px keyframe sets exist.' : `Missing keyframes: ${missingFrames.join(', ')}`, 'major'));
  const contactSheetPath = path.join(input.workspaceRoot, input.manifest.output.contactSheetPath);
  const contactExists = await pathExists(contactSheetPath);
  checks.push(check('contact-sheet', contactExists ? 'passed' : 'failed', contactExists ? 'Beat-selected contact sheet exists.' : 'Contact sheet is missing.', 'major'));
  if (contactExists) {
    await sharp(contactSheetPath).grayscale().jpeg({quality: 90}).toFile(path.join(path.dirname(contactSheetPath), 'contact-sheet.grayscale.jpg'));
  }
  const videoPath = path.join(input.workspaceRoot, input.manifest.output.videoPath);
  let probe: ProbeResult | undefined;
  if (await pathExists(videoPath)) {
    probe = await probeVideo(videoPath);
    checks.push(...probeChecks(probe, input.manifest));
    try {
      const extracted = await extractAndDecode({videoPath, outputRoot: path.join(input.workspaceRoot, input.manifest.output.directory, 'qa'), frameCount: input.story.durationInFrames});
      checks.push(check('decode-and-extract', 'passed', 'Full decode succeeded; first, middle and last frames were extracted.'));
      const frameHealth = await analyzeExtractedFrames(extracted);
      const healthy = frameHealth.every((frame) => frame.mean >= 5 && frame.standardDeviation >= 5);
      checks.push(check('extracted-frame-sanity', healthy ? 'passed' : 'failed', healthy ? `First/middle/last frames are non-blank (mean ${frameHealth.map((entry) => entry.mean.toFixed(1)).join('/')}).` : `Blank or near-uniform extracted frame: ${JSON.stringify(frameHealth)}`));
      await writeJsonReplace(path.join(input.workspaceRoot, input.manifest.output.directory, 'qa', 'frame-sanity.json'), frameHealth);
    } catch (error) {
      checks.push(check('decode-and-extract', 'failed', error instanceof Error ? error.message : String(error)));
    }
    try {
      const targets = createPackRegistry().resolveMotionAudio(input.spec.packs.motionAudio.id, input.spec.packs.motionAudio.version).loudness;
      const audio = await analyzeAudio(videoPath, targets);
      const isDelivery = input.manifest.profile === 'final' || input.manifest.profile === 'public';
      const loudnessOk = !isDelivery || Math.abs(audio.integratedLufs - audio.targetLufs) <= 1;
      const peakOk = audio.truePeakDbfs <= audio.targetTruePeakDbfs + .1;
      checks.push(check('audio-loudness', loudnessOk ? 'passed' : 'failed', `Integrated loudness: ${audio.integratedLufs.toFixed(1)} LUFS; target ${audio.targetLufs} LUFS${isDelivery ? ' ±1 LU' : ' (informational for draft)'}.`, isDelivery ? 'major' : 'info'));
      checks.push(check('audio-true-peak', peakOk ? 'passed' : 'failed', `True peak: ${audio.truePeakDbfs.toFixed(1)} dBFS; ceiling ${audio.targetTruePeakDbfs} dBFS.`, 'major'));
      await writeJsonReplace(path.join(input.workspaceRoot, input.manifest.output.directory, 'qa', 'audio.json'), audio);
    } catch (error) {
      checks.push(check('audio-analysis', 'failed', error instanceof Error ? error.message : String(error), 'major'));
    }
    await writeJsonReplace(path.join(input.workspaceRoot, input.manifest.output.directory, 'qa', 'ffprobe.json'), probe);
  } else {
    checks.push(check('video-present', 'failed', `Expected video is missing: ${videoPath}`));
  }
  const hardFailure = checks.some((entry) => entry.status === 'failed' && (entry.severity === 'blocker' || entry.severity === 'major'));
  const warning = checks.some((entry) => entry.status === 'failed');
  const report = buildArtifact<QaReportV1>({
    artifactId: `qa-${input.spec.reelId}-${input.manifest.profile}`,
    schemaVersion: 'qa-report/1',
    parentHashes: [input.manifest.contentHash],
    payload: {
      renderManifestHash: input.manifest.contentHash,
      status: hardFailure ? 'failed' : warning ? 'passed-with-warnings' : 'passed',
      checks,
      inspectedFrames: keyframes.map((entry) => entry.frame),
      ...(contactExists ? {contactSheetHash: await sha256File(contactSheetPath)} : {}),
    },
  });
  await writeJsonStable(path.join(input.workspaceRoot, input.manifest.output.qaReportPath), report);
  return report;
}
