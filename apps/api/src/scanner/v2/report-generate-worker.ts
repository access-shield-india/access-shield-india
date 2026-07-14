/**
 * Report generate worker — consumes `report.generate`.
 */

import amqp from 'amqplib';
import type { ConsumeMessage } from 'amqplib';
import { createDb, type Database } from '@accessshield/db';
import { z } from 'zod';
import { logger } from '../../lib/logger';
import { generateAndStoreReport } from '../../reporting/generate-report';
import type { ReportFormat, ReportType } from '../../reporting/types';
import { SCAN_PIPELINE_V2_QUEUES } from './queues';

const reportSchema = z.object({
  scanId: z.string().uuid(),
  orgId: z.string().uuid(),
  assetId: z.string().uuid(),
  reportType: z.enum([
    'executive',
    'technical',
    'wcag_compliance',
    'legal_rpwd',
    'accessibility_statement',
    'sebi',
  ]),
  format: z.enum(['pdf', 'html']).optional(),
  generatedBy: z.string().uuid().nullable().optional(),
  idempotencyKey: z.string().min(1),
});

let db: Database | null = null;
let rabbitConnection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
let rabbitChannel: Awaited<
  ReturnType<Awaited<ReturnType<typeof amqp.connect>>['createChannel']>
> | null = null;

function getDatabase(): Database {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not set');
    db = createDb(url);
  }
  return db;
}

export async function startReportGenerateWorker(): Promise<void> {
  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    throw new Error('RABBITMQ_URL environment variable not set');
  }

  const conn = await amqp.connect(rabbitUrl);
  rabbitConnection = conn;
  const channel = await conn.createChannel();
  rabbitChannel = channel;

  await channel.assertQueue(SCAN_PIPELINE_V2_QUEUES.REPORT_GENERATE, { durable: true });
  await channel.prefetch(1);

  await channel.consume(
    SCAN_PIPELINE_V2_QUEUES.REPORT_GENERATE,
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const parsed = reportSchema.safeParse(JSON.parse(msg.content.toString()) as unknown);
        if (!parsed.success) {
          logger.error({ errors: parsed.error.flatten() }, 'Invalid report.generate message');
          channel.ack(msg);
          return;
        }

        const { scanId, orgId, assetId, reportType, format, generatedBy } = parsed.data;
        const result = await generateAndStoreReport(getDatabase(), {
          orgId,
          scanId,
          assetId,
          reportType: reportType as ReportType,
          format: (format ?? 'pdf') as ReportFormat,
          generatedBy: generatedBy ?? null,
        });

        logger.info(
          { scanId, reportId: result.reportId, reportType },
          'report.generate completed',
        );
        channel.ack(msg);
      } catch (err) {
        logger.error({ err }, 'report.generate handler error');
        channel.ack(msg);
      }
    },
  );

  logger.info(
    { queue: SCAN_PIPELINE_V2_QUEUES.REPORT_GENERATE },
    'Report generate worker started',
  );
}

export async function shutdownReportGenerateWorker(): Promise<void> {
  if (rabbitChannel) {
    await rabbitChannel.close().catch(() => {});
    rabbitChannel = null;
  }
  if (rabbitConnection) {
    await rabbitConnection.close().catch(() => {});
    rabbitConnection = null;
  }
}
