/**
 * axe-core Runner
 *
 * Integrates axe-core accessibility testing with Playwright pages.
 * Maps axe results to AccessShield violation format with
 * WCAG 2.2, IS 17802, GIGW 3.0, and SEBI standard tagging.
 */

import { createHash } from 'crypto';
import { logger } from '../lib/logger';
import type { IssueSeverity } from '@accessshield/types';
import type { ComplianceStandard, RawViolation, ScanJobConfig, WcagLevel } from './types';

/** Playwright Page type */
type Page = import('playwright').Page;

/** axe-core result types */
interface AxeNode {
  html: string;
  target: string[];
  failureSummary?: string;
}

interface AxeViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical' | null;
  tags: string[];
  description: string;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
}

interface AxeResults {
  violations: AxeViolation[];
  passes: unknown[];
  incomplete: unknown[];
  inapplicable: unknown[];
}

/**
 * Map axe-core impact to AccessShield severity.
 *
 * @param impact - axe-core impact level
 * @returns Normalized severity
 */
export function mapImpact(impact: string | null): IssueSeverity {
  switch (impact) {
    case 'critical':
      return 'critical';
    case 'serious':
      return 'serious';
    case 'moderate':
      return 'moderate';
    case 'minor':
    default:
      return 'minor';
  }
}

/**
 * Extract WCAG success criterion from axe-core tags.
 * Converts format like 'wcag111' to '1.1.1'.
 *
 * @param tags - Array of axe-core tags
 * @returns WCAG criterion string or 'N/A' if not found
 */
export function extractCriterion(tags: string[]): string {
  for (const tag of tags) {
    const match = tag.match(/^wcag(\d)(\d)(\d+)$/);
    if (match) {
      return `${match[1]}.${match[2]}.${match[3]}`;
    }
  }

  const scTag = tags.find((t) => t.startsWith('wcag'));
  if (scTag) {
    const numMatch = scTag.match(/wcag(\d+)/);
    if (numMatch?.[1] && numMatch[1].length >= 3) {
      const num = numMatch[1];
      return `${num[0]}.${num[1]}.${num.slice(2)}`;
    }
  }

  return 'N/A';
}

/**
 * Determine WCAG level from axe-core tags.
 *
 * @param tags - Array of axe-core tags
 * @returns WCAG conformance level
 */
export function extractWcagLevel(tags: string[]): WcagLevel {
  if (tags.includes('wcag2aaa') || tags.includes('wcag22aaa')) {
    return 'AAA';
  }
  if (tags.includes('wcag2aa') || tags.includes('wcag21aa') || tags.includes('wcag22aa')) {
    return 'AA';
  }
  if (tags.includes('wcag2a') || tags.includes('wcag21a') || tags.includes('wcag22a')) {
    return 'A';
  }
  return 'AA';
}

/**
 * Determine which compliance standard a violation belongs to.
 * Priority: IS17802 > GIGW3 > SEBI > WCAG22
 *
 * @param tags - Array of axe-core tags
 * @param enabledStandards - Standards enabled for this scan
 * @returns Primary compliance standard
 */
export function determineStandard(
  tags: string[],
  enabledStandards: ComplianceStandard[],
): ComplianceStandard {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));

  if (enabledStandards.includes('IS17802')) {
    if (tagSet.has('is17802') || tagSet.has('wcag21aa') || tagSet.has('wcag2aa')) {
      return 'IS17802';
    }
  }

  if (enabledStandards.includes('GIGW3')) {
    if (tagSet.has('gigw') || tagSet.has('gigw3')) {
      return 'GIGW3';
    }
  }

  if (enabledStandards.includes('SEBI')) {
    if (tagSet.has('sebi')) {
      return 'SEBI';
    }
  }

  return 'WCAG22';
}

/**
 * Compute fingerprint for violation deduplication.
 * Uses SHA-256 of assetId + ruleId + selector.
 *
 * @param assetId - Asset UUID
 * @param ruleId - axe-core rule ID
 * @param selector - CSS selector path
 * @returns First 16 characters of SHA-256 hash
 */
export function computeFingerprint(assetId: string, ruleId: string, selector: string): string {
  const input = `${assetId}:${ruleId}:${selector}`;
  const hash = createHash('sha256').update(input).digest('hex');
  return hash.substring(0, 16);
}

/**
 * Extract HTML element type from snippet.
 *
 * @param html - HTML snippet
 * @returns Element tag name or 'unknown'
 */
function extractElementType(html: string): string {
  const match = html.match(/^<(\w+)/);
  return match?.[1]?.toLowerCase() ?? 'unknown';
}

/**
 * Build axe-core run tags based on scan configuration.
 *
 * @param config - Scan configuration
 * @returns Array of axe-core tag names to run
 */
function buildAxeTags(config: ScanJobConfig): string[] {
  const tags: string[] = [];

  if (config.wcagLevel === 'A') {
    tags.push('wcag2a', 'wcag21a');
  } else if (config.wcagLevel === 'AA') {
    tags.push('wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa');
  } else if (config.wcagLevel === 'AAA') {
    tags.push('wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag22aa');
  }

  if (process.env.SCAN_AXE_BEST_PRACTICE === 'true') {
    tags.push('best-practice');
  }

  return [...new Set(tags)];
}

/**
 * Run axe-core accessibility analysis on a page.
 *
 * Workflow:
 * 1. Inject axe-core script into page
 * 2. Configure axe with appropriate WCAG tags
 * 3. Run analysis and collect violations
 * 4. Map violations to RawViolation format
 * 5. Deduplicate by fingerprint within page
 *
 * @param page - Playwright page instance
 * @param config - Scan configuration
 * @param assetId - Asset UUID for fingerprinting
 * @param pageUrl - URL of the page being scanned
 * @returns Array of raw violations
 */
export async function runAxe(
  page: Page,
  config: ScanJobConfig,
  assetId: string,
  pageUrl: string,
): Promise<RawViolation[]> {
  try {
    const axeCorePath = require.resolve('axe-core');
    await page.addScriptTag({ path: axeCorePath });

    const axeTags = buildAxeTags(config);

    const results = (await page.evaluate(async (tags: string[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const axe = (globalThis as any).axe;

      if (!axe) {
        throw new Error('axe-core not loaded');
      }

      return await axe.run({
        runOnly: {
          type: 'tag',
          values: tags,
        },
        reporter: 'v2',
        resultTypes: ['violations'],
      });
    }, axeTags)) as AxeResults;

    const violations: RawViolation[] = [];
    const seenFingerprints = new Set<string>();

    for (const violation of results.violations) {
      for (const node of violation.nodes) {
        const selector = node.target.join(' > ');
        const fingerprint = computeFingerprint(assetId, violation.id, selector);

        if (seenFingerprints.has(fingerprint)) {
          continue;
        }
        seenFingerprints.add(fingerprint);

        const rawViolation: RawViolation = {
          ruleId: violation.id,
          wcagCriterion: extractCriterion(violation.tags),
          wcagLevel: extractWcagLevel(violation.tags),
          standard: determineStandard(violation.tags, config.standards),
          severity: mapImpact(violation.impact),
          elementType: extractElementType(node.html),
          elementHtml: node.html.substring(0, 2000),
          elementSelector: selector,
          description: `${violation.help}. ${node.failureSummary ?? violation.description}`,
          helpUrl: violation.helpUrl,
          fingerprint,
          pageUrl,
        };

        violations.push(rawViolation);
      }
    }

    logger.info(
      {
        pageUrl,
        violationCount: violations.length,
        axeViolationCount: results.violations.length,
      },
      'axe-core analysis complete',
    );

    return violations;
  } catch (err) {
    logger.error({ err, pageUrl }, 'axe-core analysis failed');
    throw err;
  }
}

/**
 * Run axe-core with retry on failure.
 *
 * @param page - Playwright page instance
 * @param config - Scan configuration
 * @param assetId - Asset UUID for fingerprinting
 * @param pageUrl - URL of the page being scanned
 * @param maxRetries - Maximum retry attempts (default: 2)
 * @returns Array of raw violations
 */
export async function runAxeWithRetry(
  page: Page,
  config: ScanJobConfig,
  assetId: string,
  pageUrl: string,
  maxRetries = 2,
): Promise<RawViolation[]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await runAxe(page, config, assetId, pageUrl);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      logger.warn(
        { err: lastError, pageUrl, attempt, maxRetries },
        'axe-core analysis failed, retrying',
      );

      if (attempt < maxRetries) {
        await page.waitForTimeout(1000);
      }
    }
  }

  throw lastError ?? new Error('axe-core analysis failed after retries');
}

/**
 * Get violations that might benefit from AI-generated alt text.
 * Filters for image-alt violations.
 *
 * @param violations - Array of raw violations
 * @returns Violations that are missing alt text on images
 */
export function getAltTextCandidates(violations: RawViolation[]): RawViolation[] {
  const altTextRules = ['image-alt', 'input-image-alt', 'area-alt'];
  return violations.filter((v) => altTextRules.includes(v.ruleId) && v.elementType === 'img');
}

/**
 * Get violations that are critical or serious for AI fix generation.
 *
 * @param violations - Array of raw violations
 * @returns Critical and serious violations
 */
export function getFixCandidates(violations: RawViolation[]): RawViolation[] {
  return violations.filter((v) => v.severity === 'critical' || v.severity === 'serious');
}
