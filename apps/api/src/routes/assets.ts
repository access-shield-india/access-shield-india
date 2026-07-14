/**
 * Assets API Routes
 *
 * CRUD-lite for digital assets (websites, apps) scoped to the caller's organisation.
 */

import type { Database } from '@accessshield/db';
import { assets, organisations } from '@accessshield/db';
import type { ApiResponse } from '@accessshield/types';
import { and, count, desc, eq } from 'drizzle-orm';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { getAssetLimit, isAssetLimitDisabled } from '../lib/plan-limits';
import { logger } from '../lib/logger';
import { sendProblem } from '../lib/problem-details';
import { uploadMobileApp } from '../services/s3-upload';
import { buildMobileAssetDescription } from '../lib/mobile-asset';
import { requireRoles } from '../middleware/rbac';

const createAssetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  url: z.string().url('Must be a valid URL'),
  type: z
    .enum(['website', 'web_app', 'mobile_app', 'document', 'pdf'])
    .optional()
    .default('website'),
  description: z.string().max(2000).optional(),
});

/**
 * Create Express router for /api/v1/assets endpoints.
 */
export function createAssetsRouter(db: Database): ExpressRouter {
  const router = Router();

  /**
   * GET /assets — List assets for the authenticated organisation
   */
  router.get(
    '/',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;

        const rows = await db
          .select({
            id: assets.id,
            name: assets.name,
            url: assets.url,
            type: assets.type,
            description: assets.description,
            isActive: assets.isActive,
            lastScannedAt: assets.lastScannedAt,
            createdAt: assets.createdAt,
          })
          .from(assets)
          .where(and(eq(assets.organisationId, orgId), eq(assets.isActive, true)))
          .orderBy(desc(assets.createdAt));

        const response: ApiResponse<typeof rows> = {
          data: rows,
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  const assetIdParamsSchema = z.object({
    id: z.string().uuid(),
  });

  /**
   * GET /assets/:id — Single asset for the authenticated organisation
   */
  router.get(
    '/:id',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parseResult = assetIdParamsSchema.safeParse(req.params);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid asset ID');
          return;
        }

        const orgId = req.user!.org_id;
        const { id: assetId } = parseResult.data;

        const [asset] = await db
          .select({
            id: assets.id,
            organisationId: assets.organisationId,
            name: assets.name,
            url: assets.url,
            type: assets.type,
            description: assets.description,
            isActive: assets.isActive,
            lastScannedAt: assets.lastScannedAt,
            createdAt: assets.createdAt,
            updatedAt: assets.updatedAt,
          })
          .from(assets)
          .where(
            and(
              eq(assets.id, assetId),
              eq(assets.organisationId, orgId),
              eq(assets.isActive, true),
            ),
          )
          .limit(1);

        if (!asset) {
          sendProblem(res, 404, 'not-found', 'Asset not found');
          return;
        }

        const response: ApiResponse<typeof asset> = {
          data: asset,
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * POST /assets — Register a new asset for scanning
   */
  router.post(
    '/',
    requireRoles('customer_admin', 'accessibility_officer', 'developer'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parseResult = createAssetSchema.safeParse(req.body);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const { name, url, type, description } = parseResult.data;
        const orgId = req.user!.org_id;

        const [org] = await db
          .select({ planTier: organisations.planTier })
          .from(organisations)
          .where(eq(organisations.id, orgId))
          .limit(1);

        const planTier = org?.planTier ?? 'starter';
        const assetLimit = getAssetLimit(planTier);

        if (assetLimit !== null && !isAssetLimitDisabled()) {
          const [assetCountResult] = await db
            .select({ count: count() })
            .from(assets)
            .where(and(eq(assets.organisationId, orgId), eq(assets.isActive, true)));

          const currentCount = assetCountResult?.count ?? 0;
          if (currentCount >= assetLimit) {
            sendProblem(
              res,
              422,
              'plan-limit-exceeded',
              `Your ${planTier} plan allows up to ${assetLimit} asset(s). Upgrade to add more.`,
            );
            return;
          }
        }

        const [created] = await db
          .insert(assets)
          .values({
            organisationId: orgId,
            name,
            url,
            type,
            description,
          })
          .returning({
            id: assets.id,
            name: assets.name,
            url: assets.url,
            type: assets.type,
            description: assets.description,
            createdAt: assets.createdAt,
          });

        if (!created) {
          sendProblem(res, 500, 'db-error', 'Failed to create asset');
          return;
        }

        const response: ApiResponse<typeof created> = {
          data: created,
          timestamp: new Date().toISOString(),
        };

        res.status(201).json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * POST /assets/mobile — Upload a mobile app (APK/IPA) and create asset
   */
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
    fileFilter: (_req, file, cb) => {
      const validTypes = [
        'application/vnd.android.package-archive', // APK
        'application/octet-stream', // IPA (often served as this)
      ];
      const validExtensions = ['.apk', '.ipa'];
      const ext = file.originalname.toLowerCase().slice(-4);

      if (validTypes.includes(file.mimetype) || validExtensions.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only APK and IPA files are allowed.'));
      }
    },
  });

  router.post(
    '/mobile',
    requireRoles('customer_admin', 'accessibility_officer', 'developer'),
    upload.single('file'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const file = req.file;

        if (!file) {
          sendProblem(res, 400, 'validation-error', 'No file uploaded');
          return;
        }

        const { name, platform, description, maxScreens, standards } = req.body;

        if (!name || !platform) {
          sendProblem(res, 400, 'validation-error', 'Missing required fields: name, platform');
          return;
        }

        if (!['android', 'ios'].includes(platform)) {
          sendProblem(res, 400, 'validation-error', 'Platform must be android or ios');
          return;
        }

        // Check plan limits
        const [org] = await db
          .select({ planTier: organisations.planTier })
          .from(organisations)
          .where(eq(organisations.id, orgId))
          .limit(1);

        const planTier = org?.planTier ?? 'starter';
        const assetLimit = getAssetLimit(planTier);

        if (assetLimit !== null && !isAssetLimitDisabled()) {
          const [assetCountResult] = await db
            .select({ count: count() })
            .from(assets)
            .where(and(eq(assets.organisationId, orgId), eq(assets.isActive, true)));

          const currentCount = assetCountResult?.count ?? 0;
          if (currentCount >= assetLimit) {
            sendProblem(
              res,
              422,
              'plan-limit-exceeded',
              `Your ${planTier} plan allows up to ${assetLimit} asset(s). Upgrade to add more.`,
            );
            return;
          }
        }

        // Create asset first to get the ID
        const [created] = await db
          .insert(assets)
          .values({
            organisationId: orgId,
            name,
            url: `mobile://${platform}/pending`,
            type: 'mobile_app',
            description: description || null,
          })
          .returning({
            id: assets.id,
            name: assets.name,
            url: assets.url,
            type: assets.type,
            description: assets.description,
            createdAt: assets.createdAt,
          });

        if (!created) {
          sendProblem(res, 500, 'db-error', 'Failed to create asset');
          return;
        }

        // Upload file to S3
        const s3Key = await uploadMobileApp(
          file.buffer,
          orgId,
          created.id,
          platform as 'android' | 'ios',
          file.originalname,
        );

        const parsedStandards = ((): Array<'WCAG22' | 'IS17802' | 'SEBI'> => {
          try {
            const raw = standards ? JSON.parse(standards) : {};
            const selected = Object.entries(raw)
              .filter(([, enabled]) => enabled)
              .map(([key]) => {
                if (key === 'wcag22') return 'WCAG22';
                if (key === 'is17802') return 'IS17802';
                if (key === 'sebi') return 'SEBI';
                return null;
              })
              .filter((value): value is 'WCAG22' | 'IS17802' | 'SEBI' => value !== null);
            return selected.length > 0 ? selected : ['WCAG22', 'IS17802'];
          } catch {
            return ['WCAG22', 'IS17802'];
          }
        })();

        const mobileDescription = buildMobileAssetDescription(
          {
            platform: platform as 'android' | 'ios',
            appS3Key: s3Key,
            maxScreens: maxScreens ? Number(maxScreens) : 50,
            standards: parsedStandards,
          },
          description || undefined,
        );

        const mobileUrl = `mobile://${platform}/${created.id}`;

        await db
          .update(assets)
          .set({ description: mobileDescription, url: mobileUrl })
          .where(and(eq(assets.id, created.id), eq(assets.organisationId, orgId)));

        const assetWithMetadata = { ...created, description: mobileDescription, url: mobileUrl };

        logger.info(
          { assetId: created.id, orgId, platform, s3Key, fileSize: file.size },
          'Mobile app uploaded',
        );

        const response: ApiResponse<typeof assetWithMetadata & { s3Key: string }> = {
          data: { ...assetWithMetadata, s3Key },
          timestamp: new Date().toISOString(),
        };

        res.status(201).json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * DELETE /assets/:id — Permanently remove an asset and all related data
   *
   * Cascades to issues, scans, violations, certificates, and reports via FK constraints.
   */
  router.delete(
    '/:id',
    requireRoles('customer_admin', 'accessibility_officer', 'developer'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const assetId = req.params.id;

        if (!assetId || !z.string().uuid().safeParse(assetId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid asset ID');
          return;
        }

        const [asset] = await db
          .select({ id: assets.id, name: assets.name })
          .from(assets)
          .where(and(eq(assets.id, assetId), eq(assets.organisationId, orgId)))
          .limit(1);

        if (!asset) {
          sendProblem(res, 404, 'not-found', 'Asset not found');
          return;
        }

        await db
          .delete(assets)
          .where(and(eq(assets.id, assetId), eq(assets.organisationId, orgId)));

        logger.info({ assetId, orgId, assetName: asset.name }, 'Asset deleted');

        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
