export class InvariantError extends Error {
  public constructor(message: string, readonly context?: Record<string, unknown>) {
    super(message);
    this.name = 'InvariantError';
  }
}

export function invariant(condition: unknown, message: string, context?: Record<string, unknown>): asserts condition {
  if (!condition) {
    throw new InvariantError(message, context);
  }
}
