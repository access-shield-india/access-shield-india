/**
 * After a scan is finalized, enqueue issues.sync + ai.enrich (+ optional report).
 */

import { eq } from 'drizzle-orm';
import { organisations, type Database } from '@accessshield/db';
import { logger } from '../../lib/logger';
import {
  publishAiEnrichJob,
  publishIssuesSyncJob,
  publishReportGenerateJob,
} from './publish';

/** When true, enqueue a technical PDF after each completed v2 scan */
export function isAutoReportEnabled(): boolean {
  return process.env.SCAN_PIPELINE_V2_AUTO_REPORT === 'true';
}

export async function enqueuePostFinalizeJobs(
  db: Database,
  params: { scanId: string; orgId: string; assetId: string },
): Promise<void> {
  const { scanId, orgId, assetId } = params;

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
