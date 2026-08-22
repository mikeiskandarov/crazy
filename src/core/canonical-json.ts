import {createHash} from 'node:crypto';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new TypeError(`Canonical JSON cannot encode non-finite number: ${value}`);
  }
  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value), null, 2);
}

export function sha256Bytes(input: string | NodeJS.ArrayBufferView): string {
  return createHash('sha256').update(input).digest('hex');
}

export function contentHash(value: unknown): string {
  return sha256Bytes(stableStringify(value));
}

export function artifactContentHash(value: Record<string, unknown>): string {
  const {createdAt: _createdAt, contentHash: _contentHash, ...semantic} = value;
  return contentHash(semantic);
}
