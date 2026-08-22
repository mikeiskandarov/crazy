import type {GameAdapter} from './game-adapter';
import {ApproxGameAdapter} from './approximate/adapter';

export class GameAdapterRegistry {
  private readonly adapters = new Map<string, GameAdapter>();
  register(adapter: GameAdapter): void {
    const key = `${adapter.id}@${adapter.version}`;
    if (this.adapters.has(key)) throw new Error(`Duplicate game adapter: ${key}`);
    this.adapters.set(key, adapter);
  }
  resolve(id: string, version = '1.0.0'): GameAdapter {
    const adapter = this.adapters.get(`${id}@${version}`);
    if (!adapter) throw new Error(`Unknown game adapter: ${id}@${version}`);
    return adapter;
  }
}

export function createGameAdapterRegistry(): GameAdapterRegistry {
  const registry = new GameAdapterRegistry();
  registry.register(new ApproxGameAdapter());
  return registry;
}
