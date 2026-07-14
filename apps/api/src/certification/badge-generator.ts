/**
 * Badge Generator
 *
 * Generates SVG certification badges in multiple variants and converts
 * them to optimised PNG using sharp.
 */

import sharp from 'sharp';
import type { BadgeParams, BadgeVariant, CertificationLevel } from './types';
import { BADGE_LABELS } from './types';

/** Brand colours */
const COLORS = {
  background: '#EAF3DE',
  border: '#3B6D11',
  primary: '#1A6B3C',
  text: '#1A1A2E',
  textLight: '#374151',
  white: '#FFFFFF',
};

/** Badge dimensions by variant */
const DIMENSIONS: Record<BadgeVariant, { width: number; height: number }> = {
  round: { width: 120, height: 120 },
  horizontal: { width: 300, height: 60 },
  compact: { width: 80, height: 80 },
};

/** Checkmark/shield SVG path */
const CHECKMARK_PATH = `
  M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z
`;

/** Shield SVG path */
const SHIELD_PATH = `
  M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 15l-4-4 1.41-1.41L11 13.17l5.59-5.59L18 9l-7 7z
`;

/**
 * Generate the round badge variant (120×120)
 */
function generateRoundBadge(params: BadgeParams): string {
  const { level, score, year } = params;
  const label = BADGE_LABELS[level];

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <title>${label} Certified — Score ${score}/100</title>
  
  <!-- Background circle -->
  <circle cx="60" cy="60" r="56" fill="${COLORS.background}" stroke="${COLORS.border}" stroke-width="3"/>
  
  <!-- Inner decorative ring -->
  <circle cx="60" cy="60" r="48" fill="none" stroke="${COLORS.border}" stroke-width="1" opacity="0.3"/>
  
  <!-- Shield/checkmark icon -->
  <g transform="translate(42, 20) scale(1.5)">
    <path d="${SHIELD_PATH}" fill="${COLORS.primary}"/>
  </g>
  
  <!-- Level label -->
  <text x="60" y="78" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="600" fill="${COLORS.text}">
    ${label}
  </text>
  
  <!-- "CERTIFIED" text -->
  <text x="60" y="90" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" fill="${COLORS.textLight}">
    CERTIFIED
  </text>
  
  <!-- Year -->
  <text x="60" y="102" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" fill="${COLORS.textLight}">
    ${year}
  </text>
  
  <!-- AccessShield wordmark -->
  <text x="60" y="112" text-anchor="middle" font-family="Arial, sans-serif" font-size="5" fill="${COLORS.textLight}">
    accessshield.in
  </text>
</svg>
`.trim();
}

/**
 * Generate the horizontal badge variant (300×60)
 */
function generateHorizontalBadge(params: BadgeParams): string {
  const { level, score } = params;
  const label = BADGE_LABELS[level];

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="60" viewBox="0 0 300 60">
  <title>${label} Certified — Score ${score}/100</title>
  
  <!-- Background rectangle -->
  <rect x="2" y="2" width="296" height="56" rx="10" ry="10" fill="${COLORS.background}" stroke="${COLORS.border}" stroke-width="2"/>
  
  <!-- Left icon circle -->
  <circle cx="35" cy="30" r="20" fill="${COLORS.primary}"/>
  
  <!-- Shield icon (white) -->
  <g transform="translate(23, 18) scale(1)">
    <path d="${SHIELD_PATH}" fill="${COLORS.white}"/>
  </g>
  
  <!-- Level label (bold) -->
  <text x="70" y="28" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="${COLORS.text}">
    ${label} Certified
  </text>
  
  <!-- Subtitle -->
  <text x="70" y="44" font-family="Arial, sans-serif" font-size="10" fill="${COLORS.textLight}">
    Certified by AccessShield India
  </text>
  
  <!-- Score badge on right -->
  <rect x="240" y="15" width="50" height="30" rx="5" ry="5" fill="${COLORS.primary}"/>
  <text x="265" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="${COLORS.white}">
    ${score}
  </text>
</svg>
`.trim();
}

/**
 * Generate the compact badge variant (80×80)
 */
function generateCompactBadge(params: BadgeParams): string {
  const { level, score } = params;
  const label = BADGE_LABELS[level];
  const shortLabel = level === 'RPWD' ? 'RPWD' : level === 'IS17802' ? 'IS17802' : 'WCAG';

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <title>${label} Certified — Score ${score}/100</title>
  
  <!-- Background circle -->
  <circle cx="40" cy="40" r="37" fill="${COLORS.background}" stroke="${COLORS.border}" stroke-width="2"/>
  
  <!-- Shield/checkmark icon -->
  <g transform="translate(26, 14) scale(1.2)">
    <path d="${SHIELD_PATH}" fill="${COLORS.primary}"/>
  </g>
  
  <!-- Short label -->
  <text x="40" y="58" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" font-weight="600" fill="${COLORS.text}">
    ${shortLabel}
  </text>
  
  <!-- "CERTIFIED" text -->
  <text x="40" y="68" text-anchor="middle" font-family="Arial, sans-serif" font-size="6" fill="${COLORS.textLight}">
    CERTIFIED
  </text>
</svg>
`.trim();
}

/**
 * Generate an SVG certification badge.
 *
 * @param params - Badge generation parameters
 * @returns SVG string
 */
export function generateBadgeSvg(params: BadgeParams): string {
  switch (params.variant) {
    case 'round':
      return generateRoundBadge(params);
    case 'horizontal':
      return generateHorizontalBadge(params);
    case 'compact':
      return generateCompactBadge(params);
    default:
      throw new Error(`Unknown badge variant: ${params.variant}`);
  }
}

/**
 * Convert SVG to optimised PNG using sharp.
 *
 * @param svg - SVG string to convert
 * @param width - Target width in pixels
 * @param height - Target height in pixels
 * @returns PNG buffer
 */
export async function svgToOptimizedPng(
  svg: string,
  width: number,
  height: number,
): Promise<Buffer> {
  const svgBuffer = Buffer.from(svg);

  const pngBuffer = await sharp(svgBuffer)
    .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ quality: 90, compressionLevel: 9 })
    .toBuffer();

  return pngBuffer;
}

/**
 * Generate all badge variants for a certificate.
 *
 * @param level - Certification level
 * @param score - Accessibility score
 * @param year - Year of certification
 * @returns Object with SVG and PNG buffers for each variant
 */
export async function generateAllBadges(
  level: CertificationLevel,
  score: number,
  year: number,
): Promise<Record<BadgeVariant, { svg: string; png: Buffer }>> {
  const variants: BadgeVariant[] = ['round', 'horizontal', 'compact'];
  const result: Record<string, { svg: string; png: Buffer }> = {};

  for (const variant of variants) {
    const params: BadgeParams = { level, score, year, variant };
    const svg = generateBadgeSvg(params);
    const { width, height } = DIMENSIONS[variant];
    const png = await svgToOptimizedPng(svg, width * 2, height * 2); // 2x for retina

    result[variant] = { svg, png };
  }

  return result as Record<BadgeVariant, { svg: string; png: Buffer }>;
}

/**
 * Get badge dimensions for a variant.
 *
 * @param variant - Badge variant
 * @returns Width and height in pixels
 */
export function getBadgeDimensions(variant: BadgeVariant): { width: number; height: number } {
  return DIMENSIONS[variant];
}
