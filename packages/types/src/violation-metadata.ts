/**
 * Structured extras stored on violations.metadata (jsonb).
 * Keeps scanner/UI/report enrichment typed without schema churn per field.
 */

export type ViolationReviewStatus = 'confirmed' | 'potential' | 'needs_manual';

export interface ContrastMetadata {
  fgColor?: string;
  bgColor?: string;
  contrastRatio?: number;
  expectedContrastRatio?: number;
  fontSize?: string;
  fontWeight?: string;
  /** AA or AAA when known from axe data */
  wcagLevel?: 'AA' | 'AAA';
}

export interface LinkMetadata {
  accessibleName?: string | null;
  visibleText?: string | null;
  href?: string | null;
  inNav?: boolean;
}

export interface FrameMetadata {
  context: 'main' | 'iframe';
  frameUrl?: string | null;
  frameTitle?: string | null;
  crossOrigin?: boolean;
}

export type ImageAltRole =
  | 'missing_alt'
  | 'filename_alt'
  | 'decorative_suspect'
  | 'meaningful_review';

export interface ImageMetadata {
  role: ImageAltRole;
  alt?: string | null;
  guidance?: string;
}

export interface ViolationMetadata {
  contrast?: ContrastMetadata;
  link?: LinkMetadata;
  frame?: FrameMetadata;
  image?: ImageMetadata;
  /** Free-form notes for customs */
  notes?: string;
}
