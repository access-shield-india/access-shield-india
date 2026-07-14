import type { Database } from '@accessshield/db';
import { assets, issues, organisations, scans, users, widgetPreferences } from '@accessshield/db';
import { and, count, eq, gte, inArray, isNull } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import { getAssetLimit, getScanLimit, isScanLimitDisabled } from './plan-limits';

export function getMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function widgetDomainsKey(orgId: string): string {
  return `widget:domains:${orgId}`;
}

export interface OrgListMetrics {
  userCount: number;
  assetCount: number;
  scansThisMonth: number;
  widgetEnabled: boolean | null;
}

export async function getOrgListMetricsBatch(
  db: Database,
  orgIds: string[],
): Promise<Map<string, OrgListMetrics>> {
  const result = new Map<string, OrgListMetrics>();
  if (orgIds.length === 0) return result;

  const monthStart = getMonthStart().toISOString();

  const [userRows, assetRows, scanRows, widgetRows] = await Promise.all([
    db
      .select({ organisationId: users.organisationId, value: count() })
      .from(users)
      .where(inArray(users.organisationId, orgIds))
      .groupBy(users.organisationId),
    db
      .select({ organisationId: assets.organisationId, value: count() })
      .from(assets)
      .where(and(inArray(assets.organisationId, orgIds), eq(assets.isActive, true)))
      .groupBy(assets.organisationId),
    db
      .select({ organisationId: scans.organisationId, value: count() })
      .from(scans)
      .where(and(inArray(scans.organisationId, orgIds), gte(scans.createdAt, monthStart)))
      .groupBy(scans.organisationId),
    db
      .select({
        organisationId: widgetPreferences.organisationId,
        isEnabled: widgetPreferences.isEnabled,
      })
      .from(widgetPreferences)
      .where(
        and(inArray(widgetPreferences.organisationId, orgIds), isNull(widgetPreferences.assetId)),
      ),
  ]);

  const userMap = new Map(userRows.map((r) => [r.organisationId, r.value]));
  const assetMap = new Map(assetRows.map((r) => [r.organisationId, r.value]));
  const scanMap = new Map(scanRows.map((r) => [r.organisationId, r.value]));
  const widgetMap = new Map(widgetRows.map((r) => [r.organisationId, r.isEnabled]));

  for (const orgId of orgIds) {
    result.set(orgId, {
      userCount: userMap.get(orgId) ?? 0,
      assetCount: assetMap.get(orgId) ?? 0,
      scansThisMonth: scanMap.get(orgId) ?? 0,
      widgetEnabled: widgetMap.has(orgId) ? widgetMap.get(orgId)! : null,
    });
  }

  return result;
}

export interface OrgSummaryWidget {
  isEnabled: boolean;
  position: string;
  language: string;
  allowedDomains: string[];
  updatedAt: string | null;
}

export interface OrgSummary {
  organisation: typeof organisations.$inferSelect;
  userCount: number;
  activeUserCount: number;
  assetCount: number;
  scansThisMonth: number;
  scansLifetime: number;
  assetsLimit: number | null;
  scansLimit: number | null;
  openIssuesCount: number;
  widget: OrgSummaryWidget;
}

async function getAllowedDomains(redis: Redis, orgId: string): Promise<string[]> {
  const raw = await redis.get(widgetDomainsKey(orgId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export async function getOrgSummary(
  db: Database,
  redis: Redis,
  orgId: string,
): Promise<OrgSummary | null> {
  const [org] = await db.select().from(organisations).where(eq(organisations.id, orgId)).limit(1);

  if (!org) return null;

  const monthStart = getMonthStart().toISOString();
  const planTier = org.planTier ?? 'starter';
  const scansLimit = isScanLimitDisabled() ? null : getScanLimit(planTier);
  const assetsLimit = getAssetLimit(planTier);

  const [
    [userTotal],
    [activeUsers],
    [assetTotal],
    [scansMonth],
    [scansLife],
    [openIssues],
    [widgetPref],
    allowedDomains,
  ] = await Promise.all([
    db.select({ value: count() }).from(users).where(eq(users.organisationId, orgId)),
    db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.organisationId, orgId), eq(users.isActive, true))),
    db
      .select({ value: count() })
      .from(assets)
      .where(and(eq(assets.organisationId, orgId), eq(assets.isActive, true))),
    db
      .select({ value: count() })
      .from(scans)
      .where(and(eq(scans.organisationId, orgId), gte(scans.createdAt, monthStart))),
    db.select({ value: count() }).from(scans).where(eq(scans.organisationId, orgId)),
    db
      .select({ value: count() })
      .from(issues)
      .where(and(eq(issues.organisationId, orgId), eq(issues.status, 'open'))),
    db
      .select()
      .from(widgetPreferences)
      .where(and(eq(widgetPreferences.organisationId, orgId), isNull(widgetPreferences.assetId)))
      .limit(1),
    getAllowedDomains(redis, orgId),
  ]);

  const pref = widgetPref;
  const widget: OrgSummaryWidget = {
    isEnabled: pref?.isEnabled ?? true,
    position: pref?.position ?? 'bottom-right',
    language: pref?.language ?? 'en',
    allowedDomains,
    updatedAt: pref?.updatedAt ?? null,
  };

  return {
    organisation: org,
    userCount: userTotal?.value ?? 0,
    activeUserCount: activeUsers?.value ?? 0,
    assetCount: assetTotal?.value ?? 0,
    scansThisMonth: scansMonth?.value ?? 0,
    scansLifetime: scansLife?.value ?? 0,
    assetsLimit,
    scansLimit,
    openIssuesCount: openIssues?.value ?? 0,
    widget,
  };
}

export async function getOrCreateOrgWidgetPrefs(db: Database, orgId: string) {
  const [existing] = await db
    .select()
    .from(widgetPreferences)
    .where(and(eq(widgetPreferences.organisationId, orgId), isNull(widgetPreferences.assetId)))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(widgetPreferences)
    .values({ organisationId: orgId, assetId: null })
    .returning();

  if (!created) {
    throw new Error('Failed to create widget preferences');
  }

  return created;
}

export async function countWidgetsEnabled(db: Database): Promise<number> {
  const [activeOrgs] = await db
    .select({ value: count() })
    .from(organisations)
    .where(eq(organisations.isActive, true));

  const [disabledPrefs] = await db
    .select({ value: count() })
    .from(widgetPreferences)
    .where(and(isNull(widgetPreferences.assetId), eq(widgetPreferences.isEnabled, false)));

  const active = activeOrgs?.value ?? 0;
  const disabled = disabledPrefs?.value ?? 0;
  return Math.max(0, active - disabled);
}

export async function countActiveOrganisations(db: Database): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(organisations)
    .where(eq(organisations.isActive, true));
  return row?.value ?? 0;
}
