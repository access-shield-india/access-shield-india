import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { config } from 'dotenv';

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

let envLoaded = false;

/** Load monorepo `.env.local` / `.env`, then package-local `.env`. */
export function loadLocalEnv(): void {
  if (envLoaded) {
    return;
  }

  const root = findMonorepoRoot();
  config({ path: resolve(root, '.env.local') });
  config({ path: resolve(root, '.env') });
  config({ path: resolve(process.cwd(), '.env') });
  envLoaded = true;
}

loadLocalEnv();
