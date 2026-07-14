import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SDK_MARKERS = ['platform-tools', 'build-tools'] as const;

function isValidSdkRoot(path: string): boolean {
  return SDK_MARKERS.some((dir) => existsSync(join(path, dir)));
}

/** Common Android SDK install locations on macOS/Linux. */
function candidateSdkPaths(): string[] {
  return [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    join(homedir(), 'Library/Android/sdk'),
    join(homedir(), 'Android/Sdk'),
    '/opt/homebrew/share/android-commandlinetools',
    '/usr/local/share/android-sdk',
  ].filter((p): p is string => typeof p === 'string' && p.length > 0);
}

/** Returns the first detected Android SDK root, or null. */
export function detectAndroidSdkPath(): string | null {
  for (const candidate of candidateSdkPaths()) {
    if (isValidSdkRoot(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Ensures ANDROID_HOME / ANDROID_SDK_ROOT are set before local Appium sessions.
 * Throws a clear error when the SDK is missing.
 */
export function ensureAndroidSdkEnv(): void {
  if (
    process.env.ANDROID_HOME &&
    process.env.ANDROID_SDK_ROOT &&
    isValidSdkRoot(process.env.ANDROID_HOME)
  ) {
    return;
  }

  const sdkPath = detectAndroidSdkPath();
  if (!sdkPath) {
    throw new Error(
      'Android SDK not found. Install Android Studio (or command-line tools) and set ANDROID_HOME in apps/mobile-scanner/.env, ' +
        'or configure BROWSERSTACK_USERNAME + BROWSERSTACK_ACCESS_KEY for cloud scanning without a local SDK.',
    );
  }

  process.env.ANDROID_HOME = sdkPath;
  process.env.ANDROID_SDK_ROOT = sdkPath;
}
