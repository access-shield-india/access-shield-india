/**
 * Mobile Scanner Worker
 *
 * RabbitMQ consumer that processes mobile scan jobs. Implements the full
 * scanning pipeline: Appium session creation, screen traversal, accessibility
 * analysis, database persistence, and status updates.
 */

import type { Browser } from 'webdriverio';
import { scans, violations, assets, eq, and } from '@accessshield/db';
import { logger } from './lib/logger.js';
import { getDatabase } from './lib/db.js';
import { getRedisClient, connectRedis, closeRedis } from './lib/redis.js';
import { consumeMobileScanJobs, closeQueue } from './queue.js';
import { deviceManager } from './device-manager.js';
import { TraversalAgent } from './traversal-agent.js';
import { MobileRuleEngine, calculateScore, countBySeverity } from './rule-engine.js';
import type { MobileScanJobMessage, MobileViolation, MobileScanProgress } from './types.js';

const PROGRESS_TTL = 3600;
const MAX_CONNECTION_RETRIES = 10;
const RETRY_DELAY = 5000;

async function updateProgress(scanId: string, progress: MobileScanProgress): Promise<void> {
  const redis = getRedisClient();
  try {
    await redis.setex(`mobile-scan:progress:${scanId}`, PROGRESS_TTL, JSON.stringify(progress));
  } catch (err) {
    logger.warn({ err, scanId }, 'Failed to update progress in Redis');
  }
}

async function clearProgress(scanId: string): Promise<void> {
  const redis = getRedisClient();
  try {
    await redis.del(`mobile-scan:progress:${scanId}`);
  } catch (err) {
    logger.warn({ err, scanId }, 'Failed to clear progress from Redis');
  }
}

async function processMobileScanJob(message: MobileScanJobMessage): Promise<void> {
  const {
    scanId,
    mobileScanId,
    mobileAppId,
    orgId,
    assetId,
    platform,
    apkS3Key,
    ipaS3Key,
    bundleId,
    config,
  } = message;

  const database = getDatabase();
  let driver: Browser | null = null;

  logger.info({ scanId, mobileScanId, orgId, platform }, 'Starting mobile scan job');

  try {
    await database
      .update(scans)
      .set({
        status: 'running',
        startedAt: new Date().toISOString(),
      })
      .where(and(eq(scans.id, scanId), eq(scans.organisationId, orgId)));

    await updateProgress(scanId, {
      screensDiscovered: 0,
      screensScanned: 0,
      currentActivity: null,
      status: 'discovering',
    });

    const appS3Key = platform === 'android' ? apkS3Key : ipaS3Key;
    if (!appS3Key) {
      throw new Error(`Missing ${platform === 'android' ? 'APK' : 'IPA'} S3 key`);
    }

    driver = await deviceManager.createSession({
      platform,
      appS3Key,
      osVersion: config.osVersion,
      deviceModel: config.deviceModel,
      bundleId,
      scanId,
      mobileAppId,
    });

    if (config.loginFlow?.username && config.loginFlow?.password) {
      await handleLoginFlow(driver, config.loginFlow);
    }

    const traversalAgent = new TraversalAgent(driver, platform, scanId, orgId, config.maxScreens);

    const screens = await traversalAgent.traverse();
    const traversalGraph = traversalAgent.getTraversalGraph();

    await updateProgress(scanId, {
      screensDiscovered: screens.length,
      screensScanned: 0,
      currentActivity: null,
      status: 'scanning',
    });

    logger.info(
      { scanId, screensDiscovered: screens.length },
      'Traversal complete, running accessibility rules',
    );

    const ruleEngine = new MobileRuleEngine(config.standards);
    const allViolations = ruleEngine.scanMultipleScreens(screens);

    await updateProgress(scanId, {
      screensDiscovered: screens.length,
      screensScanned: screens.length,
      currentActivity: null,
      status: 'finalizing',
    });

    await writeViolationsToDb(database, orgId, scanId, assetId, platform, allViolations);

    const score = calculateScore(allViolations);
    const severityCounts = countBySeverity(allViolations);

    await database
      .update(scans)
      .set({
        status: 'completed',
        completedAt: new Date().toISOString(),
        score: Math.round(score),
        violationCount: allViolations.length,
        pagesScanned: screens.length,
      })
      .where(and(eq(scans.id, scanId), eq(scans.organisationId, orgId)));

    await database
      .update(assets)
      .set({ lastScannedAt: new Date().toISOString() })
      .where(and(eq(assets.id, assetId), eq(assets.organisationId, orgId)));

    await clearProgress(scanId);

    logger.info(
      {
        scanId,
        mobileScanId,
        screensScanned: screens.length,
        violationCount: allViolations.length,
        score,
        severityCounts,
        graphNodes: Object.keys(traversalGraph).length,
      },
      'Mobile scan job completed successfully',
    );
  } catch (err) {
    logger.error({ err, scanId, mobileScanId, orgId }, 'Mobile scan job failed');

    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    await database
      .update(scans)
      .set({
        status: 'failed',
        errorMessage: errorMessage.substring(0, 1000),
      })
      .where(and(eq(scans.id, scanId), eq(scans.organisationId, orgId)));

    await clearProgress(scanId);

    throw err;
  } finally {
    if (driver) {
      await deviceManager.closeSession(driver);
    }
  }
}

async function handleLoginFlow(
  driver: Browser,
  loginConfig: NonNullable<MobileScanJobMessage['config']['loginFlow']>,
): Promise<void> {
  const { username, password, usernameFieldId, passwordFieldId } = loginConfig;

  if (!username || !password) {
    logger.warn('Login flow requested but credentials not provided');
    return;
  }

  try {
    logger.info('Attempting login flow');

    await driver.pause(2000);

    const usernameSelector = usernameFieldId
      ? `~${usernameFieldId}`
      : '//android.widget.EditText[1]';
    const passwordSelector = passwordFieldId
      ? `~${passwordFieldId}`
      : '//android.widget.EditText[2]';

    const usernameField = await driver.$(usernameSelector);
    if (await usernameField.isExisting()) {
      await usernameField.setValue(username);
    }

    const passwordField = await driver.$(passwordSelector);
    if (await passwordField.isExisting()) {
      await passwordField.setValue(password);
    }

    const loginButton = await driver.$(
      '//android.widget.Button[contains(@text, "Login") or contains(@text, "Sign in") or contains(@text, "login")]',
    );
    if (await loginButton.isExisting()) {
      await loginButton.click();
    }

    await driver.pause(3000);

    logger.info('Login flow completed');
  } catch (err) {
    logger.warn({ err }, 'Login flow failed, continuing without login');
  }
}

async function writeViolationsToDb(
  database: ReturnType<typeof getDatabase>,
  orgId: string,
  scanId: string,
  assetId: string,
  platform: string,
  mobileViolations: MobileViolation[],
): Promise<void> {
  if (mobileViolations.length === 0) {
    logger.info({ scanId }, 'No violations to write');
    return;
  }

  const BATCH_SIZE = 500;

  for (let i = 0; i < mobileViolations.length; i += BATCH_SIZE) {
    const batch = mobileViolations.slice(i, i + BATCH_SIZE);

    await database.insert(violations).values(
      batch.map((v) => ({
        organisationId: orgId,
        scanId,
        ruleId: v.ruleId,
        impact: v.severity,
        description: v.description,
        helpUrl: v.helpUrl,
        wcagCriteria: [v.wcagCriterion],
        selector: v.elementResourceId ?? v.elementClass ?? null,
        html: v.elementClass
          ? `<${v.elementClass} resourceId="${v.elementResourceId ?? ''}" />`
          : null,
        pageUrl: v.screenActivity ?? v.screenTitle ?? `screen:${platform}`,
      })),
    );

    logger.info({ scanId, batchStart: i, batchSize: batch.length }, 'Violation batch inserted');
  }

  logger.info(
    { scanId, totalViolations: mobileViolations.length },
    'All violations written to database',
  );
}

export class MobileWorker {
  private isRunning: boolean = false;

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Worker is already running');
      return;
    }

    this.isRunning = true;
    let retries = 0;

    while (retries < MAX_CONNECTION_RETRIES) {
      try {
        logger.info(
          { attempt: retries + 1, maxRetries: MAX_CONNECTION_RETRIES },
          'Connecting to RabbitMQ',
        );

        await connectRedis();

        await consumeMobileScanJobs(async (message, ack, nack) => {
          try {
            await processMobileScanJob(message);
            ack();
          } catch {
            ack();
          }
        });

        logger.info('Mobile scanner worker started successfully');
        break;
      } catch (err) {
        retries++;
        logger.error(
          { err, attempt: retries, maxRetries: MAX_CONNECTION_RETRIES },
          'Failed to start worker',
        );

        if (retries >= MAX_CONNECTION_RETRIES) {
          throw new Error('Max connection retries exceeded');
        }

        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  async stop(): Promise<void> {
    logger.info('Stopping mobile scanner worker');
    this.isRunning = false;

    await closeQueue();
    await closeRedis();

    logger.info('Mobile scanner worker stopped');
  }
}
