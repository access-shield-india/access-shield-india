import type { HealthCheckResponse } from '@accessshield/types';
import { sql } from 'drizzle-orm';
import type { Router as ExpressRouter, Request, Response } from 'express';
import { Router } from 'express';
import type { Database } from '@accessshield/db';
import type Redis from 'ioredis';

const VERSION = process.env.npm_package_version ?? '0.1.0';

export function createHealthRouter(db: Database, redis: Redis): ExpressRouter {
  const router = Router();

  router.get('/health', async (_req: Request, res: Response) => {
    let dbStatus: HealthCheckResponse['db'] = 'disconnected';
    let redisStatus: HealthCheckResponse['redis'] = 'disconnected';

    try {
      await db.execute(sql`SELECT 1`);
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    try {
      const pong = await redis.ping();
      redisStatus = pong === 'PONG' ? 'connected' : 'disconnected';
    } catch {
      redisStatus = 'disconnected';
    }

    const isHealthy = dbStatus === 'connected' && redisStatus === 'connected';

    const body: HealthCheckResponse = {
      status: isHealthy
        ? 'ok'
        : dbStatus === 'connected' || redisStatus === 'connected'
          ? 'degraded'
          : 'error',
      db: dbStatus,
      redis: redisStatus,
      version: VERSION,
      timestamp: new Date().toISOString(),
    };

    res.status(isHealthy ? 200 : 503).json(body);
  });

  return router;
}
