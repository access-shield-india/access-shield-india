/**
 * Findings persister — consumes `findings.persist`.
 * Idempotent violation inserts + page job completion + finalize barrier.
 */

import amqp from 'amqplib';
import type { ConsumeMessage } from 'amqplib';
import { createDb, type Database, violations } from '@accessshield/db';
import type { FindingsPersistQueueMessage } from '@accessshield/types';
import { logger } from '../../lib/logger';
import {
  tryFinalizeScanFromPageJobs,
  updateProgressFromPageJobs,
} from './finalize-from-page-jobs';
import { findingsPersistQueueMessageSchema } from './message-schemas';
import { markScanPageJobStatus } from './page-jobs';
import { enqueuePostFinalizeJobs } from './post-finalize';
import { SCAN_PIPELINE_V2_QUEUES } from './queues';

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

async function processFindingsPersist(msg: FindingsPersistQueueMessage): Promise<void> {
  const database = getDatabase();
  const { scanId, orgId, assetId, pageJobId, findings } = msg;

  if (findings.length > 0) {
    const BATCH = 500;
    for (let i = 0; i < findings.length; i += BATCH) {
      const batch = findings.slice(i, i + BATCH);
      await database
        .insert(violations)
        .values(
          batch.map((v) => ({
            organisationId: orgId,
            scanId,
            ruleId: v.ruleId,
            impact: v.severity,
            description: v.description,
            helpUrl: v.helpUrl,
            wcagCriteria: [v.wcagCriterion],
            selector: v.elementSelector,
            html: v.elementHtml,
            pageUrl: v.pageUrl,
            fingerprint: v.fingerprint,
            standard: v.standard,
          })),
        )
        .onConflictDoNothing({
          target: [violations.scanId, violations.fingerprint],
        });
    }
  }

  await markScanPageJobStatus(database, {
    pageJobId,
    organisationId: orgId,
    status: 'completed',
  });

  await updateProgressFromPageJobs(database, scanId, orgId, findings[0]?.pageUrl ?? '');

  const finalized = await tryFinalizeScanFromPageJobs(database, { scanId, orgId, assetId });
  if (finalized) {
    await enqueuePostFinalizeJobs(database, { scanId, orgId, assetId });
  }

  logger.info(
    { scanId, pageJobId, findingCount: findings.length, finalized },
    'findings.persist processed',
  );
}

export async function startFindingsPersistWorker(): Promise<void> {
  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    throw new Error('RABBITMQ_URL environment variable not set');
  }

  const conn = await amqp.connect(rabbitUrl);
  rabbitConnection = conn;
  const channel = await conn.createChannel();
  rabbitChannel = channel;

  await channel.assertQueue(SCAN_PIPELINE_V2_QUEUES.FINDINGS_PERSIST, { durable: true });
  await channel.prefetch(2);

  await channel.consume(SCAN_PIPELINE_V2_QUEUES.FINDINGS_PERSIST, async (msg: ConsumeMessage | null) => {
    if (!msg) return;
    try {
      const parsed = findingsPersistQueueMessageSchema.safeParse(
        JSON.parse(msg.content.toString()) as unknown,
      );
      if (!parsed.success) {
        logger.error({ errors: parsed.error.flatten() }, 'Invalid findings.persist message');
        channel.ack(msg);
        return;
      }
      await processFindingsPersist(parsed.data);
      channel.ack(msg);
    } catch (err) {
      logger.error({ err }, 'findings.persist handler error');
      channel.ack(msg);
    }
  });

  logger.info(
    { queue: SCAN_PIPELINE_V2_QUEUES.FINDINGS_PERSIST },
    'Findings persist worker started',
  );
}

export async function shutdownFindingsPersistWorker(): Promise<void> {
  if (rabbitChannel) {
    await rabbitChannel.close().catch(() => {});
    rabbitChannel = null;
  }
  if (rabbitConnection) {
    await rabbitConnection.close().catch(() => {});
    rabbitConnection = null;
  }
}
