/**
 * SaaS admin console routes — users directory, billing, inquiries, assets.
 * Mounted by createAdminRouter (already gated to super_admin).
 */

import type { Database } from '@accessshield/db';
import {
  assets,
  enterpriseQuotes,
  funnelEvents,
  invoices,
  issues,
  organisations,
  scans,
  serviceEngagements,
  users,
  violations,
  waitlistSignups,
} from '@accessshield/db';
import type { ApiResponse, PaginationMeta } from '@accessshield/types';
import { and, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { z } from 'zod';
import type { IdentityAdmin } from '../../services/identity-admin';
import { sendProblem } from '../../lib/problem-details';
import { logger } from '../../lib/logger';

const quoteStatusSchema = z.enum(['new', 'contacted', 'quoted', 'won', 'lost']);
const waitlistStatusSchema = z.enum(['new', 'contacted', 'converted', 'closed']);
const engagementStatusSchema = z.enum([
  'requested',
  'scoped',
  'in_progress',
  'delivered',
  'cancelled',
]);
const invoiceStatusSchema = z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']);

function pagination(req: Request): { page: number; limit: number; offset: number } {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

export function registerAdminConsoleRoutes(
  router: ExpressRouter,
  db: Database,
  _identityAdmin: IdentityAdmin,
): void {
  // ─── Global users directory ───────────────────────────────────────────────

  router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, offset } = pagination(req);
      const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      const role = typeof req.query.role === 'string' ? req.query.role : '';
      const orgId = typeof req.query.orgId === 'string' ? req.query.orgId : '';
      const isActiveParam = req.query.isActive;

      const conditions = [];
      if (search) {
        conditions.push(
          or(
            ilike(users.email, `%${search}%`),
            ilike(users.fullName, `%${search}%`),
            ilike(organisations.name, `%${search}%`),
          ),
        );
      }
      if (
        role &&
        ['super_admin', 'customer_admin', 'accessibility_officer', 'developer', 'auditor'].includes(
          role,
        )
      ) {
        conditions.push(
          eq(
            users.role,
            role as
              | 'super_admin'
              | 'customer_admin'
              | 'accessibility_officer'
              | 'developer'
              | 'auditor',
          ),
        );
      }
      if (orgId && z.string().uuid().safeParse(orgId).success) {
        conditions.push(eq(users.organisationId, orgId));
      }
      if (isActiveParam === 'true') conditions.push(eq(users.isActive, true));
      if (isActiveParam === 'false') conditions.push(eq(users.isActive, false));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, [totalRow]] = await Promise.all([
        db
          .select({
            id: users.id,
            organisationId: users.organisationId,
            authUserId: users.authUserId,
            email: users.email,
            fullName: users.fullName,
            role: users.role,
            isActive: users.isActive,
            createdAt: users.createdAt,
            organisationName: organisations.name,
            planTier: organisations.planTier,
            orgActive: organisations.isActive,
          })
          .from(users)
          .innerJoin(organisations, eq(users.organisationId, organisations.id))
          .where(where)
          .orderBy(desc(users.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: count() })
          .from(users)
          .innerJoin(organisations, eq(users.organisationId, organisations.id))
          .where(where),
      ]);

      const total = totalRow?.count ?? 0;
      const meta: PaginationMeta = {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      };

      const response: ApiResponse<typeof rows> = {
        data: rows,
        meta,
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  // ─── Org assets ───────────────────────────────────────────────────────────

  router.get(
    '/organisations/:id/assets',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const orgId = req.params.id ?? '';
        if (!z.string().uuid().safeParse(orgId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid organisation ID');
          return;
        }

        const rows = await db
          .select({
            id: assets.id,
            name: assets.name,
            url: assets.url,
            type: assets.type,
            isActive: assets.isActive,
            createdAt: assets.createdAt,
            updatedAt: assets.updatedAt,
          })
          .from(assets)
          .where(eq(assets.organisationId, orgId))
          .orderBy(desc(assets.createdAt));

        // Latest scan per asset (best-effort)
        const assetIds = rows.map((r) => r.id);
        let lastScanByAsset: Record<string, string> = {};
        if (assetIds.length > 0) {
          const scanRows = await db
            .select({
              assetId: scans.assetId,
              createdAt: scans.createdAt,
            })
            .from(scans)
            .where(inArray(scans.assetId, assetIds))
            .orderBy(desc(scans.createdAt));

          for (const s of scanRows) {
            if (s.assetId && !lastScanByAsset[s.assetId]) {
              lastScanByAsset[s.assetId] = s.createdAt;
            }
          }
        }

        const data = rows.map((r) => ({
          ...r,
          lastScanAt: lastScanByAsset[r.id] ?? null,
        }));

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

  // ─── Org asset detail (scans + issue breakdown) ───────────────────────────

  router.get(
    '/organisations/:id/assets/:assetId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const orgId = req.params.id ?? '';
        const assetId = req.params.assetId ?? '';
        if (!z.string().uuid().safeParse(orgId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid organisation ID');
          return;
        }
        if (!z.string().uuid().safeParse(assetId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid asset ID');
          return;
        }

        const [assetRow] = await db
          .select({
            id: assets.id,
            organisationId: assets.organisationId,
            organisationName: organisations.name,
            name: assets.name,
            url: assets.url,
            type: assets.type,
            description: assets.description,
            isActive: assets.isActive,
            standards: assets.standards,
            lastScannedAt: assets.lastScannedAt,
            createdAt: assets.createdAt,
            updatedAt: assets.updatedAt,
          })
          .from(assets)
          .innerJoin(organisations, eq(organisations.id, assets.organisationId))
          .where(and(eq(assets.id, assetId), eq(assets.organisationId, orgId)))
          .limit(1);

        if (!assetRow) {
          sendProblem(res, 404, 'not-found', 'Asset not found for this organisation');
          return;
        }

        const [scanRows, severityRows, statusRows, openIssuesCountRow, topRuleRows, recentIssues] =
          await Promise.all([
            db
              .select({
                id: scans.id,
                status: scans.status,
                score: scans.score,
                pagesScanned: scans.pagesScanned,
                violationCount: scans.violationCount,
                wcagLevel: scans.wcagLevel,
                wcagVersion: scans.wcagVersion,
                standards: scans.standards,
                startedAt: scans.startedAt,
                completedAt: scans.completedAt,
                createdAt: scans.createdAt,
                errorMessage: scans.errorMessage,
              })
              .from(scans)
              .where(and(eq(scans.assetId, assetId), eq(scans.organisationId, orgId)))
              .orderBy(desc(scans.createdAt))
              .limit(50),
            db
              .select({
                severity: issues.severity,
                count: count(),
              })
              .from(issues)
              .where(
                and(
                  eq(issues.assetId, assetId),
                  eq(issues.organisationId, orgId),
                  inArray(issues.status, ['open', 'in_progress']),
                ),
              )
              .groupBy(issues.severity),
            db
              .select({
                status: issues.status,
                count: count(),
              })
              .from(issues)
              .where(and(eq(issues.assetId, assetId), eq(issues.organisationId, orgId)))
              .groupBy(issues.status),
            db
              .select({ count: count() })
              .from(issues)
              .where(
                and(
                  eq(issues.assetId, assetId),
                  eq(issues.organisationId, orgId),
                  inArray(issues.status, ['open', 'in_progress']),
                ),
              ),
            db
              .select({
                ruleId: violations.ruleId,
                impact: violations.impact,
                count: count(),
              })
              .from(violations)
              .innerJoin(scans, eq(scans.id, violations.scanId))
              .where(and(eq(scans.assetId, assetId), eq(scans.organisationId, orgId)))
              .groupBy(violations.ruleId, violations.impact)
              .orderBy(desc(count()))
              .limit(10),
            db
              .select({
                id: issues.id,
                title: issues.title,
                severity: issues.severity,
                status: issues.status,
                createdAt: issues.createdAt,
                dueDate: issues.dueDate,
              })
              .from(issues)
              .where(
                and(
                  eq(issues.assetId, assetId),
                  eq(issues.organisationId, orgId),
                  inArray(issues.status, ['open', 'in_progress']),
                ),
              )
              .orderBy(desc(issues.createdAt))
              .limit(15),
          ]);

        const latestCompleted = scanRows.find((s) => s.status === 'completed') ?? null;
        let latestViolationsByImpact = {
          critical: 0,
          serious: 0,
          moderate: 0,
          minor: 0,
        };
        if (latestCompleted) {
          const impactRows = await db
            .select({
              impact: violations.impact,
              count: count(),
            })
            .from(violations)
            .where(eq(violations.scanId, latestCompleted.id))
            .groupBy(violations.impact);

          for (const row of impactRows) {
            if (row.impact in latestViolationsByImpact) {
              latestViolationsByImpact[row.impact as keyof typeof latestViolationsByImpact] =
                Number(row.count);
            }
          }
        }

        const issuesBySeverity = {
          critical: 0,
          serious: 0,
          moderate: 0,
          minor: 0,
        };
        for (const row of severityRows) {
          if (row.severity in issuesBySeverity) {
            issuesBySeverity[row.severity as keyof typeof issuesBySeverity] = Number(row.count);
          }
        }

        const issuesByStatus: Record<string, number> = {};
        for (const row of statusRows) {
          issuesByStatus[row.status] = Number(row.count);
        }

        const data = {
          asset: assetRow,
          summary: {
            scanCount: scanRows.length,
            completedScanCount: scanRows.filter((s) => s.status === 'completed').length,
            failedScanCount: scanRows.filter((s) => s.status === 'failed').length,
            openIssuesCount: Number(openIssuesCountRow[0]?.count ?? 0),
            latestScore: latestCompleted?.score ?? null,
            latestScanAt: latestCompleted?.completedAt ?? latestCompleted?.createdAt ?? null,
            latestPagesScanned: latestCompleted?.pagesScanned ?? null,
            latestViolationCount: latestCompleted?.violationCount ?? null,
            issuesBySeverity,
            issuesByStatus,
            latestViolationsByImpact,
            topRules: topRuleRows.map((r) => ({
              ruleId: r.ruleId,
              impact: r.impact,
              count: Number(r.count),
            })),
          },
          scans: scanRows,
          openIssues: recentIssues,
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

  // ─── Invoices / billing ───────────────────────────────────────────────────

  router.get('/invoices', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, offset } = pagination(req);
      const status = typeof req.query.status === 'string' ? req.query.status : '';
      const orgId = typeof req.query.orgId === 'string' ? req.query.orgId : '';

      const conditions = [];
      if (status && invoiceStatusSchema.safeParse(status).success) {
        conditions.push(eq(invoices.status, status as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'));
      }
      if (orgId && z.string().uuid().safeParse(orgId).success) {
        conditions.push(eq(invoices.organisationId, orgId));
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, [totalRow]] = await Promise.all([
        db
          .select({
            id: invoices.id,
            organisationId: invoices.organisationId,
            organisationName: organisations.name,
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
            createdAt: invoices.createdAt,
          })
          .from(invoices)
          .innerJoin(organisations, eq(invoices.organisationId, organisations.id))
          .where(where)
          .orderBy(desc(invoices.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: count() })
          .from(invoices)
          .where(where),
      ]);

      const response: ApiResponse<typeof rows> = {
        data: rows,
        meta: { page, pageSize: limit, total: totalRow?.count ?? 0, totalPages: Math.ceil((totalRow?.count ?? 0) / limit) || 1 },
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/invoices/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id ?? '';
      if (!z.string().uuid().safeParse(id).success) {
        sendProblem(res, 400, 'validation-error', 'Invalid invoice ID');
        return;
      }

      const schema = z.object({
        status: invoiceStatusSchema,
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        sendProblem(res, 400, 'validation-error', 'Invalid request body');
        return;
      }

      const updates: Partial<typeof invoices.$inferInsert> = {
        status: parsed.data.status,
        updatedAt: new Date().toISOString(),
      };
      if (parsed.data.status === 'paid') {
        updates.paidAt = new Date().toISOString();
      }

      const [updated] = await db
        .update(invoices)
        .set(updates)
        .where(eq(invoices.id, id))
        .returning();

      if (!updated) {
        sendProblem(res, 404, 'not-found', 'Invoice not found');
        return;
      }

      logger.info(
        { invoiceId: id, status: parsed.data.status, actor: req.user?.sub },
        'Admin updated invoice status',
      );

      const response: ApiResponse<typeof updated> = {
        data: updated,
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  // ─── Enterprise quotes ────────────────────────────────────────────────────

  router.get('/enterprise-quotes', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, offset } = pagination(req);
      const status = typeof req.query.status === 'string' ? req.query.status : '';
      const conditions = [];
      if (status && quoteStatusSchema.safeParse(status).success) {
        conditions.push(eq(enterpriseQuotes.status, status));
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, [totalRow]] = await Promise.all([
        db
          .select()
          .from(enterpriseQuotes)
          .where(where)
          .orderBy(desc(enterpriseQuotes.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(enterpriseQuotes).where(where),
      ]);

      const response: ApiResponse<typeof rows> = {
        data: rows,
        meta: { page, pageSize: limit, total: totalRow?.count ?? 0, totalPages: Math.ceil((totalRow?.count ?? 0) / limit) || 1 },
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  router.patch(
    '/enterprise-quotes/:id',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const id = req.params.id ?? '';
        if (!z.string().uuid().safeParse(id).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid quote ID');
          return;
        }
        const schema = z.object({
          status: quoteStatusSchema.optional(),
          notes: z.string().max(5000).nullable().optional(),
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid request body');
          return;
        }

        const updates: Partial<typeof enterpriseQuotes.$inferInsert> = {
          updatedAt: new Date().toISOString(),
        };
        if (parsed.data.status !== undefined) updates.status = parsed.data.status;
        if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

        const [updated] = await db
          .update(enterpriseQuotes)
          .set(updates)
          .where(eq(enterpriseQuotes.id, id))
          .returning();

        if (!updated) {
          sendProblem(res, 404, 'not-found', 'Quote not found');
          return;
        }

        const response: ApiResponse<typeof updated> = {
          data: updated,
          timestamp: new Date().toISOString(),
        };
        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  // ─── Waitlist ─────────────────────────────────────────────────────────────

  router.get('/waitlist', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, offset } = pagination(req);
      const status = typeof req.query.status === 'string' ? req.query.status : '';
      const conditions = [];
      if (status && waitlistStatusSchema.safeParse(status).success) {
        conditions.push(eq(waitlistSignups.status, status));
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, [totalRow]] = await Promise.all([
        db
          .select()
          .from(waitlistSignups)
          .where(where)
          .orderBy(desc(waitlistSignups.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(waitlistSignups).where(where),
      ]);

      const response: ApiResponse<typeof rows> = {
        data: rows,
        meta: { page, pageSize: limit, total: totalRow?.count ?? 0, totalPages: Math.ceil((totalRow?.count ?? 0) / limit) || 1 },
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/waitlist/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id ?? '';
      if (!z.string().uuid().safeParse(id).success) {
        sendProblem(res, 400, 'validation-error', 'Invalid waitlist ID');
        return;
      }
      const schema = z.object({
        status: waitlistStatusSchema.optional(),
        adminNotes: z.string().max(5000).nullable().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        sendProblem(res, 400, 'validation-error', 'Invalid request body');
        return;
      }

      const updates: Partial<typeof waitlistSignups.$inferInsert> = {
        updatedAt: new Date().toISOString(),
      };
      if (parsed.data.status !== undefined) updates.status = parsed.data.status;
      if (parsed.data.adminNotes !== undefined) updates.adminNotes = parsed.data.adminNotes;

      const [updated] = await db
        .update(waitlistSignups)
        .set(updates)
        .where(eq(waitlistSignups.id, id))
        .returning();

      if (!updated) {
        sendProblem(res, 404, 'not-found', 'Waitlist signup not found');
        return;
      }

      const response: ApiResponse<typeof updated> = {
        data: updated,
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  // ─── Cross-tenant engagements ─────────────────────────────────────────────

  router.get('/engagements', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, offset } = pagination(req);
      const status = typeof req.query.status === 'string' ? req.query.status : '';
      const conditions = [];
      if (status && engagementStatusSchema.safeParse(status).success) {
        conditions.push(eq(serviceEngagements.status, status));
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, [totalRow]] = await Promise.all([
        db
          .select({
            id: serviceEngagements.id,
            organisationId: serviceEngagements.organisationId,
            organisationName: organisations.name,
            type: serviceEngagements.type,
            title: serviceEngagements.title,
            status: serviceEngagements.status,
            dueAt: serviceEngagements.dueAt,
            notes: serviceEngagements.notes,
            createdAt: serviceEngagements.createdAt,
          })
          .from(serviceEngagements)
          .innerJoin(organisations, eq(serviceEngagements.organisationId, organisations.id))
          .where(where)
          .orderBy(desc(serviceEngagements.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(serviceEngagements).where(where),
      ]);

      const response: ApiResponse<typeof rows> = {
        data: rows,
        meta: { page, pageSize: limit, total: totalRow?.count ?? 0, totalPages: Math.ceil((totalRow?.count ?? 0) / limit) || 1 },
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/engagements/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id ?? '';
      if (!z.string().uuid().safeParse(id).success) {
        sendProblem(res, 400, 'validation-error', 'Invalid engagement ID');
        return;
      }
      const schema = z.object({
        status: engagementStatusSchema.optional(),
        notes: z.string().max(5000).nullable().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        sendProblem(res, 400, 'validation-error', 'Invalid request body');
        return;
      }

      const updates: Partial<typeof serviceEngagements.$inferInsert> = {
        updatedAt: new Date().toISOString(),
      };
      if (parsed.data.status !== undefined) updates.status = parsed.data.status;
      if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

      const [updated] = await db
        .update(serviceEngagements)
        .set(updates)
        .where(eq(serviceEngagements.id, id))
        .returning();

      if (!updated) {
        sendProblem(res, 404, 'not-found', 'Engagement not found');
        return;
      }

      const response: ApiResponse<typeof updated> = {
        data: updated,
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  // ─── Funnel events (read-only) ────────────────────────────────────────────

  router.get('/funnel-events', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, offset } = pagination(req);
      const event = typeof req.query.event === 'string' ? req.query.event : '';
      const conditions = [];
      if (event) conditions.push(eq(funnelEvents.event, event));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, [totalRow]] = await Promise.all([
        db
          .select()
          .from(funnelEvents)
          .where(where)
          .orderBy(desc(funnelEvents.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(funnelEvents).where(where),
      ]);

      const response: ApiResponse<typeof rows> = {
        data: rows,
        meta: { page, pageSize: limit, total: totalRow?.count ?? 0, totalPages: Math.ceil((totalRow?.count ?? 0) / limit) || 1 },
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });
}

/** Extra stats for overview cards — called from patched /stats or separately. */
export async function getAdminInboxStats(db: Database): Promise<{
  pendingInvoices: number;
  pendingInvoicePaise: number;
  newEnterpriseQuotes: number;
  newWaitlist: number;
  requestedEngagements: number;
}> {
  const [[pendingInv], [pendingSum], [newQuotes], [newWait], [reqEng]] = await Promise.all([
    db
      .select({ count: count() })
      .from(invoices)
      .where(inArray(invoices.status, ['draft', 'sent', 'overdue'])),
    db
      .select({
        total: sql<number>`coalesce(sum(${invoices.totalPaise}), 0)`,
      })
      .from(invoices)
      .where(inArray(invoices.status, ['draft', 'sent', 'overdue'])),
    db
      .select({ count: count() })
      .from(enterpriseQuotes)
      .where(eq(enterpriseQuotes.status, 'new')),
    db
      .select({ count: count() })
      .from(waitlistSignups)
      .where(eq(waitlistSignups.status, 'new')),
    db
      .select({ count: count() })
      .from(serviceEngagements)
      .where(eq(serviceEngagements.status, 'requested')),
  ]);

  return {
    pendingInvoices: pendingInv?.count ?? 0,
    pendingInvoicePaise: Number(pendingSum?.total ?? 0),
    newEnterpriseQuotes: newQuotes?.count ?? 0,
    newWaitlist: newWait?.count ?? 0,
    requestedEngagements: reqEng?.count ?? 0,
  };
}
