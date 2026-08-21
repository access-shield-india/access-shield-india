/**
 * axe-core Runner
 *
 * Integrates axe-core accessibility testing with Playwright pages.
 * Maps axe results to AccessShield violation format with
 * WCAG 2.2, IS 17802, GIGW 3.0, and SEBI standard tagging.
 *
 * Knowledge-base rules applied here:
 * - RULE-001: run axe inside each accessible iframe (page.frames())
 * - RULE-002: scroll the page to load lazy content before axe.run()
 * Custom DOM rules RULE-004–007 are in ./custom-rules.ts and merged in.
 */

import { createHash } from 'crypto';
import { logger } from '../lib/logger';
import type { IssueSeverity } from '@accessshield/types';
import { runCustomAxeRules } from './custom-rules';
import type { ComplianceStandard, RawViolation, ScanJobConfig, WcagLevel } from './types';

/** Playwright types */
type Page = import('playwright').Page;
type Frame = import('playwright').Frame;

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

const SCROLL_SETTLE_MS = 2500;

/**
 * RULE-002: scroll to bottom so lazy-loaded images/carousels enter the DOM, then return to top.
 */
export async function scrollPageBeforeScan(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      const doc = (globalThis as unknown as { document: Document; window: Window }).document;
      const win = (globalThis as unknown as { window: Window }).window;
      win.scrollTo(0, Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight));
    });
    await page.waitForTimeout(SCROLL_SETTLE_MS);
    await page.evaluate(() => {
      (globalThis as unknown as { window: Window }).window.scrollTo(0, 0);
    });
  } catch (err) {
    logger.warn({ err }, 'RULE-002 scroll-before-scan failed; continuing with current viewport');
  }
}

async function runAxeInContext(
  target: Page | Frame,
  axeCorePath: string,
  axeTags: string[],
): Promise<AxeResults> {
  await target.addScriptTag({ path: axeCorePath });

  return (await target.evaluate(async (tags: string[]) => {
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
}

function mapAxeResults(
  results: AxeResults,
  config: ScanJobConfig,
  assetId: string,
  pageUrl: string,
  seenFingerprints: Set<string>,
  selectorPrefix = '',
): RawViolation[] {
  const violations: RawViolation[] = [];

  for (const violation of results.violations) {
    for (const node of violation.nodes) {
      const selector = `${selectorPrefix}${node.target.join(' > ')}`;
      const fingerprint = computeFingerprint(assetId, violation.id, selector);

      if (seenFingerprints.has(fingerprint)) {
        continue;
      }
      seenFingerprints.add(fingerprint);

      violations.push({
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
      });
    }
  }

  return violations;
}

/**
 * RULE-001: axe-core cannot cross iframe boundaries. Run axe in every accessible child frame.
 * Cross-origin frames throw on script injection and are skipped (logged).
 */
async function collectIframeViolations(
  page: Page,
  axeCorePath: string,
  axeTags: string[],
  config: ScanJobConfig,
  assetId: string,
  pageUrl: string,
  seenFingerprints: Set<string>,
): Promise<RawViolation[]> {
  const collected: RawViolation[] = [];
  const frames = page.frames().filter((frame) => frame !== page.mainFrame());

  for (const frame of frames) {
    const frameUrl = frame.url();
    if (!frameUrl || frameUrl === 'about:blank') continue;

    try {
      const results = await runAxeInContext(frame, axeCorePath, axeTags);
      const prefix = `[iframe:${frameUrl}] `;
      collected.push(
        ...mapAxeResults(results, config, assetId, pageUrl, seenFingerprints, prefix),
      );
      logger.info(
        { pageUrl, frameUrl, violationCount: results.violations.length },
        'RULE-001 axe-core iframe scan complete',
      );
    } catch (err) {
      logger.debug(
        { err, pageUrl, frameUrl },
        'RULE-001 skipped inaccessible iframe (likely cross-origin)',
      );
    }
  }

  return collected;
}

/**
 * Run axe-core accessibility analysis on a page.
 *
 * Workflow:
 * 1. RULE-002: scroll page so lazy-loaded content is in the DOM
 * 2. Inject axe-core and run on the main document
 * 3. RULE-001: run axe inside each accessible iframe
 * 4. RULE-004–007: custom DOM rules
 * 5. Map + merge all violations before returning (worker persists this array)
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
    await scrollPageBeforeScan(page);

    const axeCorePath = require.resolve('axe-core');
    const axeTags = buildAxeTags(config);
    const seenFingerprints = new Set<string>();

    const mainResults = await runAxeInContext(page, axeCorePath, axeTags);
    const violations = mapAxeResults(mainResults, config, assetId, pageUrl, seenFingerprints);

    const iframeViolations = await collectIframeViolations(
      page,
      axeCorePath,
      axeTags,
      config,
      assetId,
      pageUrl,
      seenFingerprints,
    );
    violations.push(...iframeViolations);

    const customViolations = await runCustomAxeRules(page, pageUrl, assetId);
    for (const custom of customViolations) {
      if (seenFingerprints.has(custom.fingerprint)) continue;
      seenFingerprints.add(custom.fingerprint);
      violations.push(custom);
    }

    logger.info(
      {
        pageUrl,
        violationCount: violations.length,
        axeViolationCount: mainResults.violations.length,
        iframeViolationCount: iframeViolations.length,
        customViolationCount: customViolations.length,
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
