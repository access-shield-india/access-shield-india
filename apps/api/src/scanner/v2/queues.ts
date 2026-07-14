/**
 * Scan Pipeline v2 — MQ queue names and feature flags.
 * Re-exports shared constants; local helpers for the api package.
 */

import { SCAN_PIPELINE_V2_QUEUES } from '@accessshield/types';

export { SCAN_PIPELINE_V2_QUEUES };

/** All durable v2 queues that workers should assert on startup */
export const SCAN_PIPELINE_V2_QUEUE_LIST = Object.values(SCAN_PIPELINE_V2_QUEUES);

/**
 * When true, crawler/page path may publish to `page.scan` and a dedicated
 * consumer can process page jobs. Default false — v1 monolith still owns the job.
 */
export function isScanPipelineV2PageWorkerEnabled(): boolean {
  return process.env.SCAN_PIPELINE_V2_PAGE_WORKER === 'true';
}

/**
 * When true, API publishes to `scan.jobs` instead of v1 `scans`.
 * Crawler worker streams URLs to page.scan. Implies page/persist/issues workers.
 */
export function isScanPipelineV2ScanJobsEnabled(): boolean {
  return process.env.SCAN_PIPELINE_V2_SCAN_JOBS === 'true';
}

/** True if any v2 worker path should start (page pipeline and/or crawl pipeline). */
export function isScanPipelineV2Enabled(): boolean {
  return isScanPipelineV2PageWorkerEnabled() || isScanPipelineV2ScanJobsEnabled();
}
