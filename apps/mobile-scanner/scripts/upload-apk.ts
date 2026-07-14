#!/usr/bin/env tsx
/**
 * APK Upload Script
 *
 * Uploads an APK to S3 and returns the S3 key for use in mobile scans.
 * Usage: tsx scripts/upload-apk.ts /path/to/app.apk <org-id> <asset-id>
 */

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const [apkPath, orgId, assetId] = process.argv.slice(2);

if (!apkPath || !orgId || !assetId) {
  console.error(`
Usage: tsx scripts/upload-apk.ts <apk-path> <org-id> <asset-id>

Example:
  tsx scripts/upload-apk.ts ./my-app.apk 11111111-1111-1111-1111-111111111111 33333333-3333-3333-3333-333333333333

Required env vars:
  AWS_REGION (default: ap-south-1)
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  S3_BUCKET_NAME
`);
  process.exit(1);
}

async function main() {
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    console.error('Error: S3_BUCKET_NAME not set in .env');
    process.exit(1);
  }

  // Read APK file
  console.log(`Reading APK: ${apkPath}`);
  const buffer = readFileSync(apkPath);
  const filename = basename(apkPath).replace(/[^a-zA-Z0-9._-]/g, '_');

  // Build S3 key
  const timestamp = Date.now();
  const s3Key = `mobile-apps/${orgId}/${assetId}/android/${timestamp}-${filename}`;

  // Upload to S3
  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const s3 = new S3Client({
    region: process.env.AWS_REGION ?? 'ap-south-1',
    ...(endpoint
      ? { endpoint, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' }
      : {}),
    ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        }
      : {}),
  });

  console.log(`Uploading to s3://${bucketName}/${s3Key}`);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: buffer,
      ContentType: 'application/vnd.android.package-archive',
      Metadata: {
        'original-filename': filename,
        platform: 'android',
        'org-id': orgId,
        'asset-id': assetId,
      },
    }),
  );

  console.log('\n✅ Upload successful!\n');
  console.log('S3 Key (use this in your scan request):');
  console.log(`  ${s3Key}\n`);
  console.log('Full S3 URL:');
  console.log(`  s3://${bucketName}/${s3Key}\n`);

  // Show example scan job message
  console.log('Example RabbitMQ job message:');
  console.log(
    JSON.stringify(
      {
        scanId: 'uuid-for-scan',
        mobileScanId: 'uuid-for-mobile-scan',
        mobileAppId: 'uuid-for-mobile-app',
        orgId: orgId,
        assetId: assetId,
        platform: 'android',
        apkS3Key: s3Key,
        config: {
          standards: ['WCAG22', 'IS17802'],
          maxScreens: 50,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error('Upload failed:', err.message);
  process.exit(1);
});
