/**
 * Platform admin API — super_admin only.
 */

import type { Database } from '@accessshield/db';
import { organisations, scans, users, widgetPreferences } from '@accessshield/db';
import type { ApiResponse, PaginationMeta } from '@accessshield/types';
import { and, count, desc, eq, gte, ilike, isNull, or } from 'drizzle-orm';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import {
  countActiveOrganisations,
  countWidgetsEnabled,
  getMonthStart,
  getOrgListMetricsBatch,
  getOrgSummary,
  getOrCreateOrgWidgetPrefs,
} from '../../lib/admin-org-metrics';
import { slugifyCompanyName, uniqueSlug } from '../../lib/slug';
import { sendProblem } from '../../lib/problem-details';
import { logger } from '../../lib/logger';
import { requireRoles } from '../../middleware/rbac';
import { createIdentityAdmin } from '../../services/identity-admin';
import { provisionOrgUser } from '../../services/user-provisioning';
import type { AppSecrets } from '../../config/secrets';

const PLAN_TIERS = [
  'trial',
  'starter',
  'widget',
  'compliance_shield',
  'regulatory_defense',
  'professional',
  'enterprise',
  'government',
] as const;

const createOrgSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z.string().min(2).max(100).optional(),
  planTier: z.enum(PLAN_TIERS).default('starter'),
  billingEmail: z.string().email().optional(),
  gstin: z.string().max(15).optional(),
  isActive: z.boolean().default(true),
});

const updateOrgSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  planTier: z.enum(PLAN_TIERS).optional(),
  billingEmail: z.string().email().optional(),
  gstin: z.string().max(15).optional().nullable(),
  isActive: z.boolean().optional(),
});

const createOrgUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2).max(255),
  role: z.enum(['customer_admin', 'accessibility_officer', 'developer', 'auditor']),
});

const updateUserSchema = z.object({
  role: z
    .enum(['customer_admin', 'accessibility_officer', 'developer', 'auditor', 'super_admin'])
    .optional(),
  isActive: z.boolean().optional(),
  fullName: z.string().min(2).max(255).optional(),
});

const updateWidgetSchema = z.object({
  isEnabled: z.boolean(),
});

export function createAdminRouter(db: Database, secrets: AppSecrets, redis: Redis): ExpressRouter {
  const router = Router();
  const identityAdmin = createIdentityAdmin(secrets);

  router.use(requireRoles('super_admin'));

  router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const monthStart = getMonthStart();

      const [[orgCount], [userCount], [scanCount], activeOrganisations, widgetsEnabled] =
        await Promise.all([
          db.select({ count: count() }).from(organisations),
          db.select({ count: count() }).from(users),
          db
            .select({ count: count() })
            .from(scans)
            .where(gte(scans.createdAt, monthStart.toISOString())),
          countActiveOrganisations(db),
          countWidgetsEnabled(db),
        ]);

      const response: ApiResponse<{
        organisations: number;
        users: number;
        scansThisMonth: number;
        activeOrganisations: number;
        widgetsEnabled: number;
      }> = {
        data: {
          organisations: orgCount?.count ?? 0,
          users: userCount?.count ?? 0,
          scansThisMonth: scanCount?.count ?? 0,
          activeOrganisations,
          widgetsEnabled,
        },
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  router.get('/organisations', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const offset = (page - 1) * limit;
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

      const conditions = search
        ? or(ilike(organisations.name, `%${search}%`), ilike(organisations.slug, `%${search}%`))
        : undefined;

      const rows = await db
        .select({
          id: organisations.id,
          name: organisations.name,
          slug: organisations.slug,
          gstin: organisations.gstin,
          billingEmail: organisations.billingEmail,
          isActive: organisations.isActive,
          planTier: organisations.planTier,
          createdAt: organisations.createdAt,
          updatedAt: organisations.updatedAt,
        })
        .from(organisations)
        .where(conditions)
        .orderBy(desc(organisations.createdAt))
        .limit(limit)
        .offset(offset);

      const orgIds = rows.map((r) => r.id);
      const metricsMap = await getOrgListMetricsBatch(db, orgIds);

      const enriched = rows.map((org) => {
        const metrics = metricsMap.get(org.id)!;
        return {
          ...org,
          userCount: metrics.userCount,
          assetCount: metrics.assetCount,
          scansThisMonth: metrics.scansThisMonth,
          widgetEnabled: metrics.widgetEnabled,
        };
      });

      const [totalResult] = await db
        .select({ count: count() })
        .from(organisations)
        .where(conditions);

      const total = totalResult?.count ?? 0;
      const meta: PaginationMeta = {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      };

      const response: ApiResponse<typeof enriched> = {
        data: enriched,
        meta,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  router.post('/organisations', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parseResult = createOrgSchema.safeParse(req.body);
      if (!parseResult.success) {
        sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
          errors: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const data = parseResult.data;
      const slugRows = await db.select({ slug: organisations.slug }).from(organisations);
      const existingSlugs = new Set(slugRows.map((r) => r.slug));
      const slug = data.slug ?? uniqueSlug(slugifyCompanyName(data.name), existingSlugs);

      const [created] = await db
        .insert(organisations)
        .values({
          name: data.name,
          slug,
          planTier: data.planTier,
          billingEmail: data.billingEmail ?? null,
          gstin: data.gstin ?? null,
          isActive: data.isActive,
        })
        .returning();

      if (!created) {
        sendProblem(res, 500, 'db-error', 'Failed to create organisation');
        return;
      }

      logger.info({ orgId: created.id, actor: req.user?.sub }, 'Organisation created by admin');

      const response: ApiResponse<typeof created> = {
        data: created,
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/organisations/:id/summary',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const orgId = req.params.id ?? '';
        if (!z.string().uuid().safeParse(orgId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid organisation ID');
          return;
        }

        const summary = await getOrgSummary(db, redis, orgId);
        if (!summary) {
          sendProblem(res, 404, 'not-found', 'Organisation not found');
          return;
        }

        const response: ApiResponse<typeof summary> = {
          data: summary,
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    '/organisations/:id/widget',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const orgId = req.params.id ?? '';
        if (!z.string().uuid().safeParse(orgId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid organisation ID');
          return;
        }

        const parseResult = updateWidgetSchema.safeParse(req.body);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const [org] = await db
          .select({ id: organisations.id })
          .from(organisations)
          .where(eq(organisations.id, orgId))
          .limit(1);

        if (!org) {
          sendProblem(res, 404, 'not-found', 'Organisation not found');
          return;
        }

        const prefs = await getOrCreateOrgWidgetPrefs(db, orgId);
        await db
          .update(widgetPreferences)
          .set({
            isEnabled: parseResult.data.isEnabled,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(widgetPreferences.id, prefs.id));

        logger.info(
          {
            orgId,
            isEnabled: parseResult.data.isEnabled,
            actor: req.user?.sub,
          },
          'Widget toggled by platform admin',
        );

        const summary = await getOrgSummary(db, redis, orgId);

        const response: ApiResponse<{ widget: NonNullable<typeof summary>['widget'] }> = {
          data: { widget: summary!.widget },
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/organisations/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.params.id ?? '';
      if (!z.string().uuid().safeParse(orgId).success) {
        sendProblem(res, 400, 'validation-error', 'Invalid organisation ID');
        return;
      }

      const [org] = await db
        .select()
        .from(organisations)
        .where(eq(organisations.id, orgId))
        .limit(1);

      if (!org) {
        sendProblem(res, 404, 'not-found', 'Organisation not found');
        return;
      }

      const response: ApiResponse<typeof org> = {
        data: org,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/organisations/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.params.id ?? '';
      if (!z.string().uuid().safeParse(orgId).success) {
        sendProblem(res, 400, 'validation-error', 'Invalid organisation ID');
        return;
      }

      const parseResult = updateOrgSchema.safeParse(req.body);
      if (!parseResult.success) {
        sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
          errors: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const updates: Partial<typeof organisations.$inferInsert> = {
        updatedAt: new Date().toISOString(),
      };
      const data = parseResult.data;
      if (data.name !== undefined) updates.name = data.name;
      if (data.planTier !== undefined) updates.planTier = data.planTier;
      if (data.billingEmail !== undefined) updates.billingEmail = data.billingEmail;
      if (data.gstin !== undefined) updates.gstin = data.gstin;
      if (data.isActive !== undefined) updates.isActive = data.isActive;

      const [updated] = await db
        .update(organisations)
        .set(updates)
        .where(eq(organisations.id, orgId))
        .returning();

      if (!updated) {
        sendProblem(res, 404, 'not-found', 'Organisation not found');
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

  router.get(
    '/organisations/:id/users',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const orgId = req.params.id ?? '';
        if (!z.string().uuid().safeParse(orgId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid organisation ID');
          return;
        }

        const rows = await db
          .select({
            id: users.id,
            organisationId: users.organisationId,
            authUserId: users.authUserId,
            email: users.email,
            fullName: users.fullName,
            role: users.role,
            isActive: users.isActive,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(eq(users.organisationId, orgId))
          .orderBy(desc(users.createdAt));

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

  router.post(
    '/organisations/:id/users',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const orgId = req.params.id ?? '';
        if (!z.string().uuid().safeParse(orgId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid organisation ID');
          return;
        }

        const parseResult = createOrgUserSchema.safeParse(req.body);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const [org] = await db
          .select({ id: organisations.id })
          .from(organisations)
          .where(eq(organisations.id, orgId))
          .limit(1);

        if (!org) {
          sendProblem(res, 404, 'not-found', 'Organisation not found');
          return;
        }

        const data = parseResult.data;
        const result = await provisionOrgUser(db, identityAdmin, {
          orgId,
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          role: data.role,
        });

        const [createdUser] = await db
          .select({
            id: users.id,
            email: users.email,
            fullName: users.fullName,
            role: users.role,
            isActive: users.isActive,
          })
          .from(users)
          .where(eq(users.id, result.userId))
          .limit(1);

        logger.info(
          { orgId, userId: result.userId, actor: req.user?.sub },
          'User created by admin',
        );

        const response: ApiResponse<typeof createdUser> = {
          data: createdUser!,
          timestamp: new Date().toISOString(),
        };

        res.status(201).json(response);
      } catch (err) {
        if (err instanceof Error && err.message === 'EMAIL_ALREADY_REGISTERED') {
          sendProblem(res, 409, 'conflict', 'A user with this email already exists');
          return;
        }
        next(err);
      }
    },
  );

  router.patch('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id ?? '';
      if (!z.string().uuid().safeParse(userId).success) {
        sendProblem(res, 400, 'validation-error', 'Invalid user ID');
        return;
      }

      const parseResult = updateUserSchema.safeParse(req.body);
      if (!parseResult.success) {
        sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
          errors: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const [existing] = await db
        .select({
          id: users.id,
          authUserId: users.authUserId,
          organisationId: users.organisationId,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!existing) {
        sendProblem(res, 404, 'not-found', 'User not found');
        return;
      }

      const data = parseResult.data;
      const updates: Partial<typeof users.$inferInsert> = {
        updatedAt: new Date().toISOString(),
      };
      if (data.fullName !== undefined) updates.fullName = data.fullName;
      if (data.role !== undefined) updates.role = data.role;
      if (data.isActive !== undefined) updates.isActive = data.isActive;

      const [updated] = await db.update(users).set(updates).where(eq(users.id, userId)).returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        isActive: users.isActive,
        organisationId: users.organisationId,
      });

      const newRole = data.role ?? existing.role;
      await identityAdmin.setUserAppMetadata(existing.authUserId, {
        user_role: newRole,
        org_id: existing.organisationId,
      });

      const response: ApiResponse<typeof updated> = {
        data: updated!,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
