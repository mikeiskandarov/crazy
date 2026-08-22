import type {DeepReadonly} from '../contracts/common';

export function deepFreeze<T>(input: T): DeepReadonly<T> {
  if (input !== null && typeof input === 'object' && !Object.isFrozen(input)) {
    for (const value of Object.values(input as Record<string, unknown>)) {
      deepFreeze(value);
    }
    Object.freeze(input);
  }
  return input as DeepReadonly<T>;
}
