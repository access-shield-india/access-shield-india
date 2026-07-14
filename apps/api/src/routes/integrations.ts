/**
 * Third-party integrations API (Jira stub).
 */

import type { Database } from '@accessshield/db';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import { sendProblem } from '../lib/problem-details';
import { requireRoles } from '../middleware/rbac';

export function createIntegrationsRouter(_db: Database): ExpressRouter {
  const router = Router();

  router.get(
    '/jira',
    requireRoles('customer_admin', 'accessibility_officer'),
    async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
      sendProblem(res, 404, 'not-found', 'Jira integration not connected');
    },
  );

  router.delete(
    '/jira',
    requireRoles('customer_admin'),
    async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
      sendProblem(res, 404, 'not-found', 'Jira integration not connected');
    },
  );

  router.post(
    '/jira/sync',
    requireRoles('customer_admin', 'accessibility_officer'),
    async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
      sendProblem(res, 404, 'not-found', 'Jira integration not connected');
    },
  );

  return router;
}
