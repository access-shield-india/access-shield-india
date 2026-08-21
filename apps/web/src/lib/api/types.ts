/**
 * API Type Definitions for AccessShield India Web Portal
 * Extends base types for client-side data fetching and mutations.
 */

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export class ApiError extends Error {
  constructor(
    public problem: {
      type: string;
      title: string;
      status: number;
      detail: string;
      timestamp: string;
      instance?: string;
    },
  ) {
    super(problem.detail);
    this.name = 'ApiError';
  }
}

// ─── Assets ───────────────────────────────────────────────────────────────

export type ComplianceStandard = 'WCAG22' | 'IS17802' | 'GIGW3' | 'SEBI';

export interface Asset {
  id: string;
  organisationId: string;
  name: string;
  url: string;
  type: 'website' | 'web_app' | 'mobile_app' | 'document' | 'pdf';
  description: string | null;
  isActive: boolean;
  lastScannedAt: string | null;
  standards?: ComplianceStandard[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetInput {
  name: string;
  url: string;
  type: Asset['type'];
  description?: string;
  standards?: ComplianceStandard[];
}

// ─── Scans ───────────────────────────────────────────────────────────────

export type ScanType = 'full' | 'incremental' | 'single_page';
export type WcagLevel = 'A' | 'AA' | 'AAA';

export interface ScanDetail {
  id: string;
  organisationId: string;
  assetId: string;
  assetName?: string | null;
  assetUrl?: string | null;
  assetType?: Asset['type'];
  status: 'pending' | 'running' | 'completed' | 'failed';
  wcagLevel: string;
  wcagVersion: string;
  pagesScanned: number;
  violationCount: number;
  severityCounts?: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
  score: number | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  asset?: Asset;
  progress?: {
    pagesScanned: number;
    pagesTotal: number;
    currentUrl: string;
    paused?: boolean;
    phase?: string;
    currentStandard?: ComplianceStandard;
  };
  mobileScanId?: string | null;
  standards?: ComplianceStandard[];
  standardCounts?: Partial<Record<ComplianceStandard, number>>;
}

export interface CreateScanInput {
  asset_id: string;
  wcag_level?: WcagLevel | string;
  wcag_version?: string;
  max_pages?: number;
  scan_type?: ScanType;
  standards?: ComplianceStandard[];
  exclude_paths?: string[];
}

export interface CreateScanResult {
  scanId: string;
  status: string;
  message: string;
}

export interface ScanListItem {
  id: string;
  assetId: string;
  assetName: string | null;
  assetUrl: string | null;
  status: ScanDetail['status'];
  wcagLevel: string;
  wcagVersion: string;
  pagesScanned: number;
  violationCount: number;
  score: number | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  standards?: ComplianceStandard[];
}

export interface ListScansParams {
  page?: number;
  limit?: number;
  status?: ScanDetail['status'];
  asset_id?: string;
}

// ─── Violations ───────────────────────────────────────────────────────────

export type ViolationSeverity = 'critical' | 'serious' | 'moderate' | 'minor';

export interface ViolationRow {
  id: string;
  scanId: string;
  ruleId: string;
  impact: ViolationSeverity;
  description: string;
  helpUrl: string | null;
  wcagCriteria: string[] | null;
  selector: string | null;
  html: string | null;
  pageUrl: string | null;
  standard?: ComplianceStandard | string | null;
  createdAt: string;
}

// ─── Issues ───────────────────────────────────────────────────────────────

export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'wont_fix' | 'duplicate';
export type IssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor';

export interface Issue {
  id: string;
  organisationId: string;
  violationId: string | null;
  assetId: string;
  assignedTo: string | null;
  title: string;
  description: string | null;
  status: IssueStatus;
  severity: IssueSeverity;
  dueDate: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  asset?: Asset;
  assignee?: User;
  violation?: ViolationRow;
  jiraIssueKey?: string | null;
  jiraIssueUrl?: string | null;
}

export interface IssueDetail extends Issue {
  elementHtml?: string;
  elementSelector?: string;
  wcagCriterion?: string;
  wcagTitle?: string;
  screenshotUrl?: string | null;
  mobileScreenshotUrl?: string | null;
  aiFixSuggestion?: string | null;
  aiExplanation?: string | null;
  aiAltText?: string | null;
  aiFixDevPreview?: boolean;
  aiFixBefore?: string | null;
  aiFixAfter?: string | null;
  comments: IssueComment[];
  labels: string[];
}

export interface IssueComment {
  id: string;
  issueId: string;
  userId: string;
  body: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string | null;
    email: string;
    role: string;
  };
}

export interface IssueFilters {
  search?: string;
  status?: IssueStatus | 'all';
  severity?: IssueSeverity | 'all';
  assignee?: string | 'all' | 'me' | 'unassigned';
  assetId?: string | 'all';
  wcagCriterion?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
}

export interface IssueStats {
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
  criticalCount: number;
}

export interface CreateIssueInput {
  violationId?: string;
  assetId: string;
  title: string;
  description?: string;
  severity: IssueSeverity;
  assignedTo?: string;
  dueDate?: string;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  status?: IssueStatus;
  severity?: IssueSeverity;
  assignedTo?: string;
  dueDate?: string;
  labels?: string[];
}

// ─── Reports ─────────────────────────────────────────────────────────────

export type ReportType =
  'executive' | 'technical' | 'wcag_compliance' | 'legal_rpwd' | 'sebi' | 'accessibility_statement';
export type ReportFormat = 'pdf' | 'html';

export interface Report {
  id: string;
  organisationId: string;
  scanId: string;
  generatedBy: string | null;
  title: string;
  format: ReportFormat;
  storagePath: string | null;
  fileSizeBytes: number | null;
  createdAt: string;
  scan?: ScanDetail;
  reportType?: ReportType;
}

export interface GenerateReportInput {
  reportType: ReportType;
  assetId: string;
  scanId: string;
  format: ReportFormat;
  dateFrom?: string;
  dateTo?: string;
}

// ─── Certificates ────────────────────────────────────────────────────────

export type CertificateStatus = 'active' | 'expired' | 'revoked';
export type CertificateLevel = 'WCAG22_AA' | 'IS17802' | 'RPwD';

export interface Certificate {
  id: string;
  organisationId: string;
  assetId: string;
  scanId: string;
  certificateNumber: string;
  status: CertificateStatus;
  wcagLevel: string;
  wcagVersion: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
  createdAt: string;
  asset?: Asset;
  scan?: ScanDetail;
  level?: CertificateLevel;
  scoreAtIssuance?: number;
}

export interface IssueCertificateInput {
  assetId: string;
  scanId: string;
  level: CertificateLevel;
  notes?: string;
}

export interface RevokeCertificateInput {
  reason: string;
}

// ─── Users and Teams ──────────────────────────────────────────────────────

export type UserRole =
  'super_admin' | 'customer_admin' | 'accessibility_officer' | 'developer' | 'auditor';

export interface User {
  id: string;
  organisationId: string;
  authUserId: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InviteUserInput {
  email: string;
  role: UserRole;
  fullName?: string;
}

// ─── Organisation Settings ────────────────────────────────────────────────

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  gstin: string | null;
  billingEmail: string | null;
  isActive: boolean;
  planTier: 'trial' | 'starter' | 'professional' | 'enterprise' | 'government';
  aiProvider: 'anthropic' | 'local';
  aiModel: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrganisationInput {
  name?: string;
  gstin?: string;
  billingEmail?: string;
  billingAddress?: string;
  aiProvider?: 'anthropic' | 'local';
  aiModel?: string;
}

// ─── Integrations ────────────────────────────────────────────────────────

export interface JiraIntegration {
  id: string;
  organisationId: string;
  instanceUrl: string;
  connectedEmail: string;
  isActive: boolean;
  fieldMapping: JiraFieldMapping;
  lastSyncedAt: string | null;
  syncedIssuesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface JiraFieldMapping {
  severityToPriority: {
    critical: string;
    serious: string;
    moderate: string;
    minor: string;
  };
  wcagCustomField: string;
  statusMapping: Record<string, string>;
}

export interface CreateJiraIssueInput {
  violationId: string;
  issueId: string;
  projectKey?: string;
  issueTypeId?: string;
}

export interface CreateJiraIssueResult {
  jiraKey: string;
  jiraUrl: string;
}

// ─── Invoices ────────────────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  organisationId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotalPaise: number;
  gstPaise: number;
  totalPaise: number;
  currency: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  paidAt: string | null;
  lineItems: InvoiceLineItem[];
  createdAt: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPricePaise: number;
  totalPaise: number;
}

// ─── Notifications ────────────────────────────────────────────────────────

export type NotificationType =
  | 'scan_completed'
  | 'critical_violation'
  | 'issue_assigned'
  | 'certificate_issued'
  | 'invoice_generated'
  | 'monthly_summary';

export interface NotificationSettings {
  id: string;
  organisationId: string;
  userId: string;
  emailNotifications: Record<NotificationType, boolean>;
  whatsappNotifications: Record<NotificationType, boolean>;
  whatsappNumber: string | null;
  whatsappVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  organisationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  resourceType: string | null;
  resourceId: string | null;
  createdAt: string;
}

export interface UpdateNotificationSettingsInput {
  emailNotifications?: Partial<Record<NotificationType, boolean>>;
  whatsappNotifications?: Partial<Record<NotificationType, boolean>>;
  whatsappNumber?: string;
}

// ─── Document Scans ───────────────────────────────────────────────────────

export type DocumentType = 'pdf' | 'docx' | 'pptx' | 'xlsx';
export type DocumentScanStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface DocumentScanJob {
  job_id: string;
  document_name: string;
  document_type: DocumentType;
  document_size_bytes: number;
  status: DocumentScanStatus;
  progress_percent: number;
  estimated_duration_seconds: number;
  created_at: string;
  poll_url: string;
  results_url: string;
}

export interface DocumentViolation {
  violation_id: string;
  checkpoint_id: string;
  standard: string;
  severity: ViolationSeverity;
  category: string;
  description: string;
  location: string;
  wcag_criterion: string | null;
  impact: string;
  remediation: string;
  auto_fixable: boolean;
}

export interface DocumentScanResult {
  id: string;
  job_id: string;
  document_name: string;
  document_type: DocumentType;
  total_violations: number;
  critical_count: number;
  serious_count: number;
  moderate_count: number;
  minor_count: number;
  compliance_score: number;
  violations: DocumentViolation[];
  violations_total: number;
  violations_page: number;
  violations_limit: number;
  violations_pages: number;
  summary: Record<string, number>;
  gigw_checkpoint_results: Record<string, { status: string; count: number }>;
  ai_summary: string;
  scan_duration_seconds: number;
  created_at: string;
}

export interface DocumentScanListItem {
  id: string;
  documentName: string;
  documentType: DocumentType;
  status: DocumentScanStatus;
  complianceScore: number | null;
  criticalCount: number;
  seriousCount: number;
  moderateCount: number;
  minorCount: number;
  createdAt: string;
  completedAt: string | null;
}

export interface DocumentScanStatusResponse {
  job_id: string;
  status: DocumentScanStatus;
  progress_percent: number;
  document_name: string;
  error_message?: string;
}

export interface ListDocumentScansParams {
  page?: number;
  limit?: number;
  status?: DocumentScanStatus;
  document_type?: DocumentType;
}

// ─── Widget ──────────────────────────────────────────────────────────────

export interface WidgetSettings {
  id: string;
  organisationId: string;
  assetId?: string | null;
  assetName?: string | null;
  assetUrl?: string | null;
  token: string;
  allowedDomains: string[];
  position: 'bottom-right' | 'bottom-left' | 'middle-right' | 'top-right' | 'top-left';
  defaultLanguage: 'en' | 'hi';
  primaryColor: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateWidgetSettingsInput {
  allowedDomains?: string[];
  position?: WidgetSettings['position'];
  defaultLanguage?: WidgetSettings['defaultLanguage'];
  primaryColor?: string;
  isEnabled?: boolean;
}

export interface WidgetAnalyticsNamedCount {
  id: string;
  count: number;
}

export interface WidgetAnalyticsDailyOpens {
  date: string;
  opens: number;
}

export interface WidgetAnalyticsSummary {
  panelOpens: number;
  topProfiles: WidgetAnalyticsNamedCount[];
  topSettings: WidgetAnalyticsNamedCount[];
  languageSplit: WidgetAnalyticsNamedCount[];
  dailyTrend: WidgetAnalyticsDailyOpens[];
  hindiUsagePercent: number;
  includeInNextReport: boolean;
  from: string;
  to: string;
}
