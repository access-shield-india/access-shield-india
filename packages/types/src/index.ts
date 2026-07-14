/** User roles for RBAC — ordered by privilege level */
export type UserRole =
  | 'super_admin'
  | 'customer_admin'
  | 'accessibility_officer'
  | 'developer'
  | 'auditor';

export const USER_ROLES: readonly UserRole[] = [
  'super_admin',
  'customer_admin',
  'accessibility_officer',
  'developer',
  'auditor',
] as const;

export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'wont_fix' | 'duplicate';
export type IssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type CertificateStatus = 'active' | 'expired' | 'revoked';
export type AssetType = 'website' | 'web_app' | 'mobile_app' | 'document' | 'pdf';

/** RFC 7807 Problem Details */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  requestId?: string;
  [key: string]: unknown;
}

/** Health check response */
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  db: 'connected' | 'disconnected';
  redis: 'connected' | 'disconnected';
  version: string;
  /** ISO 8601 timestamp */
  timestamp: string;
}

/** JWT custom claims from IdP (Keycloak or legacy Supabase Auth) */
export interface AccessShieldJwtClaims {
  sub: string;
  email: string;
  user_role: UserRole;
  org_id: string;
  /** ISO 8601 */
  iat?: number;
  exp?: number;
}

/** INR amounts stored as integer paise (1 INR = 100 paise) */
export type PaiseAmount = number;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
  /** ISO 8601 timestamp */
  timestamp: string;
}

export * from './scan-pipeline-v2';
