/**
 * Document Scanner Routes
 *
 * POST   /api/v1/document-scans/upload        — upload file, create job, enqueue
 * GET    /api/v1/document-scans/:jobId/status — poll job status
 * GET    /api/v1/document-scans/:jobId/results — get full results
 * POST   /api/v1/document-scans/:jobId/retry   — re-enqueue a stuck/failed job
 * GET    /api/v1/document-scans               — list all scans for org (paginated)
 * DELETE /api/v1/document-scans/:jobId        — delete scan + file
 */

import type { Database } from '@accessshield/db';
import {
  documentScanJobs,
  documentScanResults,
  lookupUserByAuthId,
  organisations,
} from '@accessshield/db';
import type { ApiResponse, PaginationMeta } from '@accessshield/types';
import { and, count, desc, eq, gte } from 'drizzle-orm';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import type { Redis } from 'ioredis';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import path from 'path';
import { logger } from '../lib/logger';
import { getPlanFeatures, isScanLimitDisabled } from '../lib/plan-limits';
import { sendProblem } from '../lib/problem-details';
import { requireRoles } from '../middleware/rbac';
import { enqueueDocumentScan } from '../services/document-scan-queue';
import { generatePdfWithTitle } from '../reporting/pdf-generator';
import {
  renderDocumentScanTemplate,
  type DocumentScanViolation,
} from '../reporting/templates/document-scan';
import {
  deleteDocument,
  getDocumentDownloadUrl,
  inferDocumentType,
  uploadDocument,
} from '../services/document-storage';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DOCUMENT_STANDARDS = ['WCAG_2_1_AA', 'GIGW_3_0', 'PDF_UA', 'IS_17802'] as const;

const ESTIMATED_DURATION_SECONDS: Record<string, number> = {
  pdf: 45,
  docx: 20,
  pptx: 25,
  xlsx: 15,
};

/** Map Drizzle camelCase rows to snake_case API responses expected by the web app */
function serializeScanStatus(job: {
  id: string;
  documentName: string;
  documentType: string;
  status: string;
  progressPercent: number | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}) {
  return {
    job_id: job.id,
    document_name: job.documentName,
    document_type: job.documentType,
    status: job.status,
    progress_percent: job.progressPercent ?? 0,
    error_message: job.errorMessage ?? undefined,
    created_at: job.createdAt,
    started_at: job.startedAt,
    completed_at: job.completedAt,
    is_complete: job.status === 'completed',
    is_failed: job.status === 'failed',
  };
}

function serializeScanResults(
  results: {
    id: string;
    jobId: string;
    organisationId: string;
    documentName: string;
    documentType: string;
    totalViolations: number;
    criticalCount: number;
    seriousCount: number;
    moderateCount: number;
    minorCount: number;
    complianceScore: number;
    violations: unknown;
    summary: unknown;
    gigwCheckpointResults: unknown;
    aiSummary: string | null;
    scanDurationSeconds: number | null;
    createdAt: string;
  },
  violations: Array<{ severity?: string; category?: string }>,
) {
  return {
    id: results.id,
    job_id: results.jobId,
    organisation_id: results.organisationId,
    document_name: results.documentName,
    document_type: results.documentType,
    total_violations: results.totalViolations,
    critical_count: results.criticalCount,
    serious_count: results.seriousCount,
    moderate_count: results.moderateCount,
    minor_count: results.minorCount,
    compliance_score: results.complianceScore,
    violations,
    violations_total: violations.length,
    violations_page: 1,
    violations_limit: violations.length,
    violations_pages: 1,
    summary: (results.summary as Record<string, number>) ?? {},
    gigw_checkpoint_results:
      (results.gigwCheckpointResults as Record<string, { status: string; count: number }>) ?? {},
    ai_summary: results.aiSummary ?? '',
    scan_duration_seconds: results.scanDurationSeconds ?? 0,
    created_at: results.createdAt,
  };
}

function formatIndianDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function checkDocumentScanLimits(
  db: Database,
  orgId: string,
  planTier: string,
): Promise<{ limitReached: boolean; currentCount: number; limit: number | null }> {
  const features = getPlanFeatures(planTier);

  if (!features.documentScanning) {
    return { limitReached: true, currentCount: 0, limit: 0 };
  }

  if (isScanLimitDisabled() || features.documentScansPerMonth === 0) {
    return { limitReached: false, currentCount: 0, limit: null };
  }

  const monthStart = getMonthStart();
  const [result] = await db
    .select({ count: count() })
    .from(documentScanJobs)
    .where(
      and(
        eq(documentScanJobs.organisationId, orgId),
        gte(documentScanJobs.createdAt, monthStart.toISOString()),
      ),
    );

  const currentCount = result?.count ?? 0;
  return {
    limitReached: currentCount >= features.documentScansPerMonth,
    currentCount,
    limit: features.documentScansPerMonth,
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const supported = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    const supportedExts = ['.pdf', '.docx', '.pptx', '.xlsx'];

    if (supported.includes(file.mimetype) || supportedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Use PDF, DOCX, PPTX, or XLSX.`));
    }
  },
});

/**
 * Create Express router for /api/v1/document-scans endpoints.
 */
export function createDocumentScansRouter(db: Database, redis: Redis): ExpressRouter {
  const router = Router();

  /**
   * GET /document-scans — list scans for the authenticated organisation
   */
  router.get(
    '/',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
        const limit = Math.min(50, parseInt(String(req.query.limit ?? '20'), 10));
        const offset = (page - 1) * limit;

        const [countResult] = await db
          .select({ count: count() })
          .from(documentScanJobs)
          .where(eq(documentScanJobs.organisationId, orgId));

        const total = countResult?.count ?? 0;

        const scans = await db
          .select({
            id: documentScanJobs.id,
            documentName: documentScanJobs.documentName,
            documentType: documentScanJobs.documentType,
            status: documentScanJobs.status,
            progressPercent: documentScanJobs.progressPercent,
            createdAt: documentScanJobs.createdAt,
            completedAt: documentScanJobs.completedAt,
            complianceScore: documentScanResults.complianceScore,
            totalViolations: documentScanResults.totalViolations,
            criticalCount: documentScanResults.criticalCount,
          })
          .from(documentScanJobs)
          .leftJoin(documentScanResults, eq(documentScanResults.jobId, documentScanJobs.id))
          .where(eq(documentScanJobs.organisationId, orgId))
          .orderBy(desc(documentScanJobs.createdAt))
          .limit(limit)
          .offset(offset);

        const meta: PaginationMeta = {
          page,
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        };

        const response: ApiResponse<typeof scans> = {
          data: scans,
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
   * POST /document-scans/upload — upload document and enqueue scan job
   */
  router.post(
    '/upload',
    requireRoles('customer_admin', 'accessibility_officer', 'developer'),
    upload.single('document'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const authUserId = req.user!.sub;
        const appUser = await lookupUserByAuthId(db, authUserId);
        if (!appUser) {
          sendProblem(res, 403, 'forbidden', 'User profile not found');
          return;
        }
        const file = req.file;

        if (!file) {
          sendProblem(
            res,
            400,
            'validation-error',
            'No file uploaded',
            'Send file as multipart/form-data with field name "document"',
          );
          return;
        }

        const [org] = await db
          .select({ planTier: organisations.planTier })
          .from(organisations)
          .where(eq(organisations.id, orgId))
          .limit(1);

        const planTier = org?.planTier ?? 'starter';
        const features = getPlanFeatures(planTier);

        if (!features.documentScanning) {
          sendProblem(
            res,
            403,
            'forbidden',
            'Document scanning is not available on your current plan',
          );
          return;
        }

        const planCheck = await checkDocumentScanLimits(db, orgId, planTier);
        if (planCheck.limitReached) {
          sendProblem(
            res,
            402,
            'payment-required',
            'Monthly document scan limit reached',
            undefined,
            {
              current_count: planCheck.currentCount,
              limit: planCheck.limit,
              upgrade_url: '/services',
            },
          );
          return;
        }

        const documentType = inferDocumentType(file.mimetype, file.originalname);
        if (!documentType) {
          sendProblem(res, 400, 'validation-error', 'Could not determine document type from file');
          return;
        }

        const jobId = randomUUID();

        const storageKey = await uploadDocument(
          file.buffer,
          orgId,
          jobId,
          file.originalname,
          file.mimetype,
        );

        const downloadUrl = await getDocumentDownloadUrl(storageKey);

        await db.insert(documentScanJobs).values({
          id: jobId,
          organisationId: orgId,
          userId: appUser.id,
          documentName: file.originalname,
          documentType,
          documentSizeBytes: file.size,
          s3Key: storageKey,
          s3Bucket: process.env.S3_BUCKET_NAME ?? 'local',
          status: 'queued',
          progressPercent: 0,
          standards: [...DOCUMENT_STANDARDS],
        });

        try {
          await enqueueDocumentScan(redis, {
            job_id: jobId,
            organisation_id: orgId,
            document_name: file.originalname,
            document_type: documentType,
            document_url: downloadUrl,
            standards: [...DOCUMENT_STANDARDS],
          });
        } catch (err) {
          logger.error({ err, jobId, orgId }, 'Failed to enqueue document scan job');
          await db
            .update(documentScanJobs)
            .set({ status: 'failed', errorMessage: 'Failed to queue document scan job' })
            .where(eq(documentScanJobs.id, jobId));

          sendProblem(
            res,
            500,
            'queue-error',
            'Failed to queue document scan',
            'The document scan could not be queued. Please try again.',
          );
          return;
        }

        logger.info({ jobId, documentType, orgId }, 'Document scan job created');

        const response: ApiResponse<{
          job_id: string;
          status: string;
          document_name: string;
          document_type: string;
          document_size_bytes: number;
          estimated_duration_seconds: number;
          poll_url: string;
          results_url: string;
        }> = {
          data: {
            job_id: jobId,
            status: 'queued',
            document_name: file.originalname,
            document_type: documentType,
            document_size_bytes: file.size,
            estimated_duration_seconds: ESTIMATED_DURATION_SECONDS[documentType] ?? 30,
            poll_url: `/api/v1/document-scans/${jobId}/status`,
            results_url: `/api/v1/document-scans/${jobId}/results`,
          },
          timestamp: new Date().toISOString(),
        };

        res.status(201).json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * GET /document-scans/:jobId/status — poll job status
   */
  router.get(
    '/:jobId/status',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const jobId = req.params.jobId;
        if (!jobId || !UUID_RE.test(jobId)) {
          sendProblem(res, 400, 'validation-error', 'Invalid job ID format');
          return;
        }

        const [job] = await db
          .select({
            id: documentScanJobs.id,
            documentName: documentScanJobs.documentName,
            documentType: documentScanJobs.documentType,
            status: documentScanJobs.status,
            progressPercent: documentScanJobs.progressPercent,
            errorMessage: documentScanJobs.errorMessage,
            createdAt: documentScanJobs.createdAt,
            startedAt: documentScanJobs.startedAt,
            completedAt: documentScanJobs.completedAt,
          })
          .from(documentScanJobs)
          .where(and(eq(documentScanJobs.id, jobId), eq(documentScanJobs.organisationId, orgId)))
          .limit(1);

        if (!job) {
          sendProblem(res, 404, 'not-found', 'Scan job not found');
          return;
        }

        const response: ApiResponse<ReturnType<typeof serializeScanStatus>> = {
          data: serializeScanStatus(job),
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * POST /document-scans/:jobId/retry — re-enqueue a stuck or failed scan job
   */
  router.post(
    '/:jobId/retry',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const jobId = req.params.jobId;

        if (!jobId || !UUID_RE.test(jobId)) {
          sendProblem(res, 400, 'validation-error', 'Invalid job ID format');
          return;
        }

        const [job] = await db
          .select({
            id: documentScanJobs.id,
            status: documentScanJobs.status,
            documentName: documentScanJobs.documentName,
            documentType: documentScanJobs.documentType,
            s3Key: documentScanJobs.s3Key,
            standards: documentScanJobs.standards,
          })
          .from(documentScanJobs)
          .where(and(eq(documentScanJobs.id, jobId), eq(documentScanJobs.organisationId, orgId)))
          .limit(1);

        if (!job) {
          sendProblem(res, 404, 'not-found', 'Scan job not found');
          return;
        }

        if (job.status !== 'queued' && job.status !== 'failed') {
          sendProblem(
            res,
            409,
            'conflict',
            'Only queued or failed scans can be retried',
            undefined,
            {
              status: job.status,
            },
          );
          return;
        }

        if (!job.s3Key) {
          sendProblem(res, 422, 'unprocessable-entity', 'Document file no longer available');
          return;
        }

        const downloadUrl = await getDocumentDownloadUrl(job.s3Key);

        await db
          .update(documentScanJobs)
          .set({
            status: 'queued',
            progressPercent: 0,
            errorMessage: null,
            startedAt: null,
            completedAt: null,
          })
          .where(eq(documentScanJobs.id, jobId));

        await enqueueDocumentScan(redis, {
          job_id: jobId,
          organisation_id: orgId,
          document_name: job.documentName,
          document_type: job.documentType,
          document_url: downloadUrl,
          standards: job.standards ?? [...DOCUMENT_STANDARDS],
        });

        const response: ApiResponse<ReturnType<typeof serializeScanStatus>> = {
          data: serializeScanStatus({
            id: jobId,
            documentName: job.documentName,
            documentType: job.documentType,
            status: 'queued',
            progressPercent: 0,
            errorMessage: null,
            createdAt: new Date().toISOString(),
            startedAt: null,
            completedAt: null,
          }),
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * GET /document-scans/:jobId/report — generate and download PDF report
   */
  router.get(
    '/:jobId/report',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const jobId = req.params.jobId;

        if (!jobId || !UUID_RE.test(jobId)) {
          sendProblem(res, 400, 'validation-error', 'Invalid job ID format');
          return;
        }

        const [job] = await db
          .select({
            status: documentScanJobs.status,
            documentName: documentScanJobs.documentName,
            standards: documentScanJobs.standards,
            completedAt: documentScanJobs.completedAt,
          })
          .from(documentScanJobs)
          .where(and(eq(documentScanJobs.id, jobId), eq(documentScanJobs.organisationId, orgId)))
          .limit(1);

        if (!job) {
          sendProblem(res, 404, 'not-found', 'Scan job not found');
          return;
        }

        if (job.status !== 'completed') {
          sendProblem(res, 409, 'conflict', 'Scan not yet complete', undefined, {
            status: job.status,
          });
          return;
        }

        const [results] = await db
          .select()
          .from(documentScanResults)
          .where(eq(documentScanResults.jobId, jobId))
          .limit(1);

        if (!results) {
          sendProblem(res, 404, 'not-found', 'Results not found');
          return;
        }

        const [org] = await db
          .select({ name: organisations.name })
          .from(organisations)
          .where(eq(organisations.id, orgId))
          .limit(1);

        const violations = (results.violations as DocumentScanViolation[]) ?? [];
        const gigwRaw =
          (results.gigwCheckpointResults as Record<string, { status: string; count: number }>) ??
          {};

        const gigwCheckpoints = Object.entries(gigwRaw).map(([id, data]) => ({
          id,
          status: data.status,
          count: data.count,
        }));

        const html = renderDocumentScanTemplate({
          organisationName: org?.name ?? 'Organisation',
          documentName: results.documentName,
          documentType: results.documentType.toUpperCase(),
          complianceScore: results.complianceScore,
          totalViolations: results.totalViolations,
          criticalCount: results.criticalCount,
          seriousCount: results.seriousCount,
          moderateCount: results.moderateCount,
          minorCount: results.minorCount,
          aiSummary: results.aiSummary ?? '',
          scanDurationSeconds: results.scanDurationSeconds ?? 0,
          scannedAt: formatIndianDate(job.completedAt ?? results.createdAt),
          generatedAt: formatIndianDate(new Date()),
          standards: job.standards ?? [...DOCUMENT_STANDARDS],
          violations,
          gigwCheckpoints,
        });

        const pdfBuffer = await generatePdfWithTitle(
          html,
          `Document Scan — ${results.documentName}`,
        );

        const safeName = results.documentName.replace(/[^\w.-]+/g, '_');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeName}-report.pdf"`);
        res.send(pdfBuffer);
      } catch (err) {
        logger.error({ err, jobId: req.params.jobId }, 'Document scan report generation failed');
        next(err);
      }
    },
  );

  /**
   * GET /document-scans/:jobId/results — get scan results
   */
  router.get(
    '/:jobId/results',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const { severity, category } = req.query;

        const jobId = req.params.jobId;
        if (!jobId || !UUID_RE.test(jobId)) {
          sendProblem(res, 400, 'validation-error', 'Invalid job ID format');
          return;
        }

        const [job] = await db
          .select({ status: documentScanJobs.status })
          .from(documentScanJobs)
          .where(and(eq(documentScanJobs.id, jobId), eq(documentScanJobs.organisationId, orgId)))
          .limit(1);

        if (!job) {
          sendProblem(res, 404, 'not-found', 'Scan job not found');
          return;
        }

        if (job.status !== 'completed') {
          sendProblem(res, 409, 'conflict', 'Scan not yet complete', undefined, {
            status: job.status,
            hint: 'Poll the /status endpoint until status is "completed"',
          });
          return;
        }

        const [results] = await db
          .select()
          .from(documentScanResults)
          .where(eq(documentScanResults.jobId, jobId))
          .limit(1);

        if (!results) {
          sendProblem(res, 404, 'not-found', 'Results not found');
          return;
        }

        type ViolationRow = { severity?: string; category?: string };
        let violations = (results.violations as ViolationRow[]) ?? [];
        if (typeof severity === 'string') {
          violations = violations.filter((v) => v.severity === severity);
        }
        if (typeof category === 'string') {
          violations = violations.filter((v) => v.category === category);
        }

        const response: ApiResponse<ReturnType<typeof serializeScanResults>> = {
          data: serializeScanResults(results, violations),
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * DELETE /document-scans/:jobId — delete scan job and stored file
   */
  router.delete(
    '/:jobId',
    requireRoles('customer_admin', 'accessibility_officer', 'developer'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const orgId = req.user!.org_id;
        const jobId = req.params.jobId;

        if (!jobId || !UUID_RE.test(jobId)) {
          sendProblem(res, 400, 'validation-error', 'Invalid job ID format');
          return;
        }

        const [job] = await db
          .select({ s3Key: documentScanJobs.s3Key })
          .from(documentScanJobs)
          .where(and(eq(documentScanJobs.id, jobId), eq(documentScanJobs.organisationId, orgId)))
          .limit(1);

        if (!job) {
          sendProblem(res, 404, 'not-found', 'Scan job not found');
          return;
        }

        if (job.s3Key) {
          await deleteDocument(job.s3Key).catch((err) =>
            logger.warn({ err, s3Key: job.s3Key }, 'Storage deletion failed'),
          );
        }

        await db
          .delete(documentScanJobs)
          .where(and(eq(documentScanJobs.id, jobId), eq(documentScanJobs.organisationId, orgId)));

        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
