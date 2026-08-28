/**
 * Document Scanner Report Template
 *
 * PDF report for PDF/DOCX/PPTX/XLSX accessibility scan results.
 *
 * Text arriving here has already been entity-decoded and normalised by
 * `text-clean.ts`, so it is interpolated with `{{ }}` and escaped exactly once.
 * The previous version escaped by hand *and* interpolated with `{{ }}`, which
 * double-escaped and printed `&gt;` and `&#039;` as literal text.
 */

import Handlebars from 'handlebars';
import { REPORT_BASE_CSS } from './base-styles';
import type { CategorySummary, EnrichedFinding, RemediationStep } from '../document-findings';
import type { FrameworkCoverage } from '../standards-map';

export interface DocumentScanReportData {
  organisationName: string;
  documentName: string;
  documentType: string;
  pageCount: number | null;
  complianceScore: number;
  /** Plain-language band for the score, e.g. "Does not conform". */
  scoreBand: string;
  scoreSummary: string;
  /** Distinct defects after grouping repeats. */
  totalFindings: number;
  /** Raw instance count across the document. */
  totalOccurrences: number;
  criticalCount: number;
  seriousCount: number;
  moderateCount: number;
  minorCount: number;
  aiSummary: string;
  scanDurationSeconds: number;
  scannedAt: string;
  generatedAt: string;
  /** Frameworks requested for this scan, for the cover page. */
  standards: string[];
  isGovernment: boolean;
  frameworkCoverage: FrameworkCoverage[];
  categorySummary: CategorySummary[];
  remediationPlan: RemediationStep[];
  findings: EnrichedFinding[];
  /** Checks that require a human and were not attempted automatically. */
  manualChecks: string[];
}

/**
 * Namespaced helpers. Handlebars' registry is global and several report
 * templates in this directory register helpers under the same short names, so
 * anything added here is prefixed to avoid clobbering them.
 */
Handlebars.registerHelper('docSeverityClass', function (severity: string) {
  return `severity-${severity}`;
});

Handlebars.registerHelper('docScoreColour', function (score: number) {
  if (score >= 80) return '#1A6B3C';
  if (score >= 60) return '#7A4500';
  return '#8B1A1A';
});

Handlebars.registerHelper('docInc', function (index: number) {
  return index + 1;
});

const DOCUMENT_SCAN_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Accessibility Report - {{documentName}}</title>
  <style>${REPORT_BASE_CSS}</style>
  <style>
    .meta-table td:first-child { width: 34%; font-weight: 600; color: #374151; }
    .std-chip {
      display: inline-block; padding: 1pt 6pt; margin: 0 4pt 4pt 0;
      border-radius: 3pt; font-size: 8pt; border: 1px solid #D8B4FE;
      background-color: #F3E8FF; color: #5B21B6;
    }
    .std-chip-advisory { border-color: #D1D5DB; background-color: #F3F4F6; color: #374151; }
    .finding { border: 1px solid #D1D5DB; border-radius: 6pt; padding: 12pt;
               margin-bottom: 14pt; page-break-inside: avoid; }
    .finding-title { font-size: 11.5pt; font-weight: 600; color: #1A1A2E; margin-bottom: 6pt; }
    .finding-label { font-size: 8.5pt; font-weight: 700; text-transform: uppercase;
                     letter-spacing: 0.04em; color: #6B7280; margin: 10pt 0 3pt; }
    .finding p { text-align: left; margin-bottom: 4pt; }
    .finding ol { margin: 4pt 0 4pt 0; padding-left: 20pt; }
    .finding ol li { margin-bottom: 3pt; }
    .occurrence-table { font-size: 9pt; margin: 4pt 0 0; }
    .occurrence-table th { padding: 5pt 8pt; }
    .occurrence-table td { padding: 5pt 8pt; }
    .excerpt { font-family: 'Consolas', 'Monaco', monospace; font-size: 8.5pt; }
    .count-pill { display: inline-block; padding: 1pt 7pt; border-radius: 10pt;
                  font-size: 8.5pt; font-weight: 600;
                  background-color: #F3F4F6; color: #374151; border: 1px solid #D1D5DB; }
    .advisory-note { font-size: 9pt; color: #7A4500; background-color: #FEF3E2;
                     border-left: 3pt solid #E07B00; padding: 8pt 10pt; margin: 8pt 0; }
    .framework-intro { font-size: 9.5pt; color: #374151; margin-bottom: 6pt; text-align: left; }
  </style>
</head>
<body>

<div class="cover-page">
  <div style="color: #6D28D9; font-size: 14pt; font-weight: 600; margin-bottom: 16pt;">
    AccessibleNow
  </div>
  <h1 class="cover-title">Document Accessibility Report</h1>
  <p class="cover-subtitle">{{documentType}} · {{documentName}}</p>

  <div style="margin: 24pt 0;">
    <p class="cover-org-name">{{organisationName}}</p>
  </div>

  <div style="margin: 16pt 0; text-align: center;">
    <p style="font-size: 44pt; font-weight: 700; line-height: 1;
              color: {{docScoreColour complianceScore}};">{{complianceScore}}</p>
    <p style="font-size: 11pt; color: #6B7280;">Compliance score out of 100</p>
    <p style="font-size: 13pt; font-weight: 600; margin-top: 6pt;
              color: {{docScoreColour complianceScore}};">{{scoreBand}}</p>
  </div>

  <div class="standards-row" style="justify-content: center;">
    {{#each standards}}
    <span class="standard-pill">{{this}}</span>
    {{/each}}
  </div>

  <table style="margin: 12pt auto 0; width: 88%;">
    <thead>
      <tr>
        <th style="text-align: center;">Critical</th>
        <th style="text-align: center;">Serious</th>
        <th style="text-align: center;">Moderate</th>
        <th style="text-align: center;">Minor</th>
        <th style="text-align: center;">Distinct issues</th>
        <th style="text-align: center;">Total instances</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center;">{{criticalCount}}</td>
        <td style="text-align: center;">{{seriousCount}}</td>
        <td style="text-align: center;">{{moderateCount}}</td>
        <td style="text-align: center;">{{minorCount}}</td>
        <td style="text-align: center;"><strong>{{totalFindings}}</strong></td>
        <td style="text-align: center;">{{totalOccurrences}}</td>
      </tr>
    </tbody>
  </table>

  <p class="cover-date" style="margin-top: 20pt;">
    Scanned: {{scannedAt}}<br>
    Report generated: {{generatedAt}}
  </p>

  <div class="cover-confidential">
    CONFIDENTIAL — Document accessibility assessment
  </div>
</div>

<div class="page-break"></div>

<h1>How to read this report</h1>

<p>{{scoreSummary}}</p>

<h2>Document assessed</h2>
<table class="meta-table">
  <tbody>
    <tr><td>File name</td><td>{{documentName}}</td></tr>
    <tr><td>Format</td><td>{{documentType}}</td></tr>
    {{#if pageCount}}<tr><td>Pages</td><td>{{pageCount}}</td></tr>{{/if}}
    <tr><td>Organisation</td><td>{{organisationName}}</td></tr>
    <tr><td>Scan completed</td><td>{{scannedAt}}</td></tr>
    <tr><td>Scan duration</td><td>{{scanDurationSeconds}} seconds</td></tr>
    <tr><td>Distinct issues</td><td>{{totalFindings}}</td></tr>
    <tr><td>Total instances</td><td>{{totalOccurrences}}</td></tr>
  </tbody>
</table>

<h2>Distinct issues versus instances</h2>
<p>
  An <strong>issue</strong> is one defect that needs one decision from you. An
  <strong>instance</strong> is each place in the document where that defect appears.
  A single "text relies on colour" issue found in 200 paragraphs is one issue and 200
  instances. Issues are listed once, with every location recorded underneath, so this
  report tells you how much work there is rather than how many times to read the same
  advice.
</p>

<h2>Severity levels</h2>
<table>
  <thead>
    <tr><th>Severity</th><th>What it means for a reader using assistive technology</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><span class="severity-badge severity-critical">Critical</span></td>
      <td>Content is completely unavailable. A screen reader user cannot get the
          information at all.</td>
    </tr>
    <tr>
      <td><span class="severity-badge severity-serious">Serious</span></td>
      <td>Content is reachable but a major barrier makes it slow, confusing or
          unreliable to use.</td>
    </tr>
    <tr>
      <td><span class="severity-badge severity-moderate">Moderate</span></td>
      <td>Content is usable but the experience is degraded, and some readers will
          miss information.</td>
    </tr>
    <tr>
      <td><span class="severity-badge severity-minor">Minor</span></td>
      <td>A best-practice gap. Fix it during the next revision of the document.</td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

{{#if aiSummary}}
<h1>Executive summary</h1>
<p style="white-space: pre-line;">{{aiSummary}}</p>
<div class="page-break"></div>
{{/if}}

<h1>Where the problems are</h1>

{{#if categorySummary.length}}
<p>
  This table groups every finding by the part of the document it affects, so you can
  assign work to the right person before reading the detail.
</p>
<table>
  <thead>
    <tr>
      <th>Area of the document</th>
      <th style="text-align: center;">Issues</th>
      <th style="text-align: center;">Instances</th>
      <th>Highest severity</th>
    </tr>
  </thead>
  <tbody>
    {{#each categorySummary}}
    <tr>
      <td>{{label}}</td>
      <td style="text-align: center;">{{distinctFindings}}</td>
      <td style="text-align: center;">{{totalOccurrences}}</td>
      <td><span class="severity-badge {{docSeverityClass worstSeverity}}">{{worstSeverityLabel}}</span></td>
    </tr>
    {{/each}}
  </tbody>
</table>
{{else}}
<blockquote class="callout-success">
  <strong>No issues found</strong><br>
  This document met every check that was run automatically.
</blockquote>
{{/if}}

<div class="page-break"></div>

<h1>Conformance by standard</h1>

<p>
  Each finding below usually breaches several frameworks at once, because the Indian
  and international standards all build on the same WCAG success criteria. The same
  finding therefore appears in more than one table. WCAG 2.1 AA is the baseline that
  applies to every organisation; the other frameworks add obligations depending on who
  you are and what format you publish.
</p>

{{#each frameworkCoverage}}
<h2>{{label}}</h2>
<p class="framework-intro">{{description}}</p>

{{#if advisory}}
<div class="advisory-note">
  <strong>Advisory for your organisation.</strong>
  GIGW 3.0 is mandatory for central and state government bodies and the vendors
  publishing on their behalf. {{../organisationName}} is not recorded as a government
  body, so this table is provided for reference — typically because you are bidding for
  government work or a public-sector client has asked for GIGW evidence. The WCAG 2.1 AA
  and IS 17802 tables are the ones that bind you.
</div>
{{/if}}

<table>
  <thead>
    <tr>
      <th>Clause</th>
      <th>Requirement</th>
      <th style="text-align: center;">Level</th>
      <th style="text-align: center;">Result</th>
      <th style="text-align: center;">Issues</th>
      <th style="text-align: center;">Instances</th>
    </tr>
  </thead>
  <tbody>
    {{#each clauses}}
    <tr>
      <td><code>{{ref}}</code></td>
      <td>{{title}}</td>
      <td style="text-align: center;">{{#if level}}{{level}}{{else}}—{{/if}}</td>
      <td style="text-align: center;">
        <span class="severity-badge {{docSeverityClass worstSeverity}}">{{status}}</span>
      </td>
      <td style="text-align: center;">{{issueCount}}</td>
      <td style="text-align: center;">{{occurrenceCount}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
<p style="font-size: 9pt; color: #6B7280;">
  {{clauses.length}} clause(s) failed under {{label}}: {{totalIssues}} distinct issue(s)
  across {{totalOccurrences}} instance(s). Clauses not listed were either met or could not
  be assessed automatically — see Methodology and limitations.
</p>
{{/each}}

<div class="page-break"></div>

<h1>Prioritised remediation plan</h1>

{{#if remediationPlan.length}}
<p>
  Work down this list in order. Document-wide settings come first because fixing them
  often removes or reshapes the individual findings underneath. Effort estimates assume
  someone with the source file open in the authoring application.
</p>
<table>
  <thead>
    <tr>
      <th style="text-align: center; width: 6%;">#</th>
      <th>First action</th>
      <th>Issue</th>
      <th style="text-align: center;">Severity</th>
      <th style="text-align: center;">Instances</th>
      <th>Effort</th>
    </tr>
  </thead>
  <tbody>
    {{#each remediationPlan}}
    <tr>
      <td style="text-align: center;">{{order}}</td>
      <td>{{action}}</td>
      <td>{{scope}}</td>
      <td style="text-align: center;">{{severityLabel}}</td>
      <td style="text-align: center;">{{occurrences}}</td>
      <td>{{effort}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
{{else}}
<p>No remediation work is required for the checks that were run.</p>
{{/if}}

<div class="page-break"></div>

<h1>Detailed findings ({{totalFindings}})</h1>

{{#if findings.length}}
{{#each findings}}
<div class="finding">
  <div style="margin-bottom: 6pt;">
    <span class="severity-badge {{docSeverityClass severity}}">{{severityLabel}}</span>
    <span class="count-pill">{{occurrenceLabel}}</span>
    <span style="font-size: 8.5pt; color: #6B7280;">· {{categoryLabel}}</span>
  </div>

  <p class="finding-title">{{docInc @index}}. {{title}}</p>

  <div>
    {{#each standardRefs}}
    <span class="std-chip{{#if scope}} std-chip-advisory{{/if}}">{{frameworkLabel}} {{ref}}{{#if level}} (Level {{level}}){{/if}}</span>
    {{/each}}
  </div>

  {{#if requirement}}
  <p class="finding-label">What the standard requires</p>
  <p>{{requirement}}</p>
  {{/if}}

  {{#if impact}}
  <p class="finding-label">Why this matters</p>
  <p>{{impact}}</p>
  {{/if}}

  {{#if occurrences.length}}
  <p class="finding-label">Where to find it in the document</p>
  <table class="occurrence-table">
    <thead>
      <tr>
        <th style="width: 26%;">Location</th>
        <th>Text to search for</th>
        <th style="width: 26%;">Appears under</th>
      </tr>
    </thead>
    <tbody>
      {{#each occurrences}}
      <tr>
        <td>{{anchor}}</td>
        <td class="excerpt">{{#if excerpt}}{{excerpt}}{{else}}—{{/if}}</td>
        <td>{{#if context}}{{context}}{{else}}—{{/if}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  {{#if occurrencesTruncated}}
  <p style="font-size: 9pt; color: #6B7280;">
    Showing the first {{occurrences.length}} of {{occurrenceCount}} instances. The same
    fix applies to all of them.
  </p>
  {{/if}}
  {{/if}}

  <p class="finding-label">How to fix it</p>
  {{#if fixSteps.length}}
  <ol>
    {{#each fixSteps}}
    <li>{{this}}</li>
    {{/each}}
  </ol>
  {{else}}
  <p>{{fixProse}}</p>
  {{/if}}
</div>
{{/each}}
{{else}}
<blockquote class="callout-success">
  <strong>No violations found</strong><br>
  This document meets the assessed accessibility standards for every check that was run
  automatically.
</blockquote>
{{/if}}

<div class="page-break"></div>

<h1>Methodology and limitations</h1>

<h2>How this document was assessed</h2>
<p>
  The file was parsed directly, without rendering it to an image, and inspected against
  the machine-testable requirements of the standards listed on the cover. Findings come
  from the document's own structure — its properties, style information, tag tree, alt
  text fields, table markup and colour values — so every result points at something
  concrete in the file rather than at how it happens to look on one screen.
</p>

<h2>What automated testing cannot decide</h2>
<p>
  Roughly a third of the WCAG success criteria need human judgement. An automated scan
  can tell you that alt text is missing; it cannot tell you whether alt text that does
  exist is accurate. The following need a person before you can claim conformance:
</p>
<ul>
  {{#each manualChecks}}
  <li>{{this}}</li>
  {{/each}}
</ul>

<h2>Reading the location references</h2>
<p>
  Locations are given as precisely as the file format allows. PDF and PowerPoint expose
  real page and slide numbers. Word documents have no fixed lines or pages until they are
  rendered, so findings are anchored to a paragraph index plus the verbatim text to search
  for — paste the text in the "Text to search for" column into Find (Ctrl+F, or Cmd+F on
  macOS) to jump straight to it. Where the scanner recorded the enclosing heading, that is
  shown too.
</p>

<h2>About the compliance score</h2>
<p>
  The score is a weighted deduction from 100, with critical findings costing the most and
  minor findings the least. It is a management indicator for tracking progress between
  revisions. It is not a conformance claim: WCAG conformance is all-or-nothing at a given
  level, so a single unresolved Level A failure means the document does not conform,
  whatever the score says.
</p>

<div class="report-footer">
  Generated by AccessibleNow on {{generatedAt}} for {{organisationName}}.
  Assessed against {{#each standards}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}.
  This report describes the file as submitted; re-scan after remediation to confirm the
  fixes landed.
</div>

</body>
</html>
`;

const compiledTemplate = Handlebars.compile(DOCUMENT_SCAN_TEMPLATE);

/**
 * Render document scan report HTML for PDF generation.
 */
export function renderDocumentScanTemplate(data: DocumentScanReportData): string {
  return compiledTemplate(data);
}
