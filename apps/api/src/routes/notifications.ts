/**
 * Notification preferences API — per-user settings stored in Redis.
 */

import type { Database } from '@accessshield/db';
import { lookupUserByAuthId } from '@accessshield/db';
import type { ApiResponse } from '@accessshield/types';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { sendProblem } from '../lib/problem-details';
import { requireRoles } from '../middleware/rbac';

const NOTIFICATION_TYPES = [
  'scan_completed',
  'critical_violation',
  'issue_assigned',
  'certificate_issued',
  'invoice_generated',
  'monthly_summary',
] as const;

type NotificationType = (typeof NOTIFICATION_TYPES)[number];

interface StoredNotificationSettings {
  id: string;
  organisationId: string;
  userId: string;
  emailNotifications: Record<NotificationType, boolean>;
  whatsappNotifications: Record<NotificationType, boolean>;
  whatsappNumber: string | null;
  whatsappVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

function defaultPrefs(): Record<NotificationType, boolean> {
  return Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t, true])) as Record<
    NotificationType,
    boolean
  >;
}

function redisKey(orgId: string, userId: string): string {
  return `notification:settings:${orgId}:${userId}`;
}

const notificationPrefsSchema = z.record(z.enum(NOTIFICATION_TYPES), z.boolean());

const updateSettingsSchema = z.object({
  emailNotifications: notificationPrefsSchema.optional(),
  whatsappNotifications: notificationPrefsSchema.optional(),
  whatsappNumber: z
    .string()
    .regex(/^(\+91|91|0)?[6-9]\d{9}$/)
    .optional(),
});

const verifyWhatsAppSchema = z.object({
  number: z.string().regex(/^(\+91|91|0)?[6-9]\d{9}$/),
});

async function loadSettings(
  redis: Redis,
  orgId: string,
  userId: string,
): Promise<StoredNotificationSettings> {
  const raw = await redis.get(redisKey(orgId, userId));
  if (raw) {
    return JSON.parse(raw) as StoredNotificationSettings;
  }

  const now = new Date().toISOString();
  return {
    id: userId,
    organisationId: orgId,
    userId,
    emailNotifications: defaultPrefs(),
    whatsappNotifications: defaultPrefs(),
    whatsappNumber: null,
    whatsappVerified: false,
    createdAt: now,
    updatedAt: now,
  };
}

async function saveSettings(redis: Redis, settings: StoredNotificationSettings): Promise<void> {
  await redis.set(redisKey(settings.organisationId, settings.userId), JSON.stringify(settings));
}

export function createNotificationsRouter(db: Database, redis: Redis): ExpressRouter {
  const router = Router();

  router.get(
    '/settings',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const appUser = await lookupUserByAuthId(db, req.user!.sub);

        if (!appUser) {
          sendProblem(res, 403, 'forbidden', 'User record not found');
          return;
        }

        const settings = await loadSettings(redis, orgId, appUser.id);

        const response: ApiResponse<StoredNotificationSettings> = {
          data: settings,
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    '/settings',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parseResult = updateSettingsSchema.safeParse(req.body);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const orgId = req.user!.org_id;
        const appUser = await lookupUserByAuthId(db, req.user!.sub);

        if (!appUser) {
          sendProblem(res, 403, 'forbidden', 'User record not found');
          return;
        }

        const current = await loadSettings(redis, orgId, appUser.id);
        const { emailNotifications, whatsappNotifications, whatsappNumber } = parseResult.data;

        const updated: StoredNotificationSettings = {
          ...current,
          emailNotifications: {
            ...current.emailNotifications,
            ...emailNotifications,
          },
          whatsappNotifications: {
            ...current.whatsappNotifications,
            ...whatsappNotifications,
          },
          whatsappNumber: whatsappNumber !== undefined ? whatsappNumber : current.whatsappNumber,
          whatsappVerified:
            whatsappNumber !== undefined && whatsappNumber !== current.whatsappNumber
              ? false
              : current.whatsappVerified,
          updatedAt: new Date().toISOString(),
        };

        await saveSettings(redis, updated);

        const response: ApiResponse<StoredNotificationSettings> = {
          data: updated,
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/verify-whatsapp',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parseResult = verifyWhatsAppSchema.safeParse(req.body);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid phone number', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const orgId = req.user!.org_id;
        const appUser = await lookupUserByAuthId(db, req.user!.sub);

        if (!appUser) {
          sendProblem(res, 403, 'forbidden', 'User record not found');
          return;
        }

        const current = await loadSettings(redis, orgId, appUser.id);
        const updated: StoredNotificationSettings = {
          ...current,
          whatsappNumber: parseResult.data.number,
          whatsappVerified: true,
          updatedAt: new Date().toISOString(),
        };

        await saveSettings(redis, updated);

        const response: ApiResponse<{ verified: boolean }> = {
          data: { verified: true },
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
