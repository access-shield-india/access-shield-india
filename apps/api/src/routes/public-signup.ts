/**
 * Public signup — self-service trial account provisioning.
 */

import type { Database } from '@accessshield/db';
import type { ApiResponse } from '@accessshield/types';
import type { Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import type { AppSecrets } from '../config/secrets';
import { logger } from '../lib/logger';
import { sendProblem } from '../lib/problem-details';
import { createIdentityAdmin } from '../services/identity-admin';
import { provisionTenantUser } from '../services/user-provisioning';

const INDIAN_PHONE_REGEX = /^(\+91|91|0)?[6-9]\d{9}$/;

function normalizePhone(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/[\s-]/g, '');
  return digits.length > 0 ? digits : undefined;
}

const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  phone: z
    .string()
    .optional()
    .transform((v) => normalizePhone(v))
    .refine((v) => v === undefined || INDIAN_PHONE_REGEX.test(v), {
      message: 'Invalid Indian phone number',
    }),
});

export function createPublicSignupRouter(
  db: Database,
  redis: Redis,
  secrets: AppSecrets,
): ExpressRouter {
  const router = Router();
  const identityAdmin = createIdentityAdmin(secrets);

  router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
      const parseResult = signupSchema.safeParse(req.body);
      if (!parseResult.success) {
        sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
          errors: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
      const rateLimitKey = `public-signup:ip:${ip}`;
      const currentCount = parseInt((await redis.get(rateLimitKey)) || '0', 10);

      if (currentCount >= 5) {
        sendProblem(
          res,
          429,
          'rate-limit-exceeded',
          'Too many signup attempts. Please try again later.',
        );
        return;
      }

      const data = parseResult.data;

      const result = await provisionTenantUser(db, identityAdmin, {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        companyName: data.companyName,
        phone: data.phone ?? null,
        planTier: 'trial',
        role: 'customer_admin',
      });

      await redis.setex(rateLimitKey, 3600, String(currentCount + 1));

      logger.info({ orgId: result.orgId, email: data.email }, 'Public signup completed');

      const response: ApiResponse<{ userId: string; orgId: string }> = {
        data: { userId: result.userId, orgId: result.orgId },
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(response);
    } catch (err) {
      if (err instanceof Error && err.message === 'EMAIL_ALREADY_REGISTERED') {
        sendProblem(
          res,
          409,
          'conflict',
          'An account with this email already exists. Try signing in.',
        );
        return;
      }
      logger.error({ err }, 'Public signup failed');
      sendProblem(res, 500, 'internal-error', 'Failed to create account. Please try again.');
    }
  });

  return router;
}
