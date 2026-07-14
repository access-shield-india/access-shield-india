import { loadLocalEnv } from './config/env';

loadLocalEnv();

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import Redis from 'ioredis';
import pinoHttp from 'pino-http';
import { createDb } from '@accessshield/db';
import { loadSecrets } from './config/secrets';
import { logger } from './lib/logger';
import { sendProblem } from './lib/problem-details';
import { createAuthMiddleware } from './middleware/auth';
import { requestIdMiddleware } from './middleware/request-id';
import { createCertificationRouter } from './certification/routes';
import { createReportingRouter } from './reporting/orchestrator';
import { createAssetsRouter } from './routes/assets';
import { createBillingRouter } from './routes/billing';
import { createDashboardRouter } from './routes/dashboard';
import { createHealthRouter } from './routes/health';
import { createIntegrationsRouter } from './routes/integrations';
import { createIssuesRouter } from './routes/issues';
import { createNotificationsRouter } from './routes/notifications';
import { createOrganisationRouter } from './routes/organisation';
import { createUsersRouter } from './routes/users';
import { createWidgetRouter, createPublicWidgetRouter } from './routes/widget';
import { createScannerRouter, closeRabbitMQ } from './scanner/orchestrator';
import { createPublicScanRouter } from './routes/public-scan';
import { createPublicWaitlistRouter } from './routes/public-waitlist';
import { createPublicSignupRouter } from './routes/public-signup';
import { createAdminRouter } from './routes/admin';
import { createDocumentScansRouter } from './routes/document-scans';
import { createRealtimeRouter } from './routes/realtime';

const PORT = Number(process.env.PORT ?? 4000);

async function bootstrap() {
  const secrets = await loadSecrets();
  const db = createDb(secrets.databaseUrl);
  const redis = new Redis(secrets.redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });

  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin:
        process.env.NODE_ENV === 'production'
          ? (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
          : true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      customProps: (req) => ({ requestId: req.id }),
    }),
  );

  const healthRouter = createHealthRouter(db, redis);
  app.use(healthRouter);

  // API has no HTML UI — point browsers at the web app
  app.get('/', (_req, res) => {
    const webUrl = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
    res.json({
      service: 'AccessShield API',
      status: 'running',
      health: '/health',
      webApp: webUrl,
      freeScanTool: `${webUrl}/scan`,
    });
  });

  const publicScanRouter = createPublicScanRouter(db, redis);
  app.use('/api/v1/public/scan', publicScanRouter);

  const publicWaitlistRouter = createPublicWaitlistRouter(db, redis);
  app.use('/api/v1/public/waitlist', publicWaitlistRouter);

  const publicSignupRouter = createPublicSignupRouter(db, redis, secrets);
  app.use('/api/v1/public/signup', publicSignupRouter);

  const publicWidgetRouter = createPublicWidgetRouter(db, redis);
  app.use('/api/v1/widget', publicWidgetRouter);

  const authMiddleware = createAuthMiddleware(secrets, db);
  app.use('/api/v1', authMiddleware);

  const assetsRouter = createAssetsRouter(db);
  app.use('/api/v1/assets', assetsRouter);

  const dashboardRouter = createDashboardRouter(db);
  app.use('/api/v1/dashboard', dashboardRouter);

  const issuesRouter = createIssuesRouter(db);
  app.use('/api/v1/issues', issuesRouter);

  const scannerRouter = createScannerRouter(db, redis);
  app.use('/api/v1/scans', scannerRouter);

  const documentScansRouter = createDocumentScansRouter(db, redis);
  app.use('/api/v1/document-scans', documentScansRouter);

  const reportingRouter = createReportingRouter(db);
  app.use('/api/v1/reports', reportingRouter);

  // Certification routes: /api/v1/certificates AND public /verify/:token
  const certificationRouter = createCertificationRouter(db);
  app.use(certificationRouter);

  const organisationRouter = createOrganisationRouter(db);
  app.use('/api/v1/organisation', organisationRouter);

  const usersRouter = createUsersRouter(db, secrets);
  app.use('/api/v1/users', usersRouter);

  const realtimeRouter = createRealtimeRouter(db, redis);
  app.use('/api/v1/realtime', realtimeRouter);

  const billingRouter = createBillingRouter(db);
  app.use('/api/v1', billingRouter);

  const notificationsRouter = createNotificationsRouter(db, redis);
  app.use('/api/v1/notifications', notificationsRouter);

  const widgetRouter = createWidgetRouter(db, redis);
  app.use('/api/v1/widget', widgetRouter);

  const integrationsRouter = createIntegrationsRouter(db);
  app.use('/api/v1/integrations', integrationsRouter);

  const adminRouter = createAdminRouter(db, secrets, redis);
  app.use('/api/v1/admin', adminRouter);

  app.use((_req, res) => {
    sendProblem(res, 404, 'not-found', 'Resource not found');
  });

  app.use(
    (err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error({ err, requestId: req.id }, 'Unhandled error');
      sendProblem(res, 500, 'internal-error', 'Internal server error');
    },
  );

  await redis.connect();

  const server = app.listen(PORT, () => {
    logger.info({ port: PORT, version: process.env.npm_package_version }, 'API server started');
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.fatal(
        { port: PORT },
        'Port already in use — run "pnpm dev:stop" or kill the other API process',
      );
    } else {
      logger.fatal({ err }, 'Failed to start API server');
    }
    process.exit(1);
  });

  const gracefulShutdown = async () => {
    logger.info('Shutting down gracefully...');
    server.close();
    await redis.quit();
    await closeRabbitMQ();
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

bootstrap().catch((err: unknown) => {
  logger.fatal({ err }, 'Failed to start API server');
  process.exit(1);
});
