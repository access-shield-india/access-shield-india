import type { AccessShieldJwtClaims, UserRole } from '@accessshield/types';
import { USER_ROLES } from '@accessshield/types';

const VALID_ROLES = new Set<string>(USER_ROLES);

export interface ParsedAccessShieldClaims {
  user_role?: UserRole;
  org_id?: string;
}

interface JwtPayload {
  sub?: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  user_role?: unknown;
  org_id?: unknown;
}

/**
 * Decode a JWT payload without verification (caller must validate via getUser() first).
 */
export function decodeJwtPayload(accessToken: string): JwtPayload {
  const segment = accessToken.split('.')[1];
  if (!segment) {
    return {};
  }

  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const json =
    typeof atob === 'function' ? atob(padded) : Buffer.from(padded, 'base64').toString('utf8');

  return JSON.parse(json) as JwtPayload;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readRole(value: unknown): UserRole | undefined {
  const role = readString(value);
  if (role && VALID_ROLES.has(role)) {
    return role as UserRole;
  }
  return undefined;
}

/**
 * Extract AccessShield tenant claims from JWT + optional user record metadata.
 *
 * Prefer the Supabase user record (from getUser) over JWT payload — app_metadata
 * can be updated server-side before the access token is refreshed.
 */
export function parseAccessShieldClaims(
  accessToken: string | null | undefined,
  userAppMetadata?: Record<string, unknown> | null,
): ParsedAccessShieldClaims {
  const sources: Record<string, unknown>[] = [];

  if (userAppMetadata) {
    sources.push(userAppMetadata);
  }

  if (accessToken) {
    try {
      const payload = decodeJwtPayload(accessToken);
      sources.push((payload.app_metadata ?? {}) as Record<string, unknown>);
      sources.push(payload as Record<string, unknown>);
    } catch {
      // Malformed token — fall through to user metadata
    }
  }

  let user_role: UserRole | undefined;
  let org_id: string | undefined;

  for (const source of sources) {
    user_role ??= readRole(source['user_role']);
    org_id ??= readString(source['org_id']);
    if (user_role && org_id) break;
  }

  return { user_role, org_id };
}

/**
 * Merge parsed claims with core JWT identity fields for display / API use.
 */
export function toAccessShieldClaims(
  parsed: ParsedAccessShieldClaims,
  sub: string,
  email: string,
): Partial<AccessShieldJwtClaims> {
  return {
    sub,
    email,
    user_role: parsed.user_role,
    org_id: parsed.org_id,
  };
}
