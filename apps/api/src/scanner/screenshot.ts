/**
 * Screenshot Capture and Annotation
 *
 * Captures screenshots of scanned pages, annotates them with violation markers,
 * and uploads to S3 for storage.
 */

import type { Page } from 'playwright';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { logger } from '../lib/logger';
import { getSharedS3Client } from '../lib/s3-client';
import type { RawViolation } from './types';

/** Desktop viewport dimensions */
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

/** Mobile viewport dimensions */
const MOBILE_VIEWPORT = { width: 375, height: 667 };

/** Maximum violations to annotate on screenshot */
const MAX_ANNOTATIONS = 10;

/** Annotation box color (red) */
const ANNOTATION_COLOR = { r: 220, g: 38, b: 38, alpha: 0.8 };

/** Annotation border width */
const ANNOTATION_BORDER_WIDTH = 3;

/**
 * Convert URL to a URL-safe slug.
 *
 * @param url - Full URL to convert
 * @returns Slug string (max 80 chars)
 */
export function urlToSlug(url: string): string {
  try {
    const parsed = new URL(url);
    let slug = parsed.pathname
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .replace(/\//g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .substring(0, 80);

    if (!slug) {
      slug = 'homepage';
    }

    return slug;
  } catch {
    return 'page';
  }
}

/**
 * Build full CloudFront URL from S3 key.
 *
 * @param s3Key - S3 object key
 * @returns Full CloudFront URL
 */
export function buildScreenshotUrl(s3Key: string): string {
  const cloudfrontUrl = process.env.CLOUDFRONT_URL ?? '';
  if (cloudfrontUrl) {
    return `${cloudfrontUrl}/${s3Key}`;
  }

  const bucketName = process.env.S3_BUCKET_NAME ?? '';
  const region = process.env.AWS_REGION ?? 'ap-south-1';
  return `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
}

/**
 * Bounding box for element annotation.
 */
interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Get element bounding box from page.
 */
async function getElementBoundingBox(page: Page, selector: string): Promise<BoundingBox | null> {
  try {
    const bbox = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;

      const rect = el.getBoundingClientRect();
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    }, selector);

    return bbox;
  } catch {
    return null;
  }
}

/**
 * Create SVG overlay for violation annotations.
 */
function createAnnotationOverlay(width: number, height: number, boxes: BoundingBox[]): Buffer {
  const rects = boxes
    .map(
      (box, index) => `
      <rect
        x="${box.x}"
        y="${box.y}"
        width="${box.width}"
        height="${box.height}"
        fill="none"
        stroke="rgb(${ANNOTATION_COLOR.r},${ANNOTATION_COLOR.g},${ANNOTATION_COLOR.b})"
        stroke-width="${ANNOTATION_BORDER_WIDTH}"
        stroke-opacity="${ANNOTATION_COLOR.alpha}"
      />
      <circle
        cx="${box.x + box.width - 8}"
        cy="${box.y + 8}"
        r="10"
        fill="rgb(${ANNOTATION_COLOR.r},${ANNOTATION_COLOR.g},${ANNOTATION_COLOR.b})"
      />
      <text
        x="${box.x + box.width - 8}"
        y="${box.y + 12}"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="12"
        font-weight="bold"
        fill="white"
      >${index + 1}</text>
    `,
    )
    .join('');

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${rects}
    </svg>
  `;

  return Buffer.from(svg);
}

/**
 * Annotate screenshot with violation bounding boxes.
 */
async function annotateScreenshot(
  page: Page,
  screenshotBuffer: Buffer,
  violations: RawViolation[],
): Promise<Buffer> {
  if (violations.length === 0) {
    return screenshotBuffer;
  }

  try {
    const metadata = await sharp(screenshotBuffer).metadata();
    const width = metadata.width ?? 1280;
    const height = metadata.height ?? 800;

    const violationsToAnnotate = violations.slice(0, MAX_ANNOTATIONS);
    const boxes: BoundingBox[] = [];

    for (const violation of violationsToAnnotate) {
      const bbox = await getElementBoundingBox(page, violation.elementSelector);
      if (bbox && bbox.width > 0 && bbox.height > 0) {
        const clampedBox: BoundingBox = {
          x: Math.max(0, Math.min(bbox.x, width - 10)),
          y: Math.max(0, Math.min(bbox.y, height - 10)),
          width: Math.min(bbox.width, width - bbox.x),
          height: Math.min(bbox.height, height - bbox.y),
        };
        boxes.push(clampedBox);
      }
    }

    if (boxes.length === 0) {
      return screenshotBuffer;
    }

    const overlay = createAnnotationOverlay(width, height, boxes);

    const annotatedBuffer = await sharp(screenshotBuffer)
      .composite([
        {
          input: overlay,
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    return annotatedBuffer;
  } catch (err) {
    logger.warn({ err }, 'Failed to annotate screenshot, returning original');
    return screenshotBuffer;
  }
}

/**
 * Capture and upload screenshot to S3.
 *
 * @param page - Playwright page instance
 * @param scanId - Scan UUID
 * @param orgId - Organization UUID
 * @param pageUrl - URL of the page
 * @param viewport - Viewport type ('desktop' or 'mobile')
 * @param violations - Violations to annotate on screenshot
 * @returns S3 key or null on failure
 */
export async function captureAndUploadScreenshot(
  page: Page,
  scanId: string,
  orgId: string,
  pageUrl: string,
  viewport: 'desktop' | 'mobile',
  violations: RawViolation[],
): Promise<string | null> {
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    logger.warn('S3_BUCKET_NAME not set, skipping screenshot upload');
    return null;
  }

  try {
    const viewportDimensions = viewport === 'desktop' ? DESKTOP_VIEWPORT : MOBILE_VIEWPORT;
    await page.setViewportSize(viewportDimensions);

    await page.waitForTimeout(300);

    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: false,
    });

    const annotatedBuffer = await annotateScreenshot(page, screenshotBuffer, violations);

    const urlSlug = urlToSlug(pageUrl);
    const s3Key = `screenshots/${orgId}/${scanId}/${urlSlug}-${viewport}.png`;

    const s3 = getSharedS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: annotatedBuffer,
        ContentType: 'image/png',
        CacheControl: 'max-age=31536000',
        Metadata: {
          scanId,
          orgId,
          pageUrl: pageUrl.substring(0, 500),
          viewport,
        },
      }),
    );

    logger.info(
      {
        s3Key,
        viewport,
        annotationCount: Math.min(violations.length, MAX_ANNOTATIONS),
      },
      'Screenshot uploaded to S3',
    );

    return s3Key;
  } catch (err) {
    logger.warn({ err, pageUrl, viewport }, 'Failed to capture/upload screenshot');
    return null;
  }
}

/**
 * Capture screenshot without upload (for local testing).
 */
export async function captureScreenshotBuffer(
  page: Page,
  viewport: 'desktop' | 'mobile',
  violations: RawViolation[],
): Promise<Buffer | null> {
  try {
    const viewportDimensions = viewport === 'desktop' ? DESKTOP_VIEWPORT : MOBILE_VIEWPORT;
    await page.setViewportSize(viewportDimensions);

    await page.waitForTimeout(300);

    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: false,
    });

    return annotateScreenshot(page, screenshotBuffer, violations);
  } catch (err) {
    logger.warn({ err, viewport }, 'Failed to capture screenshot');
    return null;
  }
}
