'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

export type BrandLogoVariant = 'full' | 'mark' | 'wordmark';

export interface BrandLogoProps {
  /** Visual treatment */
  variant?: BrandLogoVariant;
  /** Optional extra classes on the outer wrapper */
  className?: string;
  /** Image height in px (width auto). Defaults by variant. */
  height?: number;
  /** Prefer decorative (hide from AT) when adjacent text already names the brand */
  decorative?: boolean;
  /** Dark plate behind artwork — matches original logo contrast */
  onDark?: boolean;
  /** Eager load for above-the-fold chrome */
  priority?: boolean;
}

/** Horizontal lockup assets in /public/brand (excluded from locale rewrite). */
const SRC: Record<BrandLogoVariant, string> = {
  full: '/brand/logo.png',
  mark: '/brand/logo-mark.png',
  wordmark: '/brand/logo-wordmark.png',
};

const DEFAULT_HEIGHT: Record<BrandLogoVariant, number> = {
  full: 56,
  mark: 44,
  wordmark: 36,
};

/** Intrinsic aspect ratios after tight crop of Logo2 artwork. */
const ASPECT: Record<BrandLogoVariant, number> = {
  full: 4.13,
  mark: 1,
  wordmark: 2.86,
};

/**
 * AccessibleNow brand mark / lockup (Logo2 horizontal).
 * - `full` — icon + wordmark + tagline
 * - `mark` — Ai monogram only
 * - `wordmark` — text lockup only
 */
export function BrandLogo({
  variant = 'full',
  className,
  height,
  decorative = false,
  onDark = false,
  priority = false,
}: BrandLogoProps) {
  const h = height ?? DEFAULT_HEIGHT[variant];
  const w = Math.round(h * ASPECT[variant]);
  const alt = decorative ? '' : 'AccessibleNow — Access for everyone. Now.';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        onDark && 'rounded-lg bg-black px-2.5 py-1.5',
        className,
      )}
    >
      <Image
        src={SRC[variant]}
        alt={alt}
        width={w}
        height={h}
        className="h-auto w-auto max-w-full object-contain"
        style={{ height: h, width: 'auto' }}
        priority={priority}
        unoptimized
      />
    </span>
  );
}

BrandLogo.displayName = 'BrandLogo';
