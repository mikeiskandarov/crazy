import {createHash} from 'node:crypto';

export const PRNG_ALGORITHM = 'xoshiro128ss-v1' as const;

function rotateLeft(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function seedWords(seed: string): [number, number, number, number] {
  const digest = createHash('sha256').update(`casino-reel:${PRNG_ALGORITHM}:${seed}`).digest();
  const words: [number, number, number, number] = [
    digest.readUInt32LE(0),
    digest.readUInt32LE(4),
    digest.readUInt32LE(8),
    digest.readUInt32LE(12),
  ];
  if (words.every((word) => word === 0)) words[0] = 0x9e3779b9;
  return words;
}

export function deriveSeed(rootSeed: string, channel: string): string {
  return createHash('sha256').update(`${rootSeed}:${channel}`).digest('hex');
}

export class SeededPrng {
  readonly algorithm = PRNG_ALGORITHM;
  private state: [number, number, number, number];

  public constructor(readonly seed: string) {
    this.state = seedWords(seed);
  }

  nextUint32(): number {
    const result = Math.imul(rotateLeft(Math.imul(this.state[1], 5) >>> 0, 7), 9) >>> 0;
    const temporary = (this.state[1] << 9) >>> 0;
    this.state[2] = (this.state[2] ^ this.state[0]) >>> 0;
    this.state[3] = (this.state[3] ^ this.state[1]) >>> 0;
    this.state[1] = (this.state[1] ^ this.state[2]) >>> 0;
    this.state[0] = (this.state[0] ^ this.state[3]) >>> 0;
    this.state[2] = (this.state[2] ^ temporary) >>> 0;
    this.state[3] = rotateLeft(this.state[3], 11);
    return result;
  }

  nextFloat01(): number {
    return this.nextUint32() / 0x1_0000_0000;
  }

  fork(channel: string): SeededPrng {
    return new SeededPrng(deriveSeed(this.seed, channel));
  }
}
