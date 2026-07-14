/**
 * Accessibility Score Calculator
 *
 * Computes accessibility scores based on violation severity.
 * Score algorithm starts at 100 and deducts points based on
 * the severity and quantity of violations found.
 */

import type { Database } from '@accessshield/db';
import { scans } from '@accessshield/db';
import { eq } from 'drizzle-orm';
import { logger } from '../lib/logger';
import type { RawViolation, ScanScoreResult } from './types';

/** Point deductions per violation by severity */
const SEVERITY_DEDUCTIONS: Record<string, number> = {
  critical: 10,
  serious: 5,
  moderate: 2,
  minor: 0.5,
};

/** Maximum possible score */
const MAX_SCORE = 100;

/** Minimum possible score */
const MIN_SCORE = 0;

/**
 * Calculate accessibility score from violations.
 *
 * Algorithm:
 * - Start with 100 points
 * - Deduct per unique violation (not per page):
 *   - Critical: -10 points
 *   - Serious: -5 points
 *   - Moderate: -2 points
 *   - Minor: -0.5 points
 * - Score cannot go below 0
 * - Round to 2 decimal places
 *
 * @param violations - Array of violations to score
 * @param _pagesScanned - Number of pages scanned (reserved for future use)
 * @returns Score from 0.00 to 100.00
 */
export function calculateScore(violations: RawViolation[], _pagesScanned: number): number {
  if (violations.length === 0) {
    return MAX_SCORE;
  }

  let totalDeduction = 0;

  for (const violation of violations) {
    const deduction = SEVERITY_DEDUCTIONS[violation.severity] ?? SEVERITY_DEDUCTIONS.minor ?? 0.5;
    totalDeduction += deduction;
  }

  totalDeduction = Math.min(totalDeduction, MAX_SCORE);

  const score = Math.max(MIN_SCORE, MAX_SCORE - totalDeduction);

  return Math.round(score * 100) / 100;
}

/**
 * Count violations by severity.
 *
 * @param violations - Array of violations to count
 * @returns Object with counts per severity level
 */
export function countViolationsBySeverity(violations: RawViolation[]): {
  criticalCount: number;
  seriousCount: number;
  moderateCount: number;
  minorCount: number;
} {
  const counts = {
    criticalCount: 0,
    seriousCount: 0,
    moderateCount: 0,
    minorCount: 0,
  };

  for (const violation of violations) {
    switch (violation.severity) {
      case 'critical':
        counts.criticalCount++;
        break;
      case 'serious':
        counts.seriousCount++;
        break;
      case 'moderate':
        counts.moderateCount++;
        break;
      case 'minor':
        counts.minorCount++;
        break;
    }
  }

  return counts;
}

/**
 * Compute score delta from previous scan.
 *
 * @param currentScore - Current scan score
 * @param previousScanId - ID of previous scan for comparison
 * @param db - Drizzle database instance
 * @param orgId - Organization ID for security
 * @returns Score delta (positive = improvement) or null if no previous scan
 */
export async function computeScoreDelta(
  currentScore: number,
  previousScanId: string | null,
  db: Database,
  orgId: string,
): Promise<number | null> {
  if (!previousScanId) {
    return null;
  }

  try {
    const [previousScan] = await db
      .select({ score: scans.score })
      .from(scans)
      .where(eq(scans.id, previousScanId))
      .limit(1);

    if (!previousScan || previousScan.score === null) {
      return null;
    }

    const delta = currentScore - previousScan.score;

    return Math.round(delta * 100) / 100;
  } catch (err) {
    logger.warn({ err, previousScanId }, 'Failed to compute score delta');
    return null;
  }
}

/**
 * Build complete scan score result.
 *
 * @param violations - All violations from the scan
 * @param pagesScanned - Number of pages that were scanned
 * @param previousScanId - ID of previous scan for delta calculation
 * @param db - Drizzle database instance
 * @param orgId - Organization ID for security
 * @returns Complete score result with all metrics
 */
export async function buildScanScoreResult(
  violations: RawViolation[],
  pagesScanned: number,
  previousScanId: string | null,
  db: Database,
  orgId: string,
): Promise<ScanScoreResult> {
  const score = calculateScore(violations, pagesScanned);
  const scoreDelta = await computeScoreDelta(score, previousScanId, db, orgId);
  const counts = countViolationsBySeverity(violations);

  const result: ScanScoreResult = {
    score,
    scoreDelta,
    ...counts,
    pagesScanned,
  };

  logger.info(
    {
      score,
      scoreDelta,
      violationCount: violations.length,
      pagesScanned,
      ...counts,
    },
    'Scan score calculated',
  );

  return result;
}

/**
 * Calculate a quick score estimate for partial results.
 * Useful for showing progress during long-running scans.
 *
 * @param violations - Violations found so far
 * @param pagesScannedSoFar - Pages scanned so far
 * @param totalPages - Total pages to scan
 * @returns Estimated final score
 */
export function estimateScore(
  violations: RawViolation[],
  pagesScannedSoFar: number,
  totalPages: number,
): number {
  if (pagesScannedSoFar === 0 || totalPages === 0) {
    return MAX_SCORE;
  }

  const currentScore = calculateScore(violations, pagesScannedSoFar);

  const violationsPerPage = violations.length / pagesScannedSoFar;

  const estimatedTotalViolations = Math.round(violationsPerPage * totalPages);

  const scaleFactor = totalPages / pagesScannedSoFar;
  const estimatedDeduction = (MAX_SCORE - currentScore) * scaleFactor;

  const estimatedScore = Math.max(MIN_SCORE, MAX_SCORE - estimatedDeduction);

  return Math.round(estimatedScore * 100) / 100;
}

/**
 * Determine score grade based on score value.
 *
 * @param score - Accessibility score (0-100)
 * @returns Letter grade
 */
export function getScoreGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * Get score color for UI display.
 *
 * @param score - Accessibility score (0-100)
 * @returns Tailwind color class name
 */
export function getScoreColor(score: number): string {
  if (score >= 85) return 'text-success-700';
  if (score >= 70) return 'text-primary-600';
  if (score >= 55) return 'text-warning-700';
  return 'text-error-700';
}

/**
 * Format score delta for display.
 *
 * @param delta - Score change (positive = improvement)
 * @returns Formatted string with sign
 */
export function formatScoreDelta(delta: number | null): string {
  if (delta === null) return 'N/A';
  if (delta === 0) return '0';
  if (delta > 0) return `+${delta.toFixed(2)}`;
  return delta.toFixed(2);
}
