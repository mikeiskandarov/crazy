import {copyFile, rename} from 'node:fs/promises';
import path from 'node:path';
import type {DeepReadonly} from '../contracts/common';
import type {QaReportV1, RenderManifestV1} from '../contracts/render-manifest';
import type {ReelSpecV1} from '../contracts/reel-spec';
import {ensureDirectory, pathExists, readJson, sha256File, writeJsonReplace} from '../core/files';
import {contentHash} from '../core/canonical-json';
import {attemptNumberFor, attemptVideoFileName, simulationSeedForSpec} from '../experiment/attempt';

export interface AcceptedVideoResult {
  status: 'accepted' | 'existing';
  videoPath: string;
  receiptPath: string;
  sha256: string;
}

export async function acceptRenderedVideo(input: {
  workspaceRoot: string;
  buildId: string;
  spec: DeepReadonly<ReelSpecV1>;
  manifest: DeepReadonly<RenderManifestV1>;
}): Promise<AcceptedVideoResult> {
  if (input.manifest.profile === 'draft') throw new Error('Draft renders cannot be accepted; render with --profile final or public first');
  const source = path.resolve(input.workspaceRoot, input.manifest.output.videoPath);
  const qaPath = path.resolve(input.workspaceRoot, input.manifest.output.qaReportPath);
  if (!await pathExists(source)) throw new Error(`Rendered video not found: ${source}`);
  if (!await pathExists(qaPath)) throw new Error(`QA report not found: ${qaPath}`);
  const qa = await readJson<QaReportV1>(qaPath);
  if (qa.status === 'failed') throw new Error('A video with failed QA cannot be accepted');
  if (qa.renderManifestHash && qa.renderManifestHash !== input.manifest.contentHash) throw new Error('QA report does not belong to this render manifest');

  const attempt = attemptNumberFor(input.spec);
  const fileName = attemptVideoFileName(input.spec.format.kind, attempt);
  const targetDirectory = path.join(input.workspaceRoot, 'final-videos', input.spec.format.kind);
  const target = path.join(targetDirectory, fileName);
  const receipt = path.join(targetDirectory, fileName.replace(/\.mp4$/, '.json'));
  const sourceHash = await sha256File(source);
  await ensureDirectory(targetDirectory);

  if (await pathExists(target)) {
    const existingHash = await sha256File(target);
    if (existingHash !== sourceHash) throw new Error(`Refusing to overwrite accepted video with different content: ${target}`);
    return {status: 'existing', videoPath: target, receiptPath: receipt, sha256: sourceHash};
  }

  const temporary = `${target}.tmp-${process.pid}`;
  await copyFile(source, temporary);
  await rename(temporary, target);
  await writeJsonReplace(receipt, {
    schemaVersion: 'accepted-video/1',
    acceptedAt: new Date().toISOString(),
    format: input.spec.format.kind,
    attempt,
    fileName,
    sha256: sourceHash,
    qaStatus: qa.status,
    profile: input.manifest.profile,
    reelId: input.spec.reelId,
    buildId: input.buildId,
    model: {
      adapterId: input.spec.game.adapterId,
      version: input.spec.game.requestedModelVersion,
      configHash: contentHash(input.spec.game.config),
      baseSeed: input.spec.game.seed,
      simulationSeed: simulationSeedForSpec(input.spec),
    },
    hashes: {
      spec: input.spec.contentHash,
      simulation: input.manifest.refs.simulation.contentHash,
      render: input.manifest.contentHash,
      qa: qa.contentHash,
    },
    source: path.relative(input.workspaceRoot, source).split(path.sep).join('/'),
  });
  return {status: 'accepted', videoPath: target, receiptPath: receipt, sha256: sourceHash};
}
