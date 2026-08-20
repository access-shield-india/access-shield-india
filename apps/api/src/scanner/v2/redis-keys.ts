/**
 * Scan Pipeline v2 — Redis coordination keys.
 * Redis is NOT the source of truth for findings; Postgres is.
 * @see docs/architecture/v2/01-scan-pipeline-architecture.md
 */

export const ScanRedisKeys = {
  progress: (scanId: string) => `scan:progress:${scanId}`,
  cancel: (scanId: string) => `scan:cancel:${scanId}`,
  pause: (scanId: string) => `scan:pause:${scanId}`,
  barrier: (scanId: string) => `scan:barrier:${scanId}`,
  finalizeLock: (scanId: string) => `scan:lock:finalize:${scanId}`,
  aiRateLimit: (orgId: string) => `ai:ratelimit:${orgId}`,
  scanCreateLock: (orgId: string) => `lock:scan-create:${orgId}`,
} as const;

/** TTL for cancel flags (seconds) — matches v1 in-memory cancel window */
export const SCAN_CANCEL_TTL_SECONDS = 3600;

/** TTL for pause flags — long enough for a large crawl */
export const SCAN_PAUSE_TTL_SECONDS = 86400;

/** TTL for finalize lock (seconds) — long enough for score + enqueue */
export const SCAN_FINALIZE_LOCK_TTL_SECONDS = 120;

/** TTL for scan progress keys (seconds) */
export const SCAN_PROGRESS_TTL_SECONDS = 3600;
