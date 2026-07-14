/**
 * Public Scan Routes
 *
 * Unauthenticated endpoints for the marketing site's free scan tool.
 * Rate-limited per email and IP to prevent abuse.
 */

import type { Database } from '@accessshield/db';
import { assets, organisations, scans, violations } from '@accessshield/db';
import type { ApiResponse } from '@accessshield/types';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import type { Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { sendProblem } from '../lib/problem-details';
import { publishScanJob } from '../scanner/queue';
import { isScanPipelineV2ScanJobsEnabled } from '../scanner/v2/queues';
import { publishScanJobsMessage } from '../scanner/v2/publish';
import { DEFAULT_SCAN_CONFIG } from '../scanner/types';

const PUBLIC_SCANS_ORG_ID = '00000000-0000-0000-0000-000000000001';

const createScanSchema = z.object({
  url: z.string().url('Invalid URL format'),
  email: z.string().email('Invalid email format'),
});

async function ensurePublicScansOrg(db: Database): Promise<void> {
  await db
    .insert(organisations)
    .values({
      id: PUBLIC_SCANS_ORG_ID,
      name: 'Public Scans',
      slug: 'public-scans-system',
      isActive: false,
      planTier: 'starter',
    })
    .onConflictDoNothing();
}

async function checkRateLimit(
  redis: Redis,
  email: string,
  ip: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const emailKey = `public-scan:email:${email}`;
  const ipKey = `public-scan:ip:${ip}`;

  const emailCount = await redis.get(emailKey);
  if (emailCount) {
    return {
      allowed: false,
      reason:
        "You've already used your free scan today. Try again tomorrow or sign up for unlimited scans.",
    };
  }

  const ipCount = parseInt((await redis.get(ipKey)) || '0', 10);
  if (ipCount >= 3) {
    return {
      allowed: false,
      reason: 'Too many scans from this IP address. Please try again tomorrow.',
    };
  }

  return { allowed: true };
}

async function setRateLimits(redis: Redis, email: string, ip: string): Promise<void> {
  const emailKey = `public-scan:email:${email}`;
  const ipKey = `public-scan:ip:${ip}`;
  const ttl = 86400;

  await redis.setex(emailKey, ttl, '1');

  const currentIpCount = parseInt((await redis.get(ipKey)) || '0', 10);
  await redis.setex(ipKey, ttl, String(currentIpCount + 1));
}

export function createPublicScanRouter(db: Database, redis: Redis): ExpressRouter {
  const router = Router();

  router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
      const parseResult = createScanSchema.safeParse(req.body);
      if (!parseResult.success) {
        sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
          errors: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const { url, email } = parseResult.data;
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';

      const rateLimitCheck = await checkRateLimit(redis, email, ip);
      if (!rateLimitCheck.allowed) {
        sendProblem(res, 429, 'rate-limit-exceeded', rateLimitCheck.reason!);
        return;
      }

      try {
        const urlCheck = new URL(url);
        const headResponse = await fetch(urlCheck.toString(), {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        });
        if (!headResponse.ok && headResponse.status !== 405) {
          sendProblem(
            res,
            422,
            'unreachable-url',
            "We couldn't reach this website. Please check the URL and try again.",
          );
          return;
        }
      } catch (err) {
        logger.warn({ err, url }, 'URL reachability check failed');
        sendProblem(
          res,
          422,
          'unreachable-url',
          "We couldn't reach this website. Please check the URL and try again.",
        );
        return;
      }

      await ensurePublicScansOrg(db);

      const [asset] = await db
        .insert(assets)
        .values({
          organisationId: PUBLIC_SCANS_ORG_ID,
          name: `Public scan: ${url}`,
          url,
          type: 'website',
          isActive: true,
        })
        .returning({ id: assets.id });

      if (!asset) {
        sendProblem(res, 500, 'db-error', 'Failed to create asset record');
        return;
      }

      const [scan] = await db
        .insert(scans)
        .values({
          organisationId: PUBLIC_SCANS_ORG_ID,
          assetId: asset.id,
          status: 'pending',
          wcagLevel: 'AA',
          wcagVersion: '2.2',
        })
        .returning({ id: scans.id });

      if (!scan) {
        sendProblem(res, 500, 'db-error', 'Failed to create scan record');
        return;
      }

      await redis.setex(`public-scan:lead:${scan.id}`, 2592000, email);

      try {
        const publicConfig = {
          maxPages: 10,
          wcagLevel: 'AA' as const,
          standards: ['WCAG22', 'IS17802'] as const,
          excludePaths: [] as string[],
          viewports: DEFAULT_SCAN_CONFIG.viewports!,
        };

        if (isScanPipelineV2ScanJobsEnabled()) {
          await publishScanJobsMessage({
            scanId: scan.id,
            orgId: PUBLIC_SCANS_ORG_ID,
            assetId: asset.id,
            assetUrl: url,
            config: {
              maxPages: publicConfig.maxPages,
              wcagLevel: publicConfig.wcagLevel,
              standards: [...publicConfig.standards],
              excludePaths: publicConfig.excludePaths,
              viewports: publicConfig.viewports,
            },
            idempotencyKey: scan.id,
          });
        } else {
          await publishScanJob({
            scanId: scan.id,
            assetId: asset.id,
            orgId: PUBLIC_SCANS_ORG_ID,
            assetUrl: url,
            config: {
              maxPages: publicConfig.maxPages,
              wcagLevel: publicConfig.wcagLevel,
              standards: [...publicConfig.standards],
              excludePaths: publicConfig.excludePaths,
              viewports: publicConfig.viewports,
            },
          });
        }
      } catch (err) {
        logger.error({ err, scanId: scan.id }, 'Failed to publish public scan job');
        await db
          .update(scans)
          .set({ status: 'failed', errorMessage: 'Failed to queue scan job' })
          .where(eq(scans.id, scan.id));
        sendProblem(res, 500, 'internal-error', 'Failed to queue scan. Please try again.');
        return;
      }

      await setRateLimits(redis, email, ip);

      const response: ApiResponse<{ scanId: string }> = {
        data: { scanId: scan.id },
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(response);
    } catch (err) {
      logger.error({ err }, 'Failed to create public scan');
      sendProblem(res, 500, 'internal-error', 'Failed to create scan. Please try again.');
    }
  });

  router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const scanId = req.params.id ?? '';

      if (!scanId || !z.string().uuid().safeParse(scanId).success) {
        sendProblem(res, 400, 'validation-error', 'Invalid scan ID format');
        return;
      }

      const [scan] = await db
        .select({
          id: scans.id,
          status: scans.status,
          pagesScanned: scans.pagesScanned,
          score: scans.score,
          createdAt: scans.createdAt,
          organisationId: scans.organisationId,
        })
        .from(scans)
        .where(and(eq(scans.id, scanId), eq(scans.organisationId, PUBLIC_SCANS_ORG_ID)))
        .limit(1);

      if (!scan) {
        sendProblem(res, 404, 'not-found', 'Scan not found');
        return;
      }

      const progressData = await redis.get(`scan:progress:${scanId}`);
      let currentUrl: string | undefined;
      let pagesTotal = 10;

      if (progressData) {
        try {
          const progress = JSON.parse(progressData) as {
            currentUrl?: string;
            pagesTotal?: number;
          };
          currentUrl = progress.currentUrl;
          pagesTotal = progress.pagesTotal || 10;
        } catch {
          logger.warn({ scanId }, 'Failed to parse scan progress from Redis');
        }
      }

      const severityCounts = await db
        .select({
          impact: violations.impact,
          count: count(),
        })
        .from(violations)
        .where(eq(violations.scanId, scanId))
        .groupBy(violations.impact);

      const criticalCount = severityCounts.find((c) => c.impact === 'critical')?.count || 0;
      const seriousCount = severityCounts.find((c) => c.impact === 'serious')?.count || 0;
      const moderateCount = severityCounts.find((c) => c.impact === 'moderate')?.count || 0;
      const minorCount = severityCounts.find((c) => c.impact === 'minor')?.count || 0;

      const topViolations = await db
        .select({
          id: violations.id,
          ruleId: violations.ruleId,
          impact: violations.impact,
          description: violations.description,
          wcagCriteria: violations.wcagCriteria,
        })
        .from(violations)
        .where(eq(violations.scanId, scanId))
        .orderBy(
          sql`CASE ${violations.impact}
            WHEN 'critical' THEN 1
            WHEN 'serious' THEN 2
            WHEN 'moderate' THEN 3
            WHEN 'minor' THEN 4
          END`,
          desc(violations.createdAt),
        )
        .limit(5);

      const [totalViolationsResult] = await db
        .select({ count: count() })
        .from(violations)
        .where(eq(violations.scanId, scanId));

      const totalViolations = totalViolationsResult?.count || 0;
      const remainingViolationsCount = Math.max(0, totalViolations - topViolations.length);

      const response: ApiResponse<{
        status: string;
        pagesScanned: number;
        pagesTotal: number;
        currentUrl?: string;
        score?: number;
        criticalCount: number;
        seriousCount: number;
        moderateCount: number;
        minorCount: number;
        topViolations: typeof topViolations;
        remainingViolationsCount: number;
      }> = {
        data: {
          status: scan.status,
          pagesScanned: scan.pagesScanned,
          pagesTotal,
          currentUrl,
          score: scan.score ?? undefined,
          criticalCount,
          seriousCount,
          moderateCount,
          minorCount,
          topViolations,
          remainingViolationsCount,
        },
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (err) {
      logger.error({ err }, 'Failed to fetch public scan');
      sendProblem(res, 500, 'internal-error', 'Failed to fetch scan. Please try again.');
    }
  });

  return router;
}
