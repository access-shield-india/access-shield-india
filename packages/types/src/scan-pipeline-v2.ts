/**
 * Scan Pipeline v2 — shared queue message types and enums.
 * Transport: MQ (RabbitMQ / SQS later). Coordination: Redis.
 * @see docs/architecture/v2/01-scan-pipeline-architecture.md
 */

/** Page job lifecycle (Postgres `scan_page_job_status`) */
export type ScanPageJobStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'skipped';

export const SCAN_PAGE_JOB_STATUSES: readonly ScanPageJobStatus[] = [
  'pending',
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
  'skipped',
] as const;

/** WCAG level for scan config */
export type ScanPipelineWcagLevel = 'A' | 'AA' | 'AAA';

/** Compliance standards for scan config */
export type ScanPipelineStandard = 'WCAG22' | 'IS17802' | 'GIGW3' | 'SEBI';

export interface ScanPipelineLoginConfig {
  url: string;
  usernameField: string;
  passwordField: string;
  usernameSecretArn: string;
  passwordSecretArn: string;
}

export interface ScanPipelineViewport {
  width: number;
  height: number;
  label: string;
}

/** Scan job configuration carried on MQ messages */
export interface ScanPipelineJobConfig {
  maxPages: number;
  wcagLevel: ScanPipelineWcagLevel;
  standards: ScanPipelineStandard[];
  loginConfig?: ScanPipelineLoginConfig;
  excludePaths: string[];
  viewports: ScanPipelineViewport[];
}

/** Base fields required on every v2 MQ message for multi-scan isolation */
export interface ScanPipelineMessageBase {
  scanId: string;
  orgId: string;
  assetId: string;
  /** Stable key for idempotent consumers */
  idempotencyKey: string;
}

/** `scan.jobs` — API → crawler */
export interface ScanJobsQueueMessage extends ScanPipelineMessageBase {
  assetUrl: string;
  config: ScanPipelineJobConfig;
}

/** `page.scan` / `page.scan.auth` — crawler → page scanner */
export interface PageScanQueueMessage extends ScanPipelineMessageBase {
  pageJobId: string;
  url: string;
  authRequired: boolean;
  config: ScanPipelineJobConfig;
}

/** Single finding payload for persist (mirrors scanner RawViolation shape) */
export interface ScanPipelineFinding {
  ruleId: string;
  wcagCriterion: string;
  wcagLevel: ScanPipelineWcagLevel;
  standard: ScanPipelineStandard;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  elementType: string;
  elementHtml: string;
  elementSelector: string;
  description: string;
  helpUrl: string;
  fingerprint: string;
  pageUrl: string;
}

/** `findings.persist` — scanner → persister */
export interface FindingsPersistQueueMessage extends ScanPipelineMessageBase {
  pageJobId: string;
  findings: ScanPipelineFinding[];
}

/** `scan.finalize` — barrier → finalizer */
export interface ScanFinalizeQueueMessage extends ScanPipelineMessageBase {}

/** `issues.sync` — after persist/finalize */
export interface IssuesSyncQueueMessage {
  scanId: string;
  orgId: string;
  idempotencyKey: string;
}

/** `ai.enrich` — fan-out eligible violations */
export interface AiEnrichQueueMessage {
  scanId: string;
  orgId: string;
  planTier: string;
  idempotencyKey: string;
}

/** `ai.alt-text` */
export interface AiAltTextQueueMessage {
  violationId: string;
  orgId: string;
  planTier: string;
  assetId: string;
  imageSelector: string;
  pageUrl: string;
  elementHtml: string;
  idempotencyKey: string;
}

/** `ai.fix` */
export interface AiFixQueueMessage {
  violationId: string;
  orgId: string;
  planTier: string;
  ruleId: string;
  elementHtml: string;
  wcagCriterion: string;
  pageUrl: string;
  description: string;
  idempotencyKey: string;
}

/** `report.generate` */
export interface ReportGenerateQueueMessage {
  scanId: string;
  orgId: string;
  assetId: string;
  reportType: string;
  format?: 'pdf' | 'html';
  generatedBy?: string | null;
  idempotencyKey: string;
}

/** `scan.cancellations` */
export interface ScanCancellationQueueMessage {
  scanId: string;
  orgId: string;
}

/** Durable MQ queue names (v2). Broker: RabbitMQ now; SQS-compatible later. */
export const SCAN_PIPELINE_V2_QUEUES = {
  SCAN_JOBS: 'scan.jobs',
  PAGE_SCAN: 'page.scan',
  PAGE_SCAN_AUTH: 'page.scan.auth',
  FINDINGS_PERSIST: 'findings.persist',
  ISSUES_SYNC: 'issues.sync',
  SCAN_FINALIZE: 'scan.finalize',
  AI_ENRICH: 'ai.enrich',
  AI_ALT_TEXT: 'ai.alt-text',
  AI_FIX: 'ai.fix',
  REPORT_GENERATE: 'report.generate',
  SCAN_CANCELLATIONS: 'scan.cancellations',
  /** v1 compat — monolith worker still consumes this until Phase 5 */
  SCANS_V1: 'scans',
} as const;

export type ScanPipelineV2QueueName =
  (typeof SCAN_PIPELINE_V2_QUEUES)[keyof typeof SCAN_PIPELINE_V2_QUEUES];
