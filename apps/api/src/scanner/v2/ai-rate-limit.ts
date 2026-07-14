/**
 * Per-org AI rate limiting via Redis sliding window (hourly).
 */

import Redis from 'ioredis';
import { logger } from '../../lib/logger';
import { ScanRedisKeys } from './redis-keys';

const HOURLY_LIMITS: Record<string, number> = {
  trial: 0,
  starter: 0,
  widget: 0,
  professional: 500,
  government: 2000,
  compliance_shield: 500,
  regulatory_defense: 2000,
  enterprise: 2000,
};

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  redisClient = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
  return redisClient;
}

export function getAiHourlyLimit(planTier: string): number {
  return HOURLY_LIMITS[planTier] ?? HOURLY_LIMITS.starter ?? 0;
}

/**
 * Returns true if the org is allowed another AI call this hour.
 * Increments the counter when allowed.
 */
export async function tryConsumeAiRateLimit(
  orgId: string,
  planTier: string,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limit = getAiHourlyLimit(planTier);
  if (limit <= 0) {
    return { allowed: false, remaining: 0, limit };
  }

  const redis = getRedis();
  if (!redis) {
    // Fail open without Redis so local/dev still works
    return { allowed: true, remaining: limit, limit };
  }

  try {
    if (redis.status !== 'ready') {
      await redis.connect().catch(() => null);
    }
    const key = ScanRedisKeys.aiRateLimit(orgId);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 3600);
    }
    if (count > limit) {
      logger.warn({ orgId, planTier, count, limit }, 'AI rate limit exceeded');
      return { allowed: false, remaining: 0, limit };
    }
    return { allowed: true, remaining: Math.max(0, limit - count), limit };
  } catch (err) {
    logger.warn({ err, orgId }, 'AI rate limit check failed — allowing request');
    return { allowed: true, remaining: limit, limit };
  }
}
