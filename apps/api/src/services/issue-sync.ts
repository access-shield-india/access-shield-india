/**
 * Sync scan violations into trackable remediation issues.
 */

import type { Database } from '@accessshield/db';
import { issues, scans, violations } from '@accessshield/db';
import { and, eq, isNull } from 'drizzle-orm';
import { logger } from '../lib/logger';

function buildIssueTitle(ruleId: string, wcagCriteria: string[] | null): string {
  const wcag = wcagCriteria?.[0];
  const prefix = wcag ? `[WCAG ${wcag}] ` : '';
  return `${prefix}${ruleId}`.substring(0, 500);
}

/**
 * Create issues for violations that do not yet have a linked issue row.
 * Safe to call repeatedly — skips violations already linked.
 */
export async function syncIssuesFromViolations(
  db: Database,
  orgId: string,
  scanId?: string,
): Promise<number> {
  const conditions = [eq(violations.organisationId, orgId), isNull(issues.id)];
  if (scanId) {
    conditions.push(eq(violations.scanId, scanId));
  }

  const orphans = await db
    .select({
      violationId: violations.id,
      ruleId: violations.ruleId,
      description: violations.description,
      impact: violations.impact,
      wcagCriteria: violations.wcagCriteria,
      assetId: scans.assetId,
    })
    .from(violations)
    .innerJoin(scans, eq(violations.scanId, scans.id))
    .leftJoin(issues, eq(issues.violationId, violations.id))
    .where(and(...conditions));

  if (orphans.length === 0) {
    return 0;
  }

  const BATCH_SIZE = 500;
  let created = 0;

  for (let i = 0; i < orphans.length; i += BATCH_SIZE) {
    const batch = orphans.slice(i, i + BATCH_SIZE);

    await db.insert(issues).values(
      batch.map((row) => ({
        organisationId: orgId,
        violationId: row.violationId,
        assetId: row.assetId,
        title: buildIssueTitle(row.ruleId, row.wcagCriteria),
        description: row.description,
        severity: row.impact,
        status: 'open' as const,
      })),
    );

    created += batch.length;
  }

  logger.info({ orgId, created }, 'Synced violations to issues');
  return created;
}
