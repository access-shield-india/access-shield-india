/**
 * AI enricher — after scan finalize, fan-out eligible violations to ai.alt-text / ai.fix.
 */

import amqp from 'amqplib';
import type { ConsumeMessage } from 'amqplib';
import { and, eq } from 'drizzle-orm';
import { createDb, scans, violations, type Database } from '@accessshield/db';
import { z } from 'zod';
import { logger } from '../../lib/logger';
import { getPlanFeatures } from '../../lib/plan-limits';
import { publishAiAltTextJob, publishAiFixJob } from './publish';
import { SCAN_PIPELINE_V2_QUEUES } from './queues';

const enrichSchema = z.object({
  scanId: z.string().uuid(),
  orgId: z.string().uuid(),
  planTier: z.string().min(1),
  idempotencyKey: z.string().min(1),
});

const ALT_TEXT_RULES = new Set(['image-alt', 'input-image-alt', 'area-alt']);

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

async function processAiEnrich(msg: z.infer<typeof enrichSchema>): Promise<void> {
  const { scanId, orgId, planTier } = msg;
  const features = getPlanFeatures(planTier);

  if (!features.aiRemediation) {
    logger.info({ scanId, orgId, planTier }, 'Skipping ai.enrich — plan has no AI remediation');
    return;
  }

  const database = getDatabase();

  const [scanRow] = await database
    .select({ assetId: scans.assetId })
    .from(scans)
    .where(and(eq(scans.id, scanId), eq(scans.organisationId, orgId)))
    .limit(1);

  if (!scanRow) {
    logger.warn({ scanId, orgId }, 'ai.enrich — scan not found');
    return;
  }

  const rows = await database
    .select({
      id: violations.id,
      ruleId: violations.ruleId,
      impact: violations.impact,
      description: violations.description,
      wcagCriteria: violations.wcagCriteria,
      selector: violations.selector,
      html: violations.html,
      pageUrl: violations.pageUrl,
      aiFix: violations.aiFix,
      aiAltText: violations.aiAltText,
    })
    .from(violations)
    .where(and(eq(violations.scanId, scanId), eq(violations.organisationId, orgId)));

  let altQueued = 0;
  let fixQueued = 0;

  for (const row of rows) {
    if (ALT_TEXT_RULES.has(row.ruleId) && !row.aiAltText && row.html) {
      await publishAiAltTextJob({
        violationId: row.id,
        orgId,
        planTier,
        assetId: scanRow.assetId,
        imageSelector: row.selector ?? '',
        pageUrl: row.pageUrl ?? '',
        elementHtml: row.html,
        idempotencyKey: `ai.alt-text:${row.id}`,
      });
      altQueued += 1;
    }

    if (
      (row.impact === 'critical' || row.impact === 'serious') &&
      !row.aiFix &&
      row.html
    ) {
      await publishAiFixJob({
        violationId: row.id,
        orgId,
        planTier,
        ruleId: row.ruleId,
        elementHtml: row.html,
        wcagCriterion: row.wcagCriteria?.[0] ?? 'N/A',
        pageUrl: row.pageUrl ?? '',
        description: row.description,
        idempotencyKey: `ai.fix:${row.id}`,
      });
      fixQueued += 1;
    }
  }

  logger.info({ scanId, orgId, altQueued, fixQueued }, 'ai.enrich fan-out complete');
}

export async function startAiEnrichWorker(): Promise<void> {
  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    throw new Error('RABBITMQ_URL environment variable not set');
  }

  const conn = await amqp.connect(rabbitUrl);
  rabbitConnection = conn;
  const channel = await conn.createChannel();
  rabbitChannel = channel;

  await channel.assertQueue(SCAN_PIPELINE_V2_QUEUES.AI_ENRICH, { durable: true });
  await channel.prefetch(1);

  await channel.consume(SCAN_PIPELINE_V2_QUEUES.AI_ENRICH, async (msg: ConsumeMessage | null) => {
    if (!msg) return;
    try {
      const parsed = enrichSchema.safeParse(JSON.parse(msg.content.toString()) as unknown);
      if (!parsed.success) {
        logger.error({ errors: parsed.error.flatten() }, 'Invalid ai.enrich message');
        channel.ack(msg);
        return;
      }
      await processAiEnrich(parsed.data);
      channel.ack(msg);
    } catch (err) {
      logger.error({ err }, 'ai.enrich handler error');
      channel.ack(msg);
    }
  });

  logger.info({ queue: SCAN_PIPELINE_V2_QUEUES.AI_ENRICH }, 'AI enrich worker started');
}

export async function shutdownAiEnrichWorker(): Promise<void> {
  if (rabbitChannel) {
    await rabbitChannel.close().catch(() => {});
    rabbitChannel = null;
  }
  if (rabbitConnection) {
    await rabbitConnection.close().catch(() => {});
    rabbitConnection = null;
  }
}
