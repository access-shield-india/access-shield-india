/**
 * Enterprise annual programme quote requests (public + authenticated).
 */

import type { Database } from '@accessshield/db';
import { enterpriseQuotes, funnelEvents } from '@accessshield/db';
import type { ApiResponse } from '@accessshield/types';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { sendProblem } from '../lib/problem-details';

const quoteSchema = z.object({
  contactName: z.string().min(2).max(255),
  contactEmail: z.string().email(),
  company: z.string().min(2).max(255),
  domainsCount: z.number().int().min(1).max(500).default(1),
  appsCount: z.number().int().min(0).max(500).default(0),
  docsVolume: z.string().max(64).optional(),
  sebiRequired: z.boolean().default(false),
  trainingSeats: z.number().int().min(0).max(5000).default(0),
  slaHours: z.number().int().min(4).max(168).default(72),
  notes: z.string().max(5000).optional(),
});

export function createPublicEnterpriseQuotesRouter(
  db: Database,
  redis: Redis,
): ExpressRouter {
  const router = Router();

  router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = quoteSchema.safeParse(req.body);
      if (!parsed.success) {
        sendProblem(res, 400, 'validation-error', 'Invalid quote request', undefined, {
          errors: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
      const rateKey = `enterprise-quote:ip:${ip}`;
      const count = parseInt((await redis.get(rateKey)) || '0', 10);
      if (count >= 5) {
        sendProblem(res, 429, 'rate-limit-exceeded', 'Too many quote requests.');
        return;
      }
      await redis.setex(rateKey, 3600, String(count + 1));

      const data = parsed.data;
      const [row] = await db
        .insert(enterpriseQuotes)
        .values({
          contactName: data.contactName,
          contactEmail: data.contactEmail,
          company: data.company,
          domainsCount: data.domainsCount,
          appsCount: data.appsCount,
          docsVolume: data.docsVolume ?? null,
          sebiRequired: data.sebiRequired,
          trainingSeats: data.trainingSeats,
          slaHours: data.slaHours,
          notes: data.notes ?? null,
          status: 'new',
        })
        .returning();

      await db.insert(funnelEvents).values({
        event: 'contact_sales',
        path: '/contact?plan=enterprise',
        meta: { plan: 'enterprise', company: data.company },
      });

      logger.info(
        { company: data.company, email: data.contactEmail, quoteId: row?.id },
        'Enterprise quote requested',
      );

      const response: ApiResponse<{ id: string; message: string }> = {
        data: {
          id: row!.id,
          message:
            'Thanks — our team will send an annual programme quote (software + monitoring + evidence packs). From ₹2.5L/yr excl. GST.',
        },
        timestamp: new Date().toISOString(),
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
