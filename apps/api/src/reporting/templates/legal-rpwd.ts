/**
 * RPwD Act 2016 Legal Compliance Report Template
 *
 * Generates a formal legal compliance evidence document under the
 * Rights of Persons with Disabilities Act 2016 for regulatory
 * submission or internal legal/compliance records.
 */

import Handlebars from 'handlebars';
import type { ReportTemplateData } from '../types';
import { REPORT_BASE_CSS } from './base-styles';

/** Legal document specific styles */
const LEGAL_CSS = `
  ${REPORT_BASE_CSS}

  body {
    font-family: 'Times New Roman', Georgia, serif;
  }

  h1, h2, h3 {
    font-family: Arial, Helvetica, sans-serif;
  }

  .legal-header {
    text-align: center;
    border-bottom: 2px solid #1A1A2E;
    padding-bottom: 16pt;
    margin-bottom: 24pt;
  }

  .legal-title {
    font-size: 18pt;
    font-weight: 700;
    color: #1A1A2E;
    margin-bottom: 8pt;
  }

  .legal-subtitle {
    font-size: 12pt;
    color: #374151;
  }

  .section-number {
    font-weight: 700;
    color: #1A56A0;
    margin-right: 8pt;
  }

  .statutory-block {
    background-color: #F9FAFB;
    border: 1px solid #D1D5DB;
    border-left: 4px solid #1A56A0;
    padding: 16pt;
    margin: 16pt 0;
    font-style: italic;
  }

  .assessment-outcome {
    font-weight: 600;
    padding: 4pt 12pt;
    border-radius: 4px;
    display: inline-block;
  }

  .outcome-compliant {
    background-color: #E6F4EC;
    color: #1A6B3C;
    border: 1px solid #86EFAC;
  }

  .outcome-partial {
    background-color: #FEF3C7;
    color: #92400E;
    border: 1px solid #FCD34D;
  }

  .outcome-non-compliant {
    background-color: #FEE2E2;
    color: #991B1B;
    border: 1px solid #FCA5A5;
  }

  .signature-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32pt;
    margin-top: 32pt;
  }

  .signature-block {
    border: 1px solid #D1D5DB;
    padding: 16pt;
  }

  .signature-line {
    border-bottom: 1px solid #1A1A2E;
    margin: 24pt 0 8pt 0;
    min-height: 40pt;
  }

  .signature-label {
    font-size: 10pt;
    color: #6B7280;
  }

  .remediation-table td:last-child {
    min-width: 150px;
    background-color: #F9FAFB;
  }

  .legal-disclaimer {
    margin-top: 32pt;
    padding: 12pt;
    background-color: #F3F4F6;
    border: 1px solid #D1D5DB;
    font-size: 9pt;
    color: #6B7280;
  }
`;

/** Handlebars helper for compliance assessment outcome */
Handlebars.registerHelper('rpwdOutcome', function (critical: number, serious: number) {
  if (critical === 0 && serious === 0) return 'Substantially Compliant';
  if (critical === 0) return 'Partially Compliant';
  return 'Non-Compliant — Remediation Required';
});

/** Handlebars helper for outcome CSS class */
Handlebars.registerHelper('rpwdOutcomeClass', function (critical: number, serious: number) {
  if (critical === 0 && serious === 0) return 'outcome-compliant';
  if (critical === 0) return 'outcome-partial';
  return 'outcome-non-compliant';
});

/** Handlebars helper for severity class */
Handlebars.registerHelper('severityClass', function (severity: string) {
  return `severity-${severity}`;
});

const LEGAL_RPWD_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RPwD Act 2016 Compliance Evidence - {{organisation.name}}</title>
  <style>${LEGAL_CSS}</style>
</head>
<body>

<!-- PAGE 1: Cover -->
<div class="cover-page" style="text-align: left; padding: 40pt;">
  <div class="legal-header">
    <div class="legal-title">RPwD Act 2016</div>
    <div class="legal-title">Digital Accessibility Compliance Evidence</div>
  </div>

  <table style="width: 100%; margin-top: 32pt;">
    <tr>
      <td style="width: 35%; font-weight: 600; border: none; padding: 8pt 0;">Organisation:</td>
      <td style="border: none; padding: 8pt 0;">{{organisation.name}}</td>
    </tr>
    {{#if organisation.gstin}}
    <tr>
      <td style="width: 35%; font-weight: 600; border: none; padding: 8pt 0;">GSTIN:</td>
      <td style="border: none; padding: 8pt 0;">{{organisation.gstin}}</td>
    </tr>
    {{/if}}
    <tr>
      <td style="width: 35%; font-weight: 600; border: none; padding: 8pt 0;">Digital Asset:</td>
      <td style="border: none; padding: 8pt 0;">{{asset.name}}</td>
    </tr>
    <tr>
      <td style="width: 35%; font-weight: 600; border: none; padding: 8pt 0;">Asset URL:</td>
      <td style="border: none; padding: 8pt 0; word-break: break-all;">{{asset.url}}</td>
    </tr>
    <tr>
      <td style="width: 35%; font-weight: 600; border: none; padding: 8pt 0;">Assessment Date:</td>
      <td style="border: none; padding: 8pt 0;">{{scan.completedAt}}</td>
    </tr>
    <tr>
      <td style="width: 35%; font-weight: 600; border: none; padding: 8pt 0;">Document Generated:</td>
      <td style="border: none; padding: 8pt 0;">{{generatedAt}} IST</td>
    </tr>
    <tr>
      <td style="width: 35%; font-weight: 600; border: none; padding: 8pt 0;">Document Reference:</td>
      <td style="border: none; padding: 8pt 0;">{{documentRef}}</td>
    </tr>
  </table>

  <div style="margin-top: 48pt; text-align: center;">
    <div style="font-size: 10pt; color: #6B7280;">
      This document is prepared in accordance with the accessibility assessment requirements<br>
      under the Rights of Persons with Disabilities Act, 2016 (No. 49 of 2016)
    </div>
  </div>
</div>

<div class="page-break"></div>

<!-- PAGE 2: Statutory Basis -->
<h1>Statutory Basis for Assessment</h1>

<h2><span class="section-number">1.</span>Applicability</h2>

<div class="statutory-block">
  Under the Rights of Persons with Disabilities Act, 2016 ('the Act'), Sections 40 through 46 
  establish obligations for accessible information and communication technology. This document 
  evidences <strong>{{organisation.name}}</strong>'s compliance assessment for the digital asset 
  located at <strong>{{asset.url}}</strong>.
</div>

<p>
  The Act mandates that establishments, both government and private, ensure accessibility of their 
  information and communication technology, including websites and web-based applications, to 
  persons with disabilities.
</p>

<h2><span class="section-number">2.</span>Technical Standard Applied</h2>

<div class="statutory-block">
  Assessment was conducted against <strong>IS 17802:2021</strong>, the Indian Standard for ICT 
  accessibility referenced under the Act's implementing rules, which incorporates 
  <strong>WCAG 2.2 Level AA</strong> as its technical baseline.
</div>

<p>
  IS 17802, published by the Bureau of Indian Standards (BIS), harmonises with international 
  accessibility standards while incorporating India-specific requirements including support for 
  Indian languages and regional date/number formats.
</p>

<h3>Standards Assessed:</h3>
<ul>
  {{#each asset.standards}}
  <li>{{this}}</li>
  {{/each}}
</ul>

<div class="page-break"></div>

<!-- PAGE 3: Compliance Assessment Summary -->
<h1>Compliance Assessment Summary</h1>

<table>
  <thead>
    <tr>
      <th style="width: 25%;">RPwD Section</th>
      <th style="width: 40%;">Requirement</th>
      <th style="width: 35%;">Assessment Outcome</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Section 40</strong></td>
      <td>General accessibility standards for digital content and services</td>
      <td>
        <span class="assessment-outcome {{rpwdOutcomeClass scan.criticalCount scan.seriousCount}}">
          {{rpwdOutcome scan.criticalCount scan.seriousCount}}
        </span>
      </td>
    </tr>
    <tr>
      <td><strong>Section 42</strong></td>
      <td>Accessible information formats (including PDF/document accessibility)</td>
      <td>
        <span class="assessment-outcome {{rpwdOutcomeClass documentCritical documentSerious}}">
          {{rpwdOutcome documentCritical documentSerious}}
        </span>
      </td>
    </tr>
    <tr>
      <td><strong>Section 46</strong></td>
      <td>ICT accessibility for services and overall digital platform compliance</td>
      <td>
        <span class="assessment-outcome {{rpwdOutcomeClass scan.criticalCount scan.seriousCount}}">
          {{rpwdOutcome scan.criticalCount scan.seriousCount}}
        </span>
      </td>
    </tr>
  </tbody>
</table>

<h2>Assessment Outcome Definitions</h2>

<table>
  <thead>
    <tr>
      <th style="width: 35%;">Outcome</th>
      <th style="width: 65%;">Definition</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><span class="assessment-outcome outcome-compliant">Substantially Compliant</span></td>
      <td>Zero critical or serious accessibility barriers identified. Minor issues may exist but do not significantly impede access.</td>
    </tr>
    <tr>
      <td><span class="assessment-outcome outcome-partial">Partially Compliant</span></td>
      <td>No critical barriers but one or more serious issues identified that may impede access for some users with disabilities.</td>
    </tr>
    <tr>
      <td><span class="assessment-outcome outcome-non-compliant">Non-Compliant — Remediation Required</span></td>
      <td>One or more critical accessibility barriers identified that completely block access for users with disabilities.</td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<!-- PAGE 4: Evidence of Assessment -->
<h1>Evidence of Assessment</h1>

<h2><span class="section-number">3.</span>Methodology</h2>

<p>
  The accessibility assessment was conducted using a combination of automated testing tools and 
  manual review procedures consistent with industry best practices for WCAG conformance testing. 
  Automated testing identifies programmatically detectable accessibility violations, while the 
  technical configuration allows for comprehensive coverage of testable success criteria.
</p>

<h2><span class="section-number">4.</span>Scan Details</h2>

<table>
  <thead>
    <tr>
      <th style="width: 40%;">Parameter</th>
      <th style="width: 60%;">Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Assessment Date</td>
      <td>{{scan.completedAt}}</td>
    </tr>
    <tr>
      <td>Pages Assessed</td>
      <td>{{scan.pagesScanned}} page(s)</td>
    </tr>
    <tr>
      <td>Testing Engine</td>
      <td>axe-core 4.9, Playwright/Chromium</td>
    </tr>
    <tr>
      <td>Rule Set</td>
      <td>IS 17802 custom rule set v1.0</td>
    </tr>
    <tr>
      <td>WCAG Version</td>
      <td>WCAG 2.2 Level AA</td>
    </tr>
    <tr>
      <td>Accessibility Score</td>
      <td><strong>{{scan.score}}/100</strong></td>
    </tr>
  </tbody>
</table>

<h2><span class="section-number">5.</span>Summary Violation Counts</h2>

<div class="kpi-grid">
  <div class="kpi-box kpi-box-critical">
    <div class="kpi-number">{{scan.criticalCount}}</div>
    <div class="kpi-label">Critical</div>
  </div>
  <div class="kpi-box kpi-box-serious">
    <div class="kpi-number">{{scan.seriousCount}}</div>
    <div class="kpi-label">Serious</div>
  </div>
  <div class="kpi-box kpi-box-moderate">
    <div class="kpi-number">{{scan.moderateCount}}</div>
    <div class="kpi-label">Moderate</div>
  </div>
  <div class="kpi-box kpi-box-minor">
    <div class="kpi-number">{{scan.minorCount}}</div>
    <div class="kpi-label">Minor</div>
  </div>
</div>

<p>
  <strong>Total Issues Identified:</strong> {{totalViolations}}
</p>

<div class="page-break"></div>

<!-- PAGE 5: Remediation Commitment -->
<h1>Remediation Commitment</h1>

<div class="statutory-block">
  <strong>{{organisation.name}}</strong> commits to remediating identified critical and serious 
  accessibility barriers within a reasonable timeframe consistent with the Act's accessibility 
  objectives.
</div>

{{#if criticalSeriousViolations.length}}
<h2>Critical and Serious Issues for Remediation</h2>

<table class="remediation-table">
  <thead>
    <tr>
      <th style="width: 15%;">Severity</th>
      <th style="width: 20%;">WCAG Criterion</th>
      <th style="width: 35%;">Description</th>
      <th style="width: 30%;">Target Remediation Date</th>
    </tr>
  </thead>
  <tbody>
    {{#each criticalSeriousViolations}}
    <tr>
      <td><span class="severity-badge {{severityClass severity}}">{{severity}}</span></td>
      <td>{{wcagCriterion}}</td>
      <td>{{description}}</td>
      <td style="font-style: italic; color: #6B7280;">[To be completed]</td>
    </tr>
    {{/each}}
  </tbody>
</table>
{{else}}
<p>
  <strong>No critical or serious issues identified.</strong> The assessed digital asset demonstrates 
  substantial compliance with accessibility requirements under the RPwD Act 2016.
</p>
{{/if}}

<div class="page-break"></div>

<!-- PAGE 6: Sign-off Block -->
<h1>Sign-off</h1>

<div class="signature-grid">
  <div class="signature-block">
    <h3 style="margin-top: 0;">Prepared by:</h3>
    <p><strong>AccessShield India</strong></p>
    <p style="font-size: 10pt; color: #6B7280;">
      Digital Accessibility Assessment Platform<br>
      WCAG 2.2 AA Compliant Testing Services
    </p>
    <div class="signature-line"></div>
    <div class="signature-label">Date: {{generatedAt}}</div>
  </div>

  <div class="signature-block">
    <h3 style="margin-top: 0;">Reviewed by:</h3>
    <p><strong>[Accessibility Officer Name]</strong></p>
    <p style="font-size: 10pt; color: #6B7280;">
      {{organisation.name}}<br>
      Accessibility Compliance Review
    </p>
    <div class="signature-line"></div>
    <div class="signature-label">Signature / Date</div>
  </div>
</div>

<div class="legal-disclaimer">
  <strong>Disclaimer:</strong> This document is an accessibility technical assessment. It is not a 
  legal opinion. Organisations should consult legal counsel regarding specific regulatory obligations 
  under the RPwD Act 2016. AccessShield India provides technical accessibility testing services and 
  does not provide legal advice. The assessment findings are based on automated and semi-automated 
  testing methodologies and may not identify all accessibility barriers that could be found through 
  comprehensive manual testing by certified accessibility professionals.
</div>

<div class="report-footer">
  <p>
    Document Reference: {{documentRef}}<br>
    Generated by AccessShield India on {{generatedAt}} IST
  </p>
  <p>
    © 2026 AccessShield India. All rights reserved.
  </p>
</div>

</body>
</html>
`;

/**
 * Get unique critical/serious violations for remediation table
 */
function getCriticalSeriousViolations(
  data: ReportTemplateData,
): Array<{ severity: string; wcagCriterion: string; description: string }> {
  const seen = new Set<string>();
  const result: Array<{ severity: string; wcagCriterion: string; description: string }> = [];

  for (const v of data.violations) {
    if (v.severity !== 'critical' && v.severity !== 'serious') continue;
    const key = `${v.wcagCriterion}:${v.severity}`;
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({
      severity: v.severity,
      wcagCriterion: v.wcagCriterion,
      description:
        v.description.length > 100 ? v.description.substring(0, 100) + '...' : v.description,
    });
  }

  const severityOrder = { critical: 0, serious: 1 };
  result.sort((a, b) => {
    const aSev = severityOrder[a.severity as keyof typeof severityOrder] ?? 2;
    const bSev = severityOrder[b.severity as keyof typeof severityOrder] ?? 2;
    return aSev - bSev;
  });

  return result.slice(0, 15);
}

/**
 * Count document/PDF related violations
 */
function countDocumentViolations(data: ReportTemplateData): { critical: number; serious: number } {
  const documentKeywords = ['pdf', 'document', 'download', 'file', 'attachment'];
  let critical = 0;
  let serious = 0;

  for (const v of data.violations) {
    const desc = v.description.toLowerCase();
    const element = v.elementType.toLowerCase();
    const isDocumentRelated =
      documentKeywords.some((kw) => desc.includes(kw)) ||
      element === 'embed' ||
      element === 'object' ||
      element === 'iframe';

    if (isDocumentRelated) {
      if (v.severity === 'critical') critical++;
      else if (v.severity === 'serious') serious++;
    }
  }

  return { critical, serious };
}

/**
 * Render the RPwD Act Legal Compliance report template.
 *
 * @param data - Complete report template data
 * @returns Rendered HTML string
 */
export function renderLegalRpwdTemplate(data: ReportTemplateData): string {
  const totalViolations =
    data.scan.criticalCount +
    data.scan.seriousCount +
    data.scan.moderateCount +
    data.scan.minorCount;

  const criticalSeriousViolations = getCriticalSeriousViolations(data);
  const documentViolations = countDocumentViolations(data);

  const templateData = {
    ...data,
    totalViolations,
    criticalSeriousViolations,
    documentCritical: documentViolations.critical,
    documentSerious: documentViolations.serious,
    documentRef: `RPWD-${data.scan.id.substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
  };

  const template = Handlebars.compile(LEGAL_RPWD_TEMPLATE);
  return template(templateData);
}
