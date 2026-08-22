import {access, appendFile, mkdir, readFile, rename, stat, writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {contentHash, sha256Bytes, stableStringify} from './canonical-json';

export async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDirectory(target: string): Promise<void> {
  await mkdir(target, {recursive: true});
}

export async function readJson<T>(target: string): Promise<T> {
  return JSON.parse(await readFile(target, 'utf8')) as T;
}

export async function writeJsonStable(target: string, value: unknown): Promise<'created' | 'existing'> {
  await ensureDirectory(path.dirname(target));
  const serialized = `${stableStringify(value)}\n`;
  if (await pathExists(target)) {
    const existing = await readFile(target, 'utf8');
    const parsedExisting = JSON.parse(existing) as Record<string, unknown>;
    const candidate = value as Record<string, unknown>;
    const sameArtifactHash = typeof parsedExisting.contentHash === 'string' && parsedExisting.contentHash === candidate.contentHash;
    if (!sameArtifactHash && contentHash(parsedExisting) !== contentHash(value)) {
      throw new Error(`Refusing to overwrite immutable artifact with different content: ${target}`);
    }
    return 'existing';
  }
  const temporary = `${target}.tmp-${process.pid}`;
  await writeFile(temporary, serialized, 'utf8');
  await rename(temporary, target);
  return 'created';
}

export async function writeJsonReplace(target: string, value: unknown): Promise<void> {
  await ensureDirectory(path.dirname(target));
  const temporary = `${target}.tmp-${process.pid}`;
  await writeFile(temporary, `${stableStringify(value)}\n`, 'utf8');
  await rename(temporary, target);
}

export async function appendJsonLine(target: string, value: unknown): Promise<void> {
  await ensureDirectory(path.dirname(target));
  await appendFile(target, `${JSON.stringify(value)}\n`, 'utf8');
}

export async function sha256File(target: string): Promise<string> {
  return sha256Bytes(await readFile(target));
}

export async function assertWritableDirectory(target: string): Promise<void> {
  await ensureDirectory(target);
  const info = await stat(target);
  if (!info.isDirectory()) {
    throw new Error(`${target} is not a directory`);
  }
  await access(target, constants.W_OK);
}
