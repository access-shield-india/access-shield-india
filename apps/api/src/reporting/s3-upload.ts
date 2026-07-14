/**
 * Report storage — S3 in production, local filesystem in dev when S3 is not configured.
 */

import fs from 'fs/promises';
import path from 'path';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../lib/logger';
import { getSharedS3Client } from '../lib/s3-client';
import type { ReportFormat } from './types';

/** Signed URL expiration in seconds (15 minutes) */
const SIGNED_URL_EXPIRY_SECONDS = 15 * 60;

const LOCAL_REPORTS_DIR = path.join(process.cwd(), '.data', 'reports');

const LOCAL_STORAGE_PREFIX = 'local:';

function useLocalReportStorage(): boolean {
  return !process.env.S3_BUCKET_NAME || process.env.REPORT_STORAGE_LOCAL === 'true';
}

function getBucketName(): string {
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('S3_BUCKET_NAME environment variable not set');
  }
  return bucketName;
}

/**
 * Build storage key for a report file.
 * Format: reports/{organisationId}/{reportId}.{format}
 */
function buildStorageKey(organisationId: string, reportId: string, format: ReportFormat): string {
  return `reports/${organisationId}/${reportId}.${format}`;
}

async function saveLocalReport(
  buffer: Buffer,
  organisationId: string,
  reportId: string,
  format: ReportFormat,
): Promise<string> {
  const relativeKey = buildStorageKey(organisationId, reportId, format);
  const filePath = path.join(LOCAL_REPORTS_DIR, relativeKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  logger.info({ filePath, size: buffer.length }, 'Report saved to local storage');
  return `${LOCAL_STORAGE_PREFIX}${relativeKey}`;
}

/**
 * Resolve absolute filesystem path for a locally stored report.
 */
export function resolveLocalReportPath(storageKey: string): string | null {
  if (!storageKey.startsWith(LOCAL_STORAGE_PREFIX)) {
    return null;
  }
  return path.join(LOCAL_REPORTS_DIR, storageKey.slice(LOCAL_STORAGE_PREFIX.length));
}

/**
 * Upload a report file to S3 or local dev storage.
 */
export async function uploadReportToS3(
  buffer: Buffer,
  organisationId: string,
  reportId: string,
  format: ReportFormat,
): Promise<string> {
  if (useLocalReportStorage()) {
    return saveLocalReport(buffer, organisationId, reportId, format);
  }

  const client = getSharedS3Client();
  const bucketName = getBucketName();
  const s3Key = buildStorageKey(organisationId, reportId, format);

  const contentType = format === 'pdf' ? 'application/pdf' : 'text/html';

  logger.info({ s3Key, bucketName, contentType, size: buffer.length }, 'Uploading report to S3');

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          organisationId,
          reportId,
        },
      }),
    );

    logger.info({ s3Key }, 'Report uploaded to S3 successfully');
    return s3Key;
  } catch (err) {
    logger.error({ err, s3Key }, 'Failed to upload report to S3');
    throw new Error(`S3 upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Generate a pre-signed GET URL for downloading a report from S3.
 */
export async function getSignedReportUrl(s3Key: string): Promise<string> {
  const client = getSharedS3Client();
  const bucketName = getBucketName();

  logger.info({ s3Key }, 'Generating signed URL for report');

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });

    const signedUrl = await getSignedUrl(client, command, {
      expiresIn: SIGNED_URL_EXPIRY_SECONDS,
    });

    logger.info({ s3Key, expiresIn: SIGNED_URL_EXPIRY_SECONDS }, 'Signed URL generated');
    return signedUrl;
  } catch (err) {
    logger.error({ err, s3Key }, 'Failed to generate signed URL');
    throw new Error(
      `Failed to generate download URL: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
  }
}

/**
 * Build a download URL for a stored report (local API route or S3 signed URL).
 */
export async function getReportDownloadUrl(storageKey: string, reportId: string): Promise<string> {
  if (storageKey.startsWith(LOCAL_STORAGE_PREFIX)) {
    const apiBase = process.env.API_PUBLIC_URL ?? 'http://localhost:4000';
    return `${apiBase}/api/v1/reports/${reportId}/file`;
  }
  return getSignedReportUrl(storageKey);
}

/**
 * Upload HTML content directly to storage.
 */
export async function uploadHtmlReportToS3(
  html: string,
  organisationId: string,
  reportId: string,
): Promise<string> {
  const buffer = Buffer.from(html, 'utf-8');
  return uploadReportToS3(buffer, organisationId, reportId, 'html');
}
