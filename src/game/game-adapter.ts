import type {DeepReadonly} from '../contracts/common';
import type {ReelSpecV1} from '../contracts/reel-spec';
import type {ModelAssumption, SimulationResultV1} from '../contracts/simulation';

export interface GameAdapter<TConfig = unknown> {
  readonly id: string;
  readonly version: string;
  readonly modelLabel: string;
  validateConfig(input: unknown): TConfig;
  simulate(input: {
    spec: DeepReadonly<ReelSpecV1>;
    config: DeepReadonly<TConfig>;
    simulationSeed: string;
    signal?: AbortSignal;
  }): Promise<DeepReadonly<SimulationResultV1>>;
  describeAssumptions(config: DeepReadonly<TConfig>): ModelAssumption[];
}
