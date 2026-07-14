import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** Walk up from cwd to find the monorepo root (pnpm-workspace.yaml). */
export function findMonorepoRoot(startDir = process.cwd()): string {
  let dir = startDir;
  while (dir !== dirname(dir)) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return startDir;
}

/** Resolve local: storage keys to an absolute APK/IPA path. */
export function resolveLocalAppPath(storageKey: string): string {
  if (!storageKey.startsWith('local:')) {
    return storageKey;
  }

  const relativeKey = storageKey.slice('local:'.length);
  return resolve(findMonorepoRoot(), '.data', relativeKey);
}
