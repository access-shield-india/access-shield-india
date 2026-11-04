/**
 * PUBLIC — funnel event ingest for free-scan → upgrade / sales analytics.
 */

import type { Database } from '@accessshield/db';
import { funnelEvents } from '@accessshield/db';
import type { ApiResponse } from '@accessshield/types';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { sendProblem } from '../lib/problem-details';
import { maybeEnqueueScanDrip } from '../services/scan-drip';

const ALLOWED_EVENTS = [
  'scan_completed',
  'upgrade_click',
  'checkout_started',
  'contact_sales',
] as const;

const funnelSchema = z.object({
  event: z.enum(ALLOWED_EVENTS),
  path: z.string().max(255).optional(),
  meta: z.record(z.string()).optional(),
});

export function createPublicFunnelRouter(db: Database, redis: Redis): ExpressRouter {
  const router = Router();

  router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parseResult = funnelSchema.safeParse(req.body);
      if (!parseResult.success) {
        sendProblem(res, 400, 'validation-error', 'Invalid funnel event', undefined, {
          errors: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const { event, path, meta } = parseResult.data;
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
      const rateKey = `funnel:ip:${ip}`;
      const count = parseInt((await redis.get(rateKey)) || '0', 10);
      if (count >= 120) {
        sendProblem(res, 429, 'rate-limit-exceeded', 'Too many events. Try again later.');
        return;
      }
      await redis.setex(rateKey, 3600, String(count + 1));

      await db.insert(funnelEvents).values({
        event,
        path: path ?? null,
        meta: meta ?? null,
      });

      if (event === 'scan_completed') {
        const email = meta?.email;
        if (email) {
          void maybeEnqueueScanDrip(db, email, meta?.scanId);
        }
      }

      logger.info({ event, path }, 'Funnel event recorded');

      const response: ApiResponse<{ ok: true }> = {
        data: { ok: true },
        timestamp: new Date().toISOString(),
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
