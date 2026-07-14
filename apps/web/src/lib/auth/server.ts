import type { AccessShieldJwtClaims } from '@accessshield/types';
import { getAppSession } from '@/lib/auth/session';
import { parseAccessShieldClaims, toAccessShieldClaims } from './claims';
import { lookupClaimsFromDatabase } from './db-claims';

export interface ServerAuthUser {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
}

export interface ServerAuthContext {
  user: ServerAuthUser;
  claims: Partial<AccessShieldJwtClaims>;
  hasRequiredClaims: boolean;
  /** Where tenant claims were resolved from */
  claimsSource: 'jwt' | 'database' | 'none';
}

/**
 * Load the authenticated user and AccessShield tenant claims for Server Components.
 */
export async function getServerAuthContext(): Promise<ServerAuthContext | null> {
  const session = await getAppSession();
  if (!session.userId) {
    return null;
  }

  const appMetadata: Record<string, unknown> = {
    user_role: session.user_role,
    org_id: session.org_id,
  };

  let parsed = parseAccessShieldClaims(session.accessToken, appMetadata);

  let claimsSource: ServerAuthContext['claimsSource'] =
    parsed.user_role && parsed.org_id ? 'jwt' : 'none';

  if (!parsed.user_role || !parsed.org_id) {
    const fromDb = await lookupClaimsFromDatabase(session.userId);
    if (fromDb) {
      parsed = {
        user_role: parsed.user_role ?? fromDb.user_role,
        org_id: parsed.org_id ?? fromDb.org_id,
      };
      if (parsed.user_role && parsed.org_id) {
        claimsSource = 'database';
      }
    }
  }

  const claims = toAccessShieldClaims(parsed, session.userId, session.email ?? '');

  return {
    user: {
      id: session.userId,
      email: session.email ?? undefined,
      app_metadata: appMetadata,
    },
    claims,
    hasRequiredClaims: Boolean(claims.user_role && claims.org_id),
    claimsSource,
  };
}
