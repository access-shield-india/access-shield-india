/**
 * Core report generation — used by HTTP orchestrator and report.generate worker.
 */

import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { assets, organisations, reports, type Database } from '@accessshield/db';
import type { Redis } from 'ioredis';
import { logger } from '../lib/logger';
import { fetchReportData } from './data-fetcher';
import { generatePdfWithTitle } from './pdf-generator';
import { getReportDownloadUrl, uploadHtmlReportToS3, uploadReportToS3 } from './s3-upload';
import { renderAccessibilityStatementTemplate } from './templates/accessibility-statement';
import { renderExecutiveTemplate } from './templates/executive';
import { renderLegalRpwdTemplate } from './templates/legal-rpwd';
import { renderSebiTemplate } from './templates/sebi';
import { renderTechnicalTemplate } from './templates/technical';
import { renderWcagComplianceTemplate } from './templates/wcag-compliance';
import type { ReportFormat, ReportType } from './types';
import { resolveWidgetUsageForReport } from './widget-usage';
import { consumeIncludeInNextReport } from '../lib/widget-analytics';

const REPORT_TITLES: Record<ReportType, string> = {
  executive: 'Executive Summary Report',
  technical: 'Technical Violations Report',
  wcag_compliance: 'WCAG 2.2 AA Conformance Report',
  legal_rpwd: 'RPwD Act Compliance Report',
  accessibility_statement: 'Accessibility Statement',
  sebi: 'SEBI Accessibility Compliance Report',
};

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

export interface GenerateAndStoreReportInput {
  orgId: string;
  scanId: string;
  assetId: string;
  reportType: ReportType;
  format?: ReportFormat;
  /** App users.id if known */
  generatedBy?: string | null;
  language?: 'en' | 'hi';
  widgetAnalytics?: boolean;
}

export interface GenerateAndStoreReportResult {
  reportId: string;
  title: string;
  format: string;
  storagePath: string;
  fileSizeBytes: number;
  downloadUrl: string;
  createdAt: string;
}

/**
 * Fetch scan data, render template, upload to S3/local, insert reports row.
 */
export async function generateAndStoreReport(
  db: Database,
  input: GenerateAndStoreReportInput,
  redis?: Redis,
): Promise<GenerateAndStoreReportResult> {
  const {
    orgId,
    scanId,
    assetId,
    reportType,
    format = 'pdf',
    generatedBy,
    language = 'en',
    widgetAnalytics,
  } = input;

  const [asset] = await db
    .select({ id: assets.id, name: assets.name })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.organisationId, orgId)))
    .limit(1);

  if (!asset) {
    throw new Error('Asset not found for report generation');
  }

  const [org] = await db
    .select({ billingEmail: organisations.billingEmail })
    .from(organisations)
    .where(eq(organisations.id, orgId))
    .limit(1);

  const reportData = await fetchReportData(
    db,
    orgId,
    scanId,
    assetId,
    reportType,
    generatedBy ?? 'system',
  );

  if (redis && (reportType === 'executive' || reportType === 'sebi')) {
    reportData.widgetUsage = await resolveWidgetUsageForReport(
      db,
      redis,
      orgId,
      widgetAnalytics,
    );
  }

  let html: string;
  if (reportType === 'accessibility_statement') {
    html = renderAccessibilityStatementTemplate(reportData, {
      language,
      grievanceOfficer: {
        name: 'Not configured',
        email: org?.billingEmail ?? 'contact@example.com',
        phone: 'Not configured',
      },
    });
  } else {
    const renderer = getTemplateRenderer(reportType);
    if (!renderer) {
      throw new Error(`No template renderer for ${reportType}`);
    }
    html = renderer(reportData);
  }

  const reportTitle = REPORT_TITLES[reportType] ?? 'Accessibility Report';
  const effectiveFormat: ReportFormat =
    reportType === 'accessibility_statement' && format !== 'pdf' ? 'html' : format;

  const tempReportId = randomUUID();
  let s3Key: string;
  let fileSizeBytes: number;

  if (effectiveFormat === 'html') {
    s3Key = await uploadHtmlReportToS3(html, orgId, tempReportId);
    fileSizeBytes = Buffer.byteLength(html, 'utf-8');
  } else {
    const pdfBuffer = await generatePdfWithTitle(html, reportTitle);
    s3Key = await uploadReportToS3(pdfBuffer, orgId, tempReportId, 'pdf');
    fileSizeBytes = pdfBuffer.length;
  }

  const [newReport] = await db
    .insert(reports)
    .values({
      organisationId: orgId,
      scanId,
      generatedBy: generatedBy ?? null,
      title: `${reportTitle} - ${asset.name}`,
      format: effectiveFormat,
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
    throw new Error('Failed to save report record');
  }

  let downloadUrl = '';
  try {
    downloadUrl = await getReportDownloadUrl(s3Key, newReport.id);
  } catch (err) {
    logger.warn({ err, s3Key }, 'Failed to generate download URL for report');
  }

  logger.info(
    { reportId: newReport.id, orgId, scanId, format: effectiveFormat, fileSizeBytes },
    'Report generated and stored',
  );

  if (redis && reportData.widgetUsage) {
    await consumeIncludeInNextReport(redis, orgId);
  }

  return {
    reportId: newReport.id,
    title: newReport.title,
    format: newReport.format,
    storagePath: s3Key,
    fileSizeBytes,
    downloadUrl,
    createdAt: newReport.createdAt,
  };
}
