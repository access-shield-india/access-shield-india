/**
 * Zod validators for Scan Pipeline v2 MQ payloads.
 */

import { z } from 'zod';

const uuid = z.string().uuid();

export const scanPipelineLoginConfigSchema = z.object({
  url: z.string().url(),
  usernameField: z.string().min(1),
  passwordField: z.string().min(1),
  usernameSecretArn: z.string().min(1),
  passwordSecretArn: z.string().min(1),
});

export const scanPipelineViewportSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  label: z.string().min(1),
});

export const scanPipelineJobConfigSchema = z.object({
  maxPages: z.number().int().min(1).max(500),
  wcagLevel: z.enum(['A', 'AA', 'AAA']),
  standards: z.array(z.enum(['WCAG22', 'IS17802', 'GIGW3', 'SEBI'])).min(1),
  loginConfig: scanPipelineLoginConfigSchema.optional(),
  excludePaths: z.array(z.string()),
  viewports: z.array(scanPipelineViewportSchema),
});

export const scanJobsQueueMessageSchema = z.object({
  scanId: uuid,
  orgId: uuid,
  assetId: uuid,
  assetUrl: z.string().url(),
  config: scanPipelineJobConfigSchema,
  idempotencyKey: z.string().min(1),
});

export const pageScanQueueMessageSchema = z.object({
  scanId: uuid,
  orgId: uuid,
  assetId: uuid,
  pageJobId: uuid,
  url: z.string().url(),
  authRequired: z.boolean(),
  config: scanPipelineJobConfigSchema,
  idempotencyKey: z.string().min(1),
});

export const scanPipelineFindingSchema = z.object({
  ruleId: z.string().min(1),
  wcagCriterion: z.string(),
  wcagLevel: z.enum(['A', 'AA', 'AAA']),
  standard: z.enum(['WCAG22', 'IS17802', 'GIGW3', 'SEBI']),
  severity: z.enum(['critical', 'serious', 'moderate', 'minor']),
  elementType: z.string(),
  elementHtml: z.string(),
  elementSelector: z.string(),
  description: z.string(),
  helpUrl: z.string(),
  fingerprint: z.string().min(1),
  pageUrl: z.string(),
});

export const findingsPersistQueueMessageSchema = z.object({
  scanId: uuid,
  orgId: uuid,
  assetId: uuid,
  pageJobId: uuid,
  findings: z.array(scanPipelineFindingSchema),
  idempotencyKey: z.string().min(1),
});

export const scanFinalizeQueueMessageSchema = z.object({
  scanId: uuid,
  orgId: uuid,
  assetId: uuid,
  idempotencyKey: z.string().min(1),
});

export const scanCancellationQueueMessageSchema = z.object({
  scanId: uuid,
  orgId: uuid,
});
