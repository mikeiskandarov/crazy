import type {DeepReadonly} from '../contracts/common';
import type {FormatConfigV1, FormatKind, ReelSpecV1, StoryKernel} from '../contracts/reel-spec';
import type {SimulationResultV1} from '../contracts/simulation';
import type {StoryPlanV1} from '../contracts/story-plan';
import {compileStoryPlan} from './story-compiler';

export interface FormatDefinition<TConfig extends FormatConfigV1 = FormatConfigV1> {
  readonly kind: TConfig['kind'];
  readonly version: string;
  readonly kernel: StoryKernel;
  validate(config: unknown): TConfig;
  compile(input: {
    spec: DeepReadonly<ReelSpecV1>;
    simulation: DeepReadonly<SimulationResultV1>;
    config: DeepReadonly<TConfig>;
    durationBudgetFrames?: number;
  }): DeepReadonly<StoryPlanV1>;
}

function definition(kind: FormatKind, kernel: StoryKernel): FormatDefinition {
  return {
    kind,
    version: '1.0.0',
    kernel,
    validate(config: unknown): FormatConfigV1 {
      if (!config || typeof config !== 'object') throw new Error(`Invalid ${kind} config`);
      const candidate = config as FormatConfigV1;
      if (candidate.kind !== kind || candidate.formatVersion !== '1.0.0') throw new Error(`Expected ${kind}@1.0.0`);
      return candidate;
    },
    compile({spec, simulation}): DeepReadonly<StoryPlanV1> {
      return compileStoryPlan({spec, simulation, kernel});
    },
  };
}

export class FormatRegistry {
  private readonly definitions = new Map<string, FormatDefinition>();
  register(format: FormatDefinition): void {
    const key = `${format.kind}@${format.version}`;
    if (this.definitions.has(key)) throw new Error(`Duplicate format registration: ${key}`);
    this.definitions.set(key, format);
  }
  resolve(kind: FormatKind, version: string): FormatDefinition {
    const result = this.definitions.get(`${kind}@${version}`);
    if (!result) throw new Error(`Unknown format: ${kind}@${version}`);
    return result;
  }
  list(): Array<{kind: FormatKind; version: string; kernel: StoryKernel}> {
    return [...this.definitions.values()].map(({kind, version, kernel}) => ({kind, version, kernel}));
  }
}

export function createFormatRegistry(): FormatRegistry {
  const registry = new FormatRegistry();
  registry.register(definition('survive-500', 'single-run'));
  registry.register(definition('luckiest-player', 'single-run'));
  registry.register(definition('stop-or-continue', 'single-run'));
  registry.register(definition('one-vs-ten', 'duel'));
  registry.register(definition('impossible-target', 'population'));
  registry.register(definition('last-man-standing', 'population'));
  registry.register(definition('race-to-1000', 'race'));
  return registry;
}
