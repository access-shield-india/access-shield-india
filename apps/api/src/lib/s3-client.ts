/**
 * Shared S3 client — works with AWS S3 or MinIO (set S3_ENDPOINT + S3_FORCE_PATH_STYLE).
 */

import { S3Client } from '@aws-sdk/client-s3';

let s3Client: S3Client | null = null;

export function createS3ClientFromEnv(): S3Client {
  const region = process.env.AWS_REGION ?? 'ap-south-1';
  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  return new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle } : {}),
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
    // AWS SDK v3.729+ sends CRC32 checksums by default. MinIO treats those
    // headers as object metadata and returns MetadataTooLarge on GET/presign.
    ...(endpoint
      ? {
          requestChecksumCalculation: 'WHEN_REQUIRED' as const,
          responseChecksumValidation: 'WHEN_REQUIRED' as const,
        }
      : {}),
  });
}

export function getSharedS3Client(): S3Client {
  if (!s3Client) {
    s3Client = createS3ClientFromEnv();
  }
  return s3Client;
}

/** Public object URL for MinIO or AWS (CloudFront preferred when set). */
export function buildObjectPublicUrl(bucket: string, key: string): string {
  if (process.env.CLOUDFRONT_URL) {
    return `${process.env.CLOUDFRONT_URL.replace(/\/$/, '')}/${key}`;
  }

  const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, '');
  if (endpoint) {
    return `${endpoint}/${bucket}/${key}`;
  }

  const region = process.env.AWS_REGION ?? 'ap-south-1';
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
