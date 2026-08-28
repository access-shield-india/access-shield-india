/**
 * Document finding enrichment for reports.
 *
 * Turns the raw finding rows produced by the Python scanner engines into the
 * shape the report template needs:
 *
 *  - text is entity-decoded and typographically normalised
 *  - framework references are re-derived so findings are not all attributed
 *    to GIGW (see standards-map.ts)
 *  - repeated instances of the same defect collapse into one finding with an
 *    occurrence list, so a document with 564 coloured runs produces one
 *    actionable entry rather than 564 near-identical cards
 *  - locations are normalised to the most precise anchor available
 *    (page → line → paragraph → excerpt) so a reader can find the text
 */

import {
  buildFrameworkCoverage,
  deriveStandardRefs,
  wcagLabel,
  wcagRequirement,
  type FrameworkCoverage,
  type StandardRef,
} from './standards-map';
import { cleanText, toFixSteps } from './text-clean';

/**
 * Raw finding as stored in `document_scan_results.violations` JSONB.
 *
 * The `page`/`line`/`excerpt`/`fix_steps`/`occurrences` fields are emitted by
 * newer scanner builds; older rows will not have them, so every consumer must
 * treat them as optional.
 */
export interface RawDocumentFinding {
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
  auto_fixable?: boolean;
  /** 1-based page number, where the format exposes one. */
  page?: number | null;
  /** 1-based line number within the page or paragraph. */
  line?: number | null;
  /** 1-based paragraph index (Word) — layout-independent anchor. */
  paragraph?: number | null;
  /** Slide number (PowerPoint). */
  slide?: number | null;
  /** Sheet name and cell reference (Excel). */
  sheet?: string | null;
  cell?: string | null;
  /** Verbatim text of the offending content, for search-in-document. */
  excerpt?: string | null;
  /** Heading trail the finding sits under, e.g. ["3. Scope", "3.1 Timeline"]. */
  heading_path?: string[] | null;
  /** Pre-split remediation steps from the engine, preferred over prose. */
  fix_steps?: string[] | null;
  /** Count when the engine already aggregated repeats. */
  occurrences?: number | null;
  /**
   * Individual places covered by an aggregated finding. Engines aggregate a
   * repeated defect into one finding so it counts once against the score, and
   * list the affected locations here.
   */
  occurrence_list?: RawOccurrence[] | null;
}

/** One location within an aggregated finding. */
export interface RawOccurrence {
  page?: number | null;
  line?: number | null;
  paragraph?: number | null;
  slide?: number | null;
  sheet?: string | null;
  cell?: string | null;
  excerpt?: string | null;
  heading_path?: string[] | null;
}

/** A single place in the document where a grouped finding occurs. */
export interface FindingOccurrence {
  /** Human-readable anchor, most precise first, e.g. "Page 4, line 12". */
  anchor: string;
  /** Verbatim offending text, when captured. */
  excerpt: string;
  /** Heading trail, joined for display. */
  context: string;
}

export interface EnrichedFinding {
  id: string;
  severity: string;
  severityLabel: string;
  category: string;
  categoryLabel: string;
  /** One-line statement of what is wrong. */
  title: string;
  /** Why it matters to a real reader. */
  impact: string;
  /** What the criterion actually requires, in plain language. */
  requirement: string | null;
  /** Ordered steps to fix it. */
  fixSteps: string[];
  /** Fallback prose when the guidance does not split into steps. */
  fixProse: string;
  /** Every framework clause this breaches. */
  standardRefs: StandardRef[];
  /** Primary WCAG label for the card header. */
  wcagLabel: string | null;
  autoFixable: boolean;
  /** Places this defect occurs. Length 1 for a one-off finding. */
  occurrences: FindingOccurrence[];
  occurrenceCount: number;
  /** Ready-to-render count label, e.g. "12 instances · fixable in bulk". */
  occurrenceLabel: string;
  /** True when occurrences were truncated for readability. */
  occurrencesTruncated: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  alt_text: 'Images and alt text',
  heading_structure: 'Headings and structure',
  colour_contrast: 'Colour and contrast',
  reading_order: 'Reading order',
  table_structure: 'Tables',
  metadata: 'Document properties',
  language: 'Language',
  link_text: 'Links',
  form_fields: 'Form fields',
  scanned_document: 'Scanned pages',
  animation_timing: 'Motion and timing',
  slide_titles: 'Slide titles',
  readability: 'Readability',
  pdf_structure: 'PDF structure',
  document_structure: 'Document structure',
  tagging: 'Tagging',
  scan_error: 'Checks not completed',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  serious: 'Serious',
  moderate: 'Moderate',
  minor: 'Minor',
};

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

/** Occurrences listed per grouped finding before truncating. */
const MAX_OCCURRENCES_SHOWN = 12;

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, ' ');
}

/**
 * Build the most precise human-readable anchor available for a finding.
 *
 * Precision order: page+line → page → slide → sheet+cell → paragraph →
 * whatever free-text location the engine supplied.
 */
function buildAnchor(anchor: RawOccurrence, fallback?: string | null): string {
  const parts: string[] = [];

  if (typeof anchor.page === 'number' && anchor.page > 0) {
    parts.push(`Page ${anchor.page}`);
  }
  if (typeof anchor.slide === 'number' && anchor.slide > 0) {
    parts.push(`Slide ${anchor.slide}`);
  }
  if (anchor.sheet) {
    parts.push(`Sheet "${cleanText(anchor.sheet)}"`);
  }
  if (anchor.cell) {
    parts.push(`Cell ${cleanText(anchor.cell)}`);
  }
  if (typeof anchor.line === 'number' && anchor.line > 0) {
    parts.push(`line ${anchor.line}`);
  }
  if (typeof anchor.paragraph === 'number' && anchor.paragraph > 0) {
    parts.push(`paragraph ${anchor.paragraph}`);
  }

  if (parts.length > 0) return parts.join(', ');

  // Older scans only have the free-text location string.
  return cleanText(fallback) || 'Location not recorded';
}

/**
 * Flatten a finding into its occurrence anchors. Engines that aggregated
 * repeats supply `occurrence_list`; older or one-off findings use their own
 * top-level anchor fields.
 */
function occurrencesOf(finding: RawDocumentFinding): FindingOccurrence[] {
  const list = finding.occurrence_list ?? [];

  if (list.length > 0) {
    return list.map((entry) => ({
      anchor: buildAnchor(entry, finding.location),
      excerpt: cleanText(entry.excerpt),
      context: (entry.heading_path ?? []).map(cleanText).filter(Boolean).join(' › '),
    }));
  }

  return [
    {
      anchor: buildAnchor(finding, finding.location),
      excerpt: cleanText(finding.excerpt) || extractQuotedSample(finding.description),
      context: (finding.heading_path ?? []).map(cleanText).filter(Boolean).join(' › '),
    },
  ];
}

/**
 * Group key for collapsing repeats of the same defect.
 *
 * Quoted content and digits are stripped from the description so
 * `... : 'Prepared by'` and `... : 'Submitted to'` share a key, while genuinely
 * different defects stay separate.
 */
function groupKey(finding: RawDocumentFinding): string {
  const template = cleanText(finding.description)
    .replace(
      /["'\u2018\u2019\u201C\u201D][^"'\u2018\u2019\u201C\u201D]*["'\u2018\u2019\u201C\u201D]/g,
      '"…"',
    )
    .replace(/\d+/g, '#')
    .toLowerCase();

  return [finding.checkpoint_id, finding.category, finding.severity, template].join('|');
}

/**
 * Strip the trailing quoted sample from a grouped description so the card
 * title reads as a general statement rather than quoting one arbitrary
 * instance. The samples move into the occurrence list instead.
 */
function groupTitle(description: string, isGrouped: boolean): string {
  const text = cleanText(description);
  if (!isGrouped) return text;

  return text
    .replace(/[:\u2014-]\s*["'\u2018\u201C][^"'\u2019\u201D]*["'\u2019\u201D]\s*\.?$/, '')
    .replace(/\s*\.?$/, '')
    .trim();
}

/**
 * Collapse, clean and re-attribute raw findings for the report.
 *
 * @param raw - findings from `document_scan_results.violations`
 * @param documentType - lowercase file extension, used for PDF/UA relevance
 */
export function enrichFindings(raw: RawDocumentFinding[], documentType: string): EnrichedFinding[] {
  const groups = new Map<string, { first: RawDocumentFinding; members: RawDocumentFinding[] }>();

  for (const finding of raw) {
    const key = groupKey(finding);
    const existing = groups.get(key);
    if (existing) {
      existing.members.push(finding);
    } else {
      groups.set(key, { first: finding, members: [finding] });
    }
  }

  const enriched: EnrichedFinding[] = [];

  for (const [key, group] of groups) {
    const { first, members } = group;
    const isGrouped = members.length > 1;

    // Occurrences already aggregated engine-side are added to the group count.
    const engineCount = members.reduce(
      (sum, member) =>
        sum + Math.max(member.occurrences ?? 1, member.occurrence_list?.length ?? 1, 1),
      0,
    );

    const allOccurrences = members.flatMap(occurrencesOf);
    const occurrences = allOccurrences.slice(0, MAX_OCCURRENCES_SHOWN);

    const engineSteps = (first.fix_steps ?? []).map(cleanText).filter(Boolean);
    const fixSteps = engineSteps.length > 0 ? engineSteps : toFixSteps(first.remediation);

    const countLabel = engineCount === 1 ? '1 instance' : `${engineCount} instances`;

    enriched.push({
      id: first.violation_id || key,
      severity: first.severity,
      severityLabel: SEVERITY_LABELS[first.severity] ?? first.severity,
      category: first.category,
      categoryLabel: categoryLabel(first.category),
      title: groupTitle(first.description, isGrouped),
      impact: cleanText(first.impact),
      requirement: wcagRequirement(first.wcag_criterion),
      fixSteps,
      fixProse: fixSteps.length > 0 ? '' : cleanText(first.remediation),
      standardRefs: deriveStandardRefs(first, documentType),
      wcagLabel: wcagLabel(first.wcag_criterion),
      autoFixable: Boolean(first.auto_fixable),
      occurrences,
      occurrenceCount: engineCount,
      occurrenceLabel: first.auto_fixable ? `${countLabel} · fixable in bulk` : countLabel,
      occurrencesTruncated: allOccurrences.length > MAX_OCCURRENCES_SHOWN,
    });
  }

  return enriched.sort((a, b) => {
    const severityDelta = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
    if (severityDelta !== 0) return severityDelta;
    // Within a severity, lead with the defects that occur most often.
    return b.occurrenceCount - a.occurrenceCount;
  });
}

/** Pull the first quoted sample out of a description, for occurrence display. */
function extractQuotedSample(description: string): string {
  const match = cleanText(description).match(
    /["'\u2018\u201C]([^"'\u2019\u201D]{2,120})["'\u2019\u201D]/,
  );
  return match?.[1]?.trim() ?? '';
}

/** A category rollup for the report's "where the problems are" table. */
export interface CategorySummary {
  category: string;
  label: string;
  distinctFindings: number;
  totalOccurrences: number;
  worstSeverity: string;
  worstSeverityLabel: string;
}

export function buildCategorySummary(findings: EnrichedFinding[]): CategorySummary[] {
  const byCategory = new Map<string, CategorySummary>();

  for (const finding of findings) {
    const existing = byCategory.get(finding.category);
    if (existing) {
      existing.distinctFindings += 1;
      existing.totalOccurrences += finding.occurrenceCount;
      if ((SEVERITY_ORDER[finding.severity] ?? 9) < (SEVERITY_ORDER[existing.worstSeverity] ?? 9)) {
        existing.worstSeverity = finding.severity;
        existing.worstSeverityLabel = finding.severityLabel;
      }
    } else {
      byCategory.set(finding.category, {
        category: finding.category,
        label: finding.categoryLabel,
        distinctFindings: 1,
        totalOccurrences: finding.occurrenceCount,
        worstSeverity: finding.severity,
        worstSeverityLabel: finding.severityLabel,
      });
    }
  }

  return [...byCategory.values()].sort((a, b) => {
    const severityDelta =
      (SEVERITY_ORDER[a.worstSeverity] ?? 9) - (SEVERITY_ORDER[b.worstSeverity] ?? 9);
    if (severityDelta !== 0) return severityDelta;
    return b.totalOccurrences - a.totalOccurrences;
  });
}

/**
 * Ordered remediation plan.
 *
 * Sequenced so that document-wide structural fixes (title, language, tagging)
 * come before per-instance work, because fixing structure first often removes
 * or reshapes the individual findings underneath it.
 */
export interface RemediationStep {
  order: number;
  action: string;
  scope: string;
  severityLabel: string;
  occurrences: number;
  effort: string;
  autoFixable: boolean;
}

/** Rough effort bands, driven by how many places need touching. */
function effortBand(finding: EnrichedFinding): string {
  if (finding.autoFixable && finding.occurrenceCount <= 2) return 'Under 5 minutes';
  if (finding.occurrenceCount === 1) return 'Under 15 minutes';
  if (finding.occurrenceCount <= 10) return '15–60 minutes';
  if (finding.occurrenceCount <= 50) return '1–3 hours';
  return 'Half a day or more';
}

/** Categories that are document-wide settings, fixed once, first. */
const STRUCTURAL_CATEGORIES = new Set([
  'metadata',
  'language',
  'document_structure',
  'pdf_structure',
  'tagging',
  'scanned_document',
]);

export function buildRemediationPlan(findings: EnrichedFinding[]): RemediationStep[] {
  const ordered = [...findings].sort((a, b) => {
    const aStructural = STRUCTURAL_CATEGORIES.has(a.category) ? 0 : 1;
    const bStructural = STRUCTURAL_CATEGORIES.has(b.category) ? 0 : 1;
    if (aStructural !== bStructural) return aStructural - bStructural;

    const severityDelta = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
    if (severityDelta !== 0) return severityDelta;
    return b.occurrenceCount - a.occurrenceCount;
  });

  return ordered.map((finding, index) => ({
    order: index + 1,
    action: finding.fixSteps[0] ?? finding.fixProse ?? finding.title,
    scope: finding.title,
    severityLabel: finding.severityLabel,
    occurrences: finding.occurrenceCount,
    effort: effortBand(finding),
    autoFixable: finding.autoFixable,
  }));
}

/**
 * Plain-language band and explanation for a compliance score.
 *
 * WCAG conformance is pass/fail at a given level, so the wording deliberately
 * avoids implying that a high score is a conformance claim.
 */
export function scoreBand(
  score: number,
  criticalCount: number,
  seriousCount: number,
): { band: string; summary: string } {
  if (criticalCount > 0) {
    return {
      band: 'Does not conform',
      summary:
        'This document has at least one critical failure, which means some content is completely unavailable to readers using a screen reader. Critical findings must be resolved before the document can be published or relied on as an accessible format. The score below tracks progress; it is not a conformance claim.',
    };
  }
  if (seriousCount > 0) {
    return {
      band: 'Does not conform — significant barriers',
      summary:
        'No content is entirely unreachable, but serious barriers remain that make parts of this document slow or unreliable to use with assistive technology. These should be resolved before publication. The score below tracks progress; it is not a conformance claim.',
    };
  }
  if (score >= 90) {
    return {
      band: 'Close to conforming',
      summary:
        'Only moderate and minor gaps remain. Clearing them, together with the manual checks listed under Methodology and limitations, would put this document in a defensible position.',
    };
  }
  return {
    band: 'Partial conformance',
    summary:
      'The remaining findings degrade the experience rather than block it outright, but enough of them are present that some readers will miss information. Work through the remediation plan in order.',
  };
}

const MANUAL_CHECKS_COMMON = [
  'Whether existing alt text actually describes the image, rather than merely being present.',
  'Whether the reading order a screen reader follows matches the order a sighted reader would use.',
  'Whether heading text genuinely describes the section it introduces.',
  'Whether link text makes sense when read out of context, as screen reader users often do.',
  'Whether colour contrast passes against the actual background behind the text, including images and shading behind it.',
  'Whether the language of individual passages is tagged where the document mixes English with Hindi or another Indian language.',
];

const MANUAL_CHECKS_BY_TYPE: Record<string, string[]> = {
  pdf: [
    'Whether the tag tree matches the visual structure, verified with the Acrobat Reading Order tool.',
    'Whether table header cells are scoped to the correct rows and columns.',
    'Whether OCR output on any scanned pages is accurate, especially for Devanagari and other Indic scripts.',
  ],
  docx: [
    'Whether tables are used for data rather than for page layout, since layout tables need different treatment.',
    'Whether content in text boxes and floating shapes is reachable, as screen readers often skip it.',
  ],
  pptx: [
    'Whether the Selection Pane order on each slide produces a sensible narration sequence.',
    'Whether embedded audio and video carry captions and transcripts.',
  ],
  xlsx: [
    'Whether every data region is a defined Excel Table so headers are announced.',
    'Whether formulas and conditional formatting convey anything that is not also available as text.',
  ],
};

/** Checks a human must perform before conformance can be claimed. */
export function manualChecksFor(documentType: string): string[] {
  const specific = MANUAL_CHECKS_BY_TYPE[documentType.toLowerCase()] ?? [];
  return [...MANUAL_CHECKS_COMMON, ...specific];
}

export { buildFrameworkCoverage };
export type { FrameworkCoverage, StandardRef };
