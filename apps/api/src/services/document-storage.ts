/**
 * Document Storage Service
 *
 * Handles upload of accessibility scan documents (PDF, DOCX, PPTX, XLSX)
 * to S3. Falls back to local filesystem when S3 is not configured (dev).
 *
 * Follows the same pattern as services/s3-upload.ts (mobile app storage).
 */

import fs from 'fs/promises';
import path from 'path';
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { findMonorepoRoot } from '../config/env';
import { getSharedS3Client } from '../lib/s3-client';
import { logger } from '../lib/logger';

export type DocumentMimeType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export type DocumentType = 'pdf' | 'docx' | 'pptx' | 'xlsx';

export const MIME_TO_DOC_TYPE: Record<string, DocumentType> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

export const EXT_TO_DOC_TYPE: Record<string, DocumentType> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.pptx': 'pptx',
  '.xlsx': 'xlsx',
};

const LOCAL_PREFIX = 'local:';
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function getBucketName(): string {
  const name = process.env.S3_BUCKET_NAME;
  if (!name) {
    throw new Error('S3_BUCKET_NAME environment variable not set');
  }
  return name;
}

function useLocalStorage(): boolean {
  return !process.env.S3_BUCKET_NAME || process.env.DOCUMENT_STORAGE_LOCAL === 'true';
}

function getLocalDataDir(): string {
  return path.join(findMonorepoRoot(), '.data');
}

function buildS3Key(orgId: string, jobId: string, originalFilename: string): string {
  const sanitised = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `document-scans/${orgId}/${jobId}/${sanitised}`;
}

async function saveLocal(
  buffer: Buffer,
  orgId: string,
  jobId: string,
  filename: string,
): Promise<string> {
  const relKey = buildS3Key(orgId, jobId, filename);
  const filePath = path.join(getLocalDataDir(), relKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  logger.info({ filePath, size: buffer.length }, 'Document saved to local storage');
  return `${LOCAL_PREFIX}${relKey}`;
}

export function resolveLocalDocumentPath(storageKey: string): string | null {
  if (!storageKey.startsWith(LOCAL_PREFIX)) {
    return null;
  }
  return path.join(getLocalDataDir(), storageKey.slice(LOCAL_PREFIX.length));
}

/**
 * Upload a document buffer to S3 (or local dev storage).
 * Returns the storage key (S3 key or local: prefixed path).
 */
export async function uploadDocument(
  buffer: Buffer,
  orgId: string,
  jobId: string,
  originalFilename: string,
  mimeType: string,
): Promise<string> {
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File exceeds ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB limit`);
  }

  if (useLocalStorage()) {
    return saveLocal(buffer, orgId, jobId, originalFilename);
  }

  const s3 = getSharedS3Client();
  const bucket = getBucketName();
  const key = buildS3Key(orgId, jobId, originalFilename);
  // MinIO rejects AWS SSE-S3 / KMS headers with NotImplemented — only set on real AWS.
  const useMinio = Boolean(process.env.S3_ENDPOINT?.trim());

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ...(useMinio ? {} : { ServerSideEncryption: 'AES256' as const }),
        Metadata: {
          'original-filename': originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_'),
          'org-id': orgId,
          'job-id': jobId,
        },
      }),
    );
    logger.info({ key, size: buffer.length }, 'Document uploaded to S3');
    return key;
  } catch (err) {
    logger.error({ err, key }, 'Failed to upload document to S3');
    throw err;
  }
}

/**
 * Generate a pre-signed download URL valid for 1 hour.
 * The ai-service job consumer uses this URL to download the file.
 */
export async function getDocumentDownloadUrl(storageKey: string): Promise<string> {
  if (storageKey.startsWith(LOCAL_PREFIX)) {
    const localPath = resolveLocalDocumentPath(storageKey);
    return `file://${localPath}`;
  }

  const s3 = getSharedS3Client();
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: getBucketName(), Key: storageKey }), {
    expiresIn: 3600,
  });
}

/**
 * Delete a document from storage (used when scan is deleted).
 */
export async function deleteDocument(storageKey: string): Promise<void> {
  if (storageKey.startsWith(LOCAL_PREFIX)) {
    const localPath = resolveLocalDocumentPath(storageKey);
    if (localPath) {
      try {
        await fs.unlink(localPath);
      } catch {
        // Best effort
      }
    }
    return;
  }

  try {
    const s3 = getSharedS3Client();
    await s3.send(new DeleteObjectCommand({ Bucket: getBucketName(), Key: storageKey }));
  } catch (err) {
    logger.warn({ err, storageKey }, 'Failed to delete document from S3');
  }
}

/**
 * Infer document type from MIME type or file extension.
 * Returns null if unsupported.
 */
export function inferDocumentType(mimeType: string, filename: string): DocumentType | null {
  const fromMime = MIME_TO_DOC_TYPE[mimeType];
  if (fromMime) {
    return fromMime;
  }
  const ext = path.extname(filename).toLowerCase();
  return EXT_TO_DOC_TYPE[ext] ?? null;
}
