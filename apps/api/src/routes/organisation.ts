/**
 * Organisation settings API — GET / PATCH for the caller's tenant.
 */

import type { Database } from '@accessshield/db';
import { organisations, priorityConfigs } from '@accessshield/db';
import type { ApiResponse } from '@accessshield/types';
import { eq } from 'drizzle-orm';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { sendProblem } from '../lib/problem-details';
import { requireRoles } from '../middleware/rbac';
import { DEFAULT_PRIORITY_WEIGHTS } from '../services/priority-score';

const updateOrganisationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  gstin: z
    .union([
      z.literal(''),
      z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/),
    ])
    .optional(),
  billingEmail: z.string().email().optional(),
  billingAddress: z.string().max(2000).optional(),
  aiProvider: z.enum(['anthropic', 'local']).optional(),
  aiModel: z.string().min(1).max(150).optional(),
});

export function createOrganisationRouter(db: Database): ExpressRouter {
  const router = Router();

  router.get(
    '/',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;

        const [org] = await db
          .select({
            id: organisations.id,
            name: organisations.name,
            slug: organisations.slug,
            gstin: organisations.gstin,
            billingEmail: organisations.billingEmail,
            isActive: organisations.isActive,
            planTier: organisations.planTier,
            aiProvider: organisations.aiProvider,
            aiModel: organisations.aiModel,
            createdAt: organisations.createdAt,
            updatedAt: organisations.updatedAt,
          })
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
    },
  );

  const priorityConfigSchema = z.object({
    userImpact: z.number().min(0).max(1).optional(),
    regulatoryWeight: z.number().min(0).max(1).optional(),
    atCoverage: z.number().min(0).max(1).optional(),
    inverseFixComplexity: z.number().min(0).max(1).optional(),
  });

  router.get(
    '/priority-config',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const [config] = await db
          .select()
          .from(priorityConfigs)
          .where(eq(priorityConfigs.organisationId, orgId))
          .limit(1);

        const data = config
          ? {
              userImpact: config.userImpactWeight,
              regulatoryWeight: config.regulatoryWeight,
              atCoverage: config.atCoverageWeight,
              inverseFixComplexity: config.fixComplexityWeight,
            }
          : DEFAULT_PRIORITY_WEIGHTS;

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

  router.put(
    '/priority-config',
    requireRoles('customer_admin', 'accessibility_officer'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parsed = priorityConfigSchema.safeParse(req.body);
        if (!parsed.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid priority config', undefined, {
            errors: parsed.error.flatten().fieldErrors,
          });
          return;
        }

        const orgId = req.user!.org_id;
        const nextWeights = {
          ...DEFAULT_PRIORITY_WEIGHTS,
          ...parsed.data,
        };

        const [existing] = await db
          .select({ id: priorityConfigs.id })
          .from(priorityConfigs)
          .where(eq(priorityConfigs.organisationId, orgId))
          .limit(1);

        if (existing) {
          await db
            .update(priorityConfigs)
            .set({
              userImpactWeight: nextWeights.userImpact,
              regulatoryWeight: nextWeights.regulatoryWeight,
              atCoverageWeight: nextWeights.atCoverage,
              fixComplexityWeight: nextWeights.inverseFixComplexity,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(priorityConfigs.organisationId, orgId));
        } else {
          await db.insert(priorityConfigs).values({
            organisationId: orgId,
            userImpactWeight: nextWeights.userImpact,
            regulatoryWeight: nextWeights.regulatoryWeight,
            atCoverageWeight: nextWeights.atCoverage,
            fixComplexityWeight: nextWeights.inverseFixComplexity,
          });
        }

        const response: ApiResponse<typeof nextWeights> = {
          data: nextWeights,
          timestamp: new Date().toISOString(),
        };
        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    '/',
    requireRoles('customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parseResult = updateOrganisationSchema.safeParse(req.body);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const orgId = req.user!.org_id;
        const { name, gstin, billingEmail, aiProvider, aiModel } = parseResult.data;

        const updates: Partial<typeof organisations.$inferInsert> = {
          updatedAt: new Date().toISOString(),
        };
        if (name !== undefined) updates.name = name;
        if (gstin !== undefined) updates.gstin = gstin || null;
        if (billingEmail !== undefined) updates.billingEmail = billingEmail;
        if (aiProvider !== undefined) updates.aiProvider = aiProvider;
        if (aiModel !== undefined) updates.aiModel = aiModel;

        const [updated] = await db
          .update(organisations)
          .set(updates)
          .where(eq(organisations.id, orgId))
          .returning({
            id: organisations.id,
            name: organisations.name,
            slug: organisations.slug,
            gstin: organisations.gstin,
            billingEmail: organisations.billingEmail,
            isActive: organisations.isActive,
            planTier: organisations.planTier,
            aiProvider: organisations.aiProvider,
            aiModel: organisations.aiModel,
            createdAt: organisations.createdAt,
            updatedAt: organisations.updatedAt,
          });

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
    },
  );

  return router;
}
