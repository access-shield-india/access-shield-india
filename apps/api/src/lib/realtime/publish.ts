import type { Redis } from 'ioredis';
import RedisClient from 'ioredis';
import { logger } from '../logger';

export const REALTIME_REDIS_CHANNEL = 'accessshield:realtime';

export interface RealtimeEvent {
  channel: string;
  event: string;
  table: string;
  new: Record<string, unknown>;
}

let publisherRedis: Redis | null = null;

function getPublisherRedis(redis?: Redis): Redis {
  if (redis) return redis;
  if (!publisherRedis) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL not set');
    }
    publisherRedis = new RedisClient(url, { maxRetriesPerRequest: 3, lazyConnect: true });
  }
  return publisherRedis;
}

/**
 * Publish a realtime event to Redis for SSE fan-out across API replicas.
 */
export async function publishRealtime(
  channel: string,
  event: string,
  table: string,
  payload: Record<string, unknown>,
  redis?: Redis,
): Promise<void> {
  const message: RealtimeEvent = {
    channel,
    event,
    table,
    new: payload,
  };

  try {
    const client = getPublisherRedis(redis);
    if (client.status !== 'ready' && client.status !== 'connecting') {
      await client.connect();
    }
    await client.publish(REALTIME_REDIS_CHANNEL, JSON.stringify(message));
  } catch (err) {
    logger.warn({ err, channel, event }, 'Failed to publish realtime event');
  }
}
