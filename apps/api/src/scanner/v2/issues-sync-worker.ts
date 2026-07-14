/**
 * Issues sync worker — consumes `issues.sync` after scan finalize.
 */

import amqp from 'amqplib';
import type { ConsumeMessage } from 'amqplib';
import { createDb, type Database } from '@accessshield/db';
import { z } from 'zod';
import { logger } from '../../lib/logger';
import { syncIssuesFromViolations } from '../../services/issue-sync';
import { SCAN_PIPELINE_V2_QUEUES } from './queues';

const issuesSyncSchema = z.object({
  scanId: z.string().uuid(),
  orgId: z.string().uuid(),
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

export async function startIssuesSyncWorker(): Promise<void> {
  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    throw new Error('RABBITMQ_URL environment variable not set');
  }

  const conn = await amqp.connect(rabbitUrl);
  rabbitConnection = conn;
  const channel = await conn.createChannel();
  rabbitChannel = channel;

  await channel.assertQueue(SCAN_PIPELINE_V2_QUEUES.ISSUES_SYNC, { durable: true });
  await channel.prefetch(1);

  await channel.consume(SCAN_PIPELINE_V2_QUEUES.ISSUES_SYNC, async (msg: ConsumeMessage | null) => {
    if (!msg) return;
    try {
      const parsed = issuesSyncSchema.safeParse(JSON.parse(msg.content.toString()) as unknown);
      if (!parsed.success) {
        logger.error({ errors: parsed.error.flatten() }, 'Invalid issues.sync message');
        channel.ack(msg);
        return;
      }

      const { scanId, orgId } = parsed.data;
      const created = await syncIssuesFromViolations(getDatabase(), orgId, scanId);
      logger.info({ scanId, orgId, created }, 'issues.sync processed');
      channel.ack(msg);
    } catch (err) {
      logger.error({ err }, 'issues.sync handler error');
      channel.ack(msg);
    }
  });

  logger.info({ queue: SCAN_PIPELINE_V2_QUEUES.ISSUES_SYNC }, 'Issues sync worker started');
}

export async function shutdownIssuesSyncWorker(): Promise<void> {
  if (rabbitChannel) {
    await rabbitChannel.close().catch(() => {});
    rabbitChannel = null;
  }
  if (rabbitConnection) {
    await rabbitConnection.close().catch(() => {});
    rabbitConnection = null;
  }
}
