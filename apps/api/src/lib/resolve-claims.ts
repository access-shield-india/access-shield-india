import type { Database } from '@accessshield/db';
import { lookupAccountAccessByAuthId } from '@accessshield/db';
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

  return undefined;
}

export type ClaimsResolveResult =
  | { ok: true; claims: Pick<AccessShieldJwtClaims, 'user_role' | 'org_id'> }
  | { ok: false; reason: 'missing_claims' | 'user_inactive' | 'org_inactive' | 'not_found' };

/**
 * Resolve AccessShield tenant claims from JWT, with DB fallback and hard active checks.
 * Inactive user or org always fails — even when JWT still carries role claims.
 */
export async function resolveAccessShieldClaimsResult(
  payload: JWTPayload,
  db: Database,
): Promise<ClaimsResolveResult> {
  let userRole = readClaim(payload, 'user_role') as AccessShieldJwtClaims['user_role'] | undefined;
  let orgId = readClaim(payload, 'org_id');

  if (payload.sub) {
    const access = await lookupAccountAccessByAuthId(db, payload.sub);

    if (access.ok === false) {
      if (access.reason === 'user_inactive' || access.reason === 'org_inactive') {
        return { ok: false, reason: access.reason };
      }
      // not_found — continue with JWT claims if present (or DB fallback path below)
    } else {
      if (isDbClaimsFallbackEnabled()) {
        userRole = access.user.user_role;
        orgId = access.user.org_id;
      } else {
        // Still prefer DB role/org when row exists so suspensions stick without re-login
        userRole = access.user.user_role;
        orgId = access.user.org_id;
      }
    }
  }

  if (!userRole || !orgId) {
    return { ok: false, reason: 'missing_claims' };
  }

  return { ok: true, claims: { user_role: userRole, org_id: orgId } };
}

/**
 * Resolve AccessShield tenant claims from JWT (top-level or app_metadata), with optional DB fallback.
 * @deprecated Prefer resolveAccessShieldClaimsResult for inactive-account messaging.
 */
export async function resolveAccessShieldClaims(
  payload: JWTPayload,
  db: Database,
): Promise<Pick<AccessShieldJwtClaims, 'user_role' | 'org_id'> | null> {
  const result = await resolveAccessShieldClaimsResult(payload, db);
  return result.ok ? result.claims : null;
}
