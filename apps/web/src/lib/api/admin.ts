import { getAccessToken } from './client';
import { apiUrl } from './base';
import type { ApiResponse, WidgetAnalyticsSummary } from './types';

export interface AdminStats {
  organisations: number;
  users: number;
  scansThisMonth: number;
  activeOrganisations: number;
  widgetsEnabled: number;
  pendingInvoices: number;
  pendingInvoicePaise: number;
  newEnterpriseQuotes: number;
  newWaitlist: number;
  requestedEngagements: number;
}

export interface AdminInvoiceRow {
  id: string;
  organisationId: string;
  organisationName: string;
  invoiceNumber: string;
  status: string;
  subtotalPaise: number;
  gstPaise: number;
  totalPaise: number;
  currency: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
}

export interface AdminAssetRow {
  id: string;
  name: string;
  url: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastScanAt: string | null;
}

export interface AdminSeverityBreakdown {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
}

export interface AdminAssetScanRow {
  id: string;
  status: string;
  score: number | null;
  pagesScanned: number;
  violationCount: number;
  wcagLevel: string;
  wcagVersion: string;
  standards: string[];
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  errorMessage: string | null;
}

export interface AdminAssetIssueRow {
  id: string;
  title: string;
  severity: string;
  status: string;
  createdAt: string;
  dueDate: string | null;
}

export interface AdminAssetDetail {
  asset: {
    id: string;
    organisationId: string;
    organisationName: string;
    name: string;
    url: string;
    type: string;
    description: string | null;
    isActive: boolean;
    standards: string[];
    lastScannedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  summary: {
    scanCount: number;
    completedScanCount: number;
    failedScanCount: number;
    openIssuesCount: number;
    latestScore: number | null;
    latestScanAt: string | null;
    latestPagesScanned: number | null;
    latestViolationCount: number | null;
    issuesBySeverity: AdminSeverityBreakdown;
    issuesByStatus: Record<string, number>;
    latestViolationsByImpact: AdminSeverityBreakdown;
    topRules: Array<{ ruleId: string; impact: string; count: number }>;
  };
  scans: AdminAssetScanRow[];
  openIssues: AdminAssetIssueRow[];
}

export interface AdminEnterpriseQuote {
  id: string;
  contactName: string;
  contactEmail: string;
  company: string;
  domainsCount: number;
  appsCount: number;
  docsVolume: string | null;
  sebiRequired: boolean;
  trainingSeats: number;
  slaHours: number;
  notes: string | null;
  status: string;
  createdAt: string;
}

export interface AdminWaitlistRow {
  id: string;
  name: string;
  email: string;
  company: string;
  companySize: string;
  phone: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
}

export interface AdminEngagementRow {
  id: string;
  organisationId: string;
  organisationName: string;
  type: string;
  title: string;
  status: string;
  dueAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface AdminFunnelEvent {
  id: string;
  event: string;
  path: string | null;
  meta: Record<string, unknown> | null;
  organisationId: string | null;
  createdAt: string;
}

export interface AdminOrganisation {
  id: string;
  name: string;
  slug: string;
  gstin: string | null;
  billingEmail: string | null;
  isActive: boolean;
  planTier: string;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
  assetCount?: number;
  scansThisMonth?: number;
  widgetEnabled?: boolean | null;
}

export interface AdminUser {
  id: string;
  organisationId: string;
  authUserId: string;
  email: string;
  fullName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminUserDirectoryRow extends AdminUser {
  organisationName: string;
  planTier: string;
  orgActive: boolean;
}

export interface AdminOrgSummaryWidget {
  isEnabled: boolean;
  position: string;
  language: string;
  allowedDomains: string[];
  updatedAt: string | null;
}

export interface AdminOrgSummary {
  organisation: AdminOrganisation;
  userCount: number;
  activeUserCount: number;
  assetCount: number;
  scansThisMonth: number;
  scansLifetime: number;
  assetsLimit: number | null;
  scansLimit: number | null;
  openIssuesCount: number;
  widget: AdminOrgSummaryWidget;
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? 'Admin API request failed');
  }

  const json = (await response.json()) as ApiResponse<T>;
  return json.data;
}

export function fetchAdminStats(): Promise<AdminStats> {
  return adminFetch<AdminStats>('/api/v1/admin/stats');
}

export function fetchAdminOrganisations(
  page = 1,
  search = '',
): Promise<{
  data: AdminOrganisation[];
  meta?: { page: number; limit: number; total: number };
}> {
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) params.set('search', search);
  return getAccessToken().then(async (token) => {
    const response = await fetch(apiUrl(`/api/v1/admin/organisations?${params}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to load organisations');
    return response.json();
  });
}

export function createAdminOrganisation(input: {
  name: string;
  planTier: string;
  billingEmail?: string;
  slug?: string;
}): Promise<AdminOrganisation> {
  return adminFetch<AdminOrganisation>('/api/v1/admin/organisations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function fetchAdminOrganisation(id: string): Promise<AdminOrganisation> {
  return adminFetch<AdminOrganisation>(`/api/v1/admin/organisations/${id}`);
}

export function fetchAdminOrgSummary(orgId: string): Promise<AdminOrgSummary> {
  return adminFetch<AdminOrgSummary>(`/api/v1/admin/organisations/${orgId}/summary`);
}

export function fetchAdminOrgWidgetAnalytics(orgId: string): Promise<WidgetAnalyticsSummary> {
  return adminFetch<WidgetAnalyticsSummary>(
    `/api/v1/admin/organisations/${orgId}/widget-analytics`,
  );
}

export function updateAdminOrganisation(
  id: string,
  input: Partial<Pick<AdminOrganisation, 'name' | 'planTier' | 'billingEmail' | 'isActive'>>,
): Promise<AdminOrganisation> {
  return adminFetch<AdminOrganisation>(`/api/v1/admin/organisations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function updateAdminOrgWidget(
  orgId: string,
  input: { isEnabled: boolean },
): Promise<{ widget: AdminOrgSummaryWidget }> {
  return adminFetch<{ widget: AdminOrgSummaryWidget }>(
    `/api/v1/admin/organisations/${orgId}/widget`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
}

export function fetchAdminOrgUsers(orgId: string): Promise<AdminUser[]> {
  return adminFetch<AdminUser[]>(`/api/v1/admin/organisations/${orgId}/users`);
}

export function createAdminOrgUser(
  orgId: string,
  input: { email: string; password: string; fullName: string; role: string },
): Promise<AdminUser> {
  return adminFetch<AdminUser>(`/api/v1/admin/organisations/${orgId}/users`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAdminUser(
  userId: string,
  input: { isActive?: boolean; role?: string; fullName?: string },
): Promise<AdminUser> {
  return adminFetch<AdminUser>(`/api/v1/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/** Display widget status — null means no prefs row (defaults to on). */
export function isWidgetOn(widgetEnabled: boolean | null | undefined): boolean {
  return widgetEnabled !== false;
}

async function adminListFetch<T>(path: string): Promise<{
  data: T[];
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
}> {
  const token = await getAccessToken();
  const response = await fetch(apiUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Admin list request failed');
  return response.json();
}

export function fetchAdminUsers(params: {
  page?: number;
  q?: string;
  role?: string;
  isActive?: string;
}): Promise<{
  data: AdminUserDirectoryRow[];
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
}> {
  const sp = new URLSearchParams({ page: String(params.page ?? 1), limit: '20' });
  if (params.q) sp.set('q', params.q);
  if (params.role) sp.set('role', params.role);
  if (params.isActive) sp.set('isActive', params.isActive);
  return adminListFetch<AdminUserDirectoryRow>(`/api/v1/admin/users?${sp}`);
}

export function fetchAdminOrgAssets(orgId: string): Promise<AdminAssetRow[]> {
  return adminFetch<AdminAssetRow[]>(`/api/v1/admin/organisations/${orgId}/assets`);
}

export function fetchAdminOrgAssetDetail(
  orgId: string,
  assetId: string,
): Promise<AdminAssetDetail> {
  return adminFetch<AdminAssetDetail>(
    `/api/v1/admin/organisations/${orgId}/assets/${assetId}`,
  );
}

export function fetchAdminInvoices(params: {
  page?: number;
  status?: string;
}): Promise<{
  data: AdminInvoiceRow[];
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
}> {
  const sp = new URLSearchParams({ page: String(params.page ?? 1), limit: '20' });
  if (params.status) sp.set('status', params.status);
  return adminListFetch<AdminInvoiceRow>(`/api/v1/admin/invoices?${sp}`);
}

export function updateAdminInvoice(
  id: string,
  input: { status: string },
): Promise<AdminInvoiceRow> {
  return adminFetch<AdminInvoiceRow>(`/api/v1/admin/invoices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function fetchAdminEnterpriseQuotes(params: {
  page?: number;
  status?: string;
}): Promise<{
  data: AdminEnterpriseQuote[];
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
}> {
  const sp = new URLSearchParams({ page: String(params.page ?? 1), limit: '20' });
  if (params.status) sp.set('status', params.status);
  return adminListFetch<AdminEnterpriseQuote>(`/api/v1/admin/enterprise-quotes?${sp}`);
}

export function updateAdminEnterpriseQuote(
  id: string,
  input: { status?: string; notes?: string | null },
): Promise<AdminEnterpriseQuote> {
  return adminFetch<AdminEnterpriseQuote>(`/api/v1/admin/enterprise-quotes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function fetchAdminWaitlist(params: {
  page?: number;
  status?: string;
}): Promise<{
  data: AdminWaitlistRow[];
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
}> {
  const sp = new URLSearchParams({ page: String(params.page ?? 1), limit: '20' });
  if (params.status) sp.set('status', params.status);
  return adminListFetch<AdminWaitlistRow>(`/api/v1/admin/waitlist?${sp}`);
}

export function updateAdminWaitlist(
  id: string,
  input: { status?: string; adminNotes?: string | null },
): Promise<AdminWaitlistRow> {
  return adminFetch<AdminWaitlistRow>(`/api/v1/admin/waitlist/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function fetchAdminEngagements(params: {
  page?: number;
  status?: string;
}): Promise<{
  data: AdminEngagementRow[];
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
}> {
  const sp = new URLSearchParams({ page: String(params.page ?? 1), limit: '20' });
  if (params.status) sp.set('status', params.status);
  return adminListFetch<AdminEngagementRow>(`/api/v1/admin/engagements?${sp}`);
}

export function updateAdminEngagement(
  id: string,
  input: { status?: string; notes?: string | null },
): Promise<AdminEngagementRow> {
  return adminFetch<AdminEngagementRow>(`/api/v1/admin/engagements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function fetchAdminFunnelEvents(params: {
  page?: number;
  event?: string;
}): Promise<{
  data: AdminFunnelEvent[];
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
}> {
  const sp = new URLSearchParams({ page: String(params.page ?? 1), limit: '20' });
  if (params.event) sp.set('event', params.event);
  return adminListFetch<AdminFunnelEvent>(`/api/v1/admin/funnel-events?${sp}`);
}

export function formatINRFromPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}
