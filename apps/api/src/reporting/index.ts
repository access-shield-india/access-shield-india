/**
 * Reporting Module
 *
 * Exports the reporting router and utilities for generating
 * professional PDF/HTML accessibility compliance reports.
 */

export { createReportingRouter } from './orchestrator';
export { fetchReportData, formatIndianDate, formatIndianDateTime } from './data-fetcher';
export { formatReportOrgName, isInternalOrgName, REPORT_BRAND_NAME } from './report-org-name';
export { generatePdf, generatePdfWithTitle } from './pdf-generator';
export { getSignedReportUrl, uploadHtmlReportToS3, uploadReportToS3 } from './s3-upload';
export type {
  ConformanceLevel,
  CriterionConformance,
  GenerateReportParams,
  PdfGenerationOptions,
  ReportAsset,
  ReportFormat,
  ReportOrganisation,
  ReportRecord,
  ReportScan,
  ReportTemplateData,
  ReportType,
  S3UploadResult,
  ScanTrendPoint,
  ViolationSummary,
  WidgetUsageForReport,
} from './types';
