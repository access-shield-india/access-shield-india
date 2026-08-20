/**
 * Nightly rollup: Redis dailies older than 7 days → widget_analytics_daily.
 * Idempotent. Uses a Redis lock so API + worker can both schedule it.
 */

import type { Database } from '@accessshield/db';
import type { Redis } from 'ioredis';
import { logger } from '../lib/logger';
import {
  daysAgoUtc,
  parseField,
  REDIS_HOT_DAYS,
  upsertDailyRow,
} from '../lib/widget-analytics';

const LOCK_KEY = 'widget-analytics-rollup-lock';
const LOCK_TTL_SECONDS = 55 * 60;
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const STATS_PREFIX = 'widget-stats:';

function parseStatsKey(key: string): { orgId: string; date: string } | null {
  if (!key.startsWith(STATS_PREFIX)) return null;
  const rest = key.slice(STATS_PREFIX.length);
  const sep = rest.lastIndexOf(':');
  if (sep <= 0) return null;
  const orgId = rest.slice(0, sep);
  const date = rest.slice(sep + 1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { orgId, date };
}

export async function rollupWidgetAnalytics(db: Database, redis: Redis): Promise<number> {
  const cutoff = daysAgoUtc(REDIS_HOT_DAYS);
  let cursor = '0';
  let rolled = 0;

  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', `${STATS_PREFIX}*`, 'COUNT', 200);
    cursor = next;
    for (const key of keys) {
      const parsed = parseStatsKey(key);
      if (!parsed || parsed.date >= cutoff) continue;

      const hash = await redis.hgetall(key);
      for (const [field, raw] of Object.entries(hash)) {
        const count = Number.parseInt(raw, 10);
        if (!Number.isFinite(count) || count <= 0) continue;
        const { type, feature } = parseField(field);
        if (!type) continue;
        await upsertDailyRow(db, {
          organisationId: parsed.orgId,
          date: parsed.date,
          eventType: type.slice(0, 40),
          feature: feature.slice(0, 60),
          count,
        });
      }
      await redis.del(key);
      rolled += 1;
    }
  } while (cursor !== '0');

  return rolled;
}

export async function runWidgetAnalyticsRollup(db: Database, redis: Redis): Promise<void> {
  const locked = await redis.set(LOCK_KEY, '1', 'EX', LOCK_TTL_SECONDS, 'NX');
  if (locked !== 'OK') return;

  try {
    const rolled = await rollupWidgetAnalytics(db, redis);
    if (rolled > 0) {
      logger.info({ rolled }, 'Widget analytics Redis dailies rolled up');
    }
  } catch (err) {
    logger.error({ err }, 'Widget analytics rollup failed');
  }
}

export function startWidgetAnalyticsRollupJob(db: Database, redis: Redis): () => void {
  const timer = setInterval(() => {
    void runWidgetAnalyticsRollup(db, redis);
  }, CHECK_INTERVAL_MS);

  setTimeout(() => {
    void runWidgetAnalyticsRollup(db, redis);
  }, 15_000);

  return () => clearInterval(timer);
}
