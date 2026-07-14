/**
 * Public Waitlist Routes
 *
 * Unauthenticated endpoint for waitlist/trial signup from marketing site.
 */

import type { Database } from '@accessshield/db';
import { waitlistSignups } from '@accessshield/db';
import type { ApiResponse } from '@accessshield/types';
import type { Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { sendProblem } from '../lib/problem-details';

const INDIAN_PHONE_REGEX = /^(\+91|91|0)?[6-9]\d{9}$/;

function normalizePhone(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/[\s-]/g, '');
  return digits.length > 0 ? digits : undefined;
}

const waitlistSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  company: z.string().min(2, 'Company name must be at least 2 characters'),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-1000', '1000+']),
  phone: z
    .string()
    .optional()
    .transform((v) => normalizePhone(v))
    .refine((v) => v === undefined || INDIAN_PHONE_REGEX.test(v), {
      message: 'Invalid Indian phone number',
    }),
});

export function createPublicWaitlistRouter(db: Database, redis: Redis): ExpressRouter {
  const router = Router();

  router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
      const parseResult = waitlistSchema.safeParse(req.body);
      if (!parseResult.success) {
        sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
          errors: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const data = parseResult.data;
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
      const rateLimitKey = `public-waitlist:ip:${ip}`;

      const currentCount = parseInt((await redis.get(rateLimitKey)) || '0', 10);
      if (currentCount >= 5) {
        sendProblem(res, 429, 'rate-limit-exceeded', 'Too many requests. Please try again later.');
        return;
      }

      await db.insert(waitlistSignups).values({
        name: data.name,
        email: data.email,
        company: data.company,
        companySize: data.companySize,
        phone: data.phone || null,
      });

      logger.info({ email: data.email, company: data.company }, 'New waitlist signup received');

      await redis.setex(rateLimitKey, 3600, String(currentCount + 1));

      const response: ApiResponse<{ message: string }> = {
        data: { message: 'Signup successful' },
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(response);
    } catch (err) {
      logger.error({ err }, 'Failed to process waitlist signup');
      sendProblem(res, 500, 'internal-error', 'Failed to process signup. Please try again.');
    }
  });

  return router;
}
