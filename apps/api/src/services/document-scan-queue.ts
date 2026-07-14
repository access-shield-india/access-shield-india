/**
 * Document Scan Queue
 *
 * Pushes document scan jobs onto the Redis list consumed
 * by apps/ai-service/services/document_scanner/job_consumer.py.
 *
 * Queue key must match QUEUE_KEY in job_consumer.py: "document-scan-jobs"
 */

import type { Redis } from 'ioredis';
import { logger } from '../lib/logger';

const QUEUE_KEY = 'document-scan-jobs';

export interface DocumentScanJobPayload {
  job_id: string;
  organisation_id: string;
  document_name: string;
  document_type: string;
  document_url: string;
  standards: string[];
}

/**
 * Push a document scan job onto the Redis queue.
 * The ai-service consumer will pick it up within seconds.
 */
export async function enqueueDocumentScan(
  redis: Redis,
  payload: DocumentScanJobPayload,
): Promise<void> {
  await redis.lpush(QUEUE_KEY, JSON.stringify(payload));
  logger.info(
    { job_id: payload.job_id, document_type: payload.document_type },
    'Document scan job enqueued',
  );
}
