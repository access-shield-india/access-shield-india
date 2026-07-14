import { getAccessToken } from './client';
import { apiUrl } from './base';
import type { ApiResponse } from './types';

export interface AdminStats {
  organisations: number;
  users: number;
  scansThisMonth: number;
  activeOrganisations: number;
  widgetsEnabled: number;
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
