/**
 * Technical Violations Report Template
 *
 * Generates a detailed technical report with all violations grouped by WCAG criterion.
 * Designed for developers and accessibility specialists.
 */

import Handlebars from 'handlebars';
import type { ReportTemplateData, ViolationSummary } from '../types';
import { REPORT_BASE_CSS } from './base-styles';

/** WCAG 2.2 criterion titles for display */
const WCAG_CRITERION_TITLES: Record<string, string> = {
  '1.1.1': 'Non-text Content',
  '1.2.1': 'Audio-only and Video-only (Prerecorded)',
  '1.2.2': 'Captions (Prerecorded)',
  '1.2.3': 'Audio Description or Media Alternative',
  '1.2.4': 'Captions (Live)',
  '1.2.5': 'Audio Description (Prerecorded)',
  '1.3.1': 'Info and Relationships',
  '1.3.2': 'Meaningful Sequence',
  '1.3.3': 'Sensory Characteristics',
  '1.3.4': 'Orientation',
  '1.3.5': 'Identify Input Purpose',
  '1.4.1': 'Use of Color',
  '1.4.2': 'Audio Control',
  '1.4.3': 'Contrast (Minimum)',
  '1.4.4': 'Resize Text',
  '1.4.5': 'Images of Text',
  '1.4.10': 'Reflow',
  '1.4.11': 'Non-text Contrast',
  '1.4.12': 'Text Spacing',
  '1.4.13': 'Content on Hover or Focus',
  '2.1.1': 'Keyboard',
  '2.1.2': 'No Keyboard Trap',
  '2.1.4': 'Character Key Shortcuts',
  '2.2.1': 'Timing Adjustable',
  '2.2.2': 'Pause, Stop, Hide',
  '2.3.1': 'Three Flashes or Below Threshold',
  '2.4.1': 'Bypass Blocks',
  '2.4.2': 'Page Titled',
  '2.4.3': 'Focus Order',
  '2.4.4': 'Link Purpose (In Context)',
  '2.4.5': 'Multiple Ways',
  '2.4.6': 'Headings and Labels',
  '2.4.7': 'Focus Visible',
  '2.4.11': 'Focus Not Obscured (Minimum)',
  '2.5.1': 'Pointer Gestures',
  '2.5.2': 'Pointer Cancellation',
  '2.5.3': 'Label in Name',
  '2.5.4': 'Motion Actuation',
  '2.5.7': 'Dragging Movements',
  '2.5.8': 'Target Size (Minimum)',
  '3.1.1': 'Language of Page',
  '3.1.2': 'Language of Parts',
  '3.2.1': 'On Focus',
  '3.2.2': 'On Input',
  '3.2.3': 'Consistent Navigation',
  '3.2.4': 'Consistent Identification',
  '3.2.6': 'Consistent Help',
  '3.3.1': 'Error Identification',
  '3.3.2': 'Labels or Instructions',
  '3.3.3': 'Error Suggestion',
  '3.3.4': 'Error Prevention (Legal, Financial, Data)',
  '3.3.7': 'Redundant Entry',
  '3.3.8': 'Accessible Authentication (Minimum)',
  '4.1.1': 'Parsing',
  '4.1.2': 'Name, Role, Value',
  '4.1.3': 'Status Messages',
};

/** Get criterion title with fallback */
function getCriterionTitle(criterion: string): string {
  return WCAG_CRITERION_TITLES[criterion] ?? criterion;
}

/** Handlebars helper for severity CSS class */
Handlebars.registerHelper('severityClass', function (severity: string) {
  return `severity-${severity}`;
});

/** Handlebars helper to escape HTML for display */
Handlebars.registerHelper('escapeHtml', function (html: string | null) {
  if (!html) return '';
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
});

/** Handlebars helper to truncate text */
Handlebars.registerHelper('truncate', function (text: string | null, length: number) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
});

/** Technical report template */
const TECHNICAL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Technical Violations Report - {{organisation.name}}</title>
  <style>${REPORT_BASE_CSS}</style>
</head>
<body>

<!-- PAGE 1: Cover -->
<div class="cover-page">
  <div style="color: #1A56A0; font-size: 14pt; font-weight: 600; margin-bottom: 16pt;">
    AccessShield India
  </div>
  <h1 class="cover-title">Accessibility Compliance Report</h1>
  <p class="cover-subtitle">Technical Violations Report</p>

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
    {{#each asset.standards}}
    <span class="standard-pill">{{this}}</span>
    {{/each}}
  </div>

  <p class="cover-date">
    Scan Date: {{scan.completedAt}}<br>
    Pages Scanned: {{scan.pagesScanned}}<br>
    Total Violations: {{totalViolations}}<br>
    Report Generated: {{generatedAt}}
  </p>

  <div class="cover-confidential">
    CONFIDENTIAL — Technical documentation for development team
  </div>
</div>

<div class="page-break"></div>

<!-- PAGE 2: Table of Contents -->
<h1>Table of Contents</h1>

<p>This report documents all accessibility violations found during the scan,
organized by WCAG 2.2 success criterion. Each section provides detailed
information about affected elements, suggested fixes, and remediation guidance.</p>

{{#if aiFixCount}}
<blockquote class="callout-success">
  <strong>AI remediation guidance:</strong> {{aiFixCount}} of {{totalViolations}} violation(s)
  include AI-suggested code fixes saved from the Issues tracker. Regenerate fixes in
  Dashboard → Issues before exporting for the most complete report.
</blockquote>
{{else}}
<blockquote class="callout-warning">
  <strong>AI fixes not included yet:</strong> Open violations in Dashboard → Issues to
  generate AI-suggested fixes; then regenerate this report to include remediation code.
</blockquote>
{{/if}}

<h2>Criteria Covered</h2>

{{#if criteriaGroups.length}}
<table>
  <thead>
    <tr>
      <th style="width: 20%;">Criterion</th>
      <th style="width: 50%;">Title</th>
      <th style="width: 15%;">Violations</th>
      <th style="width: 15%;">Severity</th>
    </tr>
  </thead>
  <tbody>
    {{#each criteriaGroups}}
    <tr>
      <td>WCAG {{criterion}}</td>
      <td>{{title}}</td>
      <td>{{count}}</td>
      <td><span class="severity-badge {{severityClass maxSeverity}}">{{maxSeverity}}</span></td>
    </tr>
    {{/each}}
  </tbody>
</table>
{{else}}
<blockquote class="callout-success">
  <strong>No Violations Found</strong><br>
  Congratulations! No accessibility violations were detected during this scan.
</blockquote>
{{/if}}

<h3>Summary by Severity</h3>

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

{{#each criteriaGroups}}
<div class="page-break"></div>

<!-- Criterion Section: {{criterion}} -->
<h2>WCAG {{criterion}} — {{title}}</h2>

<p><strong>{{count}} violation(s) found</strong></p>

{{#if description}}
<p>{{description}}</p>
{{/if}}

{{#each violations}}
<div class="violation-block">
  <div class="violation-header">
    <span class="violation-criterion">Violation #{{@index}}</span>
    <span class="severity-badge {{severityClass severity}}">{{severity}}</span>
  </div>

  <p class="violation-page-url">
    <strong>Page:</strong> {{pageUrl}}
  </p>

  <p class="violation-element">
    <strong>Element Type:</strong> &lt;{{elementType}}&gt;
    {{#if elementSelector}}
    <br><strong>Selector:</strong> <code>{{truncate elementSelector 80}}</code>
    {{/if}}
  </p>

  <p class="violation-description">{{description}}</p>

  {{#if elementHtml}}
  <h4>Before (current markup)</h4>
  <pre><code>{{escapeHtml elementHtml}}</code></pre>
  {{/if}}

  {{#if screenshotUrl}}
  <h4>Screenshot</h4>
  <img class="violation-screenshot" src="{{screenshotUrl}}" alt="Screenshot showing the accessibility violation" />
  {{/if}}

  {{#if aiFix}}
  <div class="code-fix">
    <div class="code-fix-label">AI Suggested Fix</div>
    <pre><code>{{escapeHtml aiFix}}</code></pre>
  </div>
  {{/if}}

  {{#if aiExplanation}}
  <h4>Remediation Guidance</h4>
  <p>{{aiExplanation}}</p>
  {{/if}}

  {{#unless aiFix}}
  {{#if elementHtml}}
  <p style="font-size: 9pt; color: #6B7280; font-style: italic;">
    No AI fix saved for this violation. Generate one from Dashboard → Issues.
  </p>
  {{/if}}
  {{/unless}}

  {{#if helpUrl}}
  <p style="font-size: 9pt; color: #6B7280;">
    <strong>Reference:</strong> <a href="{{helpUrl}}">{{helpUrl}}</a>
  </p>
  {{/if}}
</div>

{{#if shouldPageBreak}}
<div class="page-break"></div>
{{/if}}
{{/each}}
{{/each}}

<!-- Final Page: Reference -->
<div class="page-break"></div>

<h1>Reference</h1>

<h2>Severity Levels</h2>
<table>
  <thead>
    <tr>
      <th>Severity</th>
      <th>Definition</th>
      <th>Impact</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><span class="severity-badge severity-critical">Critical</span></td>
      <td>Complete barrier to accessibility</td>
      <td>Users cannot access content or functionality at all</td>
    </tr>
    <tr>
      <td><span class="severity-badge severity-serious">Serious</span></td>
      <td>Significant barrier to accessibility</td>
      <td>Users experience major difficulty accessing content</td>
    </tr>
    <tr>
      <td><span class="severity-badge severity-moderate">Moderate</span></td>
      <td>Moderate barrier to accessibility</td>
      <td>Users experience some difficulty but can still access content</td>
    </tr>
    <tr>
      <td><span class="severity-badge severity-minor">Minor</span></td>
      <td>Minor barrier to accessibility</td>
      <td>Minor inconvenience but does not significantly impede access</td>
    </tr>
  </tbody>
</table>

<h2>Standards Reference</h2>
<ul>
  <li><strong>WCAG 2.2:</strong> Web Content Accessibility Guidelines, W3C Recommendation</li>
  <li><strong>IS 17802:</strong> Indian Standard for ICT Accessibility (BIS 2021)</li>
  <li><strong>GIGW 3.0:</strong> Guidelines for Indian Government Websites</li>
  <li><strong>RPwD Act 2016:</strong> Rights of Persons with Disabilities Act, India</li>
</ul>

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

/** Group violations by WCAG criterion */
interface CriterionGroup {
  criterion: string;
  title: string;
  description: string;
  count: number;
  maxSeverity: string;
  violations: Array<ViolationSummary & { shouldPageBreak: boolean }>;
}

function groupViolationsByCriterion(violations: ViolationSummary[]): CriterionGroup[] {
  const groups = new Map<string, CriterionGroup>();

  const severityOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };

  for (const v of violations) {
    const criterion = v.wcagCriterion;

    if (!groups.has(criterion)) {
      groups.set(criterion, {
        criterion,
        title: getCriterionTitle(criterion),
        description: '',
        count: 0,
        maxSeverity: 'minor',
        violations: [],
      });
    }

    const group = groups.get(criterion)!;
    group.count++;

    const currentMax = severityOrder[group.maxSeverity as keyof typeof severityOrder] ?? 4;
    const newSev = severityOrder[v.severity as keyof typeof severityOrder] ?? 4;
    if (newSev < currentMax) {
      group.maxSeverity = v.severity;
    }

    group.violations.push({ ...v, shouldPageBreak: false });
  }

  for (const group of groups.values()) {
    for (let i = 0; i < group.violations.length; i++) {
      if ((i + 1) % 3 === 0 && i < group.violations.length - 1) {
        group.violations[i]!.shouldPageBreak = true;
      }
    }
  }

  const result = Array.from(groups.values());
  result.sort((a, b) => {
    const aSev = severityOrder[a.maxSeverity as keyof typeof severityOrder] ?? 4;
    const bSev = severityOrder[b.maxSeverity as keyof typeof severityOrder] ?? 4;
    if (aSev !== bSev) return aSev - bSev;
    return b.count - a.count;
  });

  return result;
}

/**
 * Render the Technical Violations report template.
 *
 * @param data - Complete report template data
 * @returns Rendered HTML string
 */
export function renderTechnicalTemplate(data: ReportTemplateData): string {
  const totalViolations =
    data.scan.criticalCount +
    data.scan.seriousCount +
    data.scan.moderateCount +
    data.scan.minorCount;

  const criteriaGroups = groupViolationsByCriterion(data.violations);
  const aiFixCount = data.violations.filter((v) => v.aiFix).length;

  const templateData = {
    ...data,
    totalViolations,
    criteriaGroups,
    aiFixCount,
  };

  const template = Handlebars.compile(TECHNICAL_TEMPLATE);
  return template(templateData);
}

export { WCAG_CRITERION_TITLES, getCriterionTitle };
