/**
 * Worker Entry Point
 *
 * Standalone entry point for running the scan worker process.
 * Used for local development and ECS/container deployment.
 *
 * Usage: pnpm --filter @accessshield/api dev:worker
 *
 * V2 flags:
 * - SCAN_PIPELINE_V2_PAGE_WORKER=true — page + persist + issues + AI + reports
 * - SCAN_PIPELINE_V2_SCAN_JOBS=true — crawler on scan.jobs; skips monolith `scans` consumer
 * - SCAN_PIPELINE_V2_AUTO_REPORT=true — enqueue technical PDF after finalize
 */

import { loadLocalEnv } from '../config/env';

loadLocalEnv();

import { logger } from '../lib/logger';
import { shutdown, startWorker } from './worker';
import {
  isScanPipelineV2Enabled,
  isScanPipelineV2ScanJobsEnabled,
} from './v2/queues';
import { shutdownPageScanWorker, startPageScanWorker } from './v2/page-scan-worker';
import {
  shutdownFindingsPersistWorker,
  startFindingsPersistWorker,
} from './v2/findings-persist-worker';
import { shutdownIssuesSyncWorker, startIssuesSyncWorker } from './v2/issues-sync-worker';
import { shutdownCrawlerWorker, startCrawlerWorker } from './v2/crawler-worker';
import { shutdownAiEnrichWorker, startAiEnrichWorker } from './v2/ai-enrich-worker';
import {
  shutdownAiRemediationWorkers,
  startAiRemediationWorkers,
} from './v2/ai-remediation-worker';
import {
  shutdownReportGenerateWorker,
  startReportGenerateWorker,
} from './v2/report-generate-worker';

import { startWidgetAnalyticsRollupJob } from '../jobs/widget-analytics-rollup';
import { createDb } from '@accessshield/db';
import Redis from 'ioredis';

logger.info('Starting AccessShield scan worker...');

let stopAnalyticsRollup: (() => void) | null = null;

const gracefulShutdown = async () => {
  stopAnalyticsRollup?.();
  if (isScanPipelineV2Enabled()) {
    await shutdownCrawlerWorker();
    await shutdownPageScanWorker();
    await shutdownFindingsPersistWorker();
    await shutdownIssuesSyncWorker();
    await shutdownAiEnrichWorker();
    await shutdownAiRemediationWorkers();
    await shutdownReportGenerateWorker();
  }
  await shutdown();
  process.exit(0);
};

process.on('SIGTERM', () => void gracefulShutdown());
process.on('SIGINT', () => void gracefulShutdown());

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;
  if (databaseUrl && redisUrl) {
    const db = createDb(databaseUrl);
    const redis = new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
    await redis.connect();
    stopAnalyticsRollup = startWidgetAnalyticsRollupJob(db, redis);
  }

  if (isScanPipelineV2Enabled()) {
    logger.info(
      {
        scanJobs: isScanPipelineV2ScanJobsEnabled(),
      },
      'Starting v2 pipeline workers',
    );
    if (isScanPipelineV2ScanJobsEnabled()) {
      await startCrawlerWorker();
    }
    await startPageScanWorker();
    await startFindingsPersistWorker();
    await startIssuesSyncWorker();
    await startAiEnrichWorker();
    await startAiRemediationWorkers();
    await startReportGenerateWorker();
  }

  // Full v2 crawl path: API publishes only to scan.jobs — skip monolith consumer
  if (isScanPipelineV2ScanJobsEnabled()) {
    logger.info(
      'SCAN_PIPELINE_V2_SCAN_JOBS=true — monolith `scans` consumer disabled (deprecated path)',
    );
    return;
  }

  await startWorker();
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start scan worker');
  process.exit(1);
});
