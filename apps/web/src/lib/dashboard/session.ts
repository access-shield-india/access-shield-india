import { headers } from 'next/headers';
import type { UserRole } from '@accessshield/types';
import { parseAccessShieldClaims } from '@/lib/auth/claims';
import { getAppSession } from '@/lib/auth/session';

/** Role forwarded by middleware — fast path for dashboard RSC. */
export function getDashboardRole(): UserRole | undefined {
  const role = headers().get('x-user-role');
  if (!role) return undefined;
  return role as UserRole;
}

export function getDashboardOrgId(): string | undefined {
  return headers().get('x-org-id') ?? undefined;
}

/**
 * Authoritative role for gated routes (e.g. platform admin).
 */
export async function getServerDashboardRole(): Promise<UserRole | undefined> {
  const session = await getAppSession();
  if (!session.userId) {
    return undefined;
  }

  const { user_role } = parseAccessShieldClaims(session.accessToken, {
    user_role: session.user_role,
    org_id: session.org_id,
  });

  return user_role;
}
