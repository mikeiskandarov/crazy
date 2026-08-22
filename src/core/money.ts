export interface RoundingPolicy {
  decimals: 2;
  mode: 'half_away_from_zero';
}

export function assertMoneyMinor(value: number, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer in minor units`);
  }
}

export function grossReturnMinor(stakeMinor: number, grossMultiplierBps: number): number {
  assertMoneyMinor(stakeMinor, 'stakeMinor');
  if (!Number.isSafeInteger(grossMultiplierBps) || grossMultiplierBps < 0) {
    throw new RangeError('grossMultiplierBps must be a non-negative safe integer');
  }
  const numerator = stakeMinor * grossMultiplierBps;
  if (!Number.isSafeInteger(numerator)) {
    throw new RangeError('payout exceeds safe integer range');
  }
  return Math.floor((numerator + 5_000) / 10_000);
}

export function formatMoney(minor: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}
