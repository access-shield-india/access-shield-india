import type { UserRole } from '@accessshield/types';
import { and, eq } from 'drizzle-orm';
import type { Database } from './index';
import { organisations, users } from './schema';

export interface ResolvedUserClaims {
  user_role: UserRole;
  org_id: string;
}

export interface ResolvedApplicationUser extends ResolvedUserClaims {
  /** Application users.id (not IdP auth UUID) */
  id: string;
}

export type AccountAccessStatus =
  | { ok: true; user: ResolvedApplicationUser }
  | { ok: false; reason: 'user_inactive' | 'org_inactive' | 'not_found' };

/**
 * Resolve application user + org active status by IdP auth user ID.
 */
export async function lookupAccountAccessByAuthId(
  db: Database,
  authUserId: string,
): Promise<AccountAccessStatus> {
  const [row] = await db
    .select({
      id: users.id,
      role: users.role,
      organisationId: users.organisationId,
      userActive: users.isActive,
      orgActive: organisations.isActive,
    })
    .from(users)
    .innerJoin(organisations, eq(users.organisationId, organisations.id))
    .where(eq(users.authUserId, authUserId))
    .limit(1);

  if (!row) {
    return { ok: false, reason: 'not_found' };
  }

  if (!row.userActive) {
    return { ok: false, reason: 'user_inactive' };
  }

  if (!row.orgActive) {
    return { ok: false, reason: 'org_inactive' };
  }

  return {
    ok: true,
    user: {
      id: row.id,
      user_role: row.role,
      org_id: row.organisationId,
    },
  };
}

/**
 * Resolve application user row by Supabase auth user ID (active user + active org only).
 */
export async function lookupUserByAuthId(
  db: Database,
  authUserId: string,
): Promise<ResolvedApplicationUser | null> {
  const access = await lookupAccountAccessByAuthId(db, authUserId);
  if (!access.ok) {
    return null;
  }
  return access.user;
}

/**
 * Resolve tenant claims from the application users table by IdP auth user ID.
 */
export async function lookupUserClaimsByAuthId(
  db: Database,
  authUserId: string,
): Promise<ResolvedUserClaims | null> {
  const user = await lookupUserByAuthId(db, authUserId);
  if (!user) {
    return null;
  }

  return {
    user_role: user.user_role,
    org_id: user.org_id,
  };
}
