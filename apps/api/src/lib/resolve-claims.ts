import type { Database } from '@accessshield/db';
import { lookupUserClaimsByAuthId } from '@accessshield/db';
import type { AccessShieldJwtClaims } from '@accessshield/types';
import type { JWTPayload } from 'jose';

function isDbClaimsFallbackEnabled(): boolean {
  if (process.env.AUTH_DB_CLAIMS_FALLBACK === 'false') {
    return false;
  }
  return process.env.NODE_ENV !== 'production' || process.env.AUTH_DB_CLAIMS_FALLBACK === 'true';
}

function readClaim(
  payload: JWTPayload,
  key: 'user_role' | 'org_id',
): string | undefined {
  const top = payload[key];
  if (typeof top === 'string' && top.length > 0) {
    return top;
  }

  const appMetadata = (payload.app_metadata ?? {}) as Record<string, unknown>;
  const fromMeta = appMetadata[key];
  if (typeof fromMeta === 'string' && fromMeta.length > 0) {
    return fromMeta;
  }

  // Keycloak sometimes nests custom claims under realm_access / resource_access — ignore those.
  return undefined;
}

/**
 * Resolve AccessShield tenant claims from JWT (top-level or app_metadata), with optional DB fallback.
 */
export async function resolveAccessShieldClaims(
  payload: JWTPayload,
  db: Database,
): Promise<Pick<AccessShieldJwtClaims, 'user_role' | 'org_id'> | null> {
  let userRole = readClaim(payload, 'user_role') as AccessShieldJwtClaims['user_role'] | undefined;
  let orgId = readClaim(payload, 'org_id');

  if (isDbClaimsFallbackEnabled() && payload.sub) {
    const fromDb = await lookupUserClaimsByAuthId(db, payload.sub);
    if (fromDb) {
      // DB is authoritative when fallback enabled — roles can change without re-login.
      userRole = fromDb.user_role;
      orgId = fromDb.org_id;
    }
  }

  if (!userRole || !orgId) {
    return null;
  }

  return { user_role: userRole, org_id: orgId };
}
