import type { Database } from '@accessshield/db';
import type { AccessShieldJwtClaims } from '@accessshield/types';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { NextFunction, Request, Response } from 'express';
import { getAuthIssuerUrl, getAuthJwksUrl } from '../config/auth-provider';
import type { AppSecrets } from '../config/secrets';
import { resolveAccessShieldClaims } from '../lib/resolve-claims';
import { sendProblem } from '../lib/problem-details';

declare global {
  namespace Express {
    interface Request {
      user?: AccessShieldJwtClaims;
    }
  }
}

export function createAuthMiddleware(secrets: AppSecrets, db: Database) {
  const issuer = getAuthIssuerUrl(secrets);
  const jwksUrl = getAuthJwksUrl(secrets);
  const jwks = createRemoteJWKSet(new URL(jwksUrl));

  return async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      // SSE stream authenticates via short-lived ticket query param
      if (req.path === '/realtime/stream' || req.originalUrl.includes('/realtime/stream')) {
        next();
        return;
      }
      sendProblem(res, 401, 'unauthorized', 'Authentication required', 'Missing Bearer token');
      return;
    }

    const token = authHeader.slice(7);

    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer,
      });

      const claims = await resolveAccessShieldClaims(payload, db);

      if (!claims) {
        sendProblem(
          res,
          403,
          'forbidden',
          'Missing required claims',
          'JWT must include user_role and org_id (or app_metadata), or a matching users row in the database (dev fallback)',
        );
        return;
      }

      req.user = {
        sub: payload.sub!,
        email: (payload.email as string) ?? '',
        user_role: claims.user_role,
        org_id: claims.org_id,
        iat: payload.iat,
        exp: payload.exp,
      };

      next();
    } catch {
      sendProblem(res, 401, 'unauthorized', 'Invalid token', 'JWT verification failed');
    }
  };
}
