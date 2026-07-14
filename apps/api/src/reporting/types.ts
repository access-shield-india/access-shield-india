/**
 * Reporting Module Types
 *
 * Type definitions for the AccessShield India Reporting Engine.
 * Generates professional PDF/HTML compliance reports from scan data.
 */

import type { IssueSeverity } from '@accessshield/types';

/** Supported report types */
export type ReportType =
  | 'executive'
  | 'technical'
  | 'wcag_compliance'
  | 'legal_rpwd'
  | 'accessibility_statement'
  | 'sebi';

/** Report output format */
export type ReportFormat = 'pdf' | 'html';

/** Parameters required to generate a report */
export interface GenerateReportParams {
  organisationId: string;
  scanId: string;
  assetId: string;
  reportType: ReportType;
  format: ReportFormat;
  /** User ID who triggered generation */
  generatedBy: string;
}

/** Organisation data for report header */
export interface ReportOrganisation {
  name: string;
  logoUrl: string | null;
  gstin: string | null;
}

/** Asset metadata for report */
export interface ReportAsset {
  name: string;
  url: string;
  standards: string[];
}

/** Scan summary data for report */
export interface ReportScan {
  id: string;
  /** Formatted DD/MM/YYYY per IS 17802 IS-004 */
  completedAt: string;
  score: number;
  /** Positive = improvement, negative = decline, null = first scan */
  scoreDelta: number | null;
  pagesScanned: number;
  criticalCount: number;
  seriousCount: number;
  moderateCount: number;
  minorCount: number;
}

/** Single violation for report display */
export interface ViolationSummary {
  wcagCriterion: string;
  wcagLevel: string;
  standard: string;
  severity: IssueSeverity;
  description: string;
  pageUrl: string;
  elementType: string;
  elementHtml: string | null;
  elementSelector: string | null;
  screenshotUrl: string | null;
  aiFix: string | null;
  aiExplanation: string | null;
  helpUrl: string | null;
}

/** Historical scan data point for trend charts */
export interface ScanTrendPoint {
  /** Formatted DD/MM/YYYY */
  date: string;
  score: number;
}

/** Auditor sign-off data for SEBI and formal compliance reports */
export interface AuditorSignOff {
  name: string;
  certId: string;
  date: string;
}

/** Complete data structure for report template rendering */
export interface ReportTemplateData {
  organisation: ReportOrganisation;
  asset: ReportAsset;
  scan: ReportScan;
  violations: ViolationSummary[];
  /** Last 5 scans for trend visualization */
  previousScans: ScanTrendPoint[];
  /** Formatted DD/MM/YYYY HH:mm IST */
  generatedAt: string;
  /** User full name who generated the report */
  generatedBy: string;
  /** Report type for template selection */
  reportType: ReportType;
  /** Auditor sign-off for SEBI and formal compliance reports */
  auditorSignOff?: AuditorSignOff;
}

/** Puppeteer PDF generation options */
export interface PdfGenerationOptions {
  headerHtml?: string;
  footerHtml?: string;
}

/** S3 upload result */
export interface S3UploadResult {
  s3Key: string;
  signedUrl: string;
}

/** Report database record */
export interface ReportRecord {
  id: string;
  organisationId: string;
  scanId: string;
  assetId: string;
  type: ReportType;
  format: ReportFormat;
  title: string;
  storagePath: string;
  fileSizeBytes: number;
  generatedBy: string;
  createdAt: string;
}

/** VPAT conformance levels per WCAG 2.2 Section 508 */
export type ConformanceLevel =
  | 'Supports'
  | 'Partially Supports'
  | 'Does Not Support'
  | 'Not Applicable';

/** WCAG criterion conformance status for VPAT report */
export interface CriterionConformance {
  criterion: string;
  level: 'A' | 'AA';
  title: string;
  conformance: ConformanceLevel;
  remarks: string;
}
