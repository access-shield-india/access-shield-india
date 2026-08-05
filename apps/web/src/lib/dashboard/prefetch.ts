import {
  getDashboardStats,
  listAssets,
  getAsset,
  listScans,
  type DashboardStats,
} from '@/lib/api/client';
import { getApiBase } from '@/lib/api/base';
import { requireServerAccessToken } from '@/lib/auth/session';
import { makeQueryClient } from '@/lib/query-client';
import type { Asset } from '@/lib/api/types';

async function serverToken(): Promise<string> {
  return requireServerAccessToken();
}

/** Prefetch dashboard home queries in parallel (one auth read). */
export async function prefetchDashboardHome() {
  const queryClient = makeQueryClient();
  const token = await serverToken();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['dashboard-stats'],
      queryFn: () => getDashboardStats(token),
    }),
    queryClient.prefetchQuery({
      queryKey: ['assets'],
      queryFn: () => listAssets(token),
    }),
  ]);

  return queryClient;
}

export async function prefetchAssets() {
  const queryClient = makeQueryClient();
  const token = await serverToken();

  await queryClient.prefetchQuery({
    queryKey: ['assets'],
    queryFn: () => listAssets(token),
  });

  return queryClient;
}

export async function prefetchScans(limit = 50) {
  const queryClient = makeQueryClient();
  const token = await serverToken();

  await queryClient.prefetchQuery({
    queryKey: ['scans', { limit }],
    queryFn: () => listScans(token, { limit }),
  });

  return queryClient;
}

export async function prefetchAsset(assetId: string) {
  const queryClient = makeQueryClient();
  const token = await serverToken();

  await queryClient.prefetchQuery({
    queryKey: ['assets', assetId],
    queryFn: () => getAsset(token, assetId),
  });

  return queryClient;
}

async function fetchIssueStatsServer(token: string) {
  const base = getApiBase();
  const response = await fetch(`${base}/api/v1/issues/stats`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch issue stats');
  const json = await response.json();
  return json.data;
}

async function fetchIssuesServer(token: string, filters: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, String(value));
  });

  const base = getApiBase();
  const response = await fetch(`${base}/api/v1/issues?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch issues');
  const json = await response.json();
  return { issues: json.data, meta: json.meta };
}

/** Prefetch issues list page — stats, list, and asset filter options in parallel. */
export async function prefetchIssues(searchParams: Record<string, string | undefined> = {}) {
  const queryClient = makeQueryClient();
  const token = await serverToken();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['issue-stats'],
      queryFn: () => fetchIssueStatsServer(token),
    }),
    queryClient.prefetchQuery({
      queryKey: ['issues', searchParams],
      queryFn: () => fetchIssuesServer(token, searchParams),
    }),
    queryClient.prefetchQuery({
      queryKey: ['assets'],
      queryFn: () => listAssets(token),
    }),
  ]);

  return queryClient;
}

export type { DashboardStats, Asset };
