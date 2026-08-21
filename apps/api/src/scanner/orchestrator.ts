/**
 * Scanner Orchestrator
 *
 * Express router for scan API endpoints. Handles scan initiation,
 * status monitoring, and violation retrieval. Uses producer-consumer
 * pattern with RabbitMQ for async scan processing.
 */

import type { Database } from '@accessshield/db';
import { assets, lookupUserByAuthId, organisations, scans, violations } from '@accessshield/db';
import type { ApiResponse, IssueSeverity, PaginationMeta } from '@accessshield/types';
import { and, count, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import amqp from 'amqplib';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { sendProblem } from '../lib/problem-details';
import { requireRoles } from '../middleware/rbac';
import type { ComplianceStandard, ScanJobMessage, ScanProgress, WcagLevel } from './types';
import { DEFAULT_SCAN_CONFIG, DEFAULT_VIEWPORTS } from './types';
import { getScanLimit, isScanLimitDisabled } from '../lib/plan-limits';
import { closeScanQueue, publishScanJob } from './queue';
import { publishMobileScanJob } from './mobile-queue';
import { parseMobileAssetMetadata } from '../lib/mobile-asset';
import {
  SCAN_CANCEL_TTL_SECONDS,
  SCAN_PAUSE_TTL_SECONDS,
  SCAN_PROGRESS_TTL_SECONDS,
  ScanRedisKeys,
} from './v2/redis-keys';
import { isScanPipelineV2ScanJobsEnabled } from './v2/queues';
import { publishScanJobsMessage } from './v2/publish';

/** Zod schema for POST /scans request body */
const createScanSchema = z.object({
  asset_id: z.string().uuid('Invalid asset ID format'),
  scan_type: z.enum(['full', 'incremental', 'single_page']).optional().default('full'),
  wcag_level: z.enum(['A', 'AA', 'AAA']).optional().default('AA'),
  standards: z.array(z.enum(['WCAG22', 'IS17802', 'GIGW3', 'SEBI'])).optional(),
  max_pages: z.number().int().min(1).max(500).optional(),
  exclude_paths: z.array(z.string()).optional(),
});

/** Zod schema for GET /scans/:id/violations query params */
const listViolationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  severity: z.enum(['critical', 'serious', 'moderate', 'minor']).optional(),
  wcag_criterion: z.string().optional(),
  standard: z.enum(['WCAG22', 'IS17802', 'GIGW3', 'SEBI']).optional(),
});

/** RabbitMQ connection state for cancel queue only */
let rabbitConnection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
let rabbitChannel: Awaited<
  ReturnType<Awaited<ReturnType<typeof amqp.connect>>['createChannel']>
> | null = null;

const CANCEL_QUEUE = 'scan_cancellations';

const DEFAULT_STANDARDS: ComplianceStandard[] = ['WCAG22', 'IS17802'];

function resolveScanStandards(
  requested: ComplianceStandard[] | undefined,
  assetStandards: string[] | null | undefined,
  fallback?: string[] | null,
): ComplianceStandard[] {
  if (requested && requested.length > 0) return requested;
  if (assetStandards && assetStandards.length > 0) {
    return assetStandards as ComplianceStandard[];
  }
  if (fallback && fallback.length > 0) return fallback as ComplianceStandard[];
  return DEFAULT_STANDARDS;
}

/**
 * Initialize RabbitMQ connection and channel.
 * Creates durable queues if they don't exist.
 */
async function ensureRabbitMQ() {
  if (rabbitChannel) return rabbitChannel;

  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    throw new Error('RABBITMQ_URL environment variable not set');
  }

  try {
    const conn = await amqp.connect(rabbitUrl);
    rabbitConnection = conn;
    const channel = await conn.createChannel();
    rabbitChannel = channel;

    await channel.assertQueue(CANCEL_QUEUE, { durable: true });

    conn.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      rabbitConnection = null;
      rabbitChannel = null;
    });

    conn.on('error', (err) => {
      logger.error({ err }, 'RabbitMQ connection error');
    });

    logger.info('RabbitMQ connection established');
    return channel;
  } catch (err) {
    logger.error({ err }, 'Failed to connect to RabbitMQ');
    throw err;
  }
}

/**
 * Publish a cancel request to RabbitMQ queue.
 */
async function publishCancelRequest(scanId: string, orgId: string): Promise<void> {
  const channel = await ensureRabbitMQ();
  const content = Buffer.from(JSON.stringify({ scanId, orgId }));

  channel.sendToQueue(CANCEL_QUEUE, content, { persistent: true });
  logger.info({ scanId }, 'Scan cancel request published');
}

async function patchProgressPaused(redis: Redis, scanId: string, paused: boolean): Promise<void> {
  if (paused) {
    await redis.setex(ScanRedisKeys.pause(scanId), SCAN_PAUSE_TTL_SECONDS, '1');
  } else {
    await redis.del(ScanRedisKeys.pause(scanId));
  }

  const raw = await redis.get(ScanRedisKeys.progress(scanId));
  let progress: ScanProgress = {
    pagesScanned: 0,
    pagesTotal: 0,
    currentUrl: '',
    paused,
    phase: paused ? 'Paused' : 'Scanning pages',
  };
  if (raw) {
    try {
      progress = { ...(JSON.parse(raw) as ScanProgress), paused };
      if (paused) {
        progress.phase = 'Paused';
      } else if (progress.phase === 'Paused') {
        progress.phase = 'Scanning pages';
      }
    } catch {
      // keep defaults
    }
  }
  await redis.setex(
    ScanRedisKeys.progress(scanId),
    SCAN_PROGRESS_TTL_SECONDS,
    JSON.stringify(progress),
  );
}

/**
 * Get first day of current month in UTC for scan count queries.
 */
function getMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Check if organization has reached monthly scan limit.
 * Returns true if limit reached, false if scans available.
 */
async function checkPlanLimits(
  db: Database,
  orgId: string,
): Promise<{ limitReached: boolean; currentCount: number; limit: number | null }> {
  if (isScanLimitDisabled()) {
    return { limitReached: false, currentCount: 0, limit: null };
  }

  const [org] = await db
    .select({ planTier: organisations.planTier })
    .from(organisations)
    .where(eq(organisations.id, orgId))
    .limit(1);

  const planTier = org?.planTier ?? 'starter';
  const planLimit = getScanLimit(planTier);

  if (planLimit === null) {
    return { limitReached: false, currentCount: 0, limit: null };
  }

  const monthStart = getMonthStart();
  const [result] = await db
    .select({ count: count() })
    .from(scans)
    .where(and(eq(scans.organisationId, orgId), gte(scans.createdAt, monthStart.toISOString())));

  const currentCount = result?.count ?? 0;
  return {
    limitReached: currentCount >= planLimit,
    currentCount,
    limit: planLimit,
  };
}

/**
 * Create the scanner router with dependency injection for db and redis.
 * @param db - Drizzle database instance
 * @param redis - ioredis client instance
 */
export function createScannerRouter(db: Database, redis: Redis): ExpressRouter {
  const router = Router();

  /**
   * POST /scans - Create a new scan job
   *
   * Validates asset ownership, checks plan limits, creates scan record,
   * and publishes job to RabbitMQ queue.
   */
  router.post(
    '/',
    requireRoles('customer_admin', 'accessibility_officer', 'developer'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parseResult = createScanSchema.safeParse(req.body);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const { asset_id, scan_type, wcag_level, standards, max_pages, exclude_paths } =
          parseResult.data;
        const orgId = req.user!.org_id;
        const authUserId = req.user!.sub;

        const appUser = await lookupUserByAuthId(db, authUserId);

        const [asset] = await db
          .select()
          .from(assets)
          .where(and(eq(assets.id, asset_id), eq(assets.organisationId, orgId)))
          .limit(1);

        if (!asset) {
          sendProblem(
            res,
            404,
            'not-found',
            'Asset not found',
            'Asset does not exist or you do not have access',
          );
          return;
        }

        const mobileMeta =
          asset.type === 'mobile_app'
            ? parseMobileAssetMetadata(asset.description, asset.url)
            : null;
        const resolvedStandards = resolveScanStandards(
          standards as ComplianceStandard[] | undefined,
          asset.standards,
          mobileMeta?.standards,
        );

        const planCheck = await checkPlanLimits(db, orgId);
        if (planCheck.limitReached) {
          sendProblem(res, 402, 'payment-required', 'Monthly scan limit reached', undefined, {
            current_count: planCheck.currentCount,
            limit: planCheck.limit,
            upgrade_url: '/services',
          });
          return;
        }

        const [previousScan] = await db
          .select({ id: scans.id })
          .from(scans)
          .where(
            and(
              eq(scans.assetId, asset_id),
              eq(scans.organisationId, orgId),
              eq(scans.status, 'completed'),
            ),
          )
          .orderBy(desc(scans.completedAt))
          .limit(1);

        const [newScan] = await db
          .insert(scans)
          .values({
            organisationId: orgId,
            assetId: asset_id,
            initiatedBy: appUser?.id,
            status: 'pending',
            wcagLevel: wcag_level,
            wcagVersion: '2.2',
            standards: resolvedStandards,
          })
          .returning({ id: scans.id });

        if (!newScan) {
          sendProblem(res, 500, 'db-error', 'Failed to create scan record');
          return;
        }

        if (asset.type === 'mobile_app') {
          if (!mobileMeta?.appS3Key) {
            await db
              .update(scans)
              .set({
                status: 'failed',
                errorMessage: 'Mobile app file not found. Please re-upload the APK/IPA.',
              })
              .where(eq(scans.id, newScan.id));

            sendProblem(
              res,
              422,
              'mobile-app-missing',
              'Mobile app file not found',
              'This asset has no uploaded APK/IPA. Delete it and upload the app again.',
            );
            return;
          }

          const mobileScanId = randomUUID();
          const mobileJob = {
            scanId: newScan.id,
            mobileScanId,
            mobileAppId: asset_id,
            orgId,
            assetId: asset_id,
            platform: mobileMeta.platform,
            ...(mobileMeta.platform === 'android'
              ? { apkS3Key: mobileMeta.appS3Key }
              : { ipaS3Key: mobileMeta.appS3Key }),
            config: {
              standards: resolvedStandards,
              maxScreens: max_pages ?? mobileMeta.maxScreens,
            },
          };

          try {
            await publishMobileScanJob(mobileJob);
          } catch (err) {
            logger.error({ err, scanId: newScan.id }, 'Failed to publish mobile scan job');
            await db
              .update(scans)
              .set({ status: 'failed', errorMessage: 'Failed to queue mobile scan job' })
              .where(eq(scans.id, newScan.id));

            sendProblem(
              res,
              500,
              'queue-error',
              'Failed to queue mobile scan',
              'The mobile scan could not be queued. Please try again.',
            );
            return;
          }

          const response: ApiResponse<{
            scanId: string;
            status: string;
            message: string;
            previousScanId?: string;
            scanType: 'mobile';
          }> = {
            data: {
              scanId: newScan.id,
              status: 'pending',
              message: 'Mobile scan queued successfully',
              scanType: 'mobile',
              ...(previousScan ? { previousScanId: previousScan.id } : {}),
            },
            timestamp: new Date().toISOString(),
          };

          res.status(201).json(response);
          return;
        }

        const scanJob: ScanJobMessage = {
          scanId: newScan.id,
          assetId: asset_id,
          orgId,
          assetUrl: asset.url,
          config: {
            maxPages:
              max_pages ?? (scan_type === 'single_page' ? 1 : DEFAULT_SCAN_CONFIG.maxPages!),
            wcagLevel: wcag_level as WcagLevel,
            standards: resolvedStandards,
            excludePaths: exclude_paths ?? DEFAULT_SCAN_CONFIG.excludePaths!,
            viewports: DEFAULT_SCAN_CONFIG.viewports!,
          },
        };

        try {
          if (isScanPipelineV2ScanJobsEnabled()) {
            await publishScanJobsMessage({
              scanId: newScan.id,
              orgId,
              assetId: asset_id,
              assetUrl: asset.url,
              config: scanJob.config,
              idempotencyKey: newScan.id,
            });
            logger.info({ scanId: newScan.id }, 'Published to scan.jobs (v2 crawler pipeline)');
          } else {
            await publishScanJob(scanJob);
          }

          await db.update(scans).set({ status: 'pending' }).where(eq(scans.id, newScan.id));
        } catch (err) {
          logger.error({ err, scanId: newScan.id }, 'Failed to publish scan job');
          await db
            .update(scans)
            .set({ status: 'failed', errorMessage: 'Failed to queue scan job' })
            .where(eq(scans.id, newScan.id));

          sendProblem(
            res,
            500,
            'queue-error',
            'Failed to queue scan',
            'The scan could not be queued. Please try again.',
          );
          return;
        }

        const response: ApiResponse<{
          scanId: string;
          status: string;
          message: string;
          previousScanId?: string;
        }> = {
          data: {
            scanId: newScan.id,
            status: 'queued',
            message: 'Scan queued successfully',
            previousScanId: previousScan?.id,
          },
          timestamp: new Date().toISOString(),
        };

        res.status(201).json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * GET /scans/:id - Get scan details with real-time progress
   *
   * Fetches scan record from DB and merges with Redis progress data
   * for in-progress scans.
   */
  router.get(
    '/:id',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const scanId = req.params.id ?? '';
        const orgId = req.user!.org_id;

        if (!scanId || !z.string().uuid().safeParse(scanId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid scan ID format');
          return;
        }

        const [scan] = await db
          .select({
            id: scans.id,
            status: scans.status,
            wcagLevel: scans.wcagLevel,
            wcagVersion: scans.wcagVersion,
            pagesScanned: scans.pagesScanned,
            violationCount: scans.violationCount,
            score: scans.score,
            startedAt: scans.startedAt,
            completedAt: scans.completedAt,
            errorMessage: scans.errorMessage,
            createdAt: scans.createdAt,
            standards: scans.standards,
            assetId: scans.assetId,
            assetName: assets.name,
            assetUrl: assets.url,
            assetType: assets.type,
          })
          .from(scans)
          .innerJoin(assets, eq(scans.assetId, assets.id))
          .where(and(eq(scans.id, scanId), eq(scans.organisationId, orgId)))
          .limit(1);

        if (!scan) {
          sendProblem(res, 404, 'not-found', 'Scan not found');
          return;
        }

        let progress: ScanProgress | null = null;
        if (scan.status === 'running' || scan.status === 'pending') {
          const progressData = await redis.get(ScanRedisKeys.progress(scanId));
          if (progressData) {
            try {
              progress = JSON.parse(progressData) as ScanProgress;
            } catch {
              logger.warn({ scanId }, 'Failed to parse scan progress from Redis');
            }
          }
          const paused = (await redis.get(ScanRedisKeys.pause(scanId))) === '1';
          if (progress) {
            progress.paused = paused;
            if (paused) progress.phase = 'Paused';
          } else if (paused) {
            progress = {
              pagesScanned: 0,
              pagesTotal: 0,
              currentUrl: '',
              paused: true,
              phase: 'Paused',
            };
          }
        }

        const severityRows = await db
          .select({
            impact: violations.impact,
            count: sql<number>`count(*)::int`,
          })
          .from(violations)
          .where(and(eq(violations.scanId, scanId), eq(violations.organisationId, orgId)))
          .groupBy(violations.impact);

        const severityCounts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
        for (const row of severityRows) {
          if (row.impact === 'critical') severityCounts.critical = Number(row.count);
          else if (row.impact === 'serious') severityCounts.serious = Number(row.count);
          else if (row.impact === 'moderate') severityCounts.moderate = Number(row.count);
          else if (row.impact === 'minor') severityCounts.minor = Number(row.count);
        }

        const standardRows = await db
          .select({
            standard: violations.standard,
            count: sql<number>`count(*)::int`,
          })
          .from(violations)
          .where(and(eq(violations.scanId, scanId), eq(violations.organisationId, orgId)))
          .groupBy(violations.standard);

        const standardCounts: Record<string, number> = {};
        for (const row of standardRows) {
          standardCounts[row.standard] = Number(row.count);
        }

        const response: ApiResponse<
          typeof scan & {
            progress?: ScanProgress;
            severityCounts: typeof severityCounts;
            standardCounts: Record<string, number>;
          }
        > = {
          data: {
            ...scan,
            severityCounts,
            standardCounts,
            ...(progress && { progress }),
          },
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * GET /scans/:id/violations - List violations with pagination and filters
   *
   * Returns paginated list of violations for a scan, filterable by
   * severity, WCAG criterion, and standard.
   */
  router.get(
    '/:id/violations',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const scanId = req.params.id ?? '';
        const orgId = req.user!.org_id;

        if (!scanId || !z.string().uuid().safeParse(scanId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid scan ID format');
          return;
        }

        const parseResult = listViolationsSchema.safeParse(req.query);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid query parameters', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const { page, limit, severity, wcag_criterion, standard } = parseResult.data;
        const offset = (page - 1) * limit;

        const [scanCheck] = await db
          .select({ id: scans.id })
          .from(scans)
          .where(and(eq(scans.id, scanId), eq(scans.organisationId, orgId)))
          .limit(1);

        if (!scanCheck) {
          sendProblem(res, 404, 'not-found', 'Scan not found');
          return;
        }

        const conditions = [eq(violations.scanId, scanId), eq(violations.organisationId, orgId)];

        if (severity) {
          conditions.push(eq(violations.impact, severity as IssueSeverity));
        }

        if (wcag_criterion) {
          conditions.push(sql`${wcag_criterion} = ANY(${violations.wcagCriteria})`);
        }

        if (standard) {
          conditions.push(eq(violations.standard, standard));
        }

        const [totalResult] = await db
          .select({ count: count() })
          .from(violations)
          .where(and(...conditions));

        const total = totalResult?.count ?? 0;

        const violationRows = await db
          .select({
            id: violations.id,
            ruleId: violations.ruleId,
            impact: violations.impact,
            description: violations.description,
            helpUrl: violations.helpUrl,
            wcagCriteria: violations.wcagCriteria,
            selector: violations.selector,
            html: violations.html,
            pageUrl: violations.pageUrl,
            standard: violations.standard,
            createdAt: violations.createdAt,
          })
          .from(violations)
          .where(and(...conditions))
          .orderBy(
            sql`CASE ${violations.impact}
              WHEN 'critical' THEN 1
              WHEN 'serious' THEN 2
              WHEN 'moderate' THEN 3
              WHEN 'minor' THEN 4
            END`,
            desc(violations.createdAt),
          )
          .limit(limit)
          .offset(offset);

        const meta: PaginationMeta = {
          page,
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        };

        const response: ApiResponse<typeof violationRows> = {
          data: violationRows,
          meta,
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * POST /scans/:id/pause - Pause a pending or running scan
   */
  router.post(
    '/:id/pause',
    requireRoles('customer_admin', 'accessibility_officer', 'developer'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const scanId = req.params.id ?? '';
        const orgId = req.user!.org_id;

        if (!scanId || !z.string().uuid().safeParse(scanId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid scan ID format');
          return;
        }

        const [scan] = await db
          .select({ id: scans.id, status: scans.status })
          .from(scans)
          .where(and(eq(scans.id, scanId), eq(scans.organisationId, orgId)))
          .limit(1);

        if (!scan) {
          sendProblem(res, 404, 'not-found', 'Scan not found');
          return;
        }

        if (scan.status !== 'pending' && scan.status !== 'running') {
          sendProblem(res, 409, 'conflict', 'Cannot pause scan', `Scan is already ${scan.status}`);
          return;
        }

        await patchProgressPaused(redis, scanId, true);

        const response: ApiResponse<{ message: string; paused: boolean }> = {
          data: { message: 'Scan paused', paused: true },
          timestamp: new Date().toISOString(),
        };
        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * POST /scans/:id/resume - Resume a paused scan
   */
  router.post(
    '/:id/resume',
    requireRoles('customer_admin', 'accessibility_officer', 'developer'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const scanId = req.params.id ?? '';
        const orgId = req.user!.org_id;

        if (!scanId || !z.string().uuid().safeParse(scanId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid scan ID format');
          return;
        }

        const [scan] = await db
          .select({ id: scans.id, status: scans.status })
          .from(scans)
          .where(and(eq(scans.id, scanId), eq(scans.organisationId, orgId)))
          .limit(1);

        if (!scan) {
          sendProblem(res, 404, 'not-found', 'Scan not found');
          return;
        }

        if (scan.status !== 'pending' && scan.status !== 'running') {
          sendProblem(res, 409, 'conflict', 'Cannot resume scan', `Scan is already ${scan.status}`);
          return;
        }

        await patchProgressPaused(redis, scanId, false);

        const response: ApiResponse<{ message: string; paused: boolean }> = {
          data: { message: 'Scan resumed', paused: false },
          timestamp: new Date().toISOString(),
        };
        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * POST /scans/:id/cancel - Request scan cancellation
   *
   * Updates scan status to 'cancelled' and publishes cancel message
   * to RabbitMQ for worker to handle.
   */
  router.post(
    '/:id/cancel',
    requireRoles('customer_admin', 'accessibility_officer', 'developer'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const scanId = req.params.id ?? '';
        const orgId = req.user!.org_id;

        if (!scanId || !z.string().uuid().safeParse(scanId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid scan ID format');
          return;
        }

        const [scan] = await db
          .select({ id: scans.id, status: scans.status })
          .from(scans)
          .where(and(eq(scans.id, scanId), eq(scans.organisationId, orgId)))
          .limit(1);

        if (!scan) {
          sendProblem(res, 404, 'not-found', 'Scan not found');
          return;
        }

        if (scan.status !== 'pending' && scan.status !== 'running') {
          sendProblem(res, 409, 'conflict', 'Cannot cancel scan', `Scan is already ${scan.status}`);
          return;
        }

        await db
          .update(scans)
          .set({ status: 'failed', errorMessage: 'Cancelled by user' })
          .where(eq(scans.id, scanId));

        try {
          await publishCancelRequest(scanId, orgId);
        } catch (err) {
          logger.warn(
            { err, scanId },
            'Failed to publish cancel request, but scan marked as cancelled',
          );
        }

        await redis.setex(ScanRedisKeys.cancel(scanId), SCAN_CANCEL_TTL_SECONDS, '1');
        await redis.del(ScanRedisKeys.pause(scanId));
        await redis.del(ScanRedisKeys.progress(scanId));

        const response: ApiResponse<{ message: string }> = {
          data: { message: 'Scan cancellation requested' },
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * GET /scans - List scans for organization
   *
   * Returns paginated list of scans with optional status filter.
   */
  router.get(
    '/',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;

        const querySchema = z.object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(20),
          status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
          asset_id: z.string().uuid().optional(),
        });

        const parseResult = querySchema.safeParse(req.query);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid query parameters', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const { page, limit, status, asset_id } = parseResult.data;
        const offset = (page - 1) * limit;

        const conditions = [eq(scans.organisationId, orgId)];

        if (status) {
          conditions.push(eq(scans.status, status));
        }

        if (asset_id) {
          conditions.push(eq(scans.assetId, asset_id));
        }

        const [totalResult] = await db
          .select({ count: count() })
          .from(scans)
          .where(and(...conditions));

        const total = totalResult?.count ?? 0;

        const scanRows = await db
          .select({
            id: scans.id,
            assetId: scans.assetId,
            assetName: assets.name,
            assetUrl: assets.url,
            status: scans.status,
            wcagLevel: scans.wcagLevel,
            wcagVersion: scans.wcagVersion,
            pagesScanned: scans.pagesScanned,
            violationCount: scans.violationCount,
            score: scans.score,
            startedAt: scans.startedAt,
            completedAt: scans.completedAt,
            errorMessage: scans.errorMessage,
            createdAt: scans.createdAt,
            standards: scans.standards,
          })
          .from(scans)
          .leftJoin(assets, and(eq(scans.assetId, assets.id), eq(assets.organisationId, orgId)))
          .where(and(...conditions))
          .orderBy(desc(scans.createdAt))
          .limit(limit)
          .offset(offset);

        const meta: PaginationMeta = {
          page,
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        };

        const response: ApiResponse<typeof scanRows> = {
          data: scanRows,
          meta,
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

/**
 * Cleanup RabbitMQ connection on process exit.
 */
export async function closeRabbitMQ(): Promise<void> {
  try {
    if (rabbitChannel) {
      await rabbitChannel.close();
    }
    if (rabbitConnection) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (rabbitConnection as any).close();
    }
    await closeScanQueue();
    logger.info('RabbitMQ connection closed');
  } catch (err) {
    logger.warn({ err }, 'Error during RabbitMQ cleanup');
  }
}
