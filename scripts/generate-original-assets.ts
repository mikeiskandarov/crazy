import {copyFile, mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root = process.cwd();
const publicRoot = path.join(root, 'public', 'assets');
const fontRoot = path.join(publicRoot, 'fonts');
const audioRoot = path.join(publicRoot, 'audio');
const licenseRoot = path.join(root, 'assets', 'licenses');

const sampleRate = 48_000;

type Oscillator = (time: number, duration: number) => number;

function envelope(time: number, duration: number, attack = 0.02, release = 0.12): number {
  const fadeIn = Math.min(1, time / attack);
  const fadeOut = Math.min(1, (duration - time) / release);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

function sine(frequency: number, time: number, phase = 0): number {
  return Math.sin(Math.PI * 2 * frequency * time + phase);
}

function writeWav(samples: Float32Array, channels = 2): Buffer {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * 2, 28);
  buffer.writeUInt16LE(channels * 2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.max(-1, Math.min(1, samples[index] ?? 0));
    buffer.writeInt16LE(Math.round(value * 32_767), 44 + index * 2);
  }
  return buffer;
}

function synthesize(duration: number, oscillator: Oscillator, gain = 0.35): Buffer {
  const frames = Math.ceil(duration * sampleRate);
  const samples = new Float32Array(frames * 2);
  for (let frame = 0; frame < frames; frame += 1) {
    const time = frame / sampleRate;
    const value = oscillator(time, duration) * gain;
    samples[frame * 2] = value;
    samples[frame * 2 + 1] = value * 0.96;
  }
  return writeWav(samples);
}

const generators: Record<string, () => Buffer> = {
  'music-bed.wav': () => synthesize(16, (time, duration) => {
    const pulse = Math.pow(Math.max(0, sine(2, time)), 8);
    const chord = sine(55, time) * 0.38 + sine(82.5, time, 0.3) * 0.16 + sine(110, time, 0.7) * 0.08;
    return chord * (0.34 + pulse * 0.3) * envelope(time, duration, 0.5, 0.8);
  }, 0.22),
  'hook-impact.wav': () => synthesize(0.55, (time, duration) => {
    const fall = 150 - time * 150;
    return (sine(Math.max(45, fall), time) * 0.8 + sine(1_100, time) * Math.exp(-time * 20) * 0.25) * envelope(time, duration, 0.005, 0.28);
  }),
  'ui-tick.wav': () => synthesize(0.09, (time, duration) => sine(1_450, time) * envelope(time, duration, 0.002, 0.055), 0.2),
  'wheel-tick.wav': () => synthesize(0.08, (time, duration) => (sine(780, time) + sine(1_560, time) * 0.3) * envelope(time, duration, 0.002, 0.045), 0.18),
  'riser.wav': () => synthesize(1.25, (time, duration) => {
    const progress = time / duration;
    return sine(170 + progress * progress * 680, time) * envelope(time, duration, 0.08, 0.12) * (0.35 + progress * 0.65);
  }, 0.2),
  'warning-pulse.wav': () => synthesize(0.52, (time, duration) => sine(74, time) * envelope(time, duration, 0.01, 0.24), 0.35),
  'reveal-impact.wav': () => synthesize(0.78, (time, duration) => {
    const body = sine(92, time) * 0.7 + sine(184, time) * 0.22 + sine(740, time) * Math.exp(-time * 16) * 0.18;
    return body * envelope(time, duration, 0.004, 0.38);
  }, 0.34),
  'result-resolve.wav': () => synthesize(1.25, (time, duration) => {
    const chord = sine(220, time) * 0.32 + sine(275, time) * 0.22 + sine(330, time) * 0.16;
    return chord * envelope(time, duration, 0.04, 0.55);
  }, 0.25),
  'celebration.wav': () => synthesize(0.92, (time, duration) => {
    const arpeggio = [440, 550, 660, 880][Math.min(3, Math.floor(time * 5))] ?? 440;
    return sine(arpeggio, time) * envelope(time, duration, 0.01, 0.22);
  }, 0.19),
};

const fonts = [
  {assetId: 'font-impact', packageName: 'archivo-black', file: 'archivo-black-latin-400-normal.woff2', family: 'Archivo Black'},
  {assetId: 'font-condensed', packageName: 'barlow-condensed', file: 'barlow-condensed-latin-700-normal.woff2', family: 'Barlow Condensed'},
  {assetId: 'font-ui', packageName: 'inter', file: 'inter-latin-600-normal.woff2', family: 'Inter'},
] as const;

async function sha256(target: string): Promise<string> {
  return createHash('sha256').update(await readFile(target)).digest('hex');
}

await Promise.all([mkdir(fontRoot, {recursive: true}), mkdir(audioRoot, {recursive: true}), mkdir(licenseRoot, {recursive: true})]);

for (const font of fonts) {
  const packageRoot = path.join(root, 'node_modules', '@fontsource', font.packageName);
  await copyFile(path.join(packageRoot, 'files', font.file), path.join(fontRoot, font.file));
  await copyFile(path.join(packageRoot, 'LICENSE'), path.join(licenseRoot, `${font.packageName}-OFL-1.1.txt`));
}

for (const [filename, generate] of Object.entries(generators)) {
  await writeFile(path.join(audioRoot, filename), generate());
}

const assetEntries = [];
for (const font of fonts) {
  const assetPath = path.join(fontRoot, font.file);
  assetEntries.push({
    assetId: font.assetId,
    path: path.relative(root, assetPath),
    sha256: await sha256(assetPath),
    mediaType: 'font/woff2',
    required: true,
    usage: 'font',
    provenance: {
      provenanceId: `fontsource-${font.packageName}-5-3-0`,
      sourceType: 'licensed',
      sourceUri: `https://fontsource.org/fonts/${font.packageName}`,
      author: font.family,
      license: 'SIL Open Font License 1.1',
      allowedUsage: ['internal', 'public', 'commercial'],
      notes: 'Vendored from pinned @fontsource package; license text stored under assets/licenses.',
    },
  });
}
for (const filename of Object.keys(generators)) {
  const assetPath = path.join(audioRoot, filename);
  assetEntries.push({
    assetId: filename.replace('.wav', '').replaceAll('_', '-'),
    path: path.relative(root, assetPath),
    sha256: await sha256(assetPath),
    mediaType: 'audio/wav',
    required: true,
    usage: 'audio',
    provenance: {
      provenanceId: `original-procedural-${filename.replace('.wav', '')}-v1`,
      sourceType: 'original',
      author: 'Casino Reel Builder',
      license: 'Original project asset',
      allowedUsage: ['internal', 'public', 'commercial'],
      notes: 'Deterministically synthesized at 48 kHz by scripts/generate-original-assets.ts; no third-party samples.',
    },
  });
}

await mkdir(path.join(root, 'assets'), {recursive: true});
await writeFile(path.join(root, 'assets', 'provenance.json'), `${JSON.stringify({schemaVersion: 'asset-provenance/1', assets: assetEntries}, null, 2)}\n`);
console.log(`Generated ${assetEntries.length} provenance-tracked assets.`);
