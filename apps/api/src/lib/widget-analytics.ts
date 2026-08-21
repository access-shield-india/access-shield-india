/**
 * Anonymous widget analytics helpers.
 *
 * Redis hot path (7 days): widget-stats:{orgId}:{yyyy-mm-dd} hash field {type}:{feature}
 * Postgres cold path: widget_analytics_daily (rolled up nightly).
 * No IPs, user ids, session ids, or page URLs.
 */

import type { Database } from '@accessshield/db';
import { widgetAnalyticsDaily } from '@accessshield/db';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import type { Redis } from 'ioredis';

export const WIDGET_EVENT_TYPES = [
  'panel_open',
  'profile_on',
  'profile_off',
  'setting_on',
  'language_switch',
] as const;

export type WidgetEventType = (typeof WIDGET_EVENT_TYPES)[number];

export const REDIS_STATS_TTL_SECONDS = 400 * 24 * 60 * 60;
export const REDIS_HOT_DAYS = 7;
export const INCLUDE_REPORT_KEY_PREFIX = 'widget-analytics:include-report:';

export interface WidgetAnalyticsEvent {
  type: WidgetEventType;
  feature?: string;
  tsBucket: string;
}

export interface NamedCount {
  id: string;
  count: number;
}

export interface DailyOpens {
  date: string;
  opens: number;
}

export interface WidgetAnalyticsSummary {
  panelOpens: number;
  topProfiles: NamedCount[];
  topSettings: NamedCount[];
  languageSplit: NamedCount[];
  dailyTrend: DailyOpens[];
  hindiUsagePercent: number;
  includeInNextReport: boolean;
  from: string;
  to: string;
}

export function statsKey(orgId: string, date: string): string {
  return `widget-stats:${orgId}:${date}`;
}

export function includeReportKey(orgId: string): string {
  return `${INCLUDE_REPORT_KEY_PREFIX}${orgId}`;
}

export function fieldName(type: string, feature?: string): string {
  const feat = (feature ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60);
  return feat ? `${type}:${feat}` : type;
}

export function parseField(field: string): { type: string; feature: string } {
  const sep = field.indexOf(':');
  if (sep === -1) return { type: field, feature: '' };
  return { type: field.slice(0, sep), feature: field.slice(sep + 1) };
}

/** Date (YYYY-MM-DD) of an hour bucket like 2026-08-14T07 */
export function dateFromBucket(tsBucket: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})T\d{2}$/.exec(tsBucket);
  return match?.[1] ?? null;
}

export function utcDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function daysAgoUtc(days: number, from: Date = new Date()): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - days);
  return utcDateString(d);
}

export function eachDateInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || cursor > end) {
    return out;
  }
  while (cursor <= end) {
    out.push(utcDateString(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export async function incrementWidgetStats(
  redis: Redis,
  orgId: string,
  events: WidgetAnalyticsEvent[],
): Promise<void> {
  const totals = new Map<string, Map<string, number>>();

  for (const event of events) {
    const date = dateFromBucket(event.tsBucket);
    if (!date) continue;
    const field = fieldName(event.type, event.feature);
    let fields = totals.get(date);
    if (!fields) {
      fields = new Map();
      totals.set(date, fields);
    }
    fields.set(field, (fields.get(field) ?? 0) + 1);
  }

  if (totals.size === 0) return;

  const pipeline = redis.pipeline();
  for (const [date, fields] of totals) {
    const key = statsKey(orgId, date);
    for (const [field, n] of fields) {
      pipeline.hincrby(key, field, n);
    }
    pipeline.expire(key, REDIS_STATS_TTL_SECONDS);
  }
  await pipeline.exec();
}

interface DayCounters {
  [field: string]: number;
}

async function redisDayCounters(redis: Redis, orgId: string, date: string): Promise<DayCounters | null> {
  const raw = await redis.hgetall(statsKey(orgId, date));
  if (!raw || Object.keys(raw).length === 0) return null;
  const out: DayCounters = {};
  for (const [field, value] of Object.entries(raw)) {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n) && n > 0) out[field] = n;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export async function getIncludeInNextReport(redis: Redis, orgId: string): Promise<boolean> {
  const value = await redis.get(includeReportKey(orgId));
  return value === '1';
}

export async function setIncludeInNextReport(
  redis: Redis,
  orgId: string,
  include: boolean,
): Promise<void> {
  const key = includeReportKey(orgId);
  if (include) {
    await redis.set(key, '1');
  } else {
    await redis.del(key);
  }
}

export async function consumeIncludeInNextReport(redis: Redis, orgId: string): Promise<boolean> {
  const key = includeReportKey(orgId);
  const value = await redis.get(key);
  if (value !== '1') return false;
  await redis.del(key);
  return true;
}

function addCount(map: Map<string, number>, id: string, n: number): void {
  if (!id) return;
  map.set(id, (map.get(id) ?? 0) + n);
}

function topN(map: Map<string, number>, n: number): NamedCount[] {
  return [...map.entries()]
    .filter(([id]) => id.length > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id, count]) => ({ id, count }));
}

export async function buildWidgetAnalyticsSummary(
  db: Database,
  redis: Redis,
  orgId: string,
  from: string,
  to: string,
): Promise<WidgetAnalyticsSummary> {
  const dates = eachDateInclusive(from, to);
  const merged = new Map<string, DayCounters>();

  const dbRows = await db
    .select({
      date: widgetAnalyticsDaily.date,
      eventType: widgetAnalyticsDaily.eventType,
      feature: widgetAnalyticsDaily.feature,
      count: widgetAnalyticsDaily.count,
    })
    .from(widgetAnalyticsDaily)
    .where(
      and(
        eq(widgetAnalyticsDaily.organisationId, orgId),
        gte(widgetAnalyticsDaily.date, from),
        lte(widgetAnalyticsDaily.date, to),
      ),
    );

  for (const row of dbRows) {
    const day = merged.get(row.date) ?? {};
    day[fieldName(row.eventType, row.feature || undefined)] = row.count;
    merged.set(row.date, day);
  }

  await Promise.all(
    dates.map(async (date) => {
      const fromRedis = await redisDayCounters(redis, orgId, date);
      if (fromRedis) merged.set(date, fromRedis);
    }),
  );

  let panelOpens = 0;
  const profiles = new Map<string, number>();
  const settings = new Map<string, number>();
  const languages = new Map<string, number>();
  const dailyTrend: DailyOpens[] = dates.map((date) => {
    const day = merged.get(date) ?? {};
    let opens = 0;
    for (const [field, count] of Object.entries(day)) {
      const { type, feature } = parseField(field);
      if (type === 'panel_open') {
        opens += count;
        panelOpens += count;
      } else if (type === 'profile_on') {
        addCount(profiles, feature, count);
      } else if (type === 'setting_on') {
        addCount(settings, feature, count);
      } else if (type === 'language_switch') {
        addCount(languages, feature || 'en', count);
      }
    }
    return { date, opens };
  });

  const hiCount = languages.get('hi') ?? 0;
  const langTotal = [...languages.values()].reduce((sum, n) => sum + n, 0);
  const hindiUsagePercent = langTotal === 0 ? 0 : Math.round((hiCount / langTotal) * 100);

  return {
    panelOpens,
    topProfiles: topN(profiles, 6),
    topSettings: topN(settings, 8),
    languageSplit: topN(languages, 8),
    dailyTrend,
    hindiUsagePercent,
    includeInNextReport: await getIncludeInNextReport(redis, orgId),
    from,
    to,
  };
}

export async function upsertDailyRow(
  db: Database,
  row: {
    organisationId: string;
    date: string;
    eventType: string;
    feature: string;
    count: number;
  },
): Promise<void> {
  await db
    .insert(widgetAnalyticsDaily)
    .values(row)
    .onConflictDoUpdate({
      target: [
        widgetAnalyticsDaily.organisationId,
        widgetAnalyticsDaily.date,
        widgetAnalyticsDaily.eventType,
        widgetAnalyticsDaily.feature,
      ],
      set: { count: sql`excluded.count` },
    });
}
