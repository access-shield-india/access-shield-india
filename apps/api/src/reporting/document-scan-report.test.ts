/**
 * Regression tests for the document scan report pipeline.
 *
 * Fixtures mirror the rows the Python engines actually store, including the
 * double-escaped entities that leaked into a delivered PDF as `&gt;` and
 * `&#039;`, and the 564-instance colour-only defect that swamped the findings
 * list.
 */

import { describe, expect, it } from 'vitest';
import {
  buildCategorySummary,
  buildFrameworkCoverage,
  buildRemediationPlan,
  enrichFindings,
  manualChecksFor,
  scoreBand,
  type RawDocumentFinding,
} from './document-findings';
import { cleanText, decodeHtmlEntities, toFixSteps } from './text-clean';
import { renderDocumentScanTemplate } from './templates/document-scan';

const RAW_FINDINGS: RawDocumentFinding[] = [
  {
    violation_id: 'v1',
    checkpoint_id: 'GIGW_5.2.28',
    standard: 'GIGW_3_0',
    severity: 'serious',
    category: 'metadata',
    description: 'Document has no title set in its properties.',
    location: 'Document properties',
    impact:
      'Screen readers announce the file name instead of a title, so a reader cannot tell what the document is before opening it.',
    remediation:
      'Set the title in File &gt; Info &gt; Properties. Use the document&#039;s first heading: &quot;KSPG Accessibility Proposal&quot;.',
    wcag_criterion: '2.4.2',
    auto_fixable: true,
    fix_steps: [
      'Open File &gt; Info in Word.',
      'In the Properties panel, click Title and enter: KSPG Accessibility Proposal',
      'Save the document so the property is written to the file.',
    ],
  },
  {
    violation_id: 'v2',
    checkpoint_id: 'GIGW_5.2.38',
    standard: 'GIGW_3_0',
    severity: 'serious',
    category: 'language',
    description: 'Document language is not declared.',
    location: 'Document properties',
    impact:
      'Without a declared language a screen reader guesses pronunciation, which makes mixed Hindi and English passages unintelligible.',
    remediation: 'Set the language via Review &gt; Language &gt; Set Proofing Language.',
    wcag_criterion: '3.1.1',
    auto_fixable: true,
    fix_steps: [
      'Select all content (Ctrl+A).',
      'Go to Review &gt; Language &gt; Set Proofing Language.',
      'Choose English (India), then tick "Set As Default".',
    ],
  },
  {
    violation_id: 'v3',
    checkpoint_id: 'GIGW_5.2.12',
    standard: 'GIGW_3_0',
    severity: 'moderate',
    category: 'colour_contrast',
    description: 'Text relies on colour alone to convey meaning: &#039;Prepared by&#039;',
    location: 'Paragraph 12',
    impact:
      'Readers who cannot distinguish the colour, and screen reader users, receive no equivalent of the emphasis.',
    remediation: 'Add a text or symbol cue alongside the colour.',
    wcag_criterion: '1.4.1',
    auto_fixable: false,
    occurrences: 564,
    occurrence_list: Array.from({ length: 40 }, (_, index) => ({
      page: Math.floor(index / 4) + 1,
      line: (index % 24) + 1,
      paragraph: index + 12,
      excerpt: `Coloured run ${index + 1}`,
      heading_path: ['2. Scope'],
    })),
    fix_steps: [
      'Select each coloured run listed below.',
      'Add a non-colour cue — bold plus a word such as "Required", or a symbol.',
      'Keep the colour if you wish; it must not be the only signal.',
    ],
  },
  {
    violation_id: 'v5',
    checkpoint_id: 'GIGW_5.2.1',
    standard: 'GIGW_3_0',
    severity: 'critical',
    category: 'alt_text',
    description: 'Image has no alternative text.',
    location: 'Paragraph 30',
    impact: 'The image conveys information that is completely unavailable to a screen reader user.',
    remediation: 'Right-click the image &gt; View Alt Text and describe it.',
    wcag_criterion: '1.1.1',
    auto_fixable: false,
    page: 2,
    line: 8,
    paragraph: 30,
    excerpt: 'inline image, 620 x 340 px',
    heading_path: ['2. Scope', '2.1 Approach'],
    fix_steps: [
      'Go to page 2, line 8 and select the image.',
      'Right-click and choose View Alt Text.',
      'Describe what the image conveys in one sentence; if purely decorative, tick "Mark as decorative".',
    ],
  },
];

function enriched() {
  return enrichFindings(RAW_FINDINGS, 'docx');
}

function render(isGovernment = false) {
  const findings = enriched();
  const band = scoreBand(62, 1, 2);

  return renderDocumentScanTemplate({
    organisationName: 'KSPG Consulting Pvt Ltd',
    documentName: 'KSPG_Accessibility_Proposal.docx',
    documentType: 'DOCX',
    pageCount: 12,
    complianceScore: 62,
    scoreBand: band.band,
    scoreSummary: band.summary,
    totalFindings: findings.length,
    totalOccurrences: findings.reduce((sum, f) => sum + f.occurrenceCount, 0),
    criticalCount: 1,
    seriousCount: 2,
    moderateCount: 1,
    minorCount: 0,
    aiSummary: cleanText(
      'The document&#039;s biggest gap is metadata: no title and no declared language. Fix File &gt; Info first.',
    ),
    scanDurationSeconds: 18,
    scannedAt: '24/08/2026',
    generatedAt: '24/08/2026',
    standards: ['WCAG_2_1_AA', 'GIGW_3_0', 'IS_17802'],
    isGovernment,
    frameworkCoverage: buildFrameworkCoverage(findings, isGovernment),
    categorySummary: buildCategorySummary(findings),
    remediationPlan: buildRemediationPlan(findings),
    findings,
    manualChecks: manualChecksFor('docx'),
  });
}

/**
 * Approximate what a reader sees: drop the markup, then resolve entities once,
 * which is what the PDF renderer does.
 *
 * Resolving exactly once is the point. Correctly escaped output (`&quot;` for a
 * literal `"`) becomes plain text, while the double-escaped output that caused
 * the original bug (`&amp;gt;`) resolves to a still-visible `&gt;` — so the
 * assertions below catch double escaping without flagging correct escaping.
 */
function visibleText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

describe('text-clean', () => {
  it('decodes entities that were escaped more than once', () => {
    expect(decodeHtmlEntities('File &amp;gt; Info')).toBe('File > Info');
    expect(decodeHtmlEntities('&amp;amp;#039;')).toBe("'");
  });

  it('decodes the entities seen in the delivered report', () => {
    expect(decodeHtmlEntities('a &gt; b')).toBe('a > b');
    expect(decodeHtmlEntities('the document&#039;s title')).toBe("the document's title");
    expect(decodeHtmlEntities('&quot;quoted&quot;')).toBe('"quoted"');
  });

  it('splits prose remediation into steps', () => {
    const steps = toFixSteps('Open the file. Set the title. Save it.');
    expect(steps.length).toBeGreaterThan(1);
  });
});

describe('finding enrichment', () => {
  it('collapses repeats of one defect into a single finding', () => {
    const findings = enriched();
    expect(findings).toHaveLength(RAW_FINDINGS.length);

    const colour = findings.find((f) => f.category === 'colour_contrast');
    expect(colour?.occurrenceCount).toBe(564);
    // 564 places must not become 564 cards.
    expect(colour?.occurrences.length).toBeLessThanOrEqual(12);
    expect(colour?.occurrencesTruncated).toBe(true);
    expect(colour?.occurrenceLabel).toContain('564');
  });

  it('anchors findings to a line, not just a paragraph', () => {
    const alt = enriched().find((f) => f.category === 'alt_text');
    expect(alt?.occurrences[0]?.anchor).toContain('Page 2');
    expect(alt?.occurrences[0]?.anchor).toContain('line 8');
    expect(alt?.occurrences[0]?.context).toContain('2.1 Approach');
    expect(alt?.occurrences[0]?.excerpt).toContain('inline image');
  });

  it('gives every finding stepwise, decoded remediation', () => {
    for (const finding of enriched()) {
      expect(finding.fixSteps.length + (finding.fixProse ? 1 : 0)).toBeGreaterThan(0);
      for (const step of finding.fixSteps) {
        expect(step).not.toMatch(/&(gt|lt|quot|amp|#0?39);/);
      }
    }
  });

  it('explains what each criterion requires', () => {
    for (const finding of enriched()) {
      expect(finding.requirement, finding.title).toBeTruthy();
    }
  });

  it('orders critical findings first', () => {
    expect(enriched()[0]?.severity).toBe('critical');
  });

  it('sequences document-wide settings before per-instance work', () => {
    const plan = buildRemediationPlan(enriched());
    const first = plan[0];
    expect(['metadata', 'language']).toContain(
      enriched().find((f) => f.title === first?.scope)?.category,
    );
  });
});

describe('standards attribution', () => {
  it('maps findings to WCAG and IS 17802, not only GIGW', () => {
    const frameworks = new Set(enriched().flatMap((f) => f.standardRefs.map((r) => r.framework)));
    expect(frameworks).toContain('WCAG');
    expect(frameworks).toContain('IS_17802');
    expect(frameworks).toContain('GIGW');
    // Alt text engages a direct statutory duty.
    expect(frameworks).toContain('RPWD');
  });

  it('omits PDF/UA for non-PDF documents', () => {
    const docxFrameworks = buildFrameworkCoverage(enriched(), false).map((c) => c.framework);
    expect(docxFrameworks).not.toContain('PDF_UA');

    const pdfFrameworks = buildFrameworkCoverage(enrichFindings(RAW_FINDINGS, 'pdf'), false).map(
      (c) => c.framework,
    );
    expect(pdfFrameworks).toContain('PDF_UA');
  });

  it('marks GIGW advisory for private-sector organisations only', () => {
    const priv = buildFrameworkCoverage(enriched(), false).find((c) => c.framework === 'GIGW');
    const govt = buildFrameworkCoverage(enriched(), true).find((c) => c.framework === 'GIGW');
    expect(priv?.advisory).toBe(true);
    expect(govt?.advisory).toBe(false);
  });

  it('counts distinct issues and instances separately per clause', () => {
    const wcag = buildFrameworkCoverage(enriched(), false).find((c) => c.framework === 'WCAG');
    const colourClause = wcag?.clauses.find((c) => c.ref === '1.4.1');
    expect(colourClause?.issueCount).toBe(1);
    expect(colourClause?.occurrenceCount).toBe(564);
  });

  it('leads with WCAG, the framework that binds everyone', () => {
    expect(buildFrameworkCoverage(enriched(), false)[0]?.framework).toBe('WCAG');
  });
});

describe('rendered report', () => {
  it('never prints an HTML entity as visible text', () => {
    // Entities surviving a single decode mean the value was escaped twice.
    expect(visibleText(render())).not.toMatch(/&(gt|lt|quot|amp|apos|#0?39);/);
  });

  it('escapes markup exactly once', () => {
    expect(render()).not.toMatch(/&amp;(gt|lt|quot|amp|#0?39);/);
  });

  it('renders menu paths and apostrophes readably', () => {
    const text = visibleText(render());
    expect(text).toMatch(/File\s*[>→]\s*Info/);
    expect(text).toMatch(/document['\u2019]s/);
  });

  it('includes a coverage table for every applicable framework', () => {
    const html = render();
    expect(html).toContain('WCAG 2.1 AA');
    expect(html).toContain('IS 17802 (India)');
    expect(html).toContain('GIGW 3.0');
    expect(html).toContain('Conformance by standard');
  });

  it('explains that GIGW is advisory for a private-sector reader', () => {
    expect(visibleText(render(false))).toContain('Advisory for your organisation');
    expect(visibleText(render(true))).not.toContain('Advisory for your organisation');
  });

  it('shows precise locations and search text for each finding', () => {
    const text = visibleText(render());
    expect(text).toContain('Where to find it in the document');
    expect(text).toContain('Text to search for');
    expect(text).toMatch(/Page 2, line 8/);
  });

  it('includes the remediation plan and methodology sections', () => {
    const text = visibleText(render());
    expect(text).toContain('Prioritised remediation plan');
    expect(text).toContain('Methodology and limitations');
    expect(text).toContain('What automated testing cannot decide');
  });

  it('distinguishes distinct issues from total instances', () => {
    const text = visibleText(render());
    expect(text).toContain('Distinct issues versus instances');
    expect(text).toContain('564');
  });

  it('does not present the score as a conformance claim', () => {
    expect(visibleText(render())).toMatch(/not a conformance claim/i);
  });
});

describe('score banding', () => {
  it('reports non-conformance whenever a critical failure exists', () => {
    expect(scoreBand(95, 1, 0).band).toBe('Does not conform');
  });

  it('does not call a high score conforming', () => {
    expect(scoreBand(98, 0, 0).band).not.toMatch(/^Conform/);
  });
});
