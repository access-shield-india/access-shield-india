/**
 * scan_page_jobs repository — multi-scan-safe page job upserts.
 */

import { and, eq, sql } from 'drizzle-orm';
import { scanPageJobs, type Database } from '@accessshield/db';
import { normalizeScanPageUrl } from './url';

export interface UpsertPageJobInput {
  organisationId: string;
  scanId: string;
  assetId: string;
  url: string;
  authRequired?: boolean;
  status?: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'skipped';
}

/**
 * Insert a page job or return the existing row for (scanId, urlNormalized).
 */
export async function upsertScanPageJob(
  db: Database,
  input: UpsertPageJobInput,
): Promise<{ id: string; created: boolean }> {
  const urlNormalized = normalizeScanPageUrl(input.url);
  const status = input.status ?? 'pending';

  const inserted = await db
    .insert(scanPageJobs)
    .values({
      organisationId: input.organisationId,
      scanId: input.scanId,
      assetId: input.assetId,
      url: input.url,
      urlNormalized,
      authRequired: input.authRequired ?? false,
      status,
    })
    .onConflictDoNothing({
      target: [scanPageJobs.scanId, scanPageJobs.urlNormalized],
    })
    .returning({ id: scanPageJobs.id });

  if (inserted[0]) {
    return { id: inserted[0].id, created: true };
  }

  const [existing] = await db
    .select({ id: scanPageJobs.id })
    .from(scanPageJobs)
    .where(
      and(eq(scanPageJobs.scanId, input.scanId), eq(scanPageJobs.urlNormalized, urlNormalized)),
    )
    .limit(1);

  if (!existing) {
    throw new Error(`Failed to upsert scan_page_job for scan=${input.scanId} url=${input.url}`);
  }

  return { id: existing.id, created: false };
}

export async function markScanPageJobStatus(
  db: Database,
  params: {
    pageJobId: string;
    organisationId: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'skipped';
    errorMessage?: string | null;
    bumpAttempt?: boolean;
  },
): Promise<void> {
  const now = new Date().toISOString();

  await db
    .update(scanPageJobs)
    .set({
      status: params.status,
      ...(params.status === 'running' ? { startedAt: now } : {}),
      ...(params.status === 'completed' ||
      params.status === 'failed' ||
      params.status === 'cancelled'
        ? { completedAt: now }
        : {}),
      ...(params.errorMessage !== undefined ? { errorMessage: params.errorMessage } : {}),
      ...(params.bumpAttempt ? { attempt: sql`${scanPageJobs.attempt} + 1` } : {}),
    })
    .where(
      and(
        eq(scanPageJobs.id, params.pageJobId),
        eq(scanPageJobs.organisationId, params.organisationId),
      ),
    );
}
