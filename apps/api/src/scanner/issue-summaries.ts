/**
 * Group stored violations into plain-language issue cards.
 * Derived at read time so older scans pick this up without a re-scan.
 */

import { and, eq, type SQL } from 'drizzle-orm';
import type { Database } from '@accessshield/db';
import { violations } from '@accessshield/db';
import { summariseIssues, type IssueSummary } from '@accessshield/types';

export interface ListIssueSummariesParams {
  scanId: string;
  organisationId: string;
  severity?: 'critical' | 'serious' | 'moderate' | 'minor';
  standard?: 'WCAG22' | 'IS17802' | 'GIGW3' | 'SEBI';
}

export async function listIssueSummaries(
  db: Database,
  params: ListIssueSummariesParams,
): Promise<IssueSummary[]> {
  const conditions: SQL[] = [
    eq(violations.scanId, params.scanId),
    eq(violations.organisationId, params.organisationId),
  ];

  if (params.severity) {
    conditions.push(eq(violations.impact, params.severity));
  }

  if (params.standard) {
    conditions.push(eq(violations.standard, params.standard));
  }

  const rows = await db
    .select({
      id: violations.id,
      ruleId: violations.ruleId,
      impact: violations.impact,
      description: violations.description,
      wcagCriteria: violations.wcagCriteria,
      selector: violations.selector,
      pageUrl: violations.pageUrl,
      standard: violations.standard,
    })
    .from(violations)
    .where(and(...conditions));

  return summariseIssues(rows);
}
