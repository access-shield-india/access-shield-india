/**
 * Page scan worker — consumes `page.scan` / `page.scan.auth`.
 * Analyzes pages and publishes `findings.persist` (does not write violations).
 * Enabled when SCAN_PIPELINE_V2_PAGE_WORKER=true.
 */

import amqp from 'amqplib';
import type { ConsumeMessage } from 'amqplib';
import { createDb, type Database } from '@accessshield/db';
import type { PageScanQueueMessage, ScanPipelineFinding } from '@accessshield/types';
import type { Browser } from 'playwright';
import { logger } from '../../lib/logger';
import { createBrowser, closeBrowser } from '../playwright-runner';
import { analyzePageUrl } from './analyze-page';
import {
  isScanCancelledInRedis,
  tryFinalizeScanFromPageJobs,
  updateProgressFromPageJobs,
  waitWhileScanPaused,
} from './finalize-from-page-jobs';
import { pageScanQueueMessageSchema } from './message-schemas';
import { markScanPageJobStatus } from './page-jobs';
import { publishFindingsPersistJob } from './publish';
import { enqueuePostFinalizeJobs } from './post-finalize';
import { SCAN_PIPELINE_V2_QUEUES } from './queues';
import { resolveScanConcurrency } from './auto-concurrency';

let db: Database | null = null;
let browser: Browser | null = null;
let rabbitConnection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
let rabbitChannel: Awaited<
  ReturnType<Awaited<ReturnType<typeof amqp.connect>>['createChannel']>
> | null = null;
let authRabbitChannel: Awaited<
  ReturnType<Awaited<ReturnType<typeof amqp.connect>>['createChannel']>
> | null = null;

function getDatabase(): Database {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not set');
    db = createDb(url);
  }
  return db;
}

async function ensureBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await createBrowser();
  }
  return browser;
}

async function maybeFinalizeAndSync(
  database: Database,
  params: { scanId: string; orgId: string; assetId: string },
): Promise<void> {
  const finalized = await tryFinalizeScanFromPageJobs(database, params);
  if (finalized) {
    await enqueuePostFinalizeJobs(database, {
      scanId: params.scanId,
      orgId: params.orgId,
      assetId: params.assetId,
    });
  }
}

async function processPageScanMessage(raw: PageScanQueueMessage): Promise<void> {
  const database = getDatabase();
  const { scanId, orgId, assetId, pageJobId, url, config } = raw;

  if (await isScanCancelledInRedis(scanId)) {
    await markScanPageJobStatus(database, {
      pageJobId,
      organisationId: orgId,
      status: 'cancelled',
      errorMessage: 'Cancelled by user',
    });
    await maybeFinalizeAndSync(database, { scanId, orgId, assetId });
    return;
  }

  await waitWhileScanPaused(scanId);

  if (await isScanCancelledInRedis(scanId)) {
    await markScanPageJobStatus(database, {
      pageJobId,
      organisationId: orgId,
      status: 'cancelled',
      errorMessage: 'Cancelled by user',
    });
    await maybeFinalizeAndSync(database, { scanId, orgId, assetId });
    return;
  }

  await markScanPageJobStatus(database, {
    pageJobId,
    organisationId: orgId,
    status: 'running',
    bumpAttempt: true,
  });

  await updateProgressFromPageJobs(database, scanId, orgId, url);

  try {
    const b = await ensureBrowser();
    const { violations: pageViolations } = await analyzePageUrl(
      b,
      url,
      config as Parameters<typeof analyzePageUrl>[2],
      assetId,
    );

    const findings: ScanPipelineFinding[] = pageViolations.map((v) => ({
      ruleId: v.ruleId,
      wcagCriterion: v.wcagCriterion,
      wcagLevel: v.wcagLevel,
      standard: v.standard,
      severity: v.severity,
      elementType: v.elementType,
      elementHtml: v.elementHtml,
      elementSelector: v.elementSelector,
      description: v.description,
      helpUrl: v.helpUrl,
      fingerprint: v.fingerprint,
      pageUrl: v.pageUrl,
    }));

    await publishFindingsPersistJob({
      scanId,
      orgId,
      assetId,
      pageJobId,
      findings,
      idempotencyKey: `${pageJobId}:persist`,
    });

    logger.info(
      { scanId, pageJobId, url, violationCount: findings.length },
      'page.scan analyzed — findings.persist published',
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown page scan error';
    logger.error({ err, scanId, pageJobId, url }, 'page.scan job failed');
    await markScanPageJobStatus(database, {
      pageJobId,
      organisationId: orgId,
      status: 'failed',
      errorMessage: message.substring(0, 1000),
    });
    await updateProgressFromPageJobs(database, scanId, orgId, url);
    await maybeFinalizeAndSync(database, { scanId, orgId, assetId });
  }
}

/**
 * Start consumers for page.scan and page.scan.auth.
 */
export async function startPageScanWorker(): Promise<void> {
  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    throw new Error('RABBITMQ_URL environment variable not set');
  }

  const conn = await amqp.connect(rabbitUrl);
  rabbitConnection = conn;
  const channel = await conn.createChannel();
  rabbitChannel = channel;

  await channel.assertQueue(SCAN_PIPELINE_V2_QUEUES.PAGE_SCAN, { durable: true });
  await channel.assertQueue(SCAN_PIPELINE_V2_QUEUES.PAGE_SCAN_AUTH, { durable: true });

  const publicPrefetch = resolveScanConcurrency();
  await channel.prefetch(publicPrefetch);

  const makeHandler =
    (ch: typeof channel) =>
    async (msg: ConsumeMessage | null): Promise<void> => {
      if (!msg) return;
      try {
        const parsed = pageScanQueueMessageSchema.safeParse(
          JSON.parse(msg.content.toString()) as unknown,
        );
        if (!parsed.success) {
          logger.error({ errors: parsed.error.flatten() }, 'Invalid page.scan message');
          ch.ack(msg);
          return;
        }
        await processPageScanMessage(parsed.data);
        ch.ack(msg);
      } catch (err) {
        logger.error({ err }, 'page.scan handler error');
        ch.ack(msg);
      }
    };

  // Separate channel for auth with prefetch 1 (sequential logged-in pages)
  const authChannel = await conn.createChannel();
  authRabbitChannel = authChannel;
  await authChannel.assertQueue(SCAN_PIPELINE_V2_QUEUES.PAGE_SCAN_AUTH, { durable: true });
  await authChannel.prefetch(1);

  await channel.consume(SCAN_PIPELINE_V2_QUEUES.PAGE_SCAN, makeHandler(channel));
  await authChannel.consume(SCAN_PIPELINE_V2_QUEUES.PAGE_SCAN_AUTH, makeHandler(authChannel));

  logger.info(
    {
      pageScanPrefetch: publicPrefetch,
      pageScanAuthPrefetch: 1,
      queues: [SCAN_PIPELINE_V2_QUEUES.PAGE_SCAN, SCAN_PIPELINE_V2_QUEUES.PAGE_SCAN_AUTH],
    },
    'Page scan worker started',
  );
}

export async function shutdownPageScanWorker(): Promise<void> {
  if (browser) {
    await closeBrowser(browser).catch(() => {});
    browser = null;
  }
  if (authRabbitChannel) {
    await authRabbitChannel.close().catch(() => {});
    authRabbitChannel = null;
  }
  if (rabbitChannel) {
    await rabbitChannel.close().catch(() => {});
    rabbitChannel = null;
  }
  if (rabbitConnection) {
    await rabbitConnection.close().catch(() => {});
    rabbitConnection = null;
  }
}
