/**
 * Expert-services engagements — lightweight CRM for audits / remediation.
 */

import type { Database } from '@accessshield/db';
import { serviceEngagements } from '@accessshield/db';
import type { ApiResponse } from '@accessshield/types';
import { and, desc, eq } from 'drizzle-orm';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { sendProblem } from '../lib/problem-details';
import { requireRoles } from '../middleware/rbac';

const ENGAGEMENT_TYPES = [
  'audit-web',
  'at-manual',
  'remediation-small',
  'remediation-large',
  'mobile-scan',
  'sebi-pack',
  'governance',
  'reassessment',
] as const;

const createSchema = z.object({
  type: z.enum(ENGAGEMENT_TYPES),
  title: z.string().min(3).max(255),
  dueAt: z.string().datetime().optional(),
  assetId: z.string().uuid().optional(),
  scanId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
});

const updateSchema = z.object({
  status: z
    .enum(['requested', 'scoped', 'in_progress', 'delivered', 'cancelled'])
    .optional(),
  title: z.string().min(3).max(255).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export function createEngagementsRouter(db: Database): ExpressRouter {
  const router = Router();

  router.get(
    '/',
    requireRoles('customer_admin', 'accessibility_officer', 'auditor'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const rows = await db
          .select()
          .from(serviceEngagements)
          .where(eq(serviceEngagements.organisationId, orgId))
          .orderBy(desc(serviceEngagements.createdAt));

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
    '/',
    requireRoles('customer_admin', 'accessibility_officer'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid engagement', undefined, {
            errors: parsed.error.flatten().fieldErrors,
          });
          return;
        }

        const orgId = req.user!.org_id;
        const data = parsed.data;
        const [row] = await db
          .insert(serviceEngagements)
          .values({
            organisationId: orgId,
            type: data.type,
            title: data.title,
            dueAt: data.dueAt ?? null,
            assetId: data.assetId ?? null,
            scanId: data.scanId ?? null,
            notes: data.notes ?? null,
            status: 'requested',
          })
          .returning();

        const response: ApiResponse<typeof row> = {
          data: row,
          timestamp: new Date().toISOString(),
        };
        res.status(201).json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    '/:id',
    requireRoles('customer_admin', 'accessibility_officer'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const id = z.string().uuid().parse(req.params.id);
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid update', undefined, {
            errors: parsed.error.flatten().fieldErrors,
          });
          return;
        }

        const orgId = req.user!.org_id;
        const updates: Record<string, unknown> = { ...parsed.data };
        const [row] = await db
          .update(serviceEngagements)
          .set(updates)
          .where(
            and(eq(serviceEngagements.id, id), eq(serviceEngagements.organisationId, orgId)),
          )
          .returning();

        if (!row) {
          sendProblem(res, 404, 'not-found', 'Engagement not found');
          return;
        }

        const response: ApiResponse<typeof row> = {
          data: row,
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
