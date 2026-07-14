/**
 * Scanner Module
 *
 * AccessShield India Website Accessibility Scanner engine.
 * Exports orchestrator router for API routes and worker for background processing.
 */

export { createScannerRouter, closeRabbitMQ } from './orchestrator';
// Worker exports live in ./worker — import directly from worker-entry.ts (not via this barrel;
// tsx fails when worker.ts is loaded through the API server bundle).
export {
  discoverUrls,
  discoverUrlsWithBrowser,
  isSameDomain,
  isExcluded,
  buildAbsoluteUrl,
} from './crawler';
export { createBrowser, scanPage, closeBrowser, injectAuth } from './playwright-runner';
export {
  runAxe,
  runAxeWithRetry,
  mapImpact,
  extractCriterion,
  computeFingerprint,
} from './axe-runner';
export { calculateScore, buildScanScoreResult, getScoreGrade, getScoreColor } from './score';

export type {
  ScanJobMessage,
  ScanJobConfig,
  RawViolation,
  PageScanResult,
  ScanScoreResult,
  ScanProgress,
  WcagLevel,
  ComplianceStandard,
  ScanType,
  ViewportConfig,
  LoginConfig,
  HeadingInfo,
} from './types';

export { DEFAULT_SCAN_CONFIG, DEFAULT_VIEWPORTS } from './types';
export { PLAN_SCAN_LIMITS } from '../lib/plan-limits';
