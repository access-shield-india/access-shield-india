/**
 * Issues API — remediation tracking for scan violations.
 */

import type { Database } from '@accessshield/db';
import { assets, issues, lookupUserByAuthId, users, violations } from '@accessshield/db';
import type { ApiResponse, PaginationMeta } from '@accessshield/types';
import { and, count, desc, eq, gte, ilike, isNull, lte, or, sql } from 'drizzle-orm';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { sendProblem } from '../lib/problem-details';
import { requireRoles } from '../middleware/rbac';
import { generateIssueAiAltText, generateIssueAiFix } from '../services/ai-enrichment';
import { isDevPreviewAiFix, stripDevPreviewComment } from '../lib/dev-mock-ai';

const listIssuesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'wont_fix', 'duplicate', 'all']).optional(),
  severity: z.enum(['critical', 'serious', 'moderate', 'minor', 'all']).optional(),
  assignee: z.enum(['me', 'unassigned', 'all']).optional(),
  assetId: z.string().uuid().optional(),
  wcagCriterion: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const patchIssueSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'wont_fix', 'duplicate']).optional(),
  severity: z.enum(['critical', 'serious', 'moderate', 'minor']).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export function createIssuesRouter(db: Database): ExpressRouter {
  const router = Router();

  router.get(
    '/stats',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;

        const base = eq(issues.organisationId, orgId);

        const [[openRow], [inProgressRow], [resolvedRow], [criticalRow]] = await Promise.all([
          db
            .select({ count: count() })
            .from(issues)
            .where(and(base, eq(issues.status, 'open'))),
          db
            .select({ count: count() })
            .from(issues)
            .where(and(base, eq(issues.status, 'in_progress'))),
          db
            .select({ count: count() })
            .from(issues)
            .where(and(base, eq(issues.status, 'resolved'))),
          db
            .select({ count: count() })
            .from(issues)
            .where(
              and(
                base,
                or(eq(issues.status, 'open'), eq(issues.status, 'in_progress')),
                eq(issues.severity, 'critical'),
              ),
            ),
        ]);

        const response: ApiResponse<{
          openCount: number;
          inProgressCount: number;
          resolvedCount: number;
          criticalCount: number;
        }> = {
          data: {
            openCount: openRow?.count ?? 0,
            inProgressCount: inProgressRow?.count ?? 0,
            resolvedCount: resolvedRow?.count ?? 0,
            criticalCount: criticalRow?.count ?? 0,
          },
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const parseResult = listIssuesSchema.safeParse(req.query);

        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid query parameters', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const {
          page,
          limit,
          search,
          status,
          severity,
          assignee,
          assetId,
          wcagCriterion,
          dateFrom,
          dateTo,
        } = parseResult.data;

        const conditions = [eq(issues.organisationId, orgId)];

        if (status && status !== 'all') {
          conditions.push(eq(issues.status, status));
        }

        if (severity && severity !== 'all') {
          conditions.push(eq(issues.severity, severity));
        }

        if (assetId) {
          conditions.push(eq(issues.assetId, assetId));
        }

        if (search) {
          conditions.push(
            or(ilike(issues.title, `%${search}%`), ilike(issues.description, `%${search}%`))!,
          );
        }

        if (dateFrom) {
          conditions.push(gte(issues.createdAt, dateFrom));
        }

        if (dateTo) {
          conditions.push(lte(issues.createdAt, dateTo));
        }

        if (assignee === 'unassigned') {
          conditions.push(isNull(issues.assignedTo));
        }

        if (assignee === 'me') {
          const appUser = await lookupUserByAuthId(db, req.user!.sub);
          if (!appUser || appUser.org_id !== orgId) {
            sendProblem(res, 404, 'not-found', 'User profile not found');
            return;
          }
          conditions.push(eq(issues.assignedTo, appUser.id));
        }

        if (wcagCriterion) {
          conditions.push(
            sql`exists (
              select 1 from violations v
              where v.id = ${issues.violationId}
              and ${wcagCriterion} = any(v.wcag_criteria)
            )`,
          );
        }

        const offset = (page - 1) * limit;

        const [totalRow] = await db
          .select({ count: count() })
          .from(issues)
          .where(and(...conditions));

        const total = totalRow?.count ?? 0;

        const rows = await db
          .select({
            id: issues.id,
            organisationId: issues.organisationId,
            violationId: issues.violationId,
            assetId: issues.assetId,
            assignedTo: issues.assignedTo,
            title: issues.title,
            description: issues.description,
            status: issues.status,
            severity: issues.severity,
            dueDate: issues.dueDate,
            resolvedAt: issues.resolvedAt,
            resolvedBy: issues.resolvedBy,
            createdAt: issues.createdAt,
            updatedAt: issues.updatedAt,
            assetName: assets.name,
            assetUrl: assets.url,
            assigneeName: users.fullName,
            assigneeEmail: users.email,
            violationRuleId: violations.ruleId,
            violationWcag: violations.wcagCriteria,
            violationSelector: violations.selector,
            violationHtml: violations.html,
            violationPageUrl: violations.pageUrl,
            violationHelpUrl: violations.helpUrl,
          })
          .from(issues)
          .leftJoin(assets, eq(issues.assetId, assets.id))
          .leftJoin(users, eq(issues.assignedTo, users.id))
          .leftJoin(violations, eq(issues.violationId, violations.id))
          .where(and(...conditions))
          .orderBy(desc(issues.createdAt))
          .limit(limit)
          .offset(offset);

        const data = rows.map((row) => ({
          id: row.id,
          organisationId: row.organisationId,
          violationId: row.violationId,
          assetId: row.assetId,
          assignedTo: row.assignedTo,
          title: row.title,
          description: row.description,
          status: row.status,
          severity: row.severity,
          dueDate: row.dueDate,
          resolvedAt: row.resolvedAt,
          resolvedBy: row.resolvedBy,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          asset: row.assetName
            ? { id: row.assetId, name: row.assetName, url: row.assetUrl ?? '' }
            : undefined,
          assignee: row.assignedTo
            ? {
                id: row.assignedTo,
                fullName: row.assigneeName,
                email: row.assigneeEmail ?? '',
                role: 'developer' as const,
              }
            : null,
          violation: row.violationId
            ? {
                id: row.violationId,
                scanId: '',
                ruleId: row.violationRuleId ?? '',
                impact: row.severity,
                description: row.description ?? '',
                helpUrl: row.violationHelpUrl,
                wcagCriteria: row.violationWcag,
                selector: row.violationSelector,
                html: row.violationHtml,
                pageUrl: row.violationPageUrl,
                createdAt: row.createdAt,
              }
            : undefined,
        }));

        const meta: PaginationMeta = {
          page,
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        };

        const response: ApiResponse<typeof data> = {
          data,
          meta,
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/:id',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const issueId = req.params.id;

        if (!issueId || !z.string().uuid().safeParse(issueId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid issue ID');
          return;
        }

        const [row] = await db
          .select({
            id: issues.id,
            organisationId: issues.organisationId,
            violationId: issues.violationId,
            assetId: issues.assetId,
            assignedTo: issues.assignedTo,
            title: issues.title,
            description: issues.description,
            status: issues.status,
            severity: issues.severity,
            dueDate: issues.dueDate,
            resolvedAt: issues.resolvedAt,
            resolvedBy: issues.resolvedBy,
            createdAt: issues.createdAt,
            updatedAt: issues.updatedAt,
            assetName: assets.name,
            assetUrl: assets.url,
            assigneeName: users.fullName,
            assigneeEmail: users.email,
            violationRuleId: violations.ruleId,
            violationWcag: violations.wcagCriteria,
            violationSelector: violations.selector,
            violationHtml: violations.html,
            violationPageUrl: violations.pageUrl,
            violationHelpUrl: violations.helpUrl,
            violationAiFix: violations.aiFix,
            violationAiExplanation: violations.aiExplanation,
            violationAiAltText: violations.aiAltText,
          })
          .from(issues)
          .leftJoin(assets, eq(issues.assetId, assets.id))
          .leftJoin(users, eq(issues.assignedTo, users.id))
          .leftJoin(violations, eq(issues.violationId, violations.id))
          .where(and(eq(issues.id, issueId), eq(issues.organisationId, orgId)))
          .limit(1);

        if (!row) {
          sendProblem(res, 404, 'not-found', 'Issue not found');
          return;
        }

        const wcagCriterion = row.violationWcag?.[0] ?? null;
        const aiFixAfter = row.violationAiFix ? stripDevPreviewComment(row.violationAiFix) : null;

        const response: ApiResponse<Record<string, unknown>> = {
          data: {
            id: row.id,
            organisationId: row.organisationId,
            violationId: row.violationId,
            assetId: row.assetId,
            assignedTo: row.assignedTo,
            title: row.title,
            description: row.description,
            status: row.status,
            severity: row.severity,
            dueDate: row.dueDate,
            resolvedAt: row.resolvedAt,
            resolvedBy: row.resolvedBy,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            asset: row.assetName
              ? { id: row.assetId, name: row.assetName, url: row.assetUrl ?? '' }
              : undefined,
            assignee: row.assignedTo
              ? {
                  id: row.assignedTo,
                  fullName: row.assigneeName,
                  email: row.assigneeEmail ?? '',
                  role: 'developer',
                }
              : null,
            violation: row.violationId
              ? {
                  id: row.violationId,
                  ruleId: row.violationRuleId,
                  impact: row.severity,
                  description: row.description,
                  helpUrl: row.violationHelpUrl,
                  wcagCriteria: row.violationWcag,
                  selector: row.violationSelector,
                  html: row.violationHtml,
                  pageUrl: row.violationPageUrl,
                }
              : undefined,
            elementHtml: row.violationHtml,
            elementSelector: row.violationSelector,
            wcagCriterion,
            wcagTitle: wcagCriterion ? `WCAG ${wcagCriterion}` : null,
            aiFixSuggestion: aiFixAfter,
            aiExplanation: row.violationAiExplanation,
            aiAltText: row.violationAiAltText,
            aiFixDevPreview: isDevPreviewAiFix(row.violationAiExplanation, row.violationAiFix),
            aiFixBefore: row.violationHtml,
            aiFixAfter,
            comments: [],
            labels: [],
          },
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    '/:id',
    requireRoles('developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const issueId = req.params.id;

        const parseResult = patchIssueSchema.safeParse(req.body);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const updates = parseResult.data;
        const patch: Record<string, unknown> = { ...updates };

        if (updates.status === 'resolved') {
          const appUser = await lookupUserByAuthId(db, req.user!.sub);
          patch.resolvedAt = new Date().toISOString();
          patch.resolvedBy = appUser?.id ?? null;
        }

        if (updates.status && updates.status !== 'resolved') {
          patch.resolvedAt = null;
          patch.resolvedBy = null;
        }

        const [updated] = await db
          .update(issues)
          .set(patch)
          .where(and(eq(issues.id, issueId!), eq(issues.organisationId, orgId)))
          .returning();

        if (!updated) {
          sendProblem(res, 404, 'not-found', 'Issue not found');
          return;
        }

        const { publishRealtime } = await import('../lib/realtime/publish.js');
        await publishRealtime(`issues:${orgId}`, 'UPDATE', 'issues', {
          ...updated,
        });

        const response: ApiResponse<{ id: string; message: string }> = {
          data: { id: updated.id, message: 'Issue updated' },
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/:id/ai-fix',
    requireRoles('developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const issueId = req.params.id;

        if (!issueId || !z.string().uuid().safeParse(issueId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid issue ID');
          return;
        }

        const result = await generateIssueAiFix(db, orgId, issueId, { force: true });

        const response: ApiResponse<typeof result> = {
          data: result,
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        if (err instanceof Error && err.message.includes('not available on your plan')) {
          sendProblem(res, 403, 'forbidden', err.message);
          return;
        }
        if (err instanceof Error && err.message === 'Issue not found') {
          sendProblem(res, 404, 'not-found', err.message);
          return;
        }
        if (err instanceof Error && err.message.includes('not configured')) {
          sendProblem(res, 503, 'service-unavailable', 'AI service is temporarily unavailable');
          return;
        }
        if (err instanceof Error) {
          sendProblem(res, 502, 'ai-unavailable', 'AI fix generation failed', err.message);
          return;
        }
        next(err);
      }
    },
  );

  router.post(
    '/:id/ai-alt-text',
    requireRoles('developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const issueId = req.params.id;

        if (!issueId || !z.string().uuid().safeParse(issueId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid issue ID');
          return;
        }

        const result = await generateIssueAiAltText(db, orgId, issueId);

        const response: ApiResponse<typeof result> = {
          data: result,
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        if (err instanceof Error && err.message.includes('not available on your plan')) {
          sendProblem(res, 403, 'forbidden', err.message);
          return;
        }
        if (err instanceof Error && err.message === 'Issue not found') {
          sendProblem(res, 404, 'not-found', err.message);
          return;
        }
        if (err instanceof Error && err.message.includes('not configured')) {
          sendProblem(res, 503, 'service-unavailable', 'AI service is temporarily unavailable');
          return;
        }
        next(err);
      }
    },
  );

  router.post(
    '/:id/comments',
    requireRoles('developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        sendProblem(
          res,
          501,
          'not-implemented',
          'Issue comments are not available yet',
          'Comments will be added in a future release.',
        );
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
