import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import {resolveAssets} from '../assets/asset-resolver';
import {assertWritableDirectory, pathExists} from '../core/files';

const execFileAsync = promisify(execFile);
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export interface DoctorCheck {
  checkId: string;
  status: 'passed' | 'failed';
  message: string;
}

async function commandVersion(command: string, args: string[]): Promise<string> {
  const {stdout} = await execFileAsync(command, args, {maxBuffer: 2 * 1024 * 1024});
  return stdout.trim().split('\n')[0] ?? '';
}

async function webGlProbe(): Promise<boolean> {
  const html = '<!doctype html><body><script>document.body.textContent=String(Boolean(document.createElement("canvas").getContext("webgl")))</script></body>';
  const {stdout} = await execFileAsync(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--dump-dom', `data:text/html,${encodeURIComponent(html)}`], {maxBuffer: 4 * 1024 * 1024});
  return stdout.includes('<body>true</body>');
}

export async function runDoctor(workspaceRoot: string): Promise<{status: 'passed' | 'failed'; checks: DoctorCheck[]}> {
  const checks: DoctorCheck[] = [];
  checks.push({checkId: 'node-version', status: process.version === 'v22.14.0' ? 'passed' : 'failed', message: `Node ${process.version}; required v22.14.0.`});
  try {
    const pnpm = await commandVersion('pnpm', ['--version']);
    checks.push({checkId: 'pnpm-version', status: pnpm === '10.8.1' ? 'passed' : 'failed', message: `pnpm ${pnpm}; required 10.8.1.`});
  } catch (error) {
    checks.push({checkId: 'pnpm-version', status: 'failed', message: String(error)});
  }
  checks.push({checkId: 'lockfile', status: await pathExists(path.join(workspaceRoot, 'pnpm-lock.yaml')) ? 'passed' : 'failed', message: 'pnpm-lock.yaml is present.'});
  checks.push({checkId: 'chrome', status: await pathExists(chrome) ? 'passed' : 'failed', message: `Chrome executable: ${chrome}`});
  checks.push({checkId: 'ffmpeg', status: ffmpegPath && await pathExists(ffmpegPath) ? 'passed' : 'failed', message: `ffmpeg-static: ${ffmpegPath ?? 'missing'}`});
  const probePath = typeof ffprobeStatic === 'string' ? ffprobeStatic : ffprobeStatic.path;
  checks.push({checkId: 'ffprobe', status: await pathExists(probePath) ? 'passed' : 'failed', message: `ffprobe-static: ${probePath}`});
  try {
    const assets = await resolveAssets(workspaceRoot, 'public');
    checks.push({checkId: 'assets', status: 'passed', message: `${assets.length} assets resolve with public/commercial provenance.`});
  } catch (error) {
    checks.push({checkId: 'assets', status: 'failed', message: error instanceof Error ? error.message : String(error)});
  }
  try {
    await assertWritableDirectory(path.join(workspaceRoot, 'output'));
    await assertWritableDirectory(path.join(workspaceRoot, '.cache'));
    checks.push({checkId: 'write-access', status: 'passed', message: 'output and cache directories are writable.'});
  } catch (error) {
    checks.push({checkId: 'write-access', status: 'failed', message: error instanceof Error ? error.message : String(error)});
  }
  try {
    checks.push({checkId: 'webgl-fallback', status: await webGlProbe() ? 'passed' : 'failed', message: 'Headless Chrome SwiftShader WebGL context is available.'});
  } catch (error) {
    checks.push({checkId: 'webgl-fallback', status: 'failed', message: error instanceof Error ? error.message : String(error)});
  }
  return {status: checks.every((entry) => entry.status === 'passed') ? 'passed' : 'failed', checks};
}
