/**
 * Auto-tune page scan concurrency from machine resources.
 * Override with SCAN_CONCURRENT_PAGES (1–10).
 */

import { cpus, freemem, totalmem } from 'node:os';
import { logger } from '../../lib/logger';

const MIN = 2;
const MAX = 10;
/** Rough RAM budget per Playwright context under load (MB) */
const MB_PER_CONTEXT = 400;

/**
 * Resolve concurrency for public page scanning.
 * - Explicit SCAN_CONCURRENT_PAGES wins when set to a valid number
 * - Else: min(cores, floor(freeMemMB / 400)), clamped to 2–10
 */
export function resolveScanConcurrency(): number {
  const fromEnv = Number(process.env.SCAN_CONCURRENT_PAGES);
  if (Number.isFinite(fromEnv) && fromEnv >= 1) {
    return Math.max(1, Math.min(MAX, Math.floor(fromEnv)));
  }

  const cores = Math.max(1, cpus().length);
  const freeMb = freemem() / (1024 * 1024);
  const byRam = Math.floor(freeMb / MB_PER_CONTEXT);
  const suggested = Math.max(MIN, Math.min(MAX, Math.min(cores, byRam || MIN)));

  logger.info(
    {
      cores,
      freeMb: Math.round(freeMb),
      totalMb: Math.round(totalmem() / (1024 * 1024)),
      concurrency: suggested,
    },
    'Auto-tuned SCAN_CONCURRENT_PAGES',
  );

  return suggested;
}
