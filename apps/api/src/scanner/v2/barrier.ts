/**
 * Redis barrier helpers for crawl-done + discovered counts.
 */

import Redis from 'ioredis';
import { logger } from '../../lib/logger';
import { SCAN_PROGRESS_TTL_SECONDS, ScanRedisKeys } from './redis-keys';

export interface ScanBarrierState {
  crawlDone: boolean;
  discovered: number;
}

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  redisClient = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
  return redisClient;
}

async function ensureRedis(): Promise<Redis | null> {
  const redis = getRedis();
  if (!redis) return null;
  if (redis.status !== 'ready') {
    await redis.connect().catch(() => null);
  }
  return redis.status === 'ready' ? redis : null;
}

export async function setScanBarrier(
  scanId: string,
  state: ScanBarrierState,
): Promise<void> {
  const redis = await ensureRedis();
  if (!redis) return;
  try {
    await redis.setex(
      ScanRedisKeys.barrier(scanId),
      SCAN_PROGRESS_TTL_SECONDS,
      JSON.stringify(state),
    );
  } catch (err) {
    logger.warn({ err, scanId }, 'Failed to set scan barrier');
  }
}

export async function getScanBarrier(scanId: string): Promise<ScanBarrierState | null> {
  const redis = await ensureRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(ScanRedisKeys.barrier(scanId));
    if (!raw) return null;
    return JSON.parse(raw) as ScanBarrierState;
  } catch (err) {
    logger.warn({ err, scanId }, 'Failed to read scan barrier');
    return null;
  }
}

export async function clearScanBarrier(scanId: string): Promise<void> {
  const redis = await ensureRedis();
  if (!redis) return;
  try {
    await redis.del(ScanRedisKeys.barrier(scanId));
  } catch (err) {
    logger.warn({ err, scanId }, 'Failed to clear scan barrier');
  }
}
