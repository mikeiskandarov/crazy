import path from 'node:path';
import type {ResolvedAsset} from '../contracts/render-manifest';
import {readJson, sha256File} from '../core/files';

interface ProvenanceLedger {
  schemaVersion: 'asset-provenance/1';
  assets: ResolvedAsset[];
}

export async function resolveAssets(workspaceRoot: string, profile: 'draft' | 'final' | 'public'): Promise<ResolvedAsset[]> {
  const ledger = await readJson<ProvenanceLedger>(path.join(workspaceRoot, 'assets', 'provenance.json'));
  if (ledger.schemaVersion !== 'asset-provenance/1') throw new Error(`Unknown provenance schema: ${ledger.schemaVersion}`);
  for (const asset of ledger.assets) {
    const actualHash = await sha256File(path.join(workspaceRoot, asset.path));
    if (actualHash !== asset.sha256) throw new Error(`Asset hash mismatch: ${asset.assetId}`);
    if (profile === 'public' && (asset.provenance.sourceType === 'reference-only' || !asset.provenance.license)) {
      throw new Error(`Asset cannot be used in public profile: ${asset.assetId}`);
    }
    const requiredUsage = profile === 'public' ? 'public' : 'internal';
    if (!asset.provenance.allowedUsage.includes(requiredUsage)) throw new Error(`Asset usage ${requiredUsage} not allowed: ${asset.assetId}`);
  }
  return ledger.assets;
}
