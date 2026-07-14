/**
 * Document Scanner Report Template
 *
 * PDF report for PDF/DOCX/PPTX/XLSX accessibility scan results.
 */

import Handlebars from 'handlebars';
import { REPORT_BASE_CSS } from './base-styles';

export interface DocumentScanViolation {
  violation_id: string;
  checkpoint_id: string;
  standard: string;
  severity: string;
  category: string;
  description: string;
  location: string;
  impact: string;
  remediation: string;
  wcag_criterion?: string | null;
}

export interface DocumentScanReportData {
  organisationName: string;
  documentName: string;
  documentType: string;
  complianceScore: number;
  totalViolations: number;
  criticalCount: number;
  seriousCount: number;
  moderateCount: number;
  minorCount: number;
  aiSummary: string;
  scanDurationSeconds: number;
  scannedAt: string;
  generatedAt: string;
  standards: string[];
  violations: DocumentScanViolation[];
  gigwCheckpoints: Array<{ id: string; status: string; count: number }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  alt_text: 'Alt Text',
  heading_structure: 'Headings',
  colour_contrast: 'Colour Contrast',
  reading_order: 'Reading Order',
  table_structure: 'Tables',
  metadata: 'Metadata',
  language: 'Language',
  link_text: 'Links',
  form_fields: 'Forms',
  scanned_document: 'Scanned PDF',
  animation_timing: 'Animations',
  slide_titles: 'Slide Titles',
  readability: 'Readability',
  pdf_structure: 'PDF Structure',
  tagging: 'Tagging',
};

Handlebars.registerHelper('severityClass', function (severity: string) {
  return `severity-${severity}`;
});

Handlebars.registerHelper('categoryLabel', function (category: string) {
  return CATEGORY_LABELS[category] ?? category;
});

Handlebars.registerHelper('escapeHtml', function (text: string | null) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
});

const DOCUMENT_SCAN_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Accessibility Report - {{documentName}}</title>
  <style>${REPORT_BASE_CSS}</style>
</head>
<body>

<div class="cover-page">
  <div style="color: #1A56A0; font-size: 14pt; font-weight: 600; margin-bottom: 16pt;">
    AccessShield India
  </div>
  <h1 class="cover-title">Document Accessibility Report</h1>
  <p class="cover-subtitle">{{documentType}} · {{documentName}}</p>

  <div style="margin: 32pt 0;">
    <p class="cover-org-name">{{organisationName}}</p>
  </div>

  <div class="standards-row" style="justify-content: center;">
    {{#each standards}}
    <span class="standard-pill">{{this}}</span>
    {{/each}}
  </div>

  <div style="margin: 24pt 0; text-align: center;">
    <p style="font-size: 36pt; font-weight: 700; color: {{scoreColor}};">{{complianceScore}}</p>
    <p style="font-size: 11pt; color: #6B7280;">Compliance Score</p>
  </div>

  <table style="margin: 0 auto; width: 80%;">
    <thead>
      <tr>
        <th>Critical</th>
        <th>Serious</th>
        <th>Moderate</th>
        <th>Minor</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center;">{{criticalCount}}</td>
        <td style="text-align: center;">{{seriousCount}}</td>
        <td style="text-align: center;">{{moderateCount}}</td>
        <td style="text-align: center;">{{minorCount}}</td>
        <td style="text-align: center;"><strong>{{totalViolations}}</strong></td>
      </tr>
    </tbody>
  </table>

  <p class="cover-date" style="margin-top: 24pt;">
    Scanned: {{scannedAt}}<br>
    Duration: {{scanDurationSeconds}}s<br>
    Report Generated: {{generatedAt}}
  </p>

  <div class="cover-confidential">
    CONFIDENTIAL — Document accessibility assessment
  </div>
</div>

<div class="page-break"></div>

{{#if aiSummary}}
<h1>Executive Summary</h1>
<p style="white-space: pre-line;">{{escapeHtml aiSummary}}</p>
<div class="page-break"></div>
{{/if}}

{{#if gigwCheckpoints.length}}
<h1>GIGW Checkpoint Coverage</h1>
<table>
  <thead>
    <tr>
      <th>Checkpoint</th>
      <th>Status</th>
      <th>Issues</th>
    </tr>
  </thead>
  <tbody>
    {{#each gigwCheckpoints}}
    <tr>
      <td><code>{{id}}</code></td>
      <td style="text-transform: capitalize;">{{status}}</td>
      <td>{{count}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
<div class="page-break"></div>
{{/if}}

<h1>Violations ({{totalViolations}})</h1>

{{#if violations.length}}
{{#each violations}}
<div class="violation-card" style="margin-bottom: 16pt; padding: 12pt; border: 1px solid #D1D5DB; border-radius: 6pt;">
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8pt;">
    <strong>{{escapeHtml description}}</strong>
    <span class="severity-badge {{severityClass severity}}">{{severity}}</span>
  </div>
  <p style="font-size: 9pt; color: #6B7280; margin-bottom: 6pt;">
  {{#if wcag_criterion}}WCAG {{wcag_criterion}} · {{/if}}
  {{checkpoint_id}} · {{standard}} · {{categoryLabel category}}
  </p>
  {{#if location}}
  <p><strong>Location:</strong> {{escapeHtml location}}</p>
  {{/if}}
  {{#if impact}}
  <p><strong>Impact:</strong> {{escapeHtml impact}}</p>
  {{/if}}
  {{#if remediation}}
  <p><strong>Remediation:</strong> {{escapeHtml remediation}}</p>
  {{/if}}
</div>
{{/each}}
{{else}}
<blockquote class="callout-success">
  <strong>No Violations Found</strong><br>
  This document meets the assessed accessibility standards.
</blockquote>
{{/if}}

</body>
</html>
`;

const compiledTemplate = Handlebars.compile(DOCUMENT_SCAN_TEMPLATE);

function scoreColor(score: number): string {
  if (score >= 80) return '#1A6B3C';
  if (score >= 60) return '#E07B00';
  return '#8B1A1A';
}

/**
 * Render document scan report HTML for PDF generation.
 */
export function renderDocumentScanTemplate(data: DocumentScanReportData): string {
  return compiledTemplate({
    ...data,
    scoreColor: scoreColor(data.complianceScore),
  });
}
