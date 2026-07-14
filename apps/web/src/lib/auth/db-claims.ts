import { createDb, lookupUserClaimsByAuthId } from '@accessshield/db';
import type { ParsedAccessShieldClaims } from './claims';

function isDbClaimsFallbackEnabled(): boolean {
  if (process.env.AUTH_DB_CLAIMS_FALLBACK === 'false') {
    return false;
  }
  return process.env.NODE_ENV !== 'production';
}

/**
 * Dev fallback: load tenant claims from local Postgres when JWT app_metadata is empty.
 */
export async function lookupClaimsFromDatabase(
  authUserId: string,
): Promise<ParsedAccessShieldClaims | null> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !isDbClaimsFallbackEnabled()) {
    return null;
  }

  try {
    const db = createDb(databaseUrl);
    return await lookupUserClaimsByAuthId(db, authUserId);
  } catch {
    return null;
  }
}
