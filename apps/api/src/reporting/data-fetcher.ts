/**
 * Report Data Fetcher
 *
 * Fetches and shapes all data needed to populate report templates.
 * Isolates DB queries from template rendering logic.
 */

import type { Database } from '@accessshield/db';
import { assets, organisations, scans, users, violations } from '@accessshield/db';
import { and, desc, eq, sql } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { isDevPreviewAiFix, stripDevPreviewComment } from '../lib/dev-mock-ai';
import type { ReportTemplateData, ReportType, ScanTrendPoint, ViolationSummary } from './types';

/** Custom error for resource not found scenarios */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/** Custom error for invalid scan state */
export class InvalidStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStateError';
  }
}

/**
 * Format date as DD/MM/YYYY per IS 17802 IS-004 requirement.
 * Never use MM/DD/YYYY format in Indian compliance reports.
 */
export function formatIndianDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format date as DD/MM/YYYY HH:mm in IST timezone.
 * Used for report generation timestamps.
 */
export function formatIndianDateTime(date: Date): string {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset);

  const day = String(istDate.getUTCDate()).padStart(2, '0');
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const year = istDate.getUTCFullYear();
  const hours = String(istDate.getUTCHours()).padStart(2, '0');
  const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Extract primary WCAG criterion from criteria array.
 * Returns first criterion or 'Unknown' if empty.
 */
function extractPrimaryCriterion(criteria: string[] | null): string {
  if (!criteria || criteria.length === 0) return 'Unknown';
  return criteria[0] ?? 'Unknown';
}

/**
 * Determine WCAG level from criterion number.
 * Level A: 1.x.1, Level AA: 1.x.2+, etc.
 */
function determineCriterionLevel(criterion: string): string {
  const parts = criterion.split('.');
  if (parts.length < 3) return 'A';
  const lastPart = parseInt(parts[2] ?? '1', 10);
  if (lastPart <= 1) return 'A';
  if (lastPart <= 13) return 'AA';
  return 'AAA';
}

/**
 * Extract element type from HTML snippet.
 * Returns the tag name or 'unknown' if parsing fails.
 */
function extractElementType(html: string | null): string {
  if (!html) return 'unknown';
  const match = /<([a-zA-Z0-9]+)[\s>]/i.exec(html);
  return match?.[1]?.toLowerCase() ?? 'unknown';
}

/**
 * Count violations by severity for a scan.
 */
async function countViolationsBySeverity(
  db: Database,
  scanId: string,
  organisationId: string,
): Promise<{ critical: number; serious: number; moderate: number; minor: number }> {
  const counts = await db
    .select({
      impact: violations.impact,
      count: sql<number>`count(*)::int`,
    })
    .from(violations)
    .where(and(eq(violations.scanId, scanId), eq(violations.organisationId, organisationId)))
    .groupBy(violations.impact);

  const result = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const row of counts) {
    if (row.impact === 'critical') result.critical = row.count;
    else if (row.impact === 'serious') result.serious = row.count;
    else if (row.impact === 'moderate') result.moderate = row.count;
    else if (row.impact === 'minor') result.minor = row.count;
  }
  return result;
}

/**
 * Fetch and assemble all data needed to render a report template.
 *
 * @param db - Drizzle database instance
 * @param organisationId - Organisation ID from JWT (tenant isolation)
 * @param scanId - Scan ID to generate report for
 * @param assetId - Asset ID the scan belongs to
 * @param reportType - Type of report being generated
 * @param generatedByUserId - User ID who triggered generation
 * @throws NotFoundError if asset, scan, or user not found
 * @throws InvalidStateError if scan is not completed
 */
export async function fetchReportData(
  db: Database,
  organisationId: string,
  scanId: string,
  assetId: string,
  reportType: ReportType,
  generatedByUserId: string,
): Promise<ReportTemplateData> {
  logger.info({ organisationId, scanId, assetId, reportType }, 'Fetching report data');

  const [org] = await db
    .select({
      name: organisations.name,
      gstin: organisations.gstin,
    })
    .from(organisations)
    .where(eq(organisations.id, organisationId))
    .limit(1);

  if (!org) {
    throw new NotFoundError('Organisation not found');
  }

  const [asset] = await db
    .select({
      name: assets.name,
      url: assets.url,
      type: assets.type,
    })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.organisationId, organisationId)))
    .limit(1);

  if (!asset) {
    throw new NotFoundError('Asset not found or access denied');
  }

  const [scan] = await db
    .select({
      id: scans.id,
      status: scans.status,
      score: scans.score,
      pagesScanned: scans.pagesScanned,
      violationCount: scans.violationCount,
      wcagLevel: scans.wcagLevel,
      wcagVersion: scans.wcagVersion,
      completedAt: scans.completedAt,
    })
    .from(scans)
    .where(and(eq(scans.id, scanId), eq(scans.organisationId, organisationId)))
    .limit(1);

  if (!scan) {
    throw new NotFoundError('Scan not found or access denied');
  }

  if (scan.status !== 'completed' || !scan.completedAt) {
    throw new InvalidStateError('Scan not found or not completed');
  }

  const violationRows = await db
    .select({
      id: violations.id,
      ruleId: violations.ruleId,
      impact: violations.impact,
      description: violations.description,
      helpUrl: violations.helpUrl,
      wcagCriteria: violations.wcagCriteria,
      selector: violations.selector,
      html: violations.html,
      pageUrl: violations.pageUrl,
      aiFix: violations.aiFix,
      aiExplanation: violations.aiExplanation,
    })
    .from(violations)
    .where(and(eq(violations.scanId, scanId), eq(violations.organisationId, organisationId)))
    .orderBy(
      sql`CASE ${violations.impact}
        WHEN 'critical' THEN 1
        WHEN 'serious' THEN 2
        WHEN 'moderate' THEN 3
        WHEN 'minor' THEN 4
      END`,
      violations.ruleId,
    );

  const violationSummaries: ViolationSummary[] = violationRows.map((v) => {
    const primaryCriterion = extractPrimaryCriterion(v.wcagCriteria);
    const rawFix = v.aiFix?.trim() ? v.aiFix : null;
    const aiFix = rawFix ? stripDevPreviewComment(rawFix) : null;
    const aiExplanation = v.aiExplanation?.trim() ? v.aiExplanation : null;
    const devPreview = isDevPreviewAiFix(aiExplanation, rawFix);

    return {
      wcagCriterion: primaryCriterion,
      wcagLevel: determineCriterionLevel(primaryCriterion),
      standard: 'WCAG22',
      severity: v.impact,
      description: v.description,
      pageUrl: v.pageUrl ?? '',
      elementType: extractElementType(v.html),
      elementHtml: v.html,
      elementSelector: v.selector,
      screenshotUrl: null,
      aiFix,
      aiExplanation:
        devPreview && aiExplanation
          ? `${aiExplanation} (Development preview — regenerate from Issues for production-grade fixes.)`
          : aiExplanation,
      helpUrl: v.helpUrl,
    };
  });

  const previousScanRows = await db
    .select({
      score: scans.score,
      completedAt: scans.completedAt,
    })
    .from(scans)
    .where(
      and(
        eq(scans.assetId, assetId),
        eq(scans.organisationId, organisationId),
        eq(scans.status, 'completed'),
      ),
    )
    .orderBy(desc(scans.completedAt))
    .limit(6);

  const currentScanIndex = previousScanRows.findIndex((s) => s.completedAt === scan.completedAt);
  const historicalScans =
    currentScanIndex >= 0
      ? previousScanRows.slice(currentScanIndex + 1, currentScanIndex + 6)
      : previousScanRows.slice(1, 6);

  const previousScans: ScanTrendPoint[] = historicalScans
    .filter((s) => s.completedAt && s.score !== null)
    .map((s) => ({
      date: formatIndianDate(new Date(s.completedAt!)),
      score: s.score!,
    }));

  let scoreDelta: number | null = null;
  if (previousScans.length > 0 && scan.score !== null) {
    const previousScore = previousScans[0]?.score;
    if (previousScore !== undefined) {
      scoreDelta = scan.score - previousScore;
    }
  }

  const [user] = await db
    .select({ fullName: users.fullName, email: users.email })
    .from(users)
    .where(and(eq(users.id, generatedByUserId), eq(users.organisationId, organisationId)))
    .limit(1);

  const generatedByName = user?.fullName ?? user?.email ?? 'System';

  const severityCounts = await countViolationsBySeverity(db, scanId, organisationId);

  const standards: string[] = [];
  if (scan.wcagVersion && scan.wcagLevel) {
    standards.push(`WCAG ${scan.wcagVersion} ${scan.wcagLevel}`);
  }
  standards.push('IS 17802');

  const reportData: ReportTemplateData = {
    organisation: {
      name: org.name,
      logoUrl: null,
      gstin: org.gstin,
    },
    asset: {
      name: asset.name,
      url: asset.url,
      standards,
    },
    scan: {
      id: scan.id,
      completedAt: formatIndianDate(new Date(scan.completedAt)),
      score: scan.score ?? 0,
      scoreDelta,
      pagesScanned: scan.pagesScanned,
      criticalCount: severityCounts.critical,
      seriousCount: severityCounts.serious,
      moderateCount: severityCounts.moderate,
      minorCount: severityCounts.minor,
    },
    violations: violationSummaries,
    previousScans,
    generatedAt: formatIndianDateTime(new Date()),
    generatedBy: generatedByName,
    reportType,
  };

  logger.info(
    {
      organisationId,
      scanId,
      violationCount: violationSummaries.length,
      previousScansCount: previousScans.length,
    },
    'Report data fetched successfully',
  );

  return reportData;
}
