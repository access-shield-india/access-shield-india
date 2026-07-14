import type { UserRole } from '@accessshield/types';
import { and, eq } from 'drizzle-orm';
import type { Database } from './index';
import { users } from './schema';

export interface ResolvedUserClaims {
  user_role: UserRole;
  org_id: string;
}

export interface ResolvedApplicationUser extends ResolvedUserClaims {
  /** Application users.id (not Supabase auth UUID) */
  id: string;
}

/**
 * Resolve application user row by Supabase auth user ID.
 */
export async function lookupUserByAuthId(
  db: Database,
  authUserId: string,
): Promise<ResolvedApplicationUser | null> {
  const [row] = await db
    .select({
      id: users.id,
      role: users.role,
      organisationId: users.organisationId,
    })
    .from(users)
    .where(and(eq(users.authUserId, authUserId), eq(users.isActive, true)))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    user_role: row.role,
    org_id: row.organisationId,
  };
}

/**
 * Resolve tenant claims from the application users table by Supabase auth user ID.
 * Used in local dev when JWT app_metadata is not yet configured on Supabase.
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
