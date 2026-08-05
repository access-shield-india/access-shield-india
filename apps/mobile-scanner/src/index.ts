/**
 * AccessShield Mobile Scanner Entry Point
 *
 * Starts the RabbitMQ consumer worker that processes mobile app
 * accessibility scan jobs using Appium/BrowserStack.
 */

import './lib/env.js';
import { MobileWorker } from './worker.js';
import { logger } from './lib/logger.js';

async function main(): Promise<void> {
  logger.info(
    {
      service: 'mobile-scanner',
      nodeVersion: process.version,
      env: process.env.NODE_ENV ?? 'development',
    },
    'AccessShield Mobile Scanner starting...',
  );

  const worker = new MobileWorker();

  const gracefulShutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');
    await worker.stop();
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection');
    process.exit(1);
  });

  await worker.start();

  logger.info('Mobile scanner worker listening on queue: mobile-scan-jobs');
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'Mobile scanner fatal error');
  process.exit(1);
});
