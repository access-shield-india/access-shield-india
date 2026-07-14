/**
 * Certification Routes
 *
 * Express router for certificate issuance, listing, and public verification.
 * Mounted at both /api/v1/certificates AND /verify (public, no auth).
 */

import type { Database } from '@accessshield/db';
import type { ApiResponse, PaginationMeta } from '@accessshield/types';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { sendProblem } from '../lib/problem-details';
import { requireRoles } from '../middleware/rbac';
import {
  getCertificateForVerify,
  issueCertificate,
  listCertificates,
  revokeCertificate,
} from './cert.service';
import { CertificateEligibilityError, CertificateNotFoundError } from './types';

/** Rate limit state for public verify endpoint */
const verifyRateLimit = new Map<string, { count: number; resetAt: number }>();
const VERIFY_RATE_LIMIT = 100;
const VERIFY_RATE_WINDOW_MS = 60 * 1000;

/**
 * Simple rate limiter for public verify endpoint.
 */
function checkVerifyRateLimit(ip: string): boolean {
  const now = Date.now();
  const state = verifyRateLimit.get(ip);

  if (!state || state.resetAt < now) {
    verifyRateLimit.set(ip, { count: 1, resetAt: now + VERIFY_RATE_WINDOW_MS });
    return true;
  }

  if (state.count >= VERIFY_RATE_LIMIT) {
    return false;
  }

  state.count++;
  return true;
}

/** Zod schema for POST /certificates */
const createCertificateSchema = z.object({
  asset_id: z.string().uuid('Invalid asset ID format'),
  scan_id: z.string().uuid('Invalid scan ID format'),
  level: z.enum(['WCAG22-AA', 'IS17802', 'RPWD']),
  auditor_confirmed: z.boolean(),
  notes: z.string().optional(),
});

/** Zod schema for POST /certificates/:id/revoke */
const revokeCertificateSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

/** Zod schema for GET /certificates query params */
const listCertificatesSchema = z.object({
  asset_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Create the certification router with dependency injection for database.
 *
 * @param db - Drizzle database instance
 */
export function createCertificationRouter(db: Database): ExpressRouter {
  const router = Router();

  /**
   * POST /api/v1/certificates - Issue a new certificate
   *
   * Validates eligibility criteria and generates badge.
   */
  router.post(
    '/api/v1/certificates',
    requireRoles('customer_admin', 'accessibility_officer', 'auditor'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parseResult = createCertificateSchema.safeParse(req.body);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const { asset_id, scan_id, level, auditor_confirmed, notes } = parseResult.data;
        const orgId = req.user!.org_id;
        const userId = req.user!.sub;

        logger.info(
          { orgId, assetId: asset_id, scanId: scan_id, level },
          'Certificate issuance requested',
        );

        try {
          const result = await issueCertificate(db, {
            organisationId: orgId,
            assetId: asset_id,
            scanId: scan_id,
            level,
            issuedBy: userId,
            auditorConfirmed: auditor_confirmed,
            notes,
          });

          const response: ApiResponse<typeof result> = {
            data: result,
            timestamp: new Date().toISOString(),
          };

          res.status(201).json(response);
        } catch (err) {
          if (err instanceof CertificateEligibilityError) {
            sendProblem(res, 422, 'eligibility-error', err.message);
            return;
          }
          throw err;
        }
      } catch (err) {
        logger.error({ err }, 'Unhandled error in certificate issuance');
        next(err);
      }
    },
  );

  /**
   * GET /api/v1/certificates - List certificates for organisation
   */
  router.get(
    '/api/v1/certificates',
    requireRoles('customer_admin', 'accessibility_officer', 'auditor', 'developer'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parseResult = listCertificatesSchema.safeParse(req.query);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid query parameters', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const { asset_id, page, limit } = parseResult.data;
        const orgId = req.user!.org_id;

        const { certificates: certs, total } = await listCertificates(
          db,
          orgId,
          asset_id,
          page,
          limit,
        );

        const meta: PaginationMeta = {
          page,
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        };

        const response: ApiResponse<typeof certs> = {
          data: certs,
          meta,
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * POST /api/v1/certificates/:id/revoke - Revoke a certificate
   */
  router.post(
    '/api/v1/certificates/:id/revoke',
    requireRoles('customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const certId = req.params.id ?? '';
        if (!certId || !z.string().uuid().safeParse(certId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid certificate ID format');
          return;
        }

        const parseResult = revokeCertificateSchema.safeParse(req.body);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const { reason } = parseResult.data;
        const orgId = req.user!.org_id;
        const userId = req.user!.sub;

        try {
          await revokeCertificate(db, certId, orgId, reason, userId);
          res.status(204).send();
        } catch (err) {
          if (err instanceof CertificateNotFoundError) {
            sendProblem(res, 404, 'not-found', err.message);
            return;
          }
          throw err;
        }
      } catch (err) {
        logger.error({ err }, 'Unhandled error in certificate revocation');
        next(err);
      }
    },
  );

  /**
   * GET /verify/:token - PUBLIC certificate verification
   *
   * No authentication required. Rate limited to prevent abuse.
   * Always returns 200 — validity indicated in response body.
   */
  router.get(
    '/verify/:token',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const token = req.params.token ?? '';

        // Rate limit check
        const clientIp = (req.ip ?? req.socket.remoteAddress ?? 'unknown').toString();
        if (!checkVerifyRateLimit(clientIp)) {
          res.status(429).json({
            valid: false,
            status: 'rate_limited',
            message: 'Too many requests. Please try again later.',
          });
          return;
        }

        // Validate token format
        if (!token || !z.string().uuid().safeParse(token).success) {
          res.json({
            valid: false,
            status: 'not_found',
            organisation: null,
            asset: null,
            score: null,
            level: null,
            issuedAt: null,
            expiresAt: null,
            badgeUrl: null,
          });
          return;
        }

        const result = await getCertificateForVerify(db, token);

        // Always return 200 — validity indicated in response body
        res.json(result);
      } catch (err) {
        logger.error({ err }, 'Error in certificate verification');
        // Even on error, return a valid JSON response
        res.json({
          valid: false,
          status: 'not_found',
          organisation: null,
          asset: null,
          score: null,
          level: null,
          issuedAt: null,
          expiresAt: null,
          badgeUrl: null,
        });
      }
    },
  );

  return router;
}

export default createCertificationRouter;
