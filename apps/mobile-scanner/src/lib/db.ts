import { createDb, type Database } from '@accessshield/db';
import { logger } from './logger.js';

let dbInstance: Database | null = null;

export function getDatabase(): Database {
  if (!dbInstance) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable not set');
    }
    dbInstance = createDb(databaseUrl);
    logger.info('Database connection initialized');
  }
  return dbInstance;
}
