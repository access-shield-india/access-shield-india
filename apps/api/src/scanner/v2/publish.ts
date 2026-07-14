/**
 * Publish helpers for Scan Pipeline v2 queues.
 */

import amqp from 'amqplib';
import type {
  AiAltTextQueueMessage,
  AiEnrichQueueMessage,
  AiFixQueueMessage,
  FindingsPersistQueueMessage,
  IssuesSyncQueueMessage,
  PageScanQueueMessage,
  ReportGenerateQueueMessage,
  ScanJobsQueueMessage,
} from '@accessshield/types';
import { logger } from '../../lib/logger';
import { SCAN_PIPELINE_V2_QUEUES } from './queues';

let rabbitConnection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
let rabbitChannel: Awaited<
  ReturnType<Awaited<ReturnType<typeof amqp.connect>>['createChannel']>
> | null = null;

async function ensureChannel() {
  if (rabbitChannel) return rabbitChannel;

  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    throw new Error('RABBITMQ_URL environment variable not set');
  }

  const conn = await amqp.connect(rabbitUrl);
  rabbitConnection = conn;
  const channel = await conn.createChannel();
  rabbitChannel = channel;

  await channel.assertQueue(SCAN_PIPELINE_V2_QUEUES.PAGE_SCAN, { durable: true });
  await channel.assertQueue(SCAN_PIPELINE_V2_QUEUES.PAGE_SCAN_AUTH, { durable: true });
  await channel.assertQueue(SCAN_PIPELINE_V2_QUEUES.SCAN_JOBS, { durable: true });
  await channel.assertQueue(SCAN_PIPELINE_V2_QUEUES.FINDINGS_PERSIST, { durable: true });
  await channel.assertQueue(SCAN_PIPELINE_V2_QUEUES.ISSUES_SYNC, { durable: true });
  await channel.assertQueue(SCAN_PIPELINE_V2_QUEUES.AI_ENRICH, { durable: true });
  await channel.assertQueue(SCAN_PIPELINE_V2_QUEUES.AI_ALT_TEXT, { durable: true });
  await channel.assertQueue(SCAN_PIPELINE_V2_QUEUES.AI_FIX, { durable: true });
  await channel.assertQueue(SCAN_PIPELINE_V2_QUEUES.REPORT_GENERATE, { durable: true });

  conn.on('close', () => {
    logger.warn('RabbitMQ v2 publisher connection closed');
    rabbitConnection = null;
    rabbitChannel = null;
  });

  conn.on('error', (err) => {
    logger.error({ err }, 'RabbitMQ v2 publisher connection error');
  });

  return channel;
}

export async function publishPageScanJob(message: PageScanQueueMessage): Promise<void> {
  const channel = await ensureChannel();
  const queue = message.authRequired
    ? SCAN_PIPELINE_V2_QUEUES.PAGE_SCAN_AUTH
    : SCAN_PIPELINE_V2_QUEUES.PAGE_SCAN;

  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
  logger.info(
    { scanId: message.scanId, pageJobId: message.pageJobId, queue },
    'Published page.scan job',
  );
}

export async function publishFindingsPersistJob(
  message: FindingsPersistQueueMessage,
): Promise<void> {
  const channel = await ensureChannel();
  channel.sendToQueue(
    SCAN_PIPELINE_V2_QUEUES.FINDINGS_PERSIST,
    Buffer.from(JSON.stringify(message)),
    { persistent: true },
  );
  logger.info(
    {
      scanId: message.scanId,
      pageJobId: message.pageJobId,
      findingCount: message.findings.length,
    },
    'Published findings.persist job',
  );
}

export async function publishIssuesSyncJob(message: IssuesSyncQueueMessage): Promise<void> {
  const channel = await ensureChannel();
  channel.sendToQueue(
    SCAN_PIPELINE_V2_QUEUES.ISSUES_SYNC,
    Buffer.from(JSON.stringify(message)),
    { persistent: true },
  );
  logger.info({ scanId: message.scanId }, 'Published issues.sync job');
}

export async function publishAiEnrichJob(message: AiEnrichQueueMessage): Promise<void> {
  const channel = await ensureChannel();
  channel.sendToQueue(
    SCAN_PIPELINE_V2_QUEUES.AI_ENRICH,
    Buffer.from(JSON.stringify(message)),
    { persistent: true },
  );
  logger.info({ scanId: message.scanId }, 'Published ai.enrich job');
}

export async function publishAiAltTextJob(message: AiAltTextQueueMessage): Promise<void> {
  const channel = await ensureChannel();
  channel.sendToQueue(
    SCAN_PIPELINE_V2_QUEUES.AI_ALT_TEXT,
    Buffer.from(JSON.stringify(message)),
    { persistent: true },
  );
}

export async function publishAiFixJob(message: AiFixQueueMessage): Promise<void> {
  const channel = await ensureChannel();
  channel.sendToQueue(
    SCAN_PIPELINE_V2_QUEUES.AI_FIX,
    Buffer.from(JSON.stringify(message)),
    { persistent: true },
  );
}

export async function publishReportGenerateJob(
  message: ReportGenerateQueueMessage,
): Promise<void> {
  const channel = await ensureChannel();
  channel.sendToQueue(
    SCAN_PIPELINE_V2_QUEUES.REPORT_GENERATE,
    Buffer.from(JSON.stringify(message)),
    { persistent: true },
  );
  logger.info(
    { scanId: message.scanId, reportType: message.reportType },
    'Published report.generate job',
  );
}

export async function publishScanJobsMessage(message: ScanJobsQueueMessage): Promise<void> {
  const channel = await ensureChannel();
  channel.sendToQueue(
    SCAN_PIPELINE_V2_QUEUES.SCAN_JOBS,
    Buffer.from(JSON.stringify(message)),
    { persistent: true },
  );
  logger.info({ scanId: message.scanId }, 'Published scan.jobs message');
}

export async function closeV2Publishers(): Promise<void> {
  if (rabbitChannel) {
    await rabbitChannel.close();
    rabbitChannel = null;
  }
  if (rabbitConnection) {
    await rabbitConnection.close();
    rabbitConnection = null;
  }
}
