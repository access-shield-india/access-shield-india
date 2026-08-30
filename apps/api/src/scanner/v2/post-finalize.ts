/**
 * After a scan is finalized, enqueue issues.sync + ai.enrich (+ optional report).
 * For free public scans, email the lead a summary report instead.
 */

import { eq } from 'drizzle-orm';
import { organisations, type Database } from '@accessshield/db';
import Redis from 'ioredis';
import { maybeSendPublicScanReportEmail } from '../../lib/email/public-scan-report';
import { logger } from '../../lib/logger';
import { PUBLIC_SCANS_ORG_ID } from '../public-scan-org';
import {
  publishAiEnrichJob,
  publishIssuesSyncJob,
  publishReportGenerateJob,
} from './publish';

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  redisClient = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
  return redisClient;
}

/** When true, enqueue a technical PDF after each completed v2 scan */
export function isAutoReportEnabled(): boolean {
  return process.env.SCAN_PIPELINE_V2_AUTO_REPORT === 'true';
}

export async function enqueuePostFinalizeJobs(
  db: Database,
  params: { scanId: string; orgId: string; assetId: string },
): Promise<void> {
  const { scanId, orgId, assetId } = params;

  if (orgId === PUBLIC_SCANS_ORG_ID) {
    const redis = getRedis();
    if (redis) {
      try {
        await maybeSendPublicScanReportEmail(db, redis, { scanId, orgId });
      } catch (err) {
        logger.warn({ err, scanId }, 'Failed to send public scan report email — non-fatal');
      }
    } else {
      logger.warn({ scanId }, 'REDIS_URL not set — skipping public scan report email');
    }
    return;
  }

  await publishIssuesSyncJob({
    scanId,
    orgId,
    idempotencyKey: `issues.sync:${scanId}`,
  });

  const [org] = await db
    .select({ planTier: organisations.planTier })
    .from(organisations)
    .where(eq(organisations.id, orgId))
    .limit(1);

  const planTier = org?.planTier ?? 'starter';

  try {
    await publishAiEnrichJob({
      scanId,
      orgId,
      planTier,
      idempotencyKey: `ai.enrich:${scanId}`,
    });
  } catch (err) {
    logger.warn({ err, scanId }, 'Failed to publish ai.enrich — non-fatal');
  }

  if (isAutoReportEnabled()) {
    try {
      await publishReportGenerateJob({
        scanId,
        orgId,
        assetId,
        reportType: 'technical',
        format: 'pdf',
        idempotencyKey: `report.generate:technical:${scanId}`,
      });
    } catch (err) {
      logger.warn({ err, scanId }, 'Failed to publish report.generate — non-fatal');
    }
  }
}
