/**
 * Finalize a scan when all scan_page_jobs are terminal.
 * Used by the v2 page.scan worker (and later a dedicated finalizer).
 */

import Redis from 'ioredis';
import { and, desc, eq, ne } from 'drizzle-orm';
import { assets, scans, scanPageJobs, violations, type Database } from '@accessshield/db';
import { logger } from '../../lib/logger';
import { buildScanScoreResult } from '../score';
import type { RawViolation } from '../types';
import {
  SCAN_FINALIZE_LOCK_TTL_SECONDS,
  SCAN_PROGRESS_TTL_SECONDS,
  ScanRedisKeys,
} from './redis-keys';
import { clearScanBarrier, getScanBarrier } from './barrier';

const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'skipped']);

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  redisClient = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
  return redisClient;
}

/**
 * If every page job for the scan is terminal, score + mark scan completed.
 * Safe under concurrent callers via Redis NX lock.
 */
export async function tryFinalizeScanFromPageJobs(
  db: Database,
  params: { scanId: string; orgId: string; assetId: string },
): Promise<boolean> {
  const { scanId, orgId, assetId } = params;

  const jobs = await db
    .select({ status: scanPageJobs.status })
    .from(scanPageJobs)
    .where(and(eq(scanPageJobs.scanId, scanId), eq(scanPageJobs.organisationId, orgId)));

  if (jobs.length === 0) {
    return false;
  }

  // When crawl streams via scan.jobs, wait until crawlDone before finalizing
  const barrier = await getScanBarrier(scanId);
  if (barrier && !barrier.crawlDone) {
    return false;
  }

  if (jobs.some((j) => !TERMINAL.has(j.status))) {
    return false;
  }

  const redis = getRedis();
  if (redis) {
    if (redis.status !== 'ready') {
      await redis.connect().catch(() => null);
    }
    const locked = await redis.set(
      ScanRedisKeys.finalizeLock(scanId),
      '1',
      'EX',
      SCAN_FINALIZE_LOCK_TTL_SECONDS,
      'NX',
    );
    if (locked !== 'OK') {
      logger.info({ scanId }, 'Finalize lock not acquired — another worker is finalizing');
      return false;
    }
  }

  const [scanRow] = await db
    .select({ status: scans.status })
    .from(scans)
    .where(and(eq(scans.id, scanId), eq(scans.organisationId, orgId)))
    .limit(1);

  if (!scanRow || scanRow.status === 'completed' || scanRow.status === 'failed') {
    return false;
  }

  const completedCount = jobs.filter((j) => j.status === 'completed').length;
  const failedCount = jobs.filter((j) => j.status === 'failed').length;

  if (completedCount === 0) {
    await db
      .update(scans)
      .set({
        status: 'failed',
        completedAt: new Date().toISOString(),
        errorMessage: `All ${jobs.length} page(s) failed to scan.`,
      })
      .where(and(eq(scans.id, scanId), eq(scans.organisationId, orgId)));
    await clearProgressKey(scanId);
    return true;
  }

  const rows = await db
    .select()
    .from(violations)
    .where(and(eq(violations.scanId, scanId), eq(violations.organisationId, orgId)));

  const asRaw: RawViolation[] = rows.map((v) => ({
    ruleId: v.ruleId,
    wcagCriterion: v.wcagCriteria?.[0] ?? 'N/A',
    wcagLevel: 'AA',
    standard: 'WCAG22',
    severity: v.impact,
    elementType: 'unknown',
    elementHtml: v.html ?? '',
    elementSelector: v.selector ?? '',
    description: v.description,
    helpUrl: v.helpUrl ?? '',
    fingerprint: `${v.ruleId}:${v.selector ?? ''}:${v.pageUrl ?? ''}`,
    pageUrl: v.pageUrl ?? '',
  }));

  const [previousScan] = await db
    .select({ id: scans.id })
    .from(scans)
    .where(
      and(
        eq(scans.assetId, assetId),
        eq(scans.organisationId, orgId),
        eq(scans.status, 'completed'),
        ne(scans.id, scanId),
      ),
    )
    .orderBy(desc(scans.completedAt))
    .limit(1);

  const scoreResult = await buildScanScoreResult(
    asRaw,
    completedCount,
    previousScan?.id ?? null,
    db,
    orgId,
  );

  const partialFailureNote =
    failedCount > 0 ? `${failedCount} of ${jobs.length} page(s) could not be analyzed.` : null;

  await db
    .update(scans)
    .set({
      status: 'completed',
      completedAt: new Date().toISOString(),
      score: Math.round(scoreResult.score),
      violationCount: rows.length,
      pagesScanned: completedCount,
      errorMessage: partialFailureNote,
    })
    .where(and(eq(scans.id, scanId), eq(scans.organisationId, orgId)));

  await db
    .update(assets)
    .set({ lastScannedAt: new Date().toISOString() })
    .where(and(eq(assets.id, assetId), eq(assets.organisationId, orgId)));

  // Issue sync is enqueued by the caller (findings persister / page worker) via issues.sync
  await clearProgressKey(scanId);
  await clearScanBarrier(scanId);

  logger.info(
    {
      scanId,
      pagesScanned: completedCount,
      pagesFailed: failedCount,
      violationCount: rows.length,
      score: scoreResult.score,
    },
    'Scan finalized from page jobs',
  );

  return true;
}

async function clearProgressKey(scanId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    if (redis.status !== 'ready') await redis.connect();
    await redis.del(ScanRedisKeys.progress(scanId));
  } catch (err) {
    logger.warn({ err, scanId }, 'Failed to clear scan progress key');
  }
}

/** Update Redis progress from page-job counts */
export async function updateProgressFromPageJobs(
  db: Database,
  scanId: string,
  orgId: string,
  currentUrl: string,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const jobs = await db
    .select({ status: scanPageJobs.status })
    .from(scanPageJobs)
    .where(and(eq(scanPageJobs.scanId, scanId), eq(scanPageJobs.organisationId, orgId)));

  const doneCount = jobs.filter((j) => TERMINAL.has(j.status)).length;

  try {
    if (redis.status !== 'ready') await redis.connect();
    await redis.setex(
      ScanRedisKeys.progress(scanId),
      SCAN_PROGRESS_TTL_SECONDS,
      JSON.stringify({
        pagesScanned: doneCount,
        pagesTotal: jobs.length,
        currentUrl,
      }),
    );
  } catch (err) {
    logger.warn({ err, scanId }, 'Failed to update progress from page jobs');
  }
}

/** True if Redis cancel flag is set for this scan */
export async function isScanCancelledInRedis(scanId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    if (redis.status !== 'ready') await redis.connect();
    const v = await redis.get(ScanRedisKeys.cancel(scanId));
    return v === '1';
  } catch {
    return false;
  }
}

/** True if the operator paused this scan */
export async function isScanPausedInRedis(scanId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    if (redis.status !== 'ready') await redis.connect();
    const v = await redis.get(ScanRedisKeys.pause(scanId));
    return v === '1';
  } catch {
    return false;
  }
}

/** Block until the scan is resumed or cancelled. */
export async function waitWhileScanPaused(scanId: string): Promise<void> {
  while (await isScanPausedInRedis(scanId)) {
    if (await isScanCancelledInRedis(scanId)) return;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}
