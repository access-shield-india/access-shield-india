/**
 * Dashboard Stats API Routes
 *
 * Provides aggregated statistics for the dashboard overview.
 */

import type { Database } from '@accessshield/db';
import { assets, scans, issues, auditLogs, users } from '@accessshield/db';
import type { ApiResponse } from '@accessshield/types';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import { requireRoles } from '../middleware/rbac';

export interface DashboardStats {
  score: number | null;
  scoreDelta: number | null;
  openIssues: number;
  criticalIssues: number;
  assetsCount: number;
  lastScanDate: string | null;
  recentActivity: Activity[];
}

export interface Activity {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  userId: string | null;
  userName: string | null;
  description: string;
  createdAt: string;
}

/**
 * Create Express router for /api/v1/dashboard endpoints.
 */
export function createDashboardRouter(db: Database): ExpressRouter {
  const router = Router();

  /**
   * GET /dashboard/stats — Get aggregated dashboard statistics
   */
  router.get(
    '/stats',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;

        // Get latest two scans to calculate score and delta
        const recentScans = await db
          .select({
            id: scans.id,
            score: scans.score,
            completedAt: scans.completedAt,
          })
          .from(scans)
          .where(and(eq(scans.organisationId, orgId), eq(scans.status, 'completed')))
          .orderBy(desc(scans.completedAt))
          .limit(2);

        const latestScore = recentScans[0]?.score ?? null;
        const previousScore = recentScans[1]?.score ?? null;
        const scoreDelta =
          latestScore !== null && previousScore !== null ? latestScore - previousScore : null;

        const [openIssuesResult, criticalIssuesResult, assetsCountResult, activityRows] =
          await Promise.all([
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(issues)
              .where(and(eq(issues.organisationId, orgId), eq(issues.status, 'open'))),
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(issues)
              .where(
                and(
                  eq(issues.organisationId, orgId),
                  eq(issues.status, 'open'),
                  eq(issues.severity, 'critical'),
                ),
              ),
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(assets)
              .where(and(eq(assets.organisationId, orgId), eq(assets.isActive, true))),
            db
              .select({
                id: auditLogs.id,
                action: auditLogs.action,
                resourceType: auditLogs.resourceType,
                resourceId: auditLogs.resourceId,
                userId: auditLogs.userId,
                metadata: auditLogs.metadata,
                createdAt: auditLogs.createdAt,
              })
              .from(auditLogs)
              .leftJoin(users, eq(auditLogs.userId, users.id))
              .where(eq(auditLogs.organisationId, orgId))
              .orderBy(desc(auditLogs.createdAt))
              .limit(10),
          ]);

        const openIssues = openIssuesResult[0]?.count ?? 0;
        const criticalIssues = criticalIssuesResult[0]?.count ?? 0;
        const assetsCount = assetsCountResult[0]?.count ?? 0;

        // Get last scan date
        const lastScan = recentScans[0];
        const lastScanDate = lastScan?.completedAt ?? null;

        const recentActivity: Activity[] = activityRows.map((row) => ({
          id: row.id,
          action: row.action,
          resourceType: row.resourceType,
          resourceId: row.resourceId,
          userId: row.userId,
          userName: 'full_name' in row && typeof row.full_name === 'string' ? row.full_name : null,
          description: formatAuditLogDescription(row),
          createdAt: row.createdAt,
        }));

        const stats: DashboardStats = {
          score: latestScore,
          scoreDelta,
          openIssues,
          criticalIssues,
          assetsCount,
          lastScanDate,
          recentActivity,
        };

        const response: ApiResponse<DashboardStats> = {
          data: stats,
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
 * Format audit log into human-readable description
 */
function formatAuditLogDescription(log: {
  action: string;
  resourceType: string;
  metadata?: Record<string, unknown> | null;
}): string {
  const { action, resourceType, metadata } = log;

  type Meta = Record<string, unknown> | null | undefined;
  const assetName = (m?: Meta) => (typeof m?.assetName === 'string' ? m.assetName : undefined);

  const descriptions: Record<string, (m?: Meta) => string> = {
    'scan.create': (m) => `Scan started on ${assetName(m) ?? 'asset'}`,
    'scan.update': (m) => `Scan updated for ${assetName(m) ?? 'asset'}`,
    'asset.create': (m) => `New asset created: ${assetName(m) ?? 'Unknown'}`,
    'asset.update': (m) => `Asset updated: ${assetName(m) ?? 'Unknown'}`,
    'issue.create': () => `New issue created`,
    'issue.update': () => `Issue updated`,
    'certificate.create': (m) => `Certificate issued for ${assetName(m) ?? 'asset'}`,
    'report.create': (m) => `Report generated for ${assetName(m) ?? 'asset'}`,
    'report.export': () => `Report exported`,
  };

  const key = `${resourceType}.${action}`;
  const formatter = descriptions[key];

  if (formatter) {
    return formatter(metadata);
  }

  return `${action} on ${resourceType}`;
}
