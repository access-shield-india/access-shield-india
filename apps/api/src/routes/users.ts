/**
 * Team / users API — list org members and invite.
 */

import type { Database } from '@accessshield/db';
import { users } from '@accessshield/db';
import type { ApiResponse } from '@accessshield/types';
import { asc, eq } from 'drizzle-orm';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { AppSecrets } from '../config/secrets';
import { logger } from '../lib/logger';
import { sendProblem } from '../lib/problem-details';
import { requireRoles } from '../middleware/rbac';
import { createIdentityAdmin } from '../services/identity-admin';
import { provisionOrgUser } from '../services/user-provisioning';

const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['customer_admin', 'accessibility_officer', 'developer', 'auditor']),
  fullName: z.string().min(1).max(255).optional(),
});

function generateTemporaryPassword(): string {
  return randomBytes(12).toString('base64url').slice(0, 16);
}

export function createUsersRouter(db: Database, secrets: AppSecrets): ExpressRouter {
  const router = Router();
  const identityAdmin = createIdentityAdmin(secrets);

  router.get(
    '/',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;

        const rows = await db
          .select({
            id: users.id,
            organisationId: users.organisationId,
            authUserId: users.authUserId,
            email: users.email,
            fullName: users.fullName,
            role: users.role,
            isActive: users.isActive,
            mfaEnabled: users.mfaEnabled,
            lastLoginAt: users.lastLoginAt,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .where(eq(users.organisationId, orgId))
          .orderBy(asc(users.createdAt));

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
    '/invite',
    requireRoles('customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parseResult = inviteUserSchema.safeParse(req.body);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const orgId = req.user!.org_id;
        const data = parseResult.data;
        const tempPassword = generateTemporaryPassword();
        const fullName = data.fullName ?? data.email.split('@')[0] ?? 'Team member';

        const result = await provisionOrgUser(db, identityAdmin, {
          orgId,
          email: data.email,
          password: tempPassword,
          fullName,
          role: data.role,
        });

        logger.info({ orgId, userId: result.userId, email: data.email }, 'User invited');

        const response: ApiResponse<{
          userId: string;
          email: string;
          temporaryPassword?: string;
          message: string;
        }> = {
          data: {
            userId: result.userId,
            email: data.email,
            ...(process.env.NODE_ENV !== 'production' ? { temporaryPassword: tempPassword } : {}),
            message:
              process.env.NODE_ENV === 'production'
                ? 'User created. Share login credentials through your secure channel.'
                : 'User created. Temporary password returned in dev mode only.',
          },
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

  return router;
}
