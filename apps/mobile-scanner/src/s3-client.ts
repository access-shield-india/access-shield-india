/**
 * S3 Client for Mobile Scanner
 *
 * Handles APK/IPA file uploads and downloads, plus screenshot storage.
 * Uses AWS SDK v3 with presigned URLs for BrowserStack integration.
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { MobilePlatform } from './types.js';
import { logger } from './lib/logger.js';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    s3Client = new S3Client({
      region: process.env.AWS_REGION ?? 'ap-south-1',
      ...(endpoint ? { endpoint, forcePathStyle } : {}),
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
  }
  return s3Client;
}

function getBucketName(): string {
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('S3_BUCKET_NAME environment variable not set');
  }
  return bucketName;
}

function buildS3Url(key: string): string {
  if (process.env.CLOUDFRONT_URL) {
    return `${process.env.CLOUDFRONT_URL.replace(/\/$/, '')}/${key}`;
  }
  const bucketName = getBucketName();
  const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, '');
  if (endpoint) {
    return `${endpoint}/${bucketName}/${key}`;
  }
  const region = process.env.AWS_REGION ?? 'ap-south-1';
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
}

export async function uploadAppFile(
  buffer: Buffer,
  orgId: string,
  assetId: string,
  platform: MobilePlatform,
  originalFilename: string,
): Promise<string> {
  const s3 = getS3Client();
  const bucketName = getBucketName();

  const timestamp = Date.now();
  const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `mobile-apps/${orgId}/${assetId}/${platform}/${timestamp}-${sanitizedFilename}`;

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
          'original-filename': sanitizedFilename,
          platform,
          'org-id': orgId,
          'asset-id': assetId,
        },
      }),
    );

    logger.info({ key, platform, size: buffer.length }, 'App file uploaded to S3');
    return key;
  } catch (err) {
    logger.error({ err, key, platform }, 'Failed to upload app file to S3');
    throw err;
  }
}

export async function downloadAppFile(s3Key: string): Promise<Buffer> {
  const s3 = getS3Client();
  const bucketName = getBucketName();

  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      }),
    );

    if (!response.Body) {
      throw new Error('Empty response body from S3');
    }

    const chunks: Uint8Array[] = [];
    const stream = response.Body as AsyncIterable<Uint8Array>;

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    logger.info({ s3Key, size: buffer.length }, 'App file downloaded from S3');
    return buffer;
  } catch (err) {
    logger.error({ err, s3Key }, 'Failed to download app file from S3');
    throw err;
  }
}

export async function getPresignedAppUrl(s3Key: string): Promise<string> {
  const s3 = getS3Client();
  const bucketName = getBucketName();

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });

    const presignedUrl = await getSignedUrl(s3, command, {
      expiresIn: 1800,
    });

    logger.info({ s3Key }, 'Presigned URL generated for app file');
    return presignedUrl;
  } catch (err) {
    logger.error({ err, s3Key }, 'Failed to generate presigned URL');
    throw err;
  }
}

export async function uploadScreenshot(
  buffer: Buffer,
  scanId: string,
  screenId: string,
  orgId: string,
): Promise<string> {
  const s3 = getS3Client();
  const bucketName = getBucketName();

  const key = `mobile-screenshots/${orgId}/${scanId}/${screenId}.png`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: 'image/png',
        CacheControl: 'max-age=31536000',
      }),
    );

    logger.info({ key, scanId, screenId }, 'Screenshot uploaded to S3');
    return key;
  } catch (err) {
    logger.error({ err, key }, 'Failed to upload screenshot to S3');
    throw err;
  }
}

export function getScreenshotUrl(s3Key: string): string {
  return buildS3Url(s3Key);
}
