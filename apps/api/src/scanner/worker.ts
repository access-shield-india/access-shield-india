/**
 * Scan Worker
 *
 * RabbitMQ consumer that processes scan jobs. Implements the full
 * scanning pipeline: URL discovery, page scanning, axe-core analysis,
 * S3 uploads, database persistence, and AI enrichment queue publishing.
 *
 * Can run as:
 * - Long-lived process for local dev / ECS (startWorker)
 * - Lambda handler for AWS Lambda (handler)
 */

import amqp from 'amqplib';
import type { ConsumeMessage } from 'amqplib';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import Redis from 'ioredis';
import {
  createDb,
  type Database,
  scans,
  violations,
  assets,
  organisations,
} from '@accessshield/db';
import { eq, and, desc } from 'drizzle-orm';
import type { Browser } from 'playwright';
import { logger } from '../lib/logger';
import { getSharedS3Client } from '../lib/s3-client';
import { runAxeWithRetry, getAltTextCandidates, getFixCandidates } from './axe-runner';
import { createConcurrencyLimit } from './concurrency';
import { discoverUrlsWithBrowser } from './crawler';
import { createBrowser, scanPage, closeScanContext, closeBrowser } from './playwright-runner';
import { runGIGWChecks } from './rules/gigw';
import { runIS17802Rules } from './rules/is17802';
import { buildScanScoreResult } from './score';
import type { RawViolation, ScanJobMessage, ScanProgress, ScanCancelMessage } from './types';
import { syncIssuesFromViolations } from '../services/issue-sync';
import { markScanPageJobStatus, upsertScanPageJob } from './v2/page-jobs';
import { isScanPipelineV2PageWorkerEnabled } from './v2/queues';
import { publishPageScanJob } from './v2/publish';
import { pageScanIdempotencyKey, normalizeScanPageUrl } from './v2/url';
import { resolveScanConcurrency } from './v2/auto-concurrency';
import { setScanBarrier } from './v2/barrier';

/** Concurrent page scan limit — SCAN_CONCURRENT_PAGES or auto from CPU/RAM */
const CONCURRENT_PAGES = resolveScanConcurrency();

/** Screenshots are expensive and not persisted yet — opt in with SCAN_SCREENSHOTS=true */
const SCREENSHOTS_ENABLED = process.env.SCAN_SCREENSHOTS === 'true';

/** RabbitMQ queue names */
const SCANS_QUEUE = 'scans';
const CANCEL_QUEUE = 'scan_cancellations';
const AI_ALT_TEXT_QUEUE = 'ai.alt-text';
const AI_FIX_QUEUE = 'ai.fix';

/** Redis key TTL in seconds */
const PROGRESS_TTL = 3600;

/** Max retries for RabbitMQ connection */
const MAX_CONNECTION_RETRIES = 10;

/** Retry delay in ms */
const RETRY_DELAY = 5000;

/** Set of cancelled scan IDs */
const cancelledScans = new Set<string>();

/** Redis client instance */
let redisClient: Redis | null = null;

/** Database instance */
let dbInstance: Database | null = null;

/** RabbitMQ connection and channel */
type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;
type AmqpChannel = Awaited<ReturnType<AmqpConnection['createChannel']>>;

let rabbitConnection: AmqpConnection | null = null;
let rabbitChannel: AmqpChannel | null = null;

/**
 * Initialize Redis client.
 */
function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable not set');
    }
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }
  return redisClient;
}

/**
 * Initialize database connection.
 */
function getDatabase(): Database {
  if (!dbInstance) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable not set');
    }
    dbInstance = createDb(databaseUrl);
  }
  return dbInstance;
}

/**
 * Upload screenshot to S3.
 *
 * @param buffer - Screenshot buffer
 * @param orgId - Organization ID
 * @param scanId - Scan ID
 * @param filename - Screenshot filename
 * @returns S3 URL or null on failure
 */
async function uploadScreenshot(
  buffer: Buffer,
  orgId: string,
  scanId: string,
  filename: string,
): Promise<string | null> {
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    logger.warn('S3_BUCKET_NAME not set, skipping screenshot upload');
    return null;
  }

  const key = `scans/${orgId}/${scanId}/${filename}`;

  try {
    const s3 = getSharedS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: 'image/png',
        CacheControl: 'max-age=31536000',
      }),
    );

    const cloudfrontUrl = process.env.CLOUDFRONT_URL;
    if (cloudfrontUrl) {
      return `${cloudfrontUrl}/${key}`;
    }

    return `https://${bucketName}.s3.${process.env.AWS_REGION ?? 'ap-south-1'}.amazonaws.com/${key}`;
  } catch (err) {
    logger.error({ err, key }, 'Failed to upload screenshot to S3');
    return null;
  }
}

/**
 * Update scan progress in Redis.
 */
async function updateProgress(
  scanId: string,
  pagesScanned: number,
  pagesTotal: number,
  currentUrl: string,
): Promise<void> {
  const redis = getRedisClient();
  const progress: ScanProgress = { pagesScanned, pagesTotal, currentUrl };

  try {
    await redis.setex(`scan:progress:${scanId}`, PROGRESS_TTL, JSON.stringify(progress));
    const { publishRealtime } = await import('../lib/realtime/publish');
    await publishRealtime(
      `scan:${scanId}`,
      'UPDATE',
      'scans',
      {
        id: scanId,
        status: 'running',
        pagesScanned,
        pagesTotal,
        progress: { pagesTotal, currentUrl },
        score: null,
      },
      redis,
    );
  } catch (err) {
    logger.warn({ err, scanId }, 'Failed to update progress in Redis');
  }
}

/**
 * Delete scan progress from Redis.
 */
async function clearProgress(scanId: string): Promise<void> {
  const redis = getRedisClient();

  try {
    await redis.del(`scan:progress:${scanId}`);
  } catch (err) {
    logger.warn({ err, scanId }, 'Failed to clear progress from Redis');
  }
}

/**
 * Publish message to AI enrichment queue.
 */
async function publishToAIQueue(queueName: string, message: unknown): Promise<void> {
  if (!rabbitChannel) {
    logger.warn({ queueName }, 'RabbitMQ channel not available for AI queue');
    return;
  }

  try {
    await rabbitChannel.assertQueue(queueName, { durable: true });
    rabbitChannel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
  } catch (err) {
    logger.warn({ err, queueName }, 'Failed to publish to AI queue');
  }
}

/**
 * Generate a URL-safe slug from page URL.
 */
function urlToSlug(url: string): string {
  try {
    const parsed = new URL(url);
    let slug = parsed.pathname
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .substring(0, 50);

    if (!slug) {
      slug = 'homepage';
    }

    return slug;
  } catch {
    return 'page';
  }
}

/**
 * Check if scan has been cancelled.
 */
function isScanCancelled(scanId: string): boolean {
  return cancelledScans.has(scanId);
}

/**
 * Process a single scan job.
 *
 * Steps:
 * 1. Update status to 'running'
 * 2. Discover URLs via sitemap or crawling
 * 3. Scan pages with Playwright + axe-core (parallel, max 3)
 * 4. Upload screenshots to S3
 * 5. Deduplicate violations
 * 6. Publish to AI enrichment queues
 * 7. Batch insert violations to DB
 * 8. Calculate and save score
 * 9. Update status to 'completed'
 *
 * @param message - Scan job message from queue
 */
async function processScanJob(message: ScanJobMessage): Promise<void> {
  const { scanId, assetId, orgId, assetUrl, config } = message;
  const db = getDatabase();
  let browser: Browser | null = null;

  logger.info({ scanId, assetId, orgId, assetUrl }, 'Starting scan job');

  try {
    await db
      .update(scans)
      .set({
        status: 'running',
        startedAt: new Date().toISOString(),
      })
      .where(and(eq(scans.id, scanId), eq(scans.organisationId, orgId)));

    browser = await createBrowser();

    const urls = await discoverUrlsWithBrowser(browser, assetUrl, config);

    logger.info({ scanId, urlCount: urls.length }, 'URL discovery complete');

    // Pipeline v2: record page jobs for multi-scan tracking (best-effort; scan continues if table missing)
    const pageJobIdsByUrl = new Map<string, string>();
    for (const url of urls) {
      try {
        const { id } = await upsertScanPageJob(db, {
          organisationId: orgId,
          scanId,
          assetId,
          url,
          authRequired: Boolean(config.loginConfig),
          status: 'queued',
        });
        pageJobIdsByUrl.set(url, id);
      } catch (err) {
        logger.warn({ err, scanId, url }, 'Failed to upsert scan_page_job (is migration 0005 applied?)');
      }
    }

    // Pipeline v2: fan-out page jobs to page.scan workers (requires page worker running)
    if (isScanPipelineV2PageWorkerEnabled()) {
      if (pageJobIdsByUrl.size === 0) {
        throw new Error(
          'SCAN_PIPELINE_V2_PAGE_WORKER is enabled but no page jobs were created. Apply migration 0005.',
        );
      }

      for (const url of urls) {
        const pageJobId = pageJobIdsByUrl.get(url);
        if (!pageJobId) continue;

        await publishPageScanJob({
          scanId,
          orgId,
          assetId,
          pageJobId,
          url,
          authRequired: Boolean(config.loginConfig),
          config,
          idempotencyKey: pageScanIdempotencyKey(scanId, normalizeScanPageUrl(url)),
        });
      }

      await setScanBarrier(scanId, { crawlDone: true, discovered: urls.length });

      await closeBrowser(browser);
      browser = null;
      await updateProgress(scanId, 0, urls.length, '');

      logger.info(
        { scanId, pageCount: urls.length },
        'Scan fanned out to page.scan workers (v2 pipeline)',
      );
      return;
    }

    await updateProgress(scanId, 0, urls.length, '');

    if (isScanCancelled(scanId)) {
      logger.info({ scanId }, 'Scan cancelled before page scanning');
      return;
    }

    const allViolations: RawViolation[] = [];
    const limit = createConcurrencyLimit(CONCURRENT_PAGES);
    let pagesScanned = 0;
    let pagesFailed = 0;
    const pageFailureMessages: string[] = [];

    const scanPromises = urls.map((url, index) =>
      limit(async () => {
        if (isScanCancelled(scanId)) {
          return;
        }

        const pageSlug = urlToSlug(url);
        const pageJobId = pageJobIdsByUrl.get(url);

        try {
          if (pageJobId) {
            await markScanPageJobStatus(db, {
              pageJobId,
              organisationId: orgId,
              status: 'running',
              bumpAttempt: true,
            }).catch((err) => {
              logger.warn({ err, scanId, pageJobId }, 'Failed to mark page job running');
            });
          }

          await updateProgress(scanId, pagesScanned, urls.length, url);

          const { page, context, desktopScreenshot, mobileScreenshot } = await scanPage(
            browser!,
            url,
            config,
          );

          const pageViolations = await runAxeWithRetry(page, config, assetId, url);

          if (config.standards.includes('IS17802')) {
            const isViolations = await runIS17802Rules(page, url, assetId);
            pageViolations.push(...isViolations);
          }

          if (config.standards.includes('GIGW3')) {
            const gigwViolations = await runGIGWChecks(page, url, assetId, config);
            pageViolations.push(...gigwViolations);
          }

          await closeScanContext(context);

          if (SCREENSHOTS_ENABLED) {
            if (desktopScreenshot) {
              await uploadScreenshot(desktopScreenshot, orgId, scanId, `${pageSlug}-desktop.png`);
            }

            if (mobileScreenshot) {
              await uploadScreenshot(mobileScreenshot, orgId, scanId, `${pageSlug}-mobile.png`);
            }
          }

          for (const violation of pageViolations) {
            allViolations.push(violation);
          }

          pagesScanned++;
          await updateProgress(scanId, pagesScanned, urls.length, url);

          if (pageJobId) {
            await markScanPageJobStatus(db, {
              pageJobId,
              organisationId: orgId,
              status: 'completed',
            }).catch((err) => {
              logger.warn({ err, scanId, pageJobId }, 'Failed to mark page job completed');
            });
          }

          logger.info(
            {
              scanId,
              url,
              pageIndex: index + 1,
              totalPages: urls.length,
              violationCount: pageViolations.length,
            },
            'Page scan complete',
          );
        } catch (err) {
          pagesFailed++;
          const message = err instanceof Error ? err.message : 'Unknown page scan error';
          pageFailureMessages.push(`${url}: ${message}`);
          logger.error({ err, scanId, url }, 'Page scan failed');

          if (pageJobId) {
            await markScanPageJobStatus(db, {
              pageJobId,
              organisationId: orgId,
              status: 'failed',
              errorMessage: message.substring(0, 1000),
            }).catch((markErr) => {
              logger.warn({ err: markErr, scanId, pageJobId }, 'Failed to mark page job failed');
            });
          }
        }
      }),
    );

    await Promise.all(scanPromises);

    await closeBrowser(browser);
    browser = null;

    if (isScanCancelled(scanId)) {
      logger.info({ scanId }, 'Scan cancelled after page scanning');
      return;
    }

    if (pagesScanned === 0 && urls.length > 0) {
      const summary =
        pageFailureMessages.slice(0, 3).join('; ') ||
        'No pages could be analyzed. Check site availability and scanner logs.';
      throw new Error(`All ${urls.length} page(s) failed to scan. ${summary}`.substring(0, 1000));
    }

    const seenFingerprints = new Set<string>();
    const deduplicatedViolations: RawViolation[] = [];

    for (const violation of allViolations) {
      if (!seenFingerprints.has(violation.fingerprint)) {
        seenFingerprints.add(violation.fingerprint);
        deduplicatedViolations.push(violation);
      }
    }

    logger.info(
      {
        scanId,
        totalViolations: allViolations.length,
        deduplicatedViolations: deduplicatedViolations.length,
      },
      'Violation deduplication complete',
    );

    const altTextFingerprints = new Set(
      getAltTextCandidates(deduplicatedViolations).map((v) => v.fingerprint),
    );
    const fixFingerprints = new Set(
      getFixCandidates(deduplicatedViolations).map((v) => v.fingerprint),
    );

    const [orgRow] = await db
      .select({ planTier: organisations.planTier })
      .from(organisations)
      .where(eq(organisations.id, orgId))
      .limit(1);
    const planTier = orgRow?.planTier ?? 'starter';

    const BATCH_SIZE = 500;
    for (let i = 0; i < deduplicatedViolations.length; i += BATCH_SIZE) {
      const batch = deduplicatedViolations.slice(i, i + BATCH_SIZE);

      const inserted = await db
        .insert(violations)
        .values(
          batch.map((v) => ({
            organisationId: orgId,
            scanId,
            ruleId: v.ruleId,
            impact: v.severity,
            description: v.description,
            helpUrl: v.helpUrl,
            wcagCriteria: [v.wcagCriterion],
            selector: v.elementSelector,
            html: v.elementHtml,
            pageUrl: v.pageUrl,
            fingerprint: v.fingerprint,
          })),
        )
        .onConflictDoNothing({
          target: [violations.scanId, violations.fingerprint],
        })
        .returning({
          id: violations.id,
          ruleId: violations.ruleId,
          html: violations.html,
          pageUrl: violations.pageUrl,
        });

      logger.info({ scanId, batchStart: i, batchSize: batch.length }, 'Violation batch inserted');

      for (let j = 0; j < batch.length; j++) {
        const source = batch[j];
        const row = inserted[j];
        if (!source || !row) {
          continue;
        }

        if (altTextFingerprints.has(source.fingerprint)) {
          await publishToAIQueue(AI_ALT_TEXT_QUEUE, {
            violationId: row.id,
            orgId,
            planTier,
            assetId,
            imageSelector: source.elementSelector,
            pageUrl: source.pageUrl,
            elementHtml: source.elementHtml,
          });
        }

        if (fixFingerprints.has(source.fingerprint)) {
          await publishToAIQueue(AI_FIX_QUEUE, {
            violationId: row.id,
            orgId,
            planTier,
            ruleId: source.ruleId,
            elementHtml: source.elementHtml,
            wcagCriterion: source.wcagCriterion,
            pageUrl: source.pageUrl,
            description: source.description,
          });
        }
      }
    }

    await syncIssuesFromViolations(db, orgId, scanId);

    const [previousScan] = await db
      .select({ id: scans.id })
      .from(scans)
      .where(
        and(
          eq(scans.assetId, assetId),
          eq(scans.organisationId, orgId),
          eq(scans.status, 'completed'),
        ),
      )
      .orderBy(desc(scans.completedAt))
      .limit(1);

    const scoreResult = await buildScanScoreResult(
      deduplicatedViolations,
      pagesScanned,
      previousScan?.id ?? null,
      db,
      orgId,
    );

    const partialFailureNote =
      pagesFailed > 0 ? `${pagesFailed} of ${urls.length} page(s) could not be analyzed.` : null;

    await db
      .update(scans)
      .set({
        status: 'completed',
        completedAt: new Date().toISOString(),
        score: Math.round(scoreResult.score),
        violationCount: deduplicatedViolations.length,
        pagesScanned,
        errorMessage: partialFailureNote,
      })
      .where(and(eq(scans.id, scanId), eq(scans.organisationId, orgId)));

    await db
      .update(assets)
      .set({ lastScannedAt: new Date().toISOString() })
      .where(and(eq(assets.id, assetId), eq(assets.organisationId, orgId)));

    await clearProgress(scanId);

    logger.info(
      {
        scanId,
        assetId,
        pagesScanned,
        violationCount: deduplicatedViolations.length,
        score: scoreResult.score,
        scoreDelta: scoreResult.scoreDelta,
      },
      'Scan job completed successfully',
    );
  } catch (err) {
    logger.error({ err, scanId, orgId }, 'Scan job failed');

    if (browser) {
      await closeBrowser(browser).catch(() => {});
    }

    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    await db
      .update(scans)
      .set({
        status: 'failed',
        errorMessage: errorMessage.substring(0, 1000),
      })
      .where(and(eq(scans.id, scanId), eq(scans.organisationId, orgId)));

    await clearProgress(scanId);

    throw err;
  }
}

/**
 * Handle cancel message from queue.
 */
function handleCancelMessage(msg: ConsumeMessage): void {
  try {
    const message = JSON.parse(msg.content.toString()) as ScanCancelMessage;
    cancelledScans.add(message.scanId);
    logger.info({ scanId: message.scanId }, 'Scan cancellation registered');

    setTimeout(() => {
      cancelledScans.delete(message.scanId);
    }, 3600000);
  } catch (err) {
    logger.error({ err }, 'Failed to parse cancel message');
  }
}

/**
 * Start the worker process.
 * Connects to RabbitMQ and consumes scan jobs.
 *
 * For local development and ECS deployment.
 */
export async function startWorker(): Promise<void> {
  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    throw new Error('RABBITMQ_URL environment variable not set');
  }

  let retries = 0;

  while (retries < MAX_CONNECTION_RETRIES) {
    try {
      logger.info(
        { attempt: retries + 1, maxRetries: MAX_CONNECTION_RETRIES },
        'Connecting to RabbitMQ',
      );

      const conn = await amqp.connect(rabbitUrl);
      rabbitConnection = conn;
      const channel = await conn.createChannel();
      rabbitChannel = channel;

      await channel.assertQueue(SCANS_QUEUE, { durable: true });
      await channel.assertQueue(CANCEL_QUEUE, { durable: true });
      await channel.assertQueue(AI_ALT_TEXT_QUEUE, { durable: true });
      await channel.assertQueue(AI_FIX_QUEUE, { durable: true });

      await channel.prefetch(1);

      const redis = getRedisClient();
      await redis.connect();

      logger.info('Scan worker started, waiting for jobs');

      await channel.consume(CANCEL_QUEUE, (msg) => {
        if (msg && rabbitChannel) {
          handleCancelMessage(msg);
          rabbitChannel.ack(msg);
        }
      });

      await channel.consume(SCANS_QUEUE, async (msg) => {
        if (!msg) return;

        try {
          const message = JSON.parse(msg.content.toString()) as ScanJobMessage;

          if (isScanCancelled(message.scanId)) {
            logger.info({ scanId: message.scanId }, 'Skipping cancelled scan job');
            if (rabbitChannel) rabbitChannel.ack(msg);
            return;
          }

          await processScanJob(message);
          if (rabbitChannel) rabbitChannel.ack(msg);
        } catch (err) {
          logger.error({ err }, 'Scan job processing failed');
          if (rabbitChannel) rabbitChannel.ack(msg);
        }
      });

      conn.on('close', () => {
        logger.error('RabbitMQ connection closed, attempting reconnect');
        rabbitConnection = null;
        rabbitChannel = null;
        setTimeout(() => startWorker(), RETRY_DELAY);
      });

      conn.on('error', (err) => {
        logger.error({ err }, 'RabbitMQ connection error');
      });

      break;
    } catch (err) {
      retries++;
      logger.error(
        { err, attempt: retries, maxRetries: MAX_CONNECTION_RETRIES },
        'Failed to connect to RabbitMQ',
      );

      if (retries >= MAX_CONNECTION_RETRIES) {
        throw new Error('Max RabbitMQ connection retries exceeded');
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

/**
 * AWS Lambda handler for processing scan jobs.
 * Receives scan job message directly from Lambda event.
 *
 * @param event - Lambda event containing scan job message
 */
export async function handler(event: {
  body?: string;
  Records?: Array<{ body: string }>;
}): Promise<void> {
  let messageBody: string;

  const firstRecord = event.Records?.[0];
  if (firstRecord) {
    messageBody = firstRecord.body;
  } else if (event.body) {
    messageBody = event.body;
  } else {
    throw new Error('No message body found in event');
  }

  const message = JSON.parse(messageBody) as ScanJobMessage;

  logger.info({ scanId: message.scanId, assetId: message.assetId }, 'Lambda handler invoked');

  try {
    await processScanJob(message);
  } catch (err) {
    logger.error({ err, scanId: message.scanId }, 'Lambda scan job failed');
    throw err;
  }
}

/**
 * Gracefully shutdown the worker.
 */
export async function shutdown(): Promise<void> {
  logger.info('Shutting down scan worker');

  if (rabbitChannel) {
    await rabbitChannel.close().catch(() => {});
  }

  if (rabbitConnection) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (rabbitConnection as any).close().catch(() => {});
  }

  if (redisClient) {
    await redisClient.quit().catch(() => {});
  }

  logger.info('Scan worker shutdown complete');
}
