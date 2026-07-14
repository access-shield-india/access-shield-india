/**
 * WCAG 2.2 Compliance Report Template (VPAT-style)
 *
 * Generates a criterion-by-criterion conformance report following
 * the Voluntary Product Accessibility Template (VPAT) format.
 */

import Handlebars from 'handlebars';
import type {
  ConformanceLevel,
  CriterionConformance,
  ReportTemplateData,
  ViolationSummary,
} from '../types';
import { REPORT_BASE_CSS } from './base-styles';
import { WCAG_CRITERION_TITLES } from './technical';

/** Complete list of WCAG 2.2 Level A and AA success criteria */
const WCAG_22_CRITERIA: Array<{ criterion: string; level: 'A' | 'AA'; title: string }> = [
  { criterion: '1.1.1', level: 'A', title: 'Non-text Content' },
  { criterion: '1.2.1', level: 'A', title: 'Audio-only and Video-only (Prerecorded)' },
  { criterion: '1.2.2', level: 'A', title: 'Captions (Prerecorded)' },
  { criterion: '1.2.3', level: 'A', title: 'Audio Description or Media Alternative (Prerecorded)' },
  { criterion: '1.2.4', level: 'AA', title: 'Captions (Live)' },
  { criterion: '1.2.5', level: 'AA', title: 'Audio Description (Prerecorded)' },
  { criterion: '1.3.1', level: 'A', title: 'Info and Relationships' },
  { criterion: '1.3.2', level: 'A', title: 'Meaningful Sequence' },
  { criterion: '1.3.3', level: 'A', title: 'Sensory Characteristics' },
  { criterion: '1.3.4', level: 'AA', title: 'Orientation' },
  { criterion: '1.3.5', level: 'AA', title: 'Identify Input Purpose' },
  { criterion: '1.4.1', level: 'A', title: 'Use of Color' },
  { criterion: '1.4.2', level: 'A', title: 'Audio Control' },
  { criterion: '1.4.3', level: 'AA', title: 'Contrast (Minimum)' },
  { criterion: '1.4.4', level: 'AA', title: 'Resize Text' },
  { criterion: '1.4.5', level: 'AA', title: 'Images of Text' },
  { criterion: '1.4.10', level: 'AA', title: 'Reflow' },
  { criterion: '1.4.11', level: 'AA', title: 'Non-text Contrast' },
  { criterion: '1.4.12', level: 'AA', title: 'Text Spacing' },
  { criterion: '1.4.13', level: 'AA', title: 'Content on Hover or Focus' },
  { criterion: '2.1.1', level: 'A', title: 'Keyboard' },
  { criterion: '2.1.2', level: 'A', title: 'No Keyboard Trap' },
  { criterion: '2.1.4', level: 'A', title: 'Character Key Shortcuts' },
  { criterion: '2.2.1', level: 'A', title: 'Timing Adjustable' },
  { criterion: '2.2.2', level: 'A', title: 'Pause, Stop, Hide' },
  { criterion: '2.3.1', level: 'A', title: 'Three Flashes or Below Threshold' },
  { criterion: '2.4.1', level: 'A', title: 'Bypass Blocks' },
  { criterion: '2.4.2', level: 'A', title: 'Page Titled' },
  { criterion: '2.4.3', level: 'A', title: 'Focus Order' },
  { criterion: '2.4.4', level: 'A', title: 'Link Purpose (In Context)' },
  { criterion: '2.4.5', level: 'AA', title: 'Multiple Ways' },
  { criterion: '2.4.6', level: 'AA', title: 'Headings and Labels' },
  { criterion: '2.4.7', level: 'AA', title: 'Focus Visible' },
  { criterion: '2.4.11', level: 'AA', title: 'Focus Not Obscured (Minimum)' },
  { criterion: '2.5.1', level: 'A', title: 'Pointer Gestures' },
  { criterion: '2.5.2', level: 'A', title: 'Pointer Cancellation' },
  { criterion: '2.5.3', level: 'A', title: 'Label in Name' },
  { criterion: '2.5.4', level: 'A', title: 'Motion Actuation' },
  { criterion: '2.5.7', level: 'AA', title: 'Dragging Movements' },
  { criterion: '2.5.8', level: 'AA', title: 'Target Size (Minimum)' },
  { criterion: '3.1.1', level: 'A', title: 'Language of Page' },
  { criterion: '3.1.2', level: 'AA', title: 'Language of Parts' },
  { criterion: '3.2.1', level: 'A', title: 'On Focus' },
  { criterion: '3.2.2', level: 'A', title: 'On Input' },
  { criterion: '3.2.3', level: 'AA', title: 'Consistent Navigation' },
  { criterion: '3.2.4', level: 'AA', title: 'Consistent Identification' },
  { criterion: '3.2.6', level: 'AA', title: 'Consistent Help' },
  { criterion: '3.3.1', level: 'A', title: 'Error Identification' },
  { criterion: '3.3.2', level: 'A', title: 'Labels or Instructions' },
  { criterion: '3.3.3', level: 'AA', title: 'Error Suggestion' },
  { criterion: '3.3.4', level: 'AA', title: 'Error Prevention (Legal, Financial, Data)' },
  { criterion: '3.3.7', level: 'A', title: 'Redundant Entry' },
  { criterion: '3.3.8', level: 'AA', title: 'Accessible Authentication (Minimum)' },
  { criterion: '4.1.2', level: 'A', title: 'Name, Role, Value' },
  { criterion: '4.1.3', level: 'AA', title: 'Status Messages' },
];

/** Handlebars helper for conformance CSS class */
Handlebars.registerHelper('conformanceClass', function (conformance: string) {
  switch (conformance) {
    case 'Supports':
      return 'compliance-compliant';
    case 'Partially Supports':
      return 'compliance-partially';
    case 'Does Not Support':
      return 'compliance-non-compliant';
    case 'Not Applicable':
      return 'compliance-substantially';
    default:
      return '';
  }
});

/** WCAG compliance report template */
const WCAG_COMPLIANCE_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WCAG 2.2 AA Conformance Report - {{organisation.name}}</title>
  <style>${REPORT_BASE_CSS}</style>
</head>
<body>

<!-- PAGE 1: Cover -->
<div class="cover-page">
  <div style="color: #1A56A0; font-size: 14pt; font-weight: 600; margin-bottom: 16pt;">
    AccessShield India
  </div>
  <h1 class="cover-title">WCAG 2.2 AA Conformance Report</h1>
  <p class="cover-subtitle">Voluntary Product Accessibility Template (VPAT®) Format</p>

  <div style="margin: 32pt 0;">
    <p class="cover-org-name">{{organisation.name}}</p>
    {{#if organisation.gstin}}
    <p style="font-size: 10pt; color: #6B7280;">GSTIN: {{organisation.gstin}}</p>
    {{/if}}
  </div>

  <div style="margin: 24pt 0;">
    <p class="cover-asset-name">{{asset.name}}</p>
    <p class="cover-asset-url">{{asset.url}}</p>
  </div>

  <div class="standards-row" style="justify-content: center;">
    <span class="standard-pill">WCAG 2.2 Level AA</span>
    <span class="standard-pill">IS 17802</span>
  </div>

  <p class="cover-date">
    Evaluation Date: {{scan.completedAt}}<br>
    Report Generated: {{generatedAt}}<br>
    Generated By: {{generatedBy}}
  </p>

  <div class="cover-confidential">
    CONFIDENTIAL — Accessibility conformance documentation
  </div>
</div>

<div class="page-break"></div>

<!-- PAGE 2: Conformance Summary -->
<h1>Conformance Summary</h1>

<p>
  AccessShield India has evaluated <strong>{{asset.url}}</strong> against the
  Web Content Accessibility Guidelines (WCAG) 2.2, Level AA conformance target,
  on behalf of <strong>{{organisation.name}}</strong>.
</p>

<h2>Evaluation Methodology</h2>

<p>
  Evaluation combined automated testing using the axe-core accessibility engine
  across <strong>{{scan.pagesScanned}} pages</strong> with applicable rule sets
  for WCAG 2.2 Level A and AA success criteria. The automated analysis was
  supplemented by manual review of key accessibility patterns.
</p>

<h2>Overall Conformance Level</h2>

<div style="margin: 24pt 0; text-align: center;">
  <div style="font-size: 18pt; font-weight: 600; margin-bottom: 8pt;">
    {{#if isFullyConformant}}
    <span class="compliance-badge compliance-compliant" style="font-size: 16pt; padding: 8pt 24pt;">
      WCAG 2.2 AA Conformant
    </span>
    {{else if isPartiallyConformant}}
    <span class="compliance-badge compliance-partially" style="font-size: 16pt; padding: 8pt 24pt;">
      Partially Conformant
    </span>
    {{else}}
    <span class="compliance-badge compliance-non-compliant" style="font-size: 16pt; padding: 8pt 24pt;">
      Non-Conformant
    </span>
    {{/if}}
  </div>
  <p style="color: #6B7280; font-size: 10pt;">
    {{conformanceSummary}}
  </p>
</div>

<h2>Conformance Statistics</h2>

<table>
  <thead>
    <tr>
      <th>Conformance Level</th>
      <th>Criteria Count</th>
      <th>Percentage</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><span class="compliance-badge compliance-compliant">Supports</span></td>
      <td>{{supportsCount}}</td>
      <td>{{supportsPercent}}%</td>
    </tr>
    <tr>
      <td><span class="compliance-badge compliance-partially">Partially Supports</span></td>
      <td>{{partialCount}}</td>
      <td>{{partialPercent}}%</td>
    </tr>
    <tr>
      <td><span class="compliance-badge compliance-non-compliant">Does Not Support</span></td>
      <td>{{doesNotSupportCount}}</td>
      <td>{{doesNotSupportPercent}}%</td>
    </tr>
    <tr>
      <td><span class="compliance-badge compliance-substantially">Not Applicable</span></td>
      <td>{{naCount}}</td>
      <td>{{naPercent}}%</td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<!-- Criterion-by-Criterion Table -->
<h1>WCAG 2.2 Level A and AA Criteria</h1>

<p>
  The following table documents conformance status for each WCAG 2.2 Level A
  and Level AA success criterion. Conformance levels follow the standard VPAT
  terminology.
</p>

<h2>Conformance Level Definitions</h2>
<ul>
  <li><strong>Supports:</strong> The functionality of the product has at least one method that meets the criterion without known defects or meets with equivalent facilitation.</li>
  <li><strong>Partially Supports:</strong> Some functionality of the product does not meet the criterion.</li>
  <li><strong>Does Not Support:</strong> The majority of product functionality does not meet the criterion.</li>
  <li><strong>Not Applicable:</strong> The criterion is not relevant to the product.</li>
</ul>

<div class="page-break"></div>

<h2>Table A: WCAG 2.2 Level A</h2>

<table>
  <thead>
    <tr>
      <th style="width: 15%;">Criterion</th>
      <th style="width: 30%;">Title</th>
      <th style="width: 20%;">Conformance</th>
      <th style="width: 35%;">Remarks</th>
    </tr>
  </thead>
  <tbody>
    {{#each levelACriteria}}
    <tr>
      <td>{{criterion}}</td>
      <td>{{title}}</td>
      <td><span class="compliance-badge {{conformanceClass conformance}}">{{conformance}}</span></td>
      <td style="font-size: 9pt;">{{remarks}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>

<div class="page-break"></div>

<h2>Table B: WCAG 2.2 Level AA</h2>

<table>
  <thead>
    <tr>
      <th style="width: 15%;">Criterion</th>
      <th style="width: 30%;">Title</th>
      <th style="width: 20%;">Conformance</th>
      <th style="width: 35%;">Remarks</th>
    </tr>
  </thead>
  <tbody>
    {{#each levelAACriteria}}
    <tr>
      <td>{{criterion}}</td>
      <td>{{title}}</td>
      <td><span class="compliance-badge {{conformanceClass conformance}}">{{conformance}}</span></td>
      <td style="font-size: 9pt;">{{remarks}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>

<div class="page-break"></div>

<!-- Legal Disclaimer -->
<h1>Legal Disclaimer</h1>

<blockquote>
  <p>
    This report reflects accessibility conformance as of <strong>{{scan.completedAt}}</strong>
    based on automated and manual testing methodologies described above.
  </p>
  <p>
    Conformance may be affected by future content or code changes to the evaluated asset.
    This report does not constitute a legal opinion.
  </p>
  <p>
    AccessShield India recommends periodic re-evaluation to maintain conformance
    as content and functionality evolve.
  </p>
</blockquote>

<h2>About This Report</h2>

<p>
  This Voluntary Product Accessibility Template (VPAT®) format report was
  generated by AccessShield India's automated accessibility evaluation platform.
  The VPAT® is a registered trademark of the Information Technology Industry Council (ITI).
</p>

<h2>Contact Information</h2>

<p>
  For questions regarding this conformance report or accessibility remediation support:<br>
  <strong>AccessShield India</strong><br>
  Email: compliance@accessshield.in<br>
  Website: https://accessshield.in
</p>

<div class="report-footer">
  <p>
    This report was generated by AccessShield India on {{generatedAt}} IST.<br>
    Scan ID: {{scan.id}}
  </p>
  <p>
    © 2026 AccessShield India. All rights reserved.
  </p>
</div>

</body>
</html>
`;

/**
 * Determine conformance level for a criterion based on violations found.
 */
function determineConformanceLevel(
  criterion: string,
  violations: ViolationSummary[],
): ConformanceLevel {
  const criterionViolations = violations.filter((v) => v.wcagCriterion === criterion);

  if (criterionViolations.length === 0) {
    return 'Supports';
  }

  const hasCritical = criterionViolations.some((v) => v.severity === 'critical');
  const hasSerious = criterionViolations.some((v) => v.severity === 'serious');

  if (hasCritical || criterionViolations.length > 5) {
    return 'Does Not Support';
  }

  if (hasSerious || criterionViolations.length > 2) {
    return 'Partially Supports';
  }

  return 'Partially Supports';
}

/**
 * Generate remarks for a criterion based on violations.
 */
function generateRemarks(
  criterion: string,
  violations: ViolationSummary[],
  pagesScanned: number,
): string {
  const criterionViolations = violations.filter((v) => v.wcagCriterion === criterion);

  if (criterionViolations.length === 0) {
    return 'No issues identified during automated and manual review.';
  }

  const uniquePages = new Set(criterionViolations.map((v) => v.pageUrl)).size;

  return `${criterionViolations.length} instance(s) found across ${uniquePages} page(s). See Technical Report for details.`;
}

/**
 * Build criterion conformance data for all WCAG 2.2 criteria.
 */
function buildCriterionConformance(
  violations: ViolationSummary[],
  pagesScanned: number,
): CriterionConformance[] {
  return WCAG_22_CRITERIA.map((c) => {
    const title = WCAG_CRITERION_TITLES[c.criterion] ?? c.title;
    const conformance = determineConformanceLevel(c.criterion, violations);
    const remarks = generateRemarks(c.criterion, violations, pagesScanned);

    return {
      criterion: c.criterion,
      level: c.level,
      title,
      conformance,
      remarks,
    };
  });
}

/**
 * Render the WCAG 2.2 Compliance (VPAT) report template.
 *
 * @param data - Complete report template data
 * @returns Rendered HTML string
 */
export function renderWcagComplianceTemplate(data: ReportTemplateData): string {
  const allCriteria = buildCriterionConformance(data.violations, data.scan.pagesScanned);

  const levelACriteria = allCriteria.filter((c) => c.level === 'A');
  const levelAACriteria = allCriteria.filter((c) => c.level === 'AA');

  const supportsCount = allCriteria.filter((c) => c.conformance === 'Supports').length;
  const partialCount = allCriteria.filter((c) => c.conformance === 'Partially Supports').length;
  const doesNotSupportCount = allCriteria.filter(
    (c) => c.conformance === 'Does Not Support',
  ).length;
  const naCount = allCriteria.filter((c) => c.conformance === 'Not Applicable').length;

  const totalCriteria = allCriteria.length;
  const supportsPercent = Math.round((supportsCount / totalCriteria) * 100);
  const partialPercent = Math.round((partialCount / totalCriteria) * 100);
  const doesNotSupportPercent = Math.round((doesNotSupportCount / totalCriteria) * 100);
  const naPercent = Math.round((naCount / totalCriteria) * 100);

  const isFullyConformant = doesNotSupportCount === 0 && partialCount === 0;
  const isPartiallyConformant = doesNotSupportCount === 0 && partialCount > 0;

  let conformanceSummary: string;
  if (isFullyConformant) {
    conformanceSummary = 'All evaluated WCAG 2.2 Level A and AA criteria are fully supported.';
  } else if (isPartiallyConformant) {
    conformanceSummary = `${partialCount} criterion/criteria partially supported. See detailed table below.`;
  } else {
    conformanceSummary = `${doesNotSupportCount} criterion/criteria not supported, ${partialCount} partially supported.`;
  }

  const templateData = {
    ...data,
    levelACriteria,
    levelAACriteria,
    supportsCount,
    partialCount,
    doesNotSupportCount,
    naCount,
    supportsPercent,
    partialPercent,
    doesNotSupportPercent,
    naPercent,
    isFullyConformant,
    isPartiallyConformant,
    conformanceSummary,
    totalCriteria,
  };

  const template = Handlebars.compile(WCAG_COMPLIANCE_TEMPLATE);
  return template(templateData);
}

export { WCAG_22_CRITERIA };
