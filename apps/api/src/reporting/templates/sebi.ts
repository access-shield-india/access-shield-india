/**
 * SEBI Accessibility Compliance Report Template
 *
 * Generates a compliance report for SEBI-regulated entities (stock brokers,
 * AMCs, depositories, investment advisers) per SEBI's 2024 accessibility
 * circular mandating WCAG 2.1 Level AA conformance.
 */

import Handlebars from 'handlebars';
import type { ReportTemplateData } from '../types';
import { REPORT_BASE_CSS } from './base-styles';

/** SEBI report specific styles */
const SEBI_CSS = `
  ${REPORT_BASE_CSS}

  .sebi-header {
    background: linear-gradient(135deg, #0D2E5A 0%, #1A56A0 100%);
    color: #FFFFFF;
    padding: 24pt;
    margin: -20pt -20pt 24pt -20pt;
  }

  .sebi-title {
    font-size: 20pt;
    font-weight: 700;
    margin-bottom: 8pt;
  }

  .sebi-subtitle {
    font-size: 11pt;
    opacity: 0.9;
  }

  .regulatory-context {
    background-color: #F4F8FD;
    border: 1px solid #EBF3FB;
    border-left: 4px solid #1A56A0;
    padding: 16pt;
    margin: 16pt 0;
  }

  .auditor-credential {
    background-color: #E6F4EC;
    border: 1px solid #86EFAC;
    border-radius: 6px;
    padding: 12pt 16pt;
    margin: 16pt 0;
  }

  .auditor-label {
    font-size: 9pt;
    color: #1A6B3C;
    text-transform: uppercase;
    font-weight: 600;
    margin-bottom: 4pt;
  }

  .functional-area-status {
    display: inline-flex;
    align-items: center;
    gap: 6pt;
    padding: 4pt 10pt;
    border-radius: 4px;
    font-size: 10pt;
    font-weight: 500;
  }

  .status-pass {
    background-color: #E6F4EC;
    color: #1A6B3C;
    border: 1px solid #86EFAC;
  }

  .status-fail {
    background-color: #FEE2E2;
    color: #991B1B;
    border: 1px solid #FCA5A5;
  }

  .status-na {
    background-color: #F3F4F6;
    color: #6B7280;
    border: 1px solid #D1D5DB;
  }

  .wcag-check-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12pt 0;
    border-bottom: 1px solid #E5E7EB;
  }

  .wcag-check-row:last-child {
    border-bottom: none;
  }

  .declaration-block {
    background-color: #FFFFFF;
    border: 2px solid #1A56A0;
    padding: 20pt;
    margin: 24pt 0;
  }

  .declaration-title {
    font-size: 14pt;
    font-weight: 700;
    color: #1A56A0;
    margin-bottom: 12pt;
    text-align: center;
  }

  .compliance-signature {
    margin-top: 32pt;
    border-top: 1px solid #D1D5DB;
    padding-top: 16pt;
  }

  .signature-field {
    display: flex;
    justify-content: space-between;
    margin-top: 24pt;
  }

  .signature-item {
    width: 45%;
  }

  .signature-line-sebi {
    border-bottom: 1px solid #1A1A2E;
    min-height: 32pt;
    margin-bottom: 4pt;
  }

  .signature-label-sebi {
    font-size: 9pt;
    color: #6B7280;
  }
`;

/** SEBI functional areas for assessment */
const SEBI_FUNCTIONAL_AREAS = [
  {
    name: 'Login & Authentication',
    keywords: ['login', 'auth', 'password', 'form', 'input', 'credential'],
  },
  {
    name: 'Portfolio & Holdings Display',
    keywords: ['table', 'data', 'grid', 'list', 'portfolio', 'holding'],
  },
  {
    name: 'Trading & Order Placement',
    keywords: ['button', 'click', 'submit', 'order', 'trade', 'interactive'],
  },
  {
    name: 'Fund Transfer Workflows',
    keywords: ['modal', 'dialog', 'form', 'transfer', 'payment', 'step'],
  },
  {
    name: 'Statements & Document Access',
    keywords: ['pdf', 'document', 'download', 'statement', 'report'],
  },
  {
    name: 'Customer Support & Grievance',
    keywords: ['contact', 'support', 'help', 'form', 'feedback', 'grievance'],
  },
];

/** WCAG criteria for specific SEBI checks */
const KEYBOARD_CRITERIA = ['2.1.1', '2.1.2', '2.1.4'];
const SCREEN_READER_CRITERIA = ['1.1.1', '1.3.1', '4.1.2', '4.1.3'];
const CONTRAST_CRITERIA = ['1.4.3', '1.4.11', '1.4.6'];

/** Handlebars helper for severity class */
Handlebars.registerHelper('severityClass', function (severity: string) {
  return `severity-${severity}`;
});

const SEBI_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEBI Accessibility Compliance Report - {{organisation.name}}</title>
  <style>${SEBI_CSS}</style>
</head>
<body>

<!-- PAGE 1: Cover -->
<div class="sebi-header">
  <div class="sebi-title">SEBI Digital Accessibility Compliance Report</div>
  <div class="sebi-subtitle">Pursuant to SEBI Circular on Accessibility of Digital Platforms (2024)</div>
</div>

<table style="width: 100%;">
  <tr>
    <td style="width: 35%; font-weight: 600; border: none; padding: 8pt 0;">Regulated Entity:</td>
    <td style="border: none; padding: 8pt 0;">{{organisation.name}}</td>
  </tr>
  {{#if organisation.gstin}}
  <tr>
    <td style="width: 35%; font-weight: 600; border: none; padding: 8pt 0;">GSTIN:</td>
    <td style="border: none; padding: 8pt 0;">{{organisation.gstin}}</td>
  </tr>
  {{/if}}
  <tr>
    <td style="width: 35%; font-weight: 600; border: none; padding: 8pt 0;">Digital Platform:</td>
    <td style="border: none; padding: 8pt 0;">{{asset.name}}</td>
  </tr>
  <tr>
    <td style="width: 35%; font-weight: 600; border: none; padding: 8pt 0;">Platform URL:</td>
    <td style="border: none; padding: 8pt 0; word-break: break-all;">{{asset.url}}</td>
  </tr>
  <tr>
    <td style="width: 35%; font-weight: 600; border: none; padding: 8pt 0;">Assessment Period:</td>
    <td style="border: none; padding: 8pt 0;">{{scan.completedAt}}</td>
  </tr>
  <tr>
    <td style="width: 35%; font-weight: 600; border: none; padding: 8pt 0;">Report Generated:</td>
    <td style="border: none; padding: 8pt 0;">{{generatedAt}} IST</td>
  </tr>
</table>

<div style="margin-top: 32pt;">
  <div class="kpi-grid">
    <div class="kpi-box" style="background-color: #F4F8FD; border: 1px solid #1A56A0;">
      <div class="kpi-number" style="color: #1A56A0;">{{scan.score}}</div>
      <div class="kpi-label" style="color: #1A56A0;">Accessibility Score</div>
    </div>
    <div class="kpi-box kpi-box-critical">
      <div class="kpi-number">{{scan.criticalCount}}</div>
      <div class="kpi-label">Critical</div>
    </div>
    <div class="kpi-box kpi-box-serious">
      <div class="kpi-number">{{scan.seriousCount}}</div>
      <div class="kpi-label">Serious</div>
    </div>
    <div class="kpi-box kpi-box-moderate">
      <div class="kpi-number">{{totalModerateMinor}}</div>
      <div class="kpi-label">Other</div>
    </div>
  </div>
</div>

<div class="page-break"></div>

<!-- PAGE 2: Regulatory Context -->
<h1>Regulatory Context</h1>

<div class="regulatory-context">
  <p>
    This report has been prepared to evidence <strong>{{organisation.name}}</strong>'s compliance 
    with SEBI's accessibility requirements for digital platforms used by investors, mandating 
    <strong>WCAG 2.1 Level AA</strong> conformance assessed by an IAAP-certified accessibility 
    professional, with annual re-assessment.
  </p>
</div>

{{#if auditorSignOff}}
<div class="auditor-credential">
  <div class="auditor-label">IAAP-Certified Accessibility Professional</div>
  <p style="margin: 0;">
    <strong>Assessment reviewed by:</strong> {{auditorSignOff.name}}<br>
    <strong>IAAP Certification ID:</strong> {{auditorSignOff.certId}}<br>
    <strong>Review Date:</strong> {{auditorSignOff.date}}
  </p>
</div>
{{else}}
<div class="auditor-credential" style="background-color: #FEF3C7; border-color: #FCD34D;">
  <div class="auditor-label" style="color: #92400E;">Auditor Credential Pending</div>
  <p style="margin: 0; color: #92400E;">
    <strong>Assessment reviewed by:</strong> [IAAP-certified professional name to be added]<br>
    <strong>IAAP Certification ID:</strong> [Certification ID to be added]<br>
    <strong>Review Date:</strong> [Date to be added]
  </p>
</div>
{{/if}}

<h2>Applicable Standards</h2>
<ul>
  <li><strong>WCAG 2.1 Level AA</strong> — Web Content Accessibility Guidelines</li>
  <li><strong>IS 17802:2021</strong> — Indian Standard for ICT Accessibility</li>
  <li><strong>SEBI Circular 2024</strong> — Accessibility of Digital Platforms for Investors</li>
</ul>

<div class="page-break"></div>

<!-- PAGE 3: Critical Functional Areas Assessment -->
<h1>Critical Functional Areas Assessment</h1>

<p>
  SEBI's circular emphasises specific functional areas critical to investor interactions. 
  The following table assesses each area based on accessibility violations identified.
</p>

<table>
  <thead>
    <tr>
      <th style="width: 35%;">Functional Area</th>
      <th style="width: 25%;">Status</th>
      <th style="width: 40%;">Notes</th>
    </tr>
  </thead>
  <tbody>
    {{#each functionalAreas}}
    <tr>
      <td><strong>{{name}}</strong></td>
      <td>
        <span class="functional-area-status {{statusClass}}">
          {{#if (eq status 'pass')}}✓{{/if}}
          {{#if (eq status 'fail')}}✗{{/if}}
          {{#if (eq status 'na')}}—{{/if}}
          {{statusText}}
        </span>
      </td>
      <td style="font-size: 10pt;">{{notes}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>

<div class="page-break"></div>

<!-- PAGE 4: Keyboard & Screen Reader Compatibility -->
<h1>Keyboard & Screen Reader Compatibility</h1>

<p>
  The following checks represent SEBI-emphasised accessibility requirements for financial platforms:
</p>

<div style="background-color: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 6px; padding: 16pt; margin: 16pt 0;">
  <div class="wcag-check-row">
    <div>
      <strong>Keyboard Navigation</strong>
      <div style="font-size: 10pt; color: #6B7280;">WCAG 2.1.1, 2.1.2, 2.1.4</div>
    </div>
    <div style="text-align: right;">
      {{#if (gt keyboardIssues 0)}}
      <span class="functional-area-status status-fail">Assessed — {{keyboardIssues}} issues identified</span>
      {{else}}
      <span class="functional-area-status status-pass">Assessed — No issues identified</span>
      {{/if}}
    </div>
  </div>

  <div class="wcag-check-row">
    <div>
      <strong>Screen Reader Compatibility</strong>
      <div style="font-size: 10pt; color: #6B7280;">WCAG 1.1.1, 1.3.1, 4.1.2, 4.1.3</div>
    </div>
    <div style="text-align: right;">
      {{#if (gt screenReaderIssues 0)}}
      <span class="functional-area-status status-fail">Assessed — {{screenReaderIssues}} issues identified</span>
      {{else}}
      <span class="functional-area-status status-pass">Assessed — No issues identified</span>
      {{/if}}
    </div>
  </div>

  <div class="wcag-check-row">
    <div>
      <strong>Colour Contrast on Financial Data</strong>
      <div style="font-size: 10pt; color: #6B7280;">WCAG 1.4.3, 1.4.11, 1.4.6</div>
    </div>
    <div style="text-align: right;">
      {{#if (gt contrastIssues 0)}}
      <span class="functional-area-status status-fail">Assessed — {{contrastIssues}} issues identified</span>
      {{else}}
      <span class="functional-area-status status-pass">Assessed — No issues identified</span>
      {{/if}}
    </div>
  </div>
</div>

<div class="page-break"></div>

<!-- PAGE 5: Annual Compliance Declaration -->
<h1>Annual Compliance Declaration</h1>

<div class="declaration-block">
  <div class="declaration-title">SEBI Accessibility Compliance Declaration</div>
  
  <p>
    I/We confirm that <strong>{{organisation.name}}</strong>'s digital platform at 
    <strong>{{asset.url}}</strong> has been assessed for accessibility in accordance with 
    SEBI's circular dated [circular date].
  </p>
  
  <p>
    The assessment was conducted on <strong>{{scan.completedAt}}</strong> and identified the 
    issues summarised in this report. A remediation plan has been / will be implemented for 
    identified issues.
  </p>

  <div class="compliance-signature">
    <div class="signature-field">
      <div class="signature-item">
        <div class="signature-line-sebi"></div>
        <div class="signature-label-sebi">Compliance Officer Name</div>
      </div>
      <div class="signature-item">
        <div class="signature-line-sebi"></div>
        <div class="signature-label-sebi">Designation</div>
      </div>
    </div>
    <div class="signature-field">
      <div class="signature-item">
        <div class="signature-line-sebi"></div>
        <div class="signature-label-sebi">Signature</div>
      </div>
      <div class="signature-item">
        <div class="signature-line-sebi"></div>
        <div class="signature-label-sebi">Date</div>
      </div>
    </div>
  </div>
</div>

<div class="page-break"></div>

<!-- PAGE 6: Detailed Findings Appendix -->
<h1>Detailed Findings Appendix</h1>

<p>
  The following table lists critical and serious accessibility violations identified during 
  the assessment. For complete findings including moderate and minor issues, see the 
  accompanying Technical Report.
</p>

{{#if criticalSeriousViolations.length}}
<table>
  <thead>
    <tr>
      <th style="width: 15%;">Severity</th>
      <th style="width: 15%;">Criterion</th>
      <th style="width: 40%;">Description</th>
      <th style="width: 30%;">Page</th>
    </tr>
  </thead>
  <tbody>
    {{#each criticalSeriousViolations}}
    <tr>
      <td><span class="severity-badge {{severityClass severity}}">{{severity}}</span></td>
      <td>{{wcagCriterion}}</td>
      <td style="font-size: 10pt;">{{description}}</td>
      <td style="font-size: 9pt; word-break: break-all;">{{pageUrl}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
{{else}}
<div style="background-color: #E6F4EC; border: 1px solid #86EFAC; border-radius: 6px; padding: 16pt; text-align: center;">
  <p style="margin: 0; color: #1A6B3C; font-weight: 600;">
    No critical or serious accessibility violations identified.
  </p>
</div>
{{/if}}

<p style="font-size: 10pt; color: #6B7280; margin-top: 16pt;">
  <strong>Note:</strong> For comprehensive technical details, remediation guidance, and complete 
  violation listings, refer to the Technical Report generated alongside this SEBI compliance report.
</p>

<div class="report-footer">
  <p>
    Report Reference: SEBI-{{reportRef}}<br>
    Generated by AccessShield India on {{generatedAt}} IST
  </p>
  <p>
    © 2026 AccessShield India. All rights reserved.
  </p>
</div>

</body>
</html>
`;

/** Handlebars equality helper */
Handlebars.registerHelper('eq', function (a: unknown, b: unknown) {
  return a === b;
});

/** Handlebars greater than helper */
Handlebars.registerHelper('gt', function (a: number, b: number) {
  return a > b;
});

/**
 * Assess functional areas based on violations
 */
function assessFunctionalAreas(
  data: ReportTemplateData,
): Array<{
  name: string;
  status: 'pass' | 'fail' | 'na';
  statusClass: string;
  statusText: string;
  notes: string;
}> {
  return SEBI_FUNCTIONAL_AREAS.map((area) => {
    const relatedViolations = data.violations.filter((v) => {
      const desc = v.description.toLowerCase();
      const element = v.elementType.toLowerCase();
      return area.keywords.some((kw) => desc.includes(kw) || element.includes(kw));
    });

    const criticalSerious = relatedViolations.filter(
      (v) => v.severity === 'critical' || v.severity === 'serious',
    );

    if (relatedViolations.length === 0) {
      return {
        name: area.name,
        status: 'na' as const,
        statusClass: 'status-na',
        statusText: 'No issues identified',
        notes: 'No accessibility issues detected in this functional area.',
      };
    }

    if (criticalSerious.length === 0) {
      return {
        name: area.name,
        status: 'pass' as const,
        statusClass: 'status-pass',
        statusText: 'Pass',
        notes: `${relatedViolations.length} minor issue(s) identified; no critical barriers.`,
      };
    }

    return {
      name: area.name,
      status: 'fail' as const,
      statusClass: 'status-fail',
      statusText: 'Issues Found',
      notes: `${criticalSerious.length} critical/serious issue(s) requiring remediation.`,
    };
  });
}

/**
 * Count violations by WCAG criteria groups
 */
function countByCriteria(data: ReportTemplateData, criteria: string[]): number {
  return data.violations.filter((v) => criteria.some((c) => v.wcagCriterion.startsWith(c))).length;
}

/**
 * Get critical and serious violations for appendix
 */
function getCriticalSeriousViolations(
  data: ReportTemplateData,
): Array<{ severity: string; wcagCriterion: string; description: string; pageUrl: string }> {
  return data.violations
    .filter((v) => v.severity === 'critical' || v.severity === 'serious')
    .slice(0, 20)
    .map((v) => ({
      severity: v.severity,
      wcagCriterion: v.wcagCriterion,
      description:
        v.description.length > 80 ? v.description.substring(0, 80) + '...' : v.description,
      pageUrl: v.pageUrl.length > 50 ? v.pageUrl.substring(0, 50) + '...' : v.pageUrl,
    }));
}

/**
 * Render the SEBI Accessibility Compliance report template.
 *
 * @param data - Complete report template data
 * @returns Rendered HTML string
 */
export function renderSebiTemplate(data: ReportTemplateData): string {
  const functionalAreas = assessFunctionalAreas(data);
  const keyboardIssues = countByCriteria(data, KEYBOARD_CRITERIA);
  const screenReaderIssues = countByCriteria(data, SCREEN_READER_CRITERIA);
  const contrastIssues = countByCriteria(data, CONTRAST_CRITERIA);
  const criticalSeriousViolations = getCriticalSeriousViolations(data);

  const templateData = {
    ...data,
    totalModerateMinor: data.scan.moderateCount + data.scan.minorCount,
    functionalAreas,
    keyboardIssues,
    screenReaderIssues,
    contrastIssues,
    criticalSeriousViolations,
    reportRef: `${data.scan.id.substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
  };

  const template = Handlebars.compile(SEBI_TEMPLATE);
  return template(templateData);
}
