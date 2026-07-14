/**
 * Billing API — invoices list and plan usage meters.
 */

import type { Database } from '@accessshield/db';
import { assets, invoices, organisations, scans } from '@accessshield/db';
import type { ApiResponse } from '@accessshield/types';
import { and, count, desc, eq, gte } from 'drizzle-orm';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import { isScanLimitDisabled, PLAN_ASSET_LIMITS, PLAN_SCAN_LIMITS } from '../lib/plan-limits';
import { sendProblem } from '../lib/problem-details';
import { requireRoles } from '../middleware/rbac';

function getMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function createBillingRouter(db: Database): ExpressRouter {
  const router = Router();

  router.get(
    '/invoices',
    requireRoles('customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;

        const rows = await db
          .select({
            id: invoices.id,
            organisationId: invoices.organisationId,
            invoiceNumber: invoices.invoiceNumber,
            status: invoices.status,
            subtotalPaise: invoices.subtotalPaise,
            gstPaise: invoices.gstPaise,
            totalPaise: invoices.totalPaise,
            currency: invoices.currency,
            billingPeriodStart: invoices.billingPeriodStart,
            billingPeriodEnd: invoices.billingPeriodEnd,
            dueDate: invoices.dueDate,
            paidAt: invoices.paidAt,
            lineItems: invoices.lineItems,
            createdAt: invoices.createdAt,
          })
          .from(invoices)
          .where(eq(invoices.organisationId, orgId))
          .orderBy(desc(invoices.createdAt));

        const response: ApiResponse<typeof rows> = {
          data: rows,
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/usage',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;

        const [org] = await db
          .select({ planTier: organisations.planTier })
          .from(organisations)
          .where(eq(organisations.id, orgId))
          .limit(1);

        if (!org) {
          sendProblem(res, 404, 'not-found', 'Organisation not found');
          return;
        }

        const planTier = org.planTier ?? 'starter';
        const assetsLimit = PLAN_ASSET_LIMITS[planTier] ?? PLAN_ASSET_LIMITS.starter ?? 1;
        const scansLimit = isScanLimitDisabled()
          ? null
          : (PLAN_SCAN_LIMITS[planTier] ?? PLAN_SCAN_LIMITS.starter ?? 3);

        const [assetCount] = await db
          .select({ count: count() })
          .from(assets)
          .where(and(eq(assets.organisationId, orgId), eq(assets.isActive, true)));

        const monthStart = getMonthStart();
        const [scanCount] = await db
          .select({ count: count() })
          .from(scans)
          .where(
            and(eq(scans.organisationId, orgId), gte(scans.createdAt, monthStart.toISOString())),
          );

        const data = {
          assetsUsed: assetCount?.count ?? 0,
          assetsLimit,
          scansThisMonth: scanCount?.count ?? 0,
          scansLimit,
        };

        const response: ApiResponse<typeof data> = {
          data,
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
