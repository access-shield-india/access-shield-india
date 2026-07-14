/**
 * Base Styles for Report Templates
 *
 * Shared CSS injected into every report template's <style> tag.
 * Uses AccessShield design tokens per .cursorrules Section 6.
 */

export const REPORT_BASE_CSS = `
/* ============================================================================
   Base Document Styles
   ============================================================================ */

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 11pt;
  line-height: 1.5;
}

body {
  font-family: Arial, Helvetica, sans-serif;
  color: #1A1A2E;
  background-color: #FFFFFF;
  padding: 0;
  margin: 0;
}

/* ============================================================================
   Typography
   ============================================================================ */

h1, h2, h3, h4, h5, h6 {
  color: #1A56A0;
  font-weight: 500;
  line-height: 1.25;
  margin-bottom: 0.5em;
}

h1 {
  font-size: 22pt;
  margin-bottom: 16pt;
}

h2 {
  font-size: 16pt;
  margin-top: 24pt;
  margin-bottom: 12pt;
  border-bottom: 1px solid #D1D5DB;
  padding-bottom: 6pt;
}

h3 {
  font-size: 13pt;
  margin-top: 16pt;
  margin-bottom: 8pt;
}

h4 {
  font-size: 11pt;
  font-weight: 600;
  margin-top: 12pt;
  margin-bottom: 6pt;
}

p {
  margin-bottom: 8pt;
  text-align: justify;
}

a {
  color: #1A56A0;
  text-decoration: underline;
}

strong {
  font-weight: 600;
}

/* ============================================================================
   Page Break Utilities
   ============================================================================ */

.page-break {
  page-break-before: always;
}

.page-break-after {
  page-break-after: always;
}

.avoid-break {
  page-break-inside: avoid;
}

/* ============================================================================
   Cover Page Styles
   ============================================================================ */

.cover-page {
  text-align: center;
  padding: 60pt 30pt;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.cover-logo {
  max-width: 180px;
  height: auto;
  margin-bottom: 24pt;
}

.cover-title {
  font-size: 28pt;
  color: #1A56A0;
  margin-bottom: 8pt;
}

.cover-subtitle {
  font-size: 16pt;
  color: #374151;
  margin-bottom: 32pt;
}

.cover-org-name {
  font-size: 18pt;
  color: #1A1A2E;
  margin-bottom: 8pt;
}

.cover-asset-name {
  font-size: 14pt;
  color: #374151;
  margin-bottom: 4pt;
}

.cover-asset-url {
  font-size: 11pt;
  color: #6B7280;
  word-break: break-all;
  margin-bottom: 24pt;
}

.cover-date {
  font-size: 11pt;
  color: #6B7280;
  margin-top: 32pt;
}

.cover-confidential {
  font-size: 9pt;
  color: #8B1A1A;
  margin-top: 48pt;
  padding: 8pt 16pt;
  border: 1px solid #FCA5A5;
  background-color: #FEE2E2;
  border-radius: 4px;
}

/* ============================================================================
   Score Display
   ============================================================================ */

.score-hero {
  text-align: center;
  padding: 24pt 0;
}

.score-number {
  font-size: 72pt;
  font-weight: 700;
  color: #1A56A0;
  line-height: 1;
}

.score-label {
  font-size: 14pt;
  color: #374151;
  margin-top: 8pt;
}

.score-delta {
  font-size: 14pt;
  margin-top: 8pt;
}

.score-delta-improved {
  color: #1A6B3C;
}

.score-delta-declined {
  color: #8B1A1A;
}

.score-delta-unchanged {
  color: #6B7280;
}

/* ============================================================================
   Severity Badges — Always show text, never color alone (WCAG 1.4.1)
   ============================================================================ */

.severity-badge {
  display: inline-block;
  padding: 2pt 8pt;
  border-radius: 4px;
  font-size: 9pt;
  font-weight: 600;
  text-transform: uppercase;
}

.severity-critical {
  background-color: #FEE2E2;
  color: #991B1B;
  border: 1px solid #FCA5A5;
}

.severity-serious {
  background-color: #FEF3C7;
  color: #92400E;
  border: 1px solid #FCD34D;
}

.severity-moderate {
  background-color: #DBEAFE;
  color: #1E40AF;
  border: 1px solid #93C5FD;
}

.severity-minor {
  background-color: #F3F4F6;
  color: #374151;
  border: 1px solid #D1D5DB;
}

/* ============================================================================
   Compliance Status Badges
   ============================================================================ */

.compliance-badge {
  display: inline-block;
  padding: 2pt 8pt;
  border-radius: 4px;
  font-size: 9pt;
  font-weight: 500;
}

.compliance-compliant {
  background-color: #E6F4EC;
  color: #1A6B3C;
  border: 1px solid #86EFAC;
}

.compliance-substantially {
  background-color: #DBEAFE;
  color: #1E40AF;
  border: 1px solid #93C5FD;
}

.compliance-partially {
  background-color: #FEF3C7;
  color: #92400E;
  border: 1px solid #FCD34D;
}

.compliance-non-compliant {
  background-color: #FEE2E2;
  color: #991B1B;
  border: 1px solid #FCA5A5;
}

/* ============================================================================
   Standards Pills
   ============================================================================ */

.standards-row {
  display: flex;
  gap: 8pt;
  flex-wrap: wrap;
  margin: 12pt 0;
}

.standard-pill {
  display: inline-block;
  padding: 4pt 12pt;
  border-radius: 16pt;
  font-size: 9pt;
  font-weight: 500;
  background-color: #F4F8FD;
  color: #1A56A0;
  border: 1px solid #EBF3FB;
}

/* ============================================================================
   Tables
   ============================================================================ */

table {
  width: 100%;
  border-collapse: collapse;
  margin: 12pt 0;
  font-size: 10pt;
}

thead {
  background-color: #1A56A0;
}

th {
  color: #FFFFFF;
  font-weight: 600;
  text-align: left;
  padding: 8pt 10pt;
  border: 1px solid #1A3A5C;
}

td {
  padding: 8pt 10pt;
  border: 1px solid #D1D5DB;
  vertical-align: top;
}

tbody tr:nth-child(even) {
  background-color: #F9FAFB;
}

tbody tr:hover {
  background-color: #F3F4F6;
}

/* ============================================================================
   KPI Boxes
   ============================================================================ */

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12pt;
  margin: 16pt 0;
}

.kpi-box {
  padding: 16pt;
  border-radius: 6pt;
  text-align: center;
}

.kpi-box-critical {
  background-color: #FEE2E2;
  border: 1px solid #FCA5A5;
}

.kpi-box-serious {
  background-color: #FEF3C7;
  border: 1px solid #FCD34D;
}

.kpi-box-moderate {
  background-color: #DBEAFE;
  border: 1px solid #93C5FD;
}

.kpi-box-minor {
  background-color: #F3F4F6;
  border: 1px solid #D1D5DB;
}

.kpi-number {
  font-size: 32pt;
  font-weight: 700;
  line-height: 1;
}

.kpi-label {
  font-size: 10pt;
  font-weight: 600;
  margin-top: 4pt;
  text-transform: uppercase;
}

.kpi-box-critical .kpi-number,
.kpi-box-critical .kpi-label {
  color: #991B1B;
}

.kpi-box-serious .kpi-number,
.kpi-box-serious .kpi-label {
  color: #92400E;
}

.kpi-box-moderate .kpi-number,
.kpi-box-moderate .kpi-label {
  color: #1E40AF;
}

.kpi-box-minor .kpi-number,
.kpi-box-minor .kpi-label {
  color: #374151;
}

/* ============================================================================
   Violation Blocks
   ============================================================================ */

.violation-block {
  padding: 12pt;
  margin: 12pt 0;
  border: 1px solid #D1D5DB;
  border-radius: 6pt;
  background-color: #FFFFFF;
  page-break-inside: avoid;
}

.violation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8pt;
}

.violation-criterion {
  font-weight: 600;
  color: #1A1A2E;
}

.violation-page-url {
  font-size: 9pt;
  color: #6B7280;
  word-break: break-all;
  margin-bottom: 8pt;
}

.violation-element {
  font-size: 9pt;
  color: #374151;
  margin-bottom: 8pt;
}

.violation-description {
  margin-bottom: 8pt;
}

.violation-screenshot {
  max-width: 100%;
  height: auto;
  border: 1px solid #D1D5DB;
  border-radius: 4pt;
  margin: 8pt 0;
}

/* ============================================================================
   Code Blocks
   ============================================================================ */

pre {
  background-color: #F3F4F6;
  border: 1px solid #D1D5DB;
  border-radius: 4pt;
  padding: 8pt;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 9pt;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

code {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 9pt;
  background-color: #F3F4F6;
  padding: 1pt 4pt;
  border-radius: 2pt;
}

.code-fix {
  margin: 8pt 0;
}

.code-fix-label {
  font-size: 9pt;
  font-weight: 600;
  color: #1A6B3C;
  margin-bottom: 4pt;
}

/* ============================================================================
   Trend Chart (SVG)
   ============================================================================ */

.trend-chart {
  width: 100%;
  max-width: 400pt;
  height: 120pt;
  margin: 16pt auto;
}

.trend-bar {
  fill: #1A56A0;
}

.trend-label {
  font-size: 8pt;
  fill: #374151;
  text-anchor: middle;
}

.trend-score {
  font-size: 8pt;
  font-weight: 600;
  fill: #1A56A0;
  text-anchor: middle;
}

/* ============================================================================
   Lists
   ============================================================================ */

ul, ol {
  margin: 8pt 0;
  padding-left: 24pt;
}

li {
  margin-bottom: 4pt;
}

/* ============================================================================
   Blockquotes / Callouts
   ============================================================================ */

blockquote {
  margin: 12pt 0;
  padding: 12pt 16pt;
  border-left: 4pt solid #1A56A0;
  background-color: #F4F8FD;
  color: #1A3A5C;
}

.callout-success {
  border-left-color: #1A6B3C;
  background-color: #E6F4EC;
  color: #1A6B3C;
}

.callout-warning {
  border-left-color: #E07B00;
  background-color: #FEF3E2;
  color: #7A4500;
}

.callout-error {
  border-left-color: #8B1A1A;
  background-color: #FDEAEA;
  color: #8B1A1A;
}

/* ============================================================================
   Footer
   ============================================================================ */

.report-footer {
  margin-top: 24pt;
  padding-top: 12pt;
  border-top: 1px solid #D1D5DB;
  font-size: 9pt;
  color: #6B7280;
}

/* ============================================================================
   Print Adjustments
   ============================================================================ */

@media print {
  body {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .page-break {
    page-break-before: always;
  }

  .avoid-break {
    page-break-inside: avoid;
  }
}
`;

/** Minimal CSS for HTML-only export (no print-specific rules) */
export const REPORT_HTML_ONLY_CSS = `
  ${REPORT_BASE_CSS}

  body {
    max-width: 210mm;
    margin: 0 auto;
    padding: 20pt;
  }

  .cover-page {
    min-height: auto;
    padding: 40pt 20pt;
  }
`;
