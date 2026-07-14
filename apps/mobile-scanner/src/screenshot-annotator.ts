/**
 * Screenshot Annotator
 *
 * Takes a screenshot buffer and list of violation element bounds,
 * draws colored rectangles around each violating element with rule labels.
 * Uses sharp for image processing.
 */

import sharp from 'sharp';
import type { MobilePlatform, ElementBounds } from './types.js';
import type { IssueSeverity } from '@accessshield/types';

export interface ViolationAnnotation {
  bounds: ElementBounds;
  severity: IssueSeverity;
  ruleId: string;
}

export interface AnnotateScreenshotParams {
  screenshotBase64: string;
  violations: ViolationAnnotation[];
  platform: MobilePlatform;
  devicePixelRatio?: number;
}

const SEVERITY_COLORS: Record<IssueSeverity, string> = {
  critical: '#DC2626',
  serious: '#D97706',
  moderate: '#2563EB',
  minor: '#6B7280',
};

const STROKE_WIDTH = 3;
const LABEL_FONT_SIZE = 12;
const LABEL_PADDING = 4;
const LABEL_OFFSET_Y = 16;

/**
 * Annotate a screenshot with violation markers.
 * Draws colored rectangles around each violating element and adds rule ID labels.
 */
export async function annotateScreenshot(params: AnnotateScreenshotParams): Promise<Buffer> {
  const { screenshotBase64, violations, devicePixelRatio = 1.0 } = params;

  if (violations.length === 0) {
    return Buffer.from(screenshotBase64, 'base64');
  }

  const imageBuffer = Buffer.from(screenshotBase64, 'base64');
  const original = sharp(imageBuffer);
  const metadata = await original.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read image metadata');
  }

  const dpr = devicePixelRatio;
  const svgOverlay = buildSvgOverlay(violations, metadata.width, metadata.height, dpr);

  const annotatedBuffer = await original
    .composite([
      {
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  return annotatedBuffer;
}

/**
 * Build an SVG overlay with violation rectangles and labels.
 */
function buildSvgOverlay(
  violations: ViolationAnnotation[],
  width: number,
  height: number,
  dpr: number,
): string {
  const elements = violations.map((violation) => {
    const color = SEVERITY_COLORS[violation.severity] || SEVERITY_COLORS.moderate;
    const { x, y, width: w, height: h } = violation.bounds;

    const scaledX = Math.round(x * dpr);
    const scaledY = Math.round(y * dpr);
    const scaledW = Math.round(w * dpr);
    const scaledH = Math.round(h * dpr);

    const safeX = Math.max(0, Math.min(scaledX, width - 1));
    const safeY = Math.max(0, Math.min(scaledY, height - 1));
    const safeW = Math.min(scaledW, width - safeX);
    const safeH = Math.min(scaledH, height - safeY);

    if (safeW <= 0 || safeH <= 0) {
      return '';
    }

    const rect = buildRectangle(safeX, safeY, safeW, safeH, color);
    const label = buildLabel(violation.ruleId, safeX, safeY, color, width);

    return rect + label;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <style>
        .violation-label {
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
          font-size: ${LABEL_FONT_SIZE}px;
          font-weight: 600;
        }
      </style>
    </defs>
    ${elements.join('\n    ')}
  </svg>`;
}

/**
 * Build an SVG rectangle element for a violation.
 */
function buildRectangle(
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
): string {
  return `<rect
    x="${x}"
    y="${y}"
    width="${width}"
    height="${height}"
    fill="none"
    stroke="${color}"
    stroke-width="${STROKE_WIDTH}"
    rx="2"
    ry="2"
  />`;
}

/**
 * Build an SVG label element for a violation rule ID.
 */
function buildLabel(ruleId: string, x: number, y: number, color: string, maxWidth: number): string {
  const labelWidth = ruleId.length * 7 + LABEL_PADDING * 2;
  const labelHeight = LABEL_FONT_SIZE + LABEL_PADDING * 2;

  let labelX = x;
  let labelY = y - labelHeight - 2;

  if (labelY < 0) {
    labelY = y + LABEL_OFFSET_Y;
  }

  if (labelX + labelWidth > maxWidth) {
    labelX = maxWidth - labelWidth - 2;
  }

  labelX = Math.max(0, labelX);
  labelY = Math.max(0, labelY);

  const textX = labelX + LABEL_PADDING;
  const textY = labelY + LABEL_FONT_SIZE + LABEL_PADDING / 2;

  return `<g>
    <rect
      x="${labelX}"
      y="${labelY}"
      width="${labelWidth}"
      height="${labelHeight}"
      fill="${color}"
      rx="2"
      ry="2"
    />
    <text
      x="${textX}"
      y="${textY}"
      fill="white"
      class="violation-label"
    >${escapeXml(ruleId)}</text>
  </g>`;
}

/**
 * Escape special XML characters in text content.
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Create a thumbnail version of an annotated screenshot.
 */
export async function createThumbnail(
  imageBuffer: Buffer,
  maxWidth: number = 400,
  maxHeight: number = 800,
): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png({ quality: 80 })
    .toBuffer();
}

/**
 * Annotate and create both full-size and thumbnail versions.
 */
export async function annotateWithThumbnail(
  params: AnnotateScreenshotParams,
): Promise<{ fullSize: Buffer; thumbnail: Buffer }> {
  const fullSize = await annotateScreenshot(params);
  const thumbnail = await createThumbnail(fullSize);

  return { fullSize, thumbnail };
}

/**
 * Generate a comparison image showing before/after annotations.
 */
export async function createComparisonImage(
  originalBase64: string,
  annotatedBuffer: Buffer,
): Promise<Buffer> {
  const originalBuffer = Buffer.from(originalBase64, 'base64');

  const [originalMeta, annotatedMeta] = await Promise.all([
    sharp(originalBuffer).metadata(),
    sharp(annotatedBuffer).metadata(),
  ]);

  const width = originalMeta.width || 400;
  const height = originalMeta.height || 800;

  const halfWidth = Math.floor(width / 2);

  const [originalHalf, annotatedHalf] = await Promise.all([
    sharp(originalBuffer).resize(halfWidth, height).toBuffer(),
    sharp(annotatedBuffer).resize(halfWidth, height).toBuffer(),
  ]);

  return sharp({
    create: {
      width: width,
      height: height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      { input: originalHalf, left: 0, top: 0 },
      { input: annotatedHalf, left: halfWidth, top: 0 },
    ])
    .png()
    .toBuffer();
}

/**
 * Calculate the total area covered by violations (for severity scoring).
 */
export function calculateViolationCoverage(
  violations: ViolationAnnotation[],
  screenWidth: number,
  screenHeight: number,
): number {
  const screenArea = screenWidth * screenHeight;
  if (screenArea === 0) return 0;

  let totalViolationArea = 0;
  for (const violation of violations) {
    const { width, height } = violation.bounds;
    totalViolationArea += width * height;
  }

  return (totalViolationArea / screenArea) * 100;
}
