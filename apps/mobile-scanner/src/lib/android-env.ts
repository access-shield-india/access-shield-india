import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { logger } from './logger.js';

const SDK_MARKERS = ['platform-tools', 'build-tools'] as const;

function isValidSdkRoot(path: string): boolean {
  return SDK_MARKERS.some((dir) => existsSync(join(path, dir)));
}

function sdkFromAdbOnPath(): string | null {
  try {
    const adbPath = execFileSync('sh', ['-lc', 'command -v adb'], {
      encoding: 'utf8',
      timeout: 5_000,
    }).trim();
    if (!adbPath) {
      return null;
    }
    const platformTools = dirname(adbPath);
    if (platformTools.endsWith('platform-tools')) {
      const sdkRoot = dirname(platformTools);
      return isValidSdkRoot(sdkRoot) ? sdkRoot : null;
    }
  } catch {
    return null;
  }
  return null;
}

function candidateSdkPaths(): string[] {
  return [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    sdkFromAdbOnPath(),
    join(homedir(), 'Android/Sdk'),
    join(homedir(), 'android-sdk'),
    join(homedir(), 'Library/Android/sdk'),
    '/opt/android-sdk',
    '/usr/lib/android-sdk',
    '/usr/local/share/android-sdk',
    '/opt/homebrew/share/android-commandlinetools',
  ].filter((p): p is string => typeof p === 'string' && p.length > 0);
}

/** Returns the first detected Android SDK root, or null. */
export function detectAndroidSdkPath(): string | null {
  for (const candidate of candidateSdkPaths()) {
    const resolved = resolve(candidate);
    if (isValidSdkRoot(resolved)) {
      return resolved;
    }
  }
  return null;
}

function prependPath(entry: string): void {
  if (!existsSync(entry)) {
    return;
  }
  const current = process.env.PATH ?? '';
  const parts = current.split(':').filter(Boolean);
  if (parts.includes(entry)) {
    return;
  }
  process.env.PATH = `${entry}:${current}`;
}

/**
 * Ensures ANDROID_HOME / ANDROID_SDK_ROOT / PATH for local Appium + adb.
 * Returns the SDK root.
 */
export function ensureAndroidSdkEnv(): string {
  let sdkPath =
    process.env.ANDROID_HOME && isValidSdkRoot(process.env.ANDROID_HOME)
      ? process.env.ANDROID_HOME
      : process.env.ANDROID_SDK_ROOT && isValidSdkRoot(process.env.ANDROID_SDK_ROOT)
        ? process.env.ANDROID_SDK_ROOT
        : detectAndroidSdkPath();

  if (!sdkPath) {
    throw new Error(
      'Android SDK not found. Set ANDROID_HOME in root .env.local (or apps/mobile-scanner/.env), ' +
        'e.g. ANDROID_HOME=/home/accessshield-india/Android/Sdk — then restart mobile-scanner and Appium.',
    );
  }

  sdkPath = resolve(sdkPath);
  process.env.ANDROID_HOME = sdkPath;
  process.env.ANDROID_SDK_ROOT = sdkPath;
  prependPath(join(sdkPath, 'platform-tools'));
  prependPath(join(sdkPath, 'emulator'));
  prependPath(join(sdkPath, 'cmdline-tools', 'latest', 'bin'));
  prependPath(join(sdkPath, 'tools', 'bin'));

  logger.info({ ANDROID_HOME: sdkPath }, 'Android SDK environment ready');
  return sdkPath;
}

function adbBin(): string {
  const fromSdk = process.env.ANDROID_HOME
    ? join(process.env.ANDROID_HOME, 'platform-tools', 'adb')
    : '';
  return fromSdk && existsSync(fromSdk) ? fromSdk : 'adb';
}

/** Online emulator/device serials (`adb devices`). */
export function listOnlineAdbSerials(): string[] {
  try {
    const stdout = execFileSync(adbBin(), ['devices'], { encoding: 'utf8', timeout: 10_000 });
    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /\tdevice$/.test(line))
      .map((line) => line.split(/\s+/)[0] ?? '')
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Android release version on a device, e.g. `17` or `13`. */
export function readAdbOsVersion(serial: string): string | null {
  try {
    const stdout = execFileSync(adbBin(), ['-s', serial, 'shell', 'getprop', 'ro.build.version.release'], {
      encoding: 'utf8',
      timeout: 10_000,
    }).trim();
    return stdout.length > 0 ? stdout : null;
  } catch {
    return null;
  }
}
