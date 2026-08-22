import type {LayoutPack, MotionAudioPack, ThemePack} from '../contracts/packs';
import {contentHash} from '../core/canonical-json';
import {verticalShowLayout} from '../layout/vertical-show/pack';
import {tensionShowMotion} from '../motion/tension-show/pack';
import {carnivalNightTheme} from '../theme/carnival-night/pack';

function key(id: string, version: string): string {
  return `${id}@${version}`;
}

export class PackRegistry {
  readonly layouts = new Map<string, LayoutPack>();
  readonly themes = new Map<string, ThemePack>();
  readonly motionAudio = new Map<string, MotionAudioPack>();

  registerLayout(pack: LayoutPack): void {
    this.register(this.layouts, pack);
  }
  registerTheme(pack: ThemePack): void {
    this.register(this.themes, pack);
  }
  registerMotionAudio(pack: MotionAudioPack): void {
    this.register(this.motionAudio, pack);
  }
  resolveLayout(id: string, version: string): LayoutPack {
    return this.resolve(this.layouts, id, version, 'layout');
  }
  resolveTheme(id: string, version: string): ThemePack {
    return this.resolve(this.themes, id, version, 'theme');
  }
  resolveMotionAudio(id: string, version: string): MotionAudioPack {
    return this.resolve(this.motionAudio, id, version, 'motion/audio');
  }
  hash(pack: LayoutPack | ThemePack | MotionAudioPack): string {
    const serializable = 'tokens' in pack
      ? {id: pack.id, version: pack.version, tokens: pack.tokens, assets: pack.assets}
      : 'durations' in pack
        ? {id: pack.id, version: pack.version, durations: pack.durations, easings: pack.easings, motionPresets: pack.motionPresets, audioCues: pack.audioCues, loudness: pack.loudness}
        : {id: pack.id, version: pack.version, regions: pack.regions, variants: pack.variants};
    return contentHash(serializable);
  }
  private register<T extends {id: string; version: string}>(map: Map<string, T>, pack: T): void {
    const packKey = key(pack.id, pack.version);
    if (map.has(packKey)) throw new Error(`Duplicate pack registration: ${packKey}`);
    map.set(packKey, pack);
  }
  private resolve<T>(map: Map<string, T>, id: string, version: string, label: string): T {
    const result = map.get(key(id, version));
    if (!result) throw new Error(`Unknown ${label} pack: ${key(id, version)}`);
    return result;
  }
}

export function createPackRegistry(): PackRegistry {
  const registry = new PackRegistry();
  registry.registerLayout(verticalShowLayout);
  registry.registerTheme(carnivalNightTheme);
  registry.registerMotionAudio(tensionShowMotion);
  return registry;
}
