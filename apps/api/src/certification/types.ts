/**
 * Certification Module Types
 *
 * Type definitions for the AccessShield India certification badge system.
 */

/** Supported certification levels */
export type CertificationLevel = 'WCAG22-AA' | 'IS17802' | 'RPWD';

/** Parameters required to issue a certificate */
export interface IssueCertificateParams {
  /** Organisation ID (from JWT — tenant isolation) */
  organisationId: string;
  /** Asset ID the certificate is for */
  assetId: string;
  /** Scan ID that passed certification criteria */
  scanId: string;
  /** Certification level to issue */
  level: CertificationLevel;
  /** User ID of auditor/admin issuing the certificate */
  issuedBy: string;
  /** Must be true — auditor must confirm sign-off */
  auditorConfirmed: boolean;
  /** Optional notes about the certification */
  notes?: string;
}

/** Response for certificate verification endpoint */
export interface CertificateVerifyResponse {
  /** Whether the certificate is currently valid */
  valid: boolean;
  /** Detailed status of the certificate */
  status: 'valid' | 'expired' | 'revoked' | 'not_found';
  /** Organisation name (only if found) */
  organisation: { name: string } | null;
  /** Asset details (only if found) */
  asset: { name: string; url: string } | null;
  /** Score at time of certification */
  score: number | null;
  /** Certification level */
  level: CertificationLevel | null;
  /** When the certificate was issued (ISO string) */
  issuedAt: string | null;
  /** When the certificate expires (ISO string) */
  expiresAt: string | null;
  /** Public badge URL */
  badgeUrl: string | null;
}

/** Certificate issuance result */
export interface IssueCertificateResult {
  /** Generated certificate ID */
  certId: string;
  /** Public verification token (UUID) */
  verifyToken: string;
  /** Signed CloudFront URL for the badge */
  badgeUrl: string;
  /** HTML embed code snippet */
  embedCode: string;
}

/** Badge variant types */
export type BadgeVariant = 'round' | 'horizontal' | 'compact';

/** Badge generation parameters */
export interface BadgeParams {
  /** Certification level */
  level: CertificationLevel;
  /** Accessibility score (0-100) */
  score: number;
  /** Year of certification */
  year: number;
  /** Badge variant/style */
  variant: BadgeVariant;
}

/** Certificate eligibility error */
export class CertificateEligibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CertificateEligibilityError';
  }
}

/** Certificate not found error */
export class CertificateNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CertificateNotFoundError';
  }
}

/** Certificate display labels */
export const CERTIFICATION_LABELS: Record<CertificationLevel, string> = {
  'WCAG22-AA': 'WCAG 2.2 AA',
  IS17802: 'IS 17802',
  RPWD: 'RPwD Compliant',
};

/** Certificate display labels for badges (short form) */
export const BADGE_LABELS: Record<CertificationLevel, string> = {
  'WCAG22-AA': 'WCAG 2.2 AA',
  IS17802: 'IS 17802',
  RPWD: 'RPWD',
};
