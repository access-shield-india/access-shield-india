/**
 * Crawler worker — consumes `scan.jobs`, streams URLs to page.scan queues.
 * Enabled when SCAN_PIPELINE_V2_SCAN_JOBS=true (implies page workers).
 */

import amqp from 'amqplib';
import type { ConsumeMessage } from 'amqplib';
import { and, eq } from 'drizzle-orm';
import { createDb, scans, type Database } from '@accessshield/db';
import type { ScanJobsQueueMessage } from '@accessshield/types';
import type { Browser } from 'playwright';
import { logger } from '../../lib/logger';
import { discoverUrlsStreaming } from '../crawler';
import { createBrowser, closeBrowser } from '../playwright-runner';
import type { ScanJobConfig } from '../types';
import { setScanBarrier } from './barrier';
import { isScanCancelledInRedis, waitWhileScanPaused } from './finalize-from-page-jobs';
import { scanJobsQueueMessageSchema } from './message-schemas';
import { upsertScanPageJob } from './page-jobs';
import { publishPageScanJob } from './publish';
import { SCAN_PIPELINE_V2_QUEUES } from './queues';
import { normalizeScanPageUrl, pageScanIdempotencyKey } from './url';

let db: Database | null = null;
let rabbitConnection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
let rabbitChannel: Awaited<
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

async function processScanJobsMessage(msg: ScanJobsQueueMessage): Promise<void> {
  const database = getDatabase();
  const { scanId, orgId, assetId, assetUrl, config } = msg;
  let browser: Browser | null = null;

  logger.info({ scanId, assetUrl }, 'Crawler starting scan.jobs');

  await database
    .update(scans)
    .set({
      status: 'running',
      startedAt: new Date().toISOString(),
    })
    .where(and(eq(scans.id, scanId), eq(scans.organisationId, orgId)));

  await setScanBarrier(scanId, { crawlDone: false, discovered: 0 });

  if (await isScanCancelledInRedis(scanId)) {
    logger.info({ scanId }, 'Scan cancelled before crawl');
    return;
  }

  const authRequired = Boolean(config.loginConfig);
  let discovered = 0;

  try {
    browser = await createBrowser();

    discovered = await discoverUrlsStreaming(
      browser,
      assetUrl,
      config as ScanJobConfig,
      async (url, meta) => {
        if (await isScanCancelledInRedis(scanId)) {
          return;
        }
        await waitWhileScanPaused(scanId);
        if (await isScanCancelledInRedis(scanId)) {
          return;
        }

        const { id: pageJobId } = await upsertScanPageJob(database, {
          organisationId: orgId,
          scanId,
          assetId,
          url,
          authRequired,
          status: 'queued',
        });

        await publishPageScanJob({
          scanId,
          orgId,
          assetId,
          pageJobId,
          url,
          authRequired,
          config,
          idempotencyKey: pageScanIdempotencyKey(scanId, normalizeScanPageUrl(url)),
        });

        await setScanBarrier(scanId, { crawlDone: false, discovered: meta.index });
      },
    );

    await setScanBarrier(scanId, { crawlDone: true, discovered });

    if (discovered === 0) {
      await database
        .update(scans)
        .set({
          status: 'failed',
          completedAt: new Date().toISOString(),
          errorMessage: 'No pages discovered to scan',
        })
        .where(and(eq(scans.id, scanId), eq(scans.organisationId, orgId)));
    }

    logger.info({ scanId, discovered, authRequired }, 'Crawler finished streaming page jobs');
  } catch (err) {
    logger.error({ err, scanId }, 'Crawler scan.jobs failed');
    await database
      .update(scans)
      .set({
        status: 'failed',
        completedAt: new Date().toISOString(),
        errorMessage: (err instanceof Error ? err.message : 'Crawl failed').substring(0, 1000),
      })
      .where(and(eq(scans.id, scanId), eq(scans.organisationId, orgId)));
    await setScanBarrier(scanId, { crawlDone: true, discovered });
  } finally {
    if (browser) {
      await closeBrowser(browser).catch(() => {});
    }
  }
}

export async function startCrawlerWorker(): Promise<void> {
  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    throw new Error('RABBITMQ_URL environment variable not set');
  }

  const conn = await amqp.connect(rabbitUrl);
  rabbitConnection = conn;
  const channel = await conn.createChannel();
  rabbitChannel = channel;

  await channel.assertQueue(SCAN_PIPELINE_V2_QUEUES.SCAN_JOBS, { durable: true });
  await channel.prefetch(1);

  await channel.consume(SCAN_PIPELINE_V2_QUEUES.SCAN_JOBS, async (msg: ConsumeMessage | null) => {
    if (!msg) return;
    try {
      const parsed = scanJobsQueueMessageSchema.safeParse(
        JSON.parse(msg.content.toString()) as unknown,
      );
      if (!parsed.success) {
        logger.error({ errors: parsed.error.flatten() }, 'Invalid scan.jobs message');
        channel.ack(msg);
        return;
      }
      await processScanJobsMessage(parsed.data);
      channel.ack(msg);
    } catch (err) {
      logger.error({ err }, 'scan.jobs handler error');
      channel.ack(msg);
    }
  });

  logger.info({ queue: SCAN_PIPELINE_V2_QUEUES.SCAN_JOBS }, 'Crawler worker started');
}

export async function shutdownCrawlerWorker(): Promise<void> {
  if (rabbitChannel) {
    await rabbitChannel.close().catch(() => {});
    rabbitChannel = null;
  }
  if (rabbitConnection) {
    await rabbitConnection.close().catch(() => {});
    rabbitConnection = null;
  }
}
