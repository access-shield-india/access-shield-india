/**
 * S3 Upload Service
 *
 * Handles file uploads to S3 for mobile apps (APK/IPA).
 * Falls back to local filesystem when S3 is not configured (local dev).
 */

import fs from 'fs/promises';
import path from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { findMonorepoRoot } from '../config/env';
import { getSharedS3Client } from '../lib/s3-client';
import { logger } from '../lib/logger';

const LOCAL_STORAGE_PREFIX = 'local:';

function getLocalDataDir(): string {
  return path.join(findMonorepoRoot(), '.data');
}

function useLocalMobileStorage(): boolean {
  return !process.env.S3_BUCKET_NAME || process.env.MOBILE_APP_STORAGE_LOCAL === 'true';
}

function getBucketName(): string {
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('S3_BUCKET_NAME environment variable not set');
  }
  return bucketName;
}

function buildStorageKey(
  orgId: string,
  assetId: string,
  platform: 'android' | 'ios',
  originalFilename: string,
): string {
  const timestamp = Date.now();
  const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `mobile-apps/${orgId}/${assetId}/${platform}/${timestamp}-${sanitizedFilename}`;
}

async function saveLocalMobileApp(
  buffer: Buffer,
  orgId: string,
  assetId: string,
  platform: 'android' | 'ios',
  originalFilename: string,
): Promise<string> {
  const relativeKey = buildStorageKey(orgId, assetId, platform, originalFilename);
  const filePath = path.join(getLocalDataDir(), relativeKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  logger.info({ filePath, platform, size: buffer.length }, 'Mobile app saved to local storage');
  return `${LOCAL_STORAGE_PREFIX}${relativeKey}`;
}

/**
 * Resolve absolute filesystem path for a locally stored mobile app.
 */
export function resolveLocalMobileAppPath(storageKey: string): string | null {
  if (!storageKey.startsWith(LOCAL_STORAGE_PREFIX)) {
    return null;
  }

  const relativeKey = storageKey.slice(LOCAL_STORAGE_PREFIX.length);
  return path.join(getLocalDataDir(), relativeKey);
}

/**
 * Upload a mobile app file (APK/IPA) to S3 or local dev storage.
 */
export async function uploadMobileApp(
  buffer: Buffer,
  orgId: string,
  assetId: string,
  platform: 'android' | 'ios',
  originalFilename: string,
): Promise<string> {
  if (useLocalMobileStorage()) {
    return saveLocalMobileApp(buffer, orgId, assetId, platform, originalFilename);
  }

  const s3 = getSharedS3Client();
  const bucketName = getBucketName();
  const key = buildStorageKey(orgId, assetId, platform, originalFilename);

  const contentType =
    platform === 'android' ? 'application/vnd.android.package-archive' : 'application/octet-stream';

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'max-age=86400',
        Metadata: {
          'original-filename': originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_'),
          platform,
          'org-id': orgId,
          'asset-id': assetId,
        },
      }),
    );

    logger.info({ key, platform, size: buffer.length }, 'Mobile app uploaded to S3');
    return key;
  } catch (err) {
    logger.error({ err, key, platform }, 'Failed to upload mobile app to S3');
    throw err;
  }
}
