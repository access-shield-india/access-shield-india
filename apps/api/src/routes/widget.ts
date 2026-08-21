/**
 * Accessibility widget settings API.
 */

import { createHash, randomBytes } from 'node:crypto';
import type { Database } from '@accessshield/db';
import { assets, widgetPreferences } from '@accessshield/db';
import type { ApiResponse } from '@accessshield/types';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { sendProblem } from '../lib/problem-details';
import { requireRoles } from '../middleware/rbac';
import {
  WIDGET_EVENT_TYPES,
  buildWidgetAnalyticsSummary,
  daysAgoUtc,
  incrementWidgetStats,
  setIncludeInNextReport,
  utcDateString,
} from '../lib/widget-analytics';

const POSITIONS = ['bottom-right', 'bottom-left', 'middle-right', 'top-right', 'top-left'] as const;
const LANGUAGES = ['en', 'hi'] as const;

interface WidgetSettingsResponse {
  id: string;
  organisationId: string;
  assetId: string | null;
  assetName: string | null;
  assetUrl: string | null;
  token: string;
  allowedDomains: string[];
  position: (typeof POSITIONS)[number];
  defaultLanguage: (typeof LANGUAGES)[number];
  primaryColor: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TokenContext {
  orgId: string;
  assetId: string | null;
}

const ASSET_LOOKUP_PREFIX = 'asset:';

function tokenKey(orgId: string): string {
  return `widget:token:${orgId}`;
}

function assetTokenKey(assetId: string): string {
  return `widget:token:asset:${assetId}`;
}

function tokenLookupKey(token: string): string {
  return `widget:token:lookup:${token}`;
}

function domainsKey(orgId: string): string {
  return `widget:domains:${orgId}`;
}

function assetDomainsKey(assetId: string): string {
  return `widget:domains:asset:${assetId}`;
}

function deriveDefaultToken(orgId: string): string {
  const secret = process.env.JWT_SECRET ?? 'dev-widget-secret';
  return createHash('sha256').update(`${orgId}:${secret}`).digest('hex').slice(0, 32);
}

/** Stable per-asset token — matches dashboard embed code format. */
function deriveAssetToken(assetId: string): string {
  return `as_${assetId.slice(0, 8)}`;
}

function assetLookupValue(orgId: string, assetId: string): string {
  return `${ASSET_LOOKUP_PREFIX}${orgId}:${assetId}`;
}

function parseTokenLookup(value: string): TokenContext | null {
  if (value.startsWith(ASSET_LOOKUP_PREFIX)) {
    const rest = value.slice(ASSET_LOOKUP_PREFIX.length);
    const separator = rest.indexOf(':');
    if (separator === -1) return null;
    const orgId = rest.slice(0, separator);
    const assetId = rest.slice(separator + 1);
    if (!orgId || !assetId) return null;
    return { orgId, assetId };
  }

  return { orgId: value, assetId: null };
}

function hostnameFromUrl(url: string): string | null {
  try {
    return normalizeHostname(new URL(url).hostname);
  } catch {
    return null;
  }
}

async function getOrCreateToken(redis: Redis, orgId: string): Promise<string> {
  const existing = await redis.get(tokenKey(orgId));
  if (existing) return existing;

  const token = deriveDefaultToken(orgId);
  await setOrgToken(redis, orgId, token);
  return token;
}

async function setOrgToken(redis: Redis, orgId: string, token: string): Promise<void> {
  const existing = await redis.get(tokenKey(orgId));
  if (existing && existing !== token) {
    await redis.del(tokenLookupKey(existing));
  }
  await redis.set(tokenKey(orgId), token);
  await redis.set(tokenLookupKey(token), orgId);
}

async function registerAssetToken(
  redis: Redis,
  orgId: string,
  assetId: string,
  token: string,
): Promise<void> {
  const existing = await redis.get(assetTokenKey(assetId));
  if (existing && existing !== token) {
    await redis.del(tokenLookupKey(existing));
  }
  await redis.set(assetTokenKey(assetId), token);
  await redis.set(tokenLookupKey(token), assetLookupValue(orgId, assetId));
}

async function getOrCreateAssetToken(
  redis: Redis,
  orgId: string,
  assetId: string,
): Promise<string> {
  const stored = await redis.get(assetTokenKey(assetId));
  if (stored) return stored;

  const token = deriveAssetToken(assetId);
  await registerAssetToken(redis, orgId, assetId, token);
  return token;
}

async function findOrgByToken(redis: Redis, token: string): Promise<string | null> {
  const fromLookup = await redis.get(tokenLookupKey(token));
  if (fromLookup) {
    const ctx = parseTokenLookup(fromLookup);
    return ctx?.orgId ?? null;
  }

  // Backfill lookup for tokens created before reverse index existed
  const keys = await redis.keys('widget:token:*');
  for (const key of keys) {
    if (key.startsWith('widget:token:lookup:')) continue;
    if (key.startsWith('widget:token:asset:')) continue;
    const orgId = key.slice('widget:token:'.length);
    const stored = await redis.get(key);
    if (stored === token) {
      await redis.set(tokenLookupKey(token), orgId);
      return orgId;
    }
  }
  return null;
}

async function resolveAssetByDeterministicToken(
  db: Database,
  redis: Redis,
  token: string,
): Promise<TokenContext | null> {
  if (!token.startsWith('as_') || token.length < 11) return null;

  const prefix = token.slice(3);
  const matches = await db
    .select({
      id: assets.id,
      organisationId: assets.organisationId,
    })
    .from(assets)
    .where(sql`${assets.id}::text like ${`${prefix}%`}`)
    .limit(2);

  if (matches.length !== 1) return null;

  const { id: assetId, organisationId: orgId } = matches[0]!;
  await registerAssetToken(redis, orgId, assetId, token);
  return { orgId, assetId };
}

async function resolveTokenContext(
  redis: Redis,
  db: Database,
  token: string,
): Promise<TokenContext | null> {
  const lookupRaw = await redis.get(tokenLookupKey(token));
  if (lookupRaw) {
    return parseTokenLookup(lookupRaw);
  }

  const assetCtx = await resolveAssetByDeterministicToken(db, redis, token);
  if (assetCtx) return assetCtx;

  const orgId = await resolveOrgByToken(redis, db, token);
  if (orgId) return { orgId, assetId: null };

  return null;
}

async function resolveOrgByToken(
  redis: Redis,
  db: Database,
  token: string,
): Promise<string | null> {
  const fromLookup = await findOrgByToken(redis, token);
  if (fromLookup) return fromLookup;

  const orgPrefs = await db
    .select({ organisationId: widgetPreferences.organisationId })
    .from(widgetPreferences)
    .where(isNull(widgetPreferences.assetId));

  for (const row of orgPrefs) {
    const stored = await redis.get(tokenKey(row.organisationId));
    const derived = deriveDefaultToken(row.organisationId);
    const candidate = stored ?? derived;
    if (candidate === token) {
      if (!stored) {
        await setOrgToken(redis, row.organisationId, token);
      }
      return row.organisationId;
    }
  }

  // Platform org default token before widget settings are opened in dashboard
  const platformOrgId = '44444444-4444-4444-4444-444444444444';
  const platformStored = await redis.get(tokenKey(platformOrgId));
  const platformDerived = deriveDefaultToken(platformOrgId);
  if (token === (platformStored ?? platformDerived)) {
    if (!platformStored) {
      await setOrgToken(redis, platformOrgId, token);
    }
    return platformOrgId;
  }

  return null;
}

function normalizeHostname(host: string): string {
  return host.toLowerCase().replace(/^www\./, '');
}

function requestHostname(req: Request): string | null {
  const origin = req.headers.origin;
  if (origin) {
    try {
      return normalizeHostname(new URL(origin).hostname);
    } catch {
      /* fall through */
    }
  }
  const referer = req.headers.referer;
  if (referer) {
    try {
      return normalizeHostname(new URL(referer).hostname);
    } catch {
      /* fall through */
    }
  }
  return null;
}

function domainAllowed(allowedDomains: string[], hostname: string | null): boolean {
  if (allowedDomains.length === 0) return true;
  if (!hostname) return false;

  const normalizedHost = normalizeHostname(hostname);
  return allowedDomains.some((domain) => {
    const normalizedDomain = normalizeHostname(domain.trim());
    return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`);
  });
}

async function getAllowedDomains(
  redis: Redis,
  scope: { orgId: string; assetId?: string | null },
): Promise<string[]> {
  const key = scope.assetId ? assetDomainsKey(scope.assetId) : domainsKey(scope.orgId);
  const raw = await redis.get(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

async function setAllowedDomains(
  redis: Redis,
  scope: { orgId: string; assetId?: string | null },
  allowedDomains: string[],
): Promise<void> {
  const key = scope.assetId ? assetDomainsKey(scope.assetId) : domainsKey(scope.orgId);
  await redis.set(key, JSON.stringify(allowedDomains));
}

async function getPrefsForVerify(
  db: Database,
  orgId: string,
  assetId: string | null = null,
): Promise<{ isEnabled: boolean; position: string }> {
  const whereClause = assetId
    ? and(eq(widgetPreferences.organisationId, orgId), eq(widgetPreferences.assetId, assetId))
    : and(eq(widgetPreferences.organisationId, orgId), isNull(widgetPreferences.assetId));

  const [existing] = await db
    .select({
      isEnabled: widgetPreferences.isEnabled,
      position: widgetPreferences.position,
    })
    .from(widgetPreferences)
    .where(whereClause)
    .limit(1);

  return existing ?? { isEnabled: true, position: 'bottom-right' };
}

async function getOrCreatePrefs(db: Database, orgId: string, assetId: string | null = null) {
  const whereClause = assetId
    ? and(eq(widgetPreferences.organisationId, orgId), eq(widgetPreferences.assetId, assetId))
    : and(eq(widgetPreferences.organisationId, orgId), isNull(widgetPreferences.assetId));

  const [existing] = await db.select().from(widgetPreferences).where(whereClause).limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(widgetPreferences)
    .values({
      organisationId: orgId,
      assetId,
    })
    .returning();

  if (!created) {
    throw new Error('Failed to create widget preferences');
  }

  return created;
}

async function getAssetForOrg(
  db: Database,
  orgId: string,
  assetId: string,
): Promise<{ id: string; name: string; url: string } | null> {
  const [asset] = await db
    .select({
      id: assets.id,
      name: assets.name,
      url: assets.url,
    })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.organisationId, orgId), eq(assets.isActive, true)))
    .limit(1);

  return asset ?? null;
}

async function ensureDefaultAssetDomains(
  redis: Redis,
  assetId: string,
  assetUrl: string,
): Promise<string[]> {
  const existing = await getAllowedDomains(redis, { orgId: '', assetId });
  if (existing.length > 0) return existing;

  const hostname = hostnameFromUrl(assetUrl);
  if (!hostname) return [];

  await setAllowedDomains(redis, { orgId: '', assetId }, [hostname]);
  return [hostname];
}

function toResponse(
  prefs: typeof widgetPreferences.$inferSelect,
  token: string,
  allowedDomains: string[],
  assetMeta?: { name: string; url: string } | null,
): WidgetSettingsResponse {
  const position = POSITIONS.includes(prefs.position as (typeof POSITIONS)[number])
    ? (prefs.position as (typeof POSITIONS)[number])
    : 'bottom-right';

  const defaultLanguage = LANGUAGES.includes(prefs.language as (typeof LANGUAGES)[number])
    ? (prefs.language as (typeof LANGUAGES)[number])
    : 'en';

  return {
    id: prefs.id,
    organisationId: prefs.organisationId,
    assetId: prefs.assetId,
    assetName: assetMeta?.name ?? null,
    assetUrl: assetMeta?.url ?? null,
    token,
    allowedDomains,
    position,
    defaultLanguage,
    primaryColor: prefs.primaryColor,
    isEnabled: prefs.isEnabled,
    createdAt: prefs.createdAt,
    updatedAt: prefs.updatedAt,
  };
}

const updateWidgetSchema = z.object({
  allowedDomains: z.array(z.string().min(1).max(253)).optional(),
  position: z.enum(POSITIONS).optional(),
  defaultLanguage: z.enum(LANGUAGES).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  isEnabled: z.boolean().optional(),
});

const assetIdParamsSchema = z.object({
  assetId: z.string().uuid(),
});

const verifyQuerySchema = z.object({
  token: z.string().min(8).max(128),
});

const analyticsEventSchema = z.object({
  type: z.enum(WIDGET_EVENT_TYPES),
  feature: z.string().max(60).optional(),
  tsBucket: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}$/),
});

const analyticsBodySchema = z.object({
  token: z.string().min(8).max(128),
  events: z.array(analyticsEventSchema).min(1).max(50),
});

const analyticsSummaryQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const includeInReportSchema = z.object({
  include: z.boolean(),
});

/** PUBLIC — token verification for embedded widget (mount before auth middleware). */
export function createPublicWidgetRouter(db: Database, redis: Redis): ExpressRouter {
  const router = Router();

  router.get('/verify', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parseResult = verifyQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        sendProblem(res, 400, 'validation-error', 'Invalid token', undefined, {
          errors: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const { token } = parseResult.data;
      const ctx = await resolveTokenContext(redis, db, token);

      if (!ctx) {
        const response: ApiResponse<{ valid: boolean }> = {
          data: { valid: false },
          timestamp: new Date().toISOString(),
        };
        res.json(response);
        return;
      }

      const [prefs, allowedDomains] = await Promise.all([
        getPrefsForVerify(db, ctx.orgId, ctx.assetId),
        getAllowedDomains(redis, { orgId: ctx.orgId, assetId: ctx.assetId }),
      ]);

      const hostname = requestHostname(req);
      const valid = prefs.isEnabled && domainAllowed(allowedDomains, hostname);

      const response: ApiResponse<{ valid: boolean; position?: string }> = {
        data: { valid, position: prefs.position },
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  /**
   * PUBLIC — batched anonymous usage events. Token-validated.
   * Do not log IP or request body beyond event types.
   */
  router.post('/analytics', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let payload: unknown = req.body;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload) as unknown;
        } catch {
          sendProblem(res, 400, 'validation-error', 'Invalid analytics payload');
          return;
        }
      }

      const parseResult = analyticsBodySchema.safeParse(payload);
      if (!parseResult.success) {
        sendProblem(res, 400, 'validation-error', 'Invalid analytics payload', undefined, {
          errors: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const { token, events } = parseResult.data;
      const ctx = await resolveTokenContext(redis, db, token);
      if (!ctx) {
        sendProblem(res, 401, 'unauthorized', 'Invalid widget token');
        return;
      }

      await incrementWidgetStats(redis, ctx.orgId, events);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function createWidgetRouter(db: Database, redis: Redis): ExpressRouter {
  const router = Router();

  router.get(
    '/settings',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const [prefs, token, allowedDomains] = await Promise.all([
          getOrCreatePrefs(db, orgId),
          getOrCreateToken(redis, orgId),
          getAllowedDomains(redis, { orgId }),
        ]);

        const response: ApiResponse<WidgetSettingsResponse> = {
          data: toResponse(prefs, token, allowedDomains),
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
    requireRoles('customer_admin', 'accessibility_officer'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parseResult = updateWidgetSchema.safeParse(req.body);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const orgId = req.user!.org_id;
        const { allowedDomains, position, defaultLanguage, primaryColor, isEnabled } =
          parseResult.data;

        if (allowedDomains !== undefined) {
          await setAllowedDomains(redis, { orgId }, allowedDomains);
        }

        const prefs = await getOrCreatePrefs(db, orgId);

        const dbUpdates: Partial<typeof widgetPreferences.$inferInsert> = {
          updatedAt: new Date().toISOString(),
        };
        if (position !== undefined) dbUpdates.position = position;
        if (defaultLanguage !== undefined) dbUpdates.language = defaultLanguage;
        if (primaryColor !== undefined) dbUpdates.primaryColor = primaryColor;
        if (isEnabled !== undefined) dbUpdates.isEnabled = isEnabled;

        const [updated] = await db
          .update(widgetPreferences)
          .set(dbUpdates)
          .where(eq(widgetPreferences.id, prefs.id))
          .returning();

        const token = await getOrCreateToken(redis, orgId);
        const domains = await getAllowedDomains(redis, { orgId });

        const response: ApiResponse<WidgetSettingsResponse> = {
          data: toResponse(updated ?? prefs, token, domains),
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/regenerate-token',
    requireRoles('customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const newToken = randomBytes(16).toString('hex');
        await setOrgToken(redis, orgId, newToken);

        const [prefs, allowedDomains] = await Promise.all([
          getOrCreatePrefs(db, orgId),
          getAllowedDomains(redis, { orgId }),
        ]);

        const response: ApiResponse<WidgetSettingsResponse> = {
          data: toResponse(prefs, newToken, allowedDomains),
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/assets/:assetId/settings',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const paramsResult = assetIdParamsSchema.safeParse(req.params);
        if (!paramsResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid asset ID', undefined, {
            errors: paramsResult.error.flatten().fieldErrors,
          });
          return;
        }

        const orgId = req.user!.org_id;
        const { assetId } = paramsResult.data;

        const asset = await getAssetForOrg(db, orgId, assetId);
        if (!asset) {
          sendProblem(res, 404, 'not-found', 'Asset not found');
          return;
        }

        const [prefs, token] = await Promise.all([
          getOrCreatePrefs(db, orgId, assetId),
          getOrCreateAssetToken(redis, orgId, assetId),
        ]);

        const allowedDomains = await ensureDefaultAssetDomains(redis, assetId, asset.url);

        const response: ApiResponse<WidgetSettingsResponse> = {
          data: toResponse(prefs, token, allowedDomains, asset),
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    '/assets/:assetId/settings',
    requireRoles('customer_admin', 'accessibility_officer', 'developer'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const paramsResult = assetIdParamsSchema.safeParse(req.params);
        if (!paramsResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid asset ID', undefined, {
            errors: paramsResult.error.flatten().fieldErrors,
          });
          return;
        }

        const bodyResult = updateWidgetSchema.safeParse(req.body);
        if (!bodyResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
            errors: bodyResult.error.flatten().fieldErrors,
          });
          return;
        }

        const orgId = req.user!.org_id;
        const { assetId } = paramsResult.data;

        const asset = await getAssetForOrg(db, orgId, assetId);
        if (!asset) {
          sendProblem(res, 404, 'not-found', 'Asset not found');
          return;
        }

        const { allowedDomains, position, defaultLanguage, primaryColor, isEnabled } =
          bodyResult.data;

        if (allowedDomains !== undefined) {
          await setAllowedDomains(redis, { orgId, assetId }, allowedDomains);
        }

        const prefs = await getOrCreatePrefs(db, orgId, assetId);

        const dbUpdates: Partial<typeof widgetPreferences.$inferInsert> = {
          updatedAt: new Date().toISOString(),
        };
        if (position !== undefined) dbUpdates.position = position;
        if (defaultLanguage !== undefined) dbUpdates.language = defaultLanguage;
        if (primaryColor !== undefined) dbUpdates.primaryColor = primaryColor;
        if (isEnabled !== undefined) dbUpdates.isEnabled = isEnabled;

        const [updated] = await db
          .update(widgetPreferences)
          .set(dbUpdates)
          .where(eq(widgetPreferences.id, prefs.id))
          .returning();

        const [token, domains] = await Promise.all([
          getOrCreateAssetToken(redis, orgId, assetId),
          getAllowedDomains(redis, { orgId, assetId }),
        ]);

        const response: ApiResponse<WidgetSettingsResponse> = {
          data: toResponse(updated ?? prefs, token, domains, asset),
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/analytics/summary',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parseResult = analyticsSummaryQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid date range', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const to = parseResult.data.to ?? utcDateString();
        const from = parseResult.data.from ?? daysAgoUtc(29, new Date(`${to}T00:00:00.000Z`));
        const orgId = req.user!.org_id;
        const summary = await buildWidgetAnalyticsSummary(db, redis, orgId, from, to);

        const response: ApiResponse<typeof summary> = {
          data: summary,
          timestamp: new Date().toISOString(),
        };
        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/analytics/include-in-report',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parseResult = includeInReportSchema.safeParse(req.body);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const orgId = req.user!.org_id;
        await setIncludeInNextReport(redis, orgId, parseResult.data.include);

        const response: ApiResponse<{ includeInNextReport: boolean }> = {
          data: { includeInNextReport: parseResult.data.include },
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
