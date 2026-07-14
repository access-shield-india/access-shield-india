/**
 * Realtime SSE — replaces Supabase Realtime postgres_changes.
 * Ticket pattern: POST /ticket → short-lived opaque token → GET /stream?ticket=
 */

import { randomBytes } from 'node:crypto';
import type { Database } from '@accessshield/db';
import { scans } from '@accessshield/db';
import { and, eq } from 'drizzle-orm';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { sendProblem } from '../lib/problem-details';
import { REALTIME_REDIS_CHANNEL, type RealtimeEvent } from '../lib/realtime/publish';
import { requireRoles } from '../middleware/rbac';

const TICKET_PREFIX = 'realtime:ticket:';
const TICKET_TTL_SECONDS = 60;

const ticketBodySchema = z.object({
  channels: z.array(z.string().min(1)).min(1).max(10),
});

function parseChannelAcl(
  channel: string,
  orgId: string,
): { ok: boolean; scanId?: string } {
  if (channel === `org:${orgId}` || channel === `issues:${orgId}`) {
    return { ok: true };
  }
  const scanMatch = /^scan:([0-9a-f-]{36})$/i.exec(channel);
  if (scanMatch) {
    return { ok: true, scanId: scanMatch[1] };
  }
  return { ok: false };
}

export function createRealtimeRouter(db: Database, redis: Redis): ExpressRouter {
  const router = Router();

  router.post(
    '/ticket',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin', 'super_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const parsed = ticketBodySchema.safeParse(req.body);
        if (!parsed.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid channels', undefined, {
            errors: parsed.error.flatten().fieldErrors,
          });
          return;
        }

        const allowed: string[] = [];
        for (const channel of parsed.data.channels) {
          const acl = parseChannelAcl(channel, orgId);
          if (!acl.ok) {
            sendProblem(res, 403, 'forbidden', 'Channel not allowed', channel);
            return;
          }
          if (acl.scanId) {
            const [row] = await db
              .select({ id: scans.id })
              .from(scans)
              .where(and(eq(scans.id, acl.scanId), eq(scans.organisationId, orgId)))
              .limit(1);
            if (!row) {
              sendProblem(res, 403, 'forbidden', 'Scan not in organisation', channel);
              return;
            }
          }
          allowed.push(channel);
        }

        const ticket = randomBytes(24).toString('hex');
        await redis.setex(
          `${TICKET_PREFIX}${ticket}`,
          TICKET_TTL_SECONDS,
          JSON.stringify({ orgId, channels: allowed, userId: req.user!.sub }),
        );

        res.status(201).json({
          data: {
            ticket,
            expiresIn: TICKET_TTL_SECONDS,
            streamPath: `/api/v1/realtime/stream?ticket=${ticket}`,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/stream', async (req: Request, res: Response): Promise<void> => {
    const ticket = typeof req.query.ticket === 'string' ? req.query.ticket : null;
    if (!ticket) {
      sendProblem(res, 401, 'unauthorized', 'Missing ticket', 'Provide ?ticket=');
      return;
    }

    const raw = await redis.get(`${TICKET_PREFIX}${ticket}`);
    if (!raw) {
      sendProblem(res, 401, 'unauthorized', 'Invalid or expired ticket', undefined);
      return;
    }

    await redis.del(`${TICKET_PREFIX}${ticket}`);

    const meta = JSON.parse(raw) as { orgId: string; channels: string[]; userId: string };
    const channelSet = new Set(meta.channels);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(`event: ready\ndata: ${JSON.stringify({ channels: meta.channels })}\n\n`);

    const subscriber = redis.duplicate();
    await subscriber.subscribe(REALTIME_REDIS_CHANNEL);

    const onMessage = (_ch: string, message: string) => {
      try {
        const event = JSON.parse(message) as RealtimeEvent;
        if (!channelSet.has(event.channel)) {
          return;
        }
        res.write(`event: ${event.event}\ndata: ${JSON.stringify(event)}\n\n`);
      } catch {
        // ignore malformed
      }
    };

    subscriber.on('message', onMessage);

    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      subscriber.off('message', onMessage);
      void subscriber.unsubscribe(REALTIME_REDIS_CHANNEL);
      void subscriber.quit();
    });
  });

  return router;
}
