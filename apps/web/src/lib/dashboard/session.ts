import { headers } from 'next/headers';
import type { UserRole } from '@accessshield/types';
import { getServerAuthContext } from '@/lib/auth/server';

/** Role forwarded by middleware — fast path for dashboard RSC (JWT claims only). */
export function getDashboardRole(): UserRole | undefined {
  const role = headers().get('x-user-role');
  if (!role) return undefined;
  return role as UserRole;
}

export function getDashboardOrgId(): string | undefined {
  return headers().get('x-org-id') ?? undefined;
}

/**
 * Authoritative role for gated routes / sidebar (JWT session + Postgres fallback).
 */
export async function getServerDashboardRole(): Promise<UserRole | undefined> {
  const fromHeader = getDashboardRole();
  if (fromHeader) {
    return fromHeader;
  }

  const auth = await getServerAuthContext();
  return auth?.claims.user_role;
}
