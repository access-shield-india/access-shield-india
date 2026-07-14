/**
 * Reporting Orchestrator
 *
 * Express router for report generation endpoints.
 * Handles report creation, listing, and download with proper tenant isolation.
 */

import type { Database } from '@accessshield/db';
import { assets, organisations, reports, scans, users } from '@accessshield/db';
import type { ApiResponse, PaginationMeta } from '@accessshield/types';
import { and, count, desc, eq } from 'drizzle-orm';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { sendProblem } from '../lib/problem-details';
import { requireRoles } from '../middleware/rbac';
import { fetchReportData, InvalidStateError, NotFoundError } from './data-fetcher';
import { generatePdf, generatePdfWithTitle } from './pdf-generator';
import {
  getReportDownloadUrl,
  uploadHtmlReportToS3,
  uploadReportToS3,
  resolveLocalReportPath,
} from './s3-upload';
import { renderAccessibilityStatementTemplate } from './templates/accessibility-statement';
import { renderExecutiveTemplate } from './templates/executive';
import { renderLegalRpwdTemplate } from './templates/legal-rpwd';
import { renderSebiTemplate } from './templates/sebi';
import { renderTechnicalTemplate } from './templates/technical';
import { renderWcagComplianceTemplate } from './templates/wcag-compliance';
import type { ReportFormat, ReportType } from './types';

/** Plans that can generate SEBI reports */
const SEBI_ELIGIBLE_PLANS = ['regulatory_defense', 'enterprise', 'government'];

/** Zod schema for POST /reports request body */
const createReportSchema = z.object({
  scan_id: z.string().uuid('Invalid scan ID format'),
  asset_id: z.string().uuid('Invalid asset ID format'),
  report_type: z.enum([
    'executive',
    'technical',
    'wcag_compliance',
    'legal_rpwd',
    'accessibility_statement',
    'sebi',
  ]),
  format: z.enum(['pdf', 'html']).default('pdf'),
  /** Language for accessibility statement (default: en) */
  language: z.enum(['en', 'hi']).optional(),
});

/** Zod schema for GET /reports query params */
const listReportsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  asset_id: z.string().uuid().optional(),
  type: z
    .enum([
      'executive',
      'technical',
      'wcag_compliance',
      'legal_rpwd',
      'accessibility_statement',
      'sebi',
    ])
    .optional(),
});

/** Report titles for display */
const REPORT_TITLES: Record<ReportType, string> = {
  executive: 'Executive Summary Report',
  technical: 'Technical Violations Report',
  wcag_compliance: 'WCAG 2.2 AA Conformance Report',
  legal_rpwd: 'RPwD Act Compliance Report',
  accessibility_statement: 'Accessibility Statement',
  sebi: 'SEBI Accessibility Compliance Report',
};

/**
 * Get the appropriate template renderer for a report type.
 */
function getTemplateRenderer(
  reportType: ReportType,
): ((data: Parameters<typeof renderExecutiveTemplate>[0]) => string) | null {
  switch (reportType) {
    case 'executive':
      return renderExecutiveTemplate;
    case 'technical':
      return renderTechnicalTemplate;
    case 'wcag_compliance':
      return renderWcagComplianceTemplate;
    case 'legal_rpwd':
      return renderLegalRpwdTemplate;
    case 'sebi':
      return renderSebiTemplate;
    default:
      return null;
  }
}

/**
 * Check if report type is implemented.
 */
function isReportTypeImplemented(reportType: ReportType): boolean {
  return [
    'executive',
    'technical',
    'wcag_compliance',
    'legal_rpwd',
    'accessibility_statement',
    'sebi',
  ].includes(reportType);
}

/**
 * Create the reporting router with dependency injection for database.
 *
 * @param db - Drizzle database instance
 */
export function createReportingRouter(db: Database): ExpressRouter {
  const router = Router();

  /**
   * POST /reports - Generate a new report
   *
   * Creates a PDF or HTML report from scan data.
   * Validates ownership and plan limits before generation.
   */
  router.post(
    '/',
    requireRoles('customer_admin', 'accessibility_officer', 'auditor'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parseResult = createReportSchema.safeParse(req.body);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid request body', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const { scan_id, asset_id, report_type, format, language } = parseResult.data;
        const orgId = req.user!.org_id;
        const userId = req.user!.sub;

        if (!isReportTypeImplemented(report_type as ReportType)) {
          sendProblem(
            res,
            501,
            'not-implemented',
            'Report type not yet implemented',
            `The '${report_type}' report type will be available in a future release.`,
          );
          return;
        }

        const [scan] = await db
          .select({ id: scans.id, status: scans.status })
          .from(scans)
          .where(and(eq(scans.id, scan_id), eq(scans.organisationId, orgId)))
          .limit(1);

        if (!scan) {
          sendProblem(res, 404, 'not-found', 'Scan not found or access denied');
          return;
        }

        const [asset] = await db
          .select({ id: assets.id, name: assets.name })
          .from(assets)
          .where(and(eq(assets.id, asset_id), eq(assets.organisationId, orgId)))
          .limit(1);

        if (!asset) {
          sendProblem(res, 404, 'not-found', 'Asset not found or access denied');
          return;
        }

        // Fetch organisation data for plan check and accessibility statement
        const [org] = await db
          .select({
            planTier: organisations.planTier,
            billingEmail: organisations.billingEmail,
          })
          .from(organisations)
          .where(eq(organisations.id, orgId))
          .limit(1);

        if (report_type === 'sebi') {
          if (!org || !SEBI_ELIGIBLE_PLANS.includes(org.planTier)) {
            sendProblem(
              res,
              402,
              'payment-required',
              'SEBI reports require Enterprise or Government plan',
              'Upgrade your plan to generate SEBI compliance reports.',
              { upgrade_url: '/services' },
            );
            return;
          }
        }

        const [user] = await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.authUserId, userId), eq(users.organisationId, orgId)))
          .limit(1);

        const appUserId = user?.id;

        logger.info(
          { orgId, scanId: scan_id, assetId: asset_id, reportType: report_type, format },
          'Starting report generation',
        );

        let reportData;
        try {
          reportData = await fetchReportData(
            db,
            orgId,
            scan_id,
            asset_id,
            report_type as ReportType,
            appUserId ?? userId,
          );
        } catch (err) {
          if (err instanceof NotFoundError) {
            sendProblem(res, 404, 'not-found', err.message);
            return;
          }
          if (err instanceof InvalidStateError) {
            sendProblem(res, 400, 'invalid-state', err.message);
            return;
          }
          throw err;
        }

        // Handle accessibility_statement separately (uses different signature)
        let html: string;
        if (report_type === 'accessibility_statement') {
          html = renderAccessibilityStatementTemplate(reportData, {
            language: language ?? 'en',
            grievanceOfficer: {
              name: 'Not configured',
              email: org?.billingEmail ?? 'contact@example.com',
              phone: 'Not configured',
            },
          });
        } else {
          const renderer = getTemplateRenderer(report_type as ReportType);
          if (!renderer) {
            sendProblem(res, 500, 'internal-error', 'Template renderer not available');
            return;
          }
          html = renderer(reportData);
        }

        const reportTitle = REPORT_TITLES[report_type as ReportType] ?? 'Accessibility Report';

        let s3Key: string;
        let fileSizeBytes: number;

        const tempReportId = crypto.randomUUID();

        // Accessibility statement defaults to HTML format (meant for embedding)
        const effectiveFormat =
          report_type === 'accessibility_statement' && format !== 'pdf' ? 'html' : format;

        try {
          if (effectiveFormat === 'html') {
            s3Key = await uploadHtmlReportToS3(html, orgId, tempReportId);
            fileSizeBytes = Buffer.byteLength(html, 'utf-8');
          } else {
            const pdfBuffer = await generatePdfWithTitle(html, reportTitle);
            s3Key = await uploadReportToS3(pdfBuffer, orgId, tempReportId, 'pdf');
            fileSizeBytes = pdfBuffer.length;
          }
        } catch (err) {
          logger.error({ err, orgId, scanId: scan_id }, 'Failed to generate or upload report');
          const detail =
            err instanceof Error ? err.message : 'An error occurred while generating the report.';
          sendProblem(res, 500, 'generation-error', 'Failed to generate report', detail);
          return;
        }

        const [newReport] = await db
          .insert(reports)
          .values({
            organisationId: orgId,
            scanId: scan_id,
            generatedBy: appUserId,
            title: `${reportTitle} - ${asset.name}`,
            format: effectiveFormat as ReportFormat,
            storagePath: s3Key,
            fileSizeBytes,
          })
          .returning({
            id: reports.id,
            title: reports.title,
            format: reports.format,
            createdAt: reports.createdAt,
          });

        if (!newReport) {
          sendProblem(res, 500, 'db-error', 'Failed to save report record');
          return;
        }

        let downloadUrl: string;
        try {
          downloadUrl = await getReportDownloadUrl(s3Key, newReport.id);
        } catch (err) {
          logger.warn({ err, s3Key }, 'Failed to generate download URL for new report');
          downloadUrl = '';
        }

        logger.info(
          { reportId: newReport.id, orgId, scanId: scan_id, format, fileSizeBytes },
          'Report generated successfully',
        );

        const response: ApiResponse<{
          reportId: string;
          title: string;
          format: string;
          downloadUrl: string;
          fileSizeBytes: number;
          createdAt: string;
        }> = {
          data: {
            reportId: newReport.id,
            title: newReport.title,
            format: newReport.format,
            downloadUrl,
            fileSizeBytes,
            createdAt: newReport.createdAt,
          },
          timestamp: new Date().toISOString(),
        };

        res.status(201).json(response);
      } catch (err) {
        logger.error({ err }, 'Unhandled error in report generation');
        next(err);
      }
    },
  );

  /**
   * GET /reports - List reports for organization
   *
   * Returns paginated list of reports with optional filters.
   */
  router.get(
    '/',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parseResult = listReportsSchema.safeParse(req.query);
        if (!parseResult.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid query parameters', undefined, {
            errors: parseResult.error.flatten().fieldErrors,
          });
          return;
        }

        const { page, limit, asset_id, type } = parseResult.data;
        const orgId = req.user!.org_id;
        const offset = (page - 1) * limit;

        const conditions = [eq(reports.organisationId, orgId)];

        if (asset_id) {
          const [scan] = await db
            .select({ id: scans.id })
            .from(scans)
            .where(and(eq(scans.assetId, asset_id), eq(scans.organisationId, orgId)))
            .limit(1);

          if (scan) {
            conditions.push(eq(reports.scanId, scan.id));
          }
        }

        const [totalResult] = await db
          .select({ count: count() })
          .from(reports)
          .where(and(...conditions));

        const total = totalResult?.count ?? 0;

        const reportRows = await db
          .select({
            id: reports.id,
            scanId: reports.scanId,
            title: reports.title,
            format: reports.format,
            storagePath: reports.storagePath,
            fileSizeBytes: reports.fileSizeBytes,
            createdAt: reports.createdAt,
          })
          .from(reports)
          .where(and(...conditions))
          .orderBy(desc(reports.createdAt))
          .limit(limit)
          .offset(offset);

        const meta: PaginationMeta = {
          page,
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        };

        const response: ApiResponse<typeof reportRows> = {
          data: reportRows,
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
   * GET /reports/:id - Get single report details
   */
  router.get(
    '/:id',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const reportId = req.params.id ?? '';
        const orgId = req.user!.org_id;

        if (!reportId || !z.string().uuid().safeParse(reportId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid report ID format');
          return;
        }

        const [report] = await db
          .select({
            id: reports.id,
            scanId: reports.scanId,
            title: reports.title,
            format: reports.format,
            storagePath: reports.storagePath,
            fileSizeBytes: reports.fileSizeBytes,
            createdAt: reports.createdAt,
          })
          .from(reports)
          .where(and(eq(reports.id, reportId), eq(reports.organisationId, orgId)))
          .limit(1);

        if (!report) {
          sendProblem(res, 404, 'not-found', 'Report not found');
          return;
        }

        const response: ApiResponse<typeof report> = {
          data: report,
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * GET /reports/:id/file - Stream locally stored report file (dev fallback)
   */
  router.get(
    '/:id/file',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const reportId = req.params.id ?? '';
        const orgId = req.user!.org_id;

        if (!reportId || !z.string().uuid().safeParse(reportId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid report ID format');
          return;
        }

        const [report] = await db
          .select({
            id: reports.id,
            storagePath: reports.storagePath,
            title: reports.title,
            format: reports.format,
          })
          .from(reports)
          .where(and(eq(reports.id, reportId), eq(reports.organisationId, orgId)))
          .limit(1);

        if (!report?.storagePath) {
          sendProblem(res, 404, 'not-found', 'Report file not available');
          return;
        }

        const filePath = resolveLocalReportPath(report.storagePath);
        if (!filePath) {
          sendProblem(
            res,
            404,
            'not-found',
            'Report file is stored remotely — use the download endpoint',
          );
          return;
        }

        const contentType = report.format === 'pdf' ? 'application/pdf' : 'text/html';
        const safeName = (report.title ?? 'report').replace(/[^\w.-]+/g, '_');

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${safeName}.${report.format}"`);

        const stream = (await import('fs')).createReadStream(filePath);
        stream.on('error', (err) => next(err));
        stream.pipe(res);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * GET /reports/:id/download - Get download URL for report
   *
   * Generates a fresh signed URL (15 min expiry).
   */
  router.get(
    '/:id/download',
    requireRoles('auditor', 'developer', 'accessibility_officer', 'customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const reportId = req.params.id ?? '';
        const orgId = req.user!.org_id;

        if (!reportId || !z.string().uuid().safeParse(reportId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid report ID format');
          return;
        }

        const [report] = await db
          .select({
            id: reports.id,
            storagePath: reports.storagePath,
            title: reports.title,
          })
          .from(reports)
          .where(and(eq(reports.id, reportId), eq(reports.organisationId, orgId)))
          .limit(1);

        if (!report) {
          sendProblem(res, 404, 'not-found', 'Report not found');
          return;
        }

        if (!report.storagePath) {
          sendProblem(res, 404, 'not-found', 'Report file not available');
          return;
        }

        let downloadUrl: string;
        try {
          downloadUrl = await getReportDownloadUrl(report.storagePath, report.id);
        } catch (err) {
          logger.error({ err, reportId }, 'Failed to generate signed URL');
          sendProblem(res, 500, 'internal-error', 'Failed to generate download URL');
          return;
        }

        const response: ApiResponse<{ downloadUrl: string; expiresIn: number }> = {
          data: {
            downloadUrl,
            expiresIn: 15 * 60,
          },
          timestamp: new Date().toISOString(),
        };

        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  /**
   * DELETE /reports/:id - Delete a report
   *
   * Hard deletes the report record. S3 object remains until cleanup.
   */
  router.delete(
    '/:id',
    requireRoles('customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const reportId = req.params.id ?? '';
        const orgId = req.user!.org_id;

        if (!reportId || !z.string().uuid().safeParse(reportId).success) {
          sendProblem(res, 400, 'validation-error', 'Invalid report ID format');
          return;
        }

        const [report] = await db
          .select({ id: reports.id })
          .from(reports)
          .where(and(eq(reports.id, reportId), eq(reports.organisationId, orgId)))
          .limit(1);

        if (!report) {
          sendProblem(res, 404, 'not-found', 'Report not found');
          return;
        }

        await db.delete(reports).where(eq(reports.id, reportId));

        logger.info({ reportId, orgId }, 'Report deleted');

        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

export default createReportingRouter;
