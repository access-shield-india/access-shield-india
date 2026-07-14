/**
 * Scanner Module Types
 *
 * Type definitions for the AccessShield India Website Accessibility Scanner.
 * Handles WCAG 2.2 AA, IS 17802, GIGW 3.0, and SEBI compliance scanning.
 */

import type { IssueSeverity } from '@accessshield/types';

/** Supported WCAG conformance levels */
export type WcagLevel = 'A' | 'AA' | 'AAA';

/** Compliance standards supported by the scanner */
export type ComplianceStandard = 'WCAG22' | 'IS17802' | 'GIGW3' | 'SEBI';

/** Scan type determines crawl scope */
export type ScanType = 'full' | 'incremental' | 'single_page';

/** Viewport configuration for responsive testing */
export interface ViewportConfig {
  width: number;
  height: number;
  label: string;
}

/** Login configuration for authenticated scanning */
export interface LoginConfig {
  url: string;
  usernameField: string;
  passwordField: string;
  usernameSecretArn: string;
  passwordSecretArn: string;
}

/** Scan job configuration passed through RabbitMQ */
export interface ScanJobConfig {
  maxPages: number;
  wcagLevel: WcagLevel;
  standards: ComplianceStandard[];
  loginConfig?: LoginConfig;
  excludePaths: string[];
  viewports: ViewportConfig[];
}

/**
 * Message published to RabbitMQ 'scans' queue.
 * Contains all information needed for a worker to execute a scan job.
 */
export interface ScanJobMessage {
  scanId: string;
  assetId: string;
  orgId: string;
  assetUrl: string;
  config: ScanJobConfig;
}

/**
 * Raw violation detected by axe-core, enriched with India-specific metadata.
 * Fingerprint enables deduplication across pages and scans.
 */
export interface RawViolation {
  /** axe-core rule ID (e.g., 'image-alt', 'color-contrast') */
  ruleId: string;
  /** WCAG success criterion (e.g., '1.1.1', '1.4.3') */
  wcagCriterion: string;
  /** WCAG conformance level of the criterion */
  wcagLevel: WcagLevel;
  /** Primary standard this violation falls under */
  standard: ComplianceStandard;
  /** Severity mapped from axe-core impact */
  severity: IssueSeverity;
  /** HTML element type (e.g., 'img', 'button', 'input') */
  elementType: string;
  /** Truncated HTML snippet (max 2000 chars) */
  elementHtml: string;
  /** CSS selector path to the element */
  elementSelector: string;
  /** Human-readable description of the issue */
  description: string;
  /** URL to axe-core documentation for this rule */
  helpUrl: string;
  /** SHA-256 fingerprint for deduplication: assetId + ruleId + selector */
  fingerprint: string;
  /** Page URL where this violation was found */
  pageUrl: string;
}

/** Heading structure extracted from page for accessibility analysis */
export interface HeadingInfo {
  level: number;
  text: string;
}

/**
 * Result of scanning a single page with Playwright + axe-core.
 * Screenshots stored as S3 URLs after upload.
 */
export interface PageScanResult {
  url: string;
  title: string;
  langAttribute: string | null;
  violations: RawViolation[];
  screenshotUrl: string | null;
  mobileScreenshotUrl: string | null;
  headingStructure: HeadingInfo[];
  landmarkRegions: string[];
  scanDurationMs: number;
}

/**
 * Aggregated score result after processing all violations.
 * Score algorithm: start at 100, deduct based on severity.
 */
export interface ScanScoreResult {
  /** Accessibility score from 0.00 to 100.00 */
  score: number;
  /** Change from previous scan (positive = improved) */
  scoreDelta: number | null;
  criticalCount: number;
  seriousCount: number;
  moderateCount: number;
  minorCount: number;
  pagesScanned: number;
}

/**
 * Redis progress object for real-time scan status updates.
 * Key format: scan:progress:{scanId}
 */
export interface ScanProgress {
  pagesScanned: number;
  pagesTotal: number;
  currentUrl: string;
}

/** Cancel message published to stop a running scan */
export interface ScanCancelMessage {
  scanId: string;
  orgId: string;
}

/** Default viewport configurations for responsive testing */
export const DEFAULT_VIEWPORTS: ViewportConfig[] = [
  { width: 1280, height: 800, label: 'desktop' },
  { width: 375, height: 667, label: 'mobile' },
];

/** Default scan configuration values */
export const DEFAULT_SCAN_CONFIG: Partial<ScanJobConfig> = {
  maxPages: 50,
  wcagLevel: 'AA',
  standards: ['WCAG22', 'IS17802'],
  excludePaths: ['/api/', '/admin/', '/_next/', '/static/'],
  viewports: DEFAULT_VIEWPORTS,
};
