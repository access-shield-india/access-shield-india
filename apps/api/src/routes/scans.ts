import type { UserRole } from '@accessshield/types';
import { Router, type Router as ExpressRouter } from 'express';
import type { Request, Response } from 'express';
import { requireRoles } from '../middleware/rbac';

const router: ExpressRouter = Router();

router.get(
  '/',
  requireRoles('developer', 'accessibility_officer', 'auditor'),
  (_req: Request, res: Response) => {
    res.json({
      data: [],
      timestamp: new Date().toISOString(),
    });
  },
);

router.post(
  '/',
  requireRoles('developer', 'accessibility_officer'),
  (_req: Request, res: Response) => {
    res.status(201).json({
      data: { message: 'Scan queued' },
      timestamp: new Date().toISOString(),
    });
  },
);

export { router as scansRouter };
