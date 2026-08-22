export interface HostClipSlot {
  slot: number;
  assetPath: string;
}

export const HOST_CLIP_POOL: readonly HostClipSlot[] = [{
  slot: 1,
  assetPath: 'assets/hosts/host-01.webm',
}];

export function selectHostClip(): HostClipSlot {
  return HOST_CLIP_POOL[0]!;
}
