/**
 * AI alt-text + fix consumers — call ai-service and update violations.
 * Consumes `ai.alt-text` / `ai.fix` and legacy `ai-alt-text` / `ai-fix`.
 * Provider/model come from the organisation AI settings (anthropic | local).
 */

import amqp from 'amqplib';
import type { ConsumeMessage } from 'amqplib';
import { and, eq } from 'drizzle-orm';
import { createDb, organisations, violations, type Database } from '@accessshield/db';
import { z } from 'zod';
import { logger } from '../../lib/logger';
import { requestAiAltText, requestAiFix } from '../../lib/ai-client';
import { getPlanFeatures } from '../../lib/plan-limits';
import { tryConsumeAiRateLimit } from './ai-rate-limit';
import { SCAN_PIPELINE_V2_QUEUES } from './queues';

const altTextSchema = z.object({
  violationId: z.string().uuid(),
  orgId: z.string().uuid(),
  planTier: z.string().min(1),
  assetId: z.string().uuid(),
  imageSelector: z.string().optional(),
  pageUrl: z.string(),
  elementHtml: z.string(),
  idempotencyKey: z.string().optional(),
});

const fixSchema = z.object({
  violationId: z.string().uuid(),
  orgId: z.string().uuid(),
  planTier: z.string().min(1),
  ruleId: z.string().min(1),
  elementHtml: z.string(),
  wcagCriterion: z.string(),
  pageUrl: z.string().optional(),
  description: z.string().optional(),
  idempotencyKey: z.string().optional(),
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

async function loadOrgAiSettings(
  database: Database,
  orgId: string,
): Promise<{ aiProvider: string; aiModel: string }> {
  const [org] = await database
    .select({
      aiProvider: organisations.aiProvider,
      aiModel: organisations.aiModel,
    })
    .from(organisations)
    .where(eq(organisations.id, orgId))
    .limit(1);

  return {
    aiProvider: org?.aiProvider ?? 'local',
    aiModel: org?.aiModel ?? 'Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF',
  };
}

async function processAltText(raw: z.infer<typeof altTextSchema>): Promise<void> {
  const features = getPlanFeatures(raw.planTier);
  if (!features.aiRemediation) {
    return;
  }

  const rate = await tryConsumeAiRateLimit(raw.orgId, raw.planTier);
  if (!rate.allowed) {
    logger.warn({ orgId: raw.orgId }, 'Skipping ai.alt-text — rate limited');
    return;
  }

  const database = getDatabase();
  const [existing] = await database
    .select({ aiAltText: violations.aiAltText })
    .from(violations)
    .where(and(eq(violations.id, raw.violationId), eq(violations.organisationId, raw.orgId)))
    .limit(1);

  if (existing?.aiAltText) {
    return;
  }

  try {
    const { aiProvider, aiModel } = await loadOrgAiSettings(database, raw.orgId);
    const response = await requestAiAltText(
      {
        image_url: raw.pageUrl,
        page_context: raw.pageUrl,
        element_html: raw.elementHtml,
        page_lang: 'en',
        asset_id: raw.assetId,
        violation_id: raw.violationId,
      },
      raw.orgId,
      raw.planTier,
      aiProvider,
      aiModel,
    );

    const altText = response.alt_text?.trim() ?? '';
    if (!altText) {
      logger.info({ violationId: raw.violationId }, 'AI alt-text empty (decorative?)');
      return;
    }

    await database
      .update(violations)
      .set({ aiAltText: altText })
      .where(and(eq(violations.id, raw.violationId), eq(violations.organisationId, raw.orgId)));

    logger.info({ violationId: raw.violationId }, 'AI alt-text stored');
  } catch (err) {
    logger.error({ err, violationId: raw.violationId }, 'AI alt-text worker failed');
  }
}

async function processFix(raw: z.infer<typeof fixSchema>): Promise<void> {
  const features = getPlanFeatures(raw.planTier);
  if (!features.aiRemediation) {
    return;
  }

  const rate = await tryConsumeAiRateLimit(raw.orgId, raw.planTier);
  if (!rate.allowed) {
    logger.warn({ orgId: raw.orgId }, 'Skipping ai.fix — rate limited');
    return;
  }

  const database = getDatabase();
  const [existing] = await database
    .select({ aiFix: violations.aiFix })
    .from(violations)
    .where(and(eq(violations.id, raw.violationId), eq(violations.organisationId, raw.orgId)))
    .limit(1);

  if (existing?.aiFix) {
    return;
  }

  try {
    const { aiProvider, aiModel } = await loadOrgAiSettings(database, raw.orgId);
    const response = await requestAiFix(
      {
        rule_id: raw.ruleId,
        element_html: raw.elementHtml,
        wcag_criterion: raw.wcagCriterion,
        standard: 'WCAG22',
        page_context: raw.pageUrl ?? raw.description ?? '',
        violation_id: raw.violationId,
      },
      raw.orgId,
      raw.planTier,
      aiProvider,
      aiModel,
    );

    await database
      .update(violations)
      .set({
        aiFix: response.fix_html || raw.elementHtml,
        aiExplanation: response.explanation || null,
      })
      .where(and(eq(violations.id, raw.violationId), eq(violations.organisationId, raw.orgId)));

    logger.info({ violationId: raw.violationId }, 'AI fix stored');
  } catch (err) {
    logger.error({ err, violationId: raw.violationId }, 'AI fix worker failed');
  }
}

export async function startAiRemediationWorkers(): Promise<void> {
  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    throw new Error('RABBITMQ_URL environment variable not set');
  }

  const conn = await amqp.connect(rabbitUrl);
  rabbitConnection = conn;
  const channel = await conn.createChannel();
  rabbitChannel = channel;

  const altQueues = [SCAN_PIPELINE_V2_QUEUES.AI_ALT_TEXT, 'ai-alt-text'];
  const fixQueues = [SCAN_PIPELINE_V2_QUEUES.AI_FIX, 'ai-fix'];

  for (const q of [...altQueues, ...fixQueues]) {
    await channel.assertQueue(q, { durable: true });
  }
  await channel.prefetch(2);

  for (const q of altQueues) {
    await channel.consume(q, async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const parsed = altTextSchema.safeParse(JSON.parse(msg.content.toString()) as unknown);
        if (!parsed.success) {
          logger.error({ errors: parsed.error.flatten(), q }, 'Invalid alt-text message');
          channel.ack(msg);
          return;
        }
        await processAltText(parsed.data);
        channel.ack(msg);
      } catch (err) {
        logger.error({ err, q }, 'alt-text consumer error');
        channel.ack(msg);
      }
    });
  }

  for (const q of fixQueues) {
    await channel.consume(q, async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const parsed = fixSchema.safeParse(JSON.parse(msg.content.toString()) as unknown);
        if (!parsed.success) {
          logger.error({ errors: parsed.error.flatten(), q }, 'Invalid fix message');
          channel.ack(msg);
          return;
        }
        await processFix(parsed.data);
        channel.ack(msg);
      } catch (err) {
        logger.error({ err, q }, 'fix consumer error');
        channel.ack(msg);
      }
    });
  }

  logger.info({ altQueues, fixQueues }, 'AI remediation workers started');
}

export async function shutdownAiRemediationWorkers(): Promise<void> {
  if (rabbitChannel) {
    await rabbitChannel.close().catch(() => {});
    rabbitChannel = null;
  }
  if (rabbitConnection) {
    await rabbitConnection.close().catch(() => {});
    rabbitConnection = null;
  }
}
