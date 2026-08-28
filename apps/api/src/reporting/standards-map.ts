/**
 * Standards Mapping for Document Accessibility Reports
 *
 * A single document finding almost always breaches several frameworks at once.
 * The scanner engines historically stamped every finding with a `GIGW_*`
 * checkpoint id, which made every issue look like a Government of India (GIGW)
 * problem even for private-sector documents. GIGW 3.0 only binds government
 * websites and their documents, so this module re-derives the full set of
 * framework references from the underlying WCAG success criterion and reports
 * each framework separately.
 *
 * Derivation is done at report time (not scan time) so historical scans already
 * in the database get the corrected attribution without a re-scan.
 */

/** A framework this finding breaches. */
export interface StandardRef {
  /** Framework family key — used for grouping in the report. */
  framework: 'WCAG' | 'IS_17802' | 'GIGW' | 'PDF_UA' | 'RPWD';
  /** Human label for the framework, e.g. "WCAG 2.1 AA". */
  frameworkLabel: string;
  /** Clause/criterion identifier within the framework, e.g. "1.1.1". */
  ref: string;
  /** Plain-language name of the clause. */
  title: string;
  /** Conformance level, where the framework defines one. */
  level?: 'A' | 'AA' | 'AAA';
  /**
   * Set when the framework is not universally binding. GIGW 3.0 applies to
   * government bodies; the report surfaces this so private-sector readers know
   * the section is informational for them.
   */
  scope?: string;
}

interface WcagCriterion {
  title: string;
  level: 'A' | 'AA' | 'AAA';
  /** What the criterion requires, in plain language, for a document context. */
  requirement: string;
}

/**
 * WCAG 2.1/2.2 success criteria referenced by the document engines.
 * `requirement` is written for a document author, not a web developer.
 */
export const WCAG_CRITERIA: Record<string, WcagCriterion> = {
  '1.1.1': {
    title: 'Non-text Content',
    level: 'A',
    requirement:
      'Every image, chart, icon and shape that carries meaning must have a text alternative. Purely decorative graphics must be explicitly marked decorative so assistive technology skips them.',
  },
  '1.3.1': {
    title: 'Info and Relationships',
    level: 'A',
    requirement:
      'Structure that is visible on screen — headings, lists, table headers — must also exist in the file format, not just as bold or larger text.',
  },
  '1.3.2': {
    title: 'Meaningful Sequence',
    level: 'A',
    requirement:
      'The order in which assistive technology reads content must match the order a sighted reader would follow.',
  },
  '1.4.1': {
    title: 'Use of Colour',
    level: 'A',
    requirement:
      'Colour must never be the only way meaning is conveyed. Anything shown by colour must also be available as text or a symbol.',
  },
  '1.4.3': {
    title: 'Contrast (Minimum)',
    level: 'AA',
    requirement:
      'Body text needs at least 4.5:1 contrast against its background. Text 18pt and larger (or 14pt bold) needs at least 3:1.',
  },
  '1.4.4': {
    title: 'Resize Text',
    level: 'AA',
    requirement: 'Text must remain readable and usable when enlarged to 200%.',
  },
  '2.2.2': {
    title: 'Pause, Stop, Hide',
    level: 'A',
    requirement:
      'Anything that moves, scrolls or advances automatically for more than five seconds must be pausable by the reader.',
  },
  '2.4.2': {
    title: 'Page Titled',
    level: 'A',
    requirement:
      'The document must carry a descriptive title in its file properties, not just a heading on the first page.',
  },
  '2.4.4': {
    title: 'Link Purpose (In Context)',
    level: 'A',
    requirement:
      'Link text must describe where the link goes. "Click here" and bare URLs fail this criterion.',
  },
  '2.4.6': {
    title: 'Headings and Labels',
    level: 'AA',
    requirement: 'Headings and form labels must describe the content or purpose that follows them.',
  },
  '3.1.1': {
    title: 'Language of Page',
    level: 'A',
    requirement:
      'The document language must be declared in file properties so screen readers pick the correct pronunciation rules.',
  },
  '3.1.2': {
    title: 'Language of Parts',
    level: 'AA',
    requirement:
      'Passages in a different language from the main document must be tagged with that language.',
  },
  '3.3.2': {
    title: 'Labels or Instructions',
    level: 'A',
    requirement: 'Every form field must have a label that says what to enter.',
  },
};

/**
 * GIGW 3.0 checkpoint titles. GIGW ("Guidelines for Indian Government
 * Websites") is issued by MeitY and binds government bodies only.
 */
const GIGW_CHECKPOINTS: Record<string, string> = {
  '5.1.15': 'Legible font sizes',
  '5.1.19': 'Data tables carry header markup',
  '5.2.1': 'Images carry text alternatives',
  '5.2.7': 'Content uses structural markup',
  '5.2.8': 'Content order is meaningful',
  '5.2.12': 'Colour is not the sole carrier of meaning',
  '5.2.14': 'Text meets minimum contrast',
  '5.2.25': 'Time limits and motion are user-controlled',
  '5.2.28': 'Documents and pages are titled',
  '5.2.30': 'Link purpose is clear from link text',
  '5.2.38': 'Document language is declared',
  '5.2.45': 'Form controls have labels and instructions',
  '5.4.9': 'Downloadable documents are in accessible formats',
};

/**
 * PDF/UA (ISO 14289-1) clauses, keyed by the WCAG criterion they correspond to
 * for a PDF. Only meaningful for PDF documents.
 */
const PDF_UA_BY_WCAG: Record<string, { ref: string; title: string }> = {
  '1.1.1': { ref: '7.3', title: 'Graphics — alternative descriptions' },
  '1.3.1': { ref: '7.1', title: 'Real content is tagged with correct semantics' },
  '1.3.2': { ref: '7.1', title: 'Logical structure defines reading order' },
  '1.4.3': { ref: '7.1', title: 'Content is perceivable' },
  '2.4.2': { ref: '7.1', title: 'Document metadata declares a title' },
  '2.4.4': { ref: '7.18', title: 'Annotations — link alternate descriptions' },
  '2.4.6': { ref: '7.4', title: 'Headings are correctly nested' },
  '3.1.1': { ref: '7.2', title: 'Text — natural language is declared' },
  '3.3.2': { ref: '7.18.6', title: 'Widget annotations — form field names' },
};

/** Explicit PDF/UA clauses for findings that have no WCAG equivalent. */
const PDF_UA_DIRECT: Record<string, { ref: string; title: string }> = {
  PDF_UA_1_2: { ref: '7.1', title: 'File is marked as tagged PDF' },
  PDF_UA_1_7: { ref: '7.1', title: 'Security settings permit assistive technology' },
};

/**
 * RPwD Act 2016 hooks. Only the failures that carry a direct statutory
 * obligation are mapped — over-mapping legal references dilutes the signal.
 */
const RPWD_BY_CATEGORY: Record<string, { ref: string; title: string }> = {
  scanned_document: {
    ref: 's.46',
    title: 'Duty to provide information in accessible formats',
  },
  document_structure: {
    ref: 's.46',
    title: 'Duty to provide information in accessible formats',
  },
  alt_text: {
    ref: 's.42',
    title: 'Duty to ensure access to electronic media and information',
  },
};

/** Frameworks the report can render, in the order they should appear. */
export const FRAMEWORK_ORDER: StandardRef['framework'][] = [
  'WCAG',
  'IS_17802',
  'PDF_UA',
  'GIGW',
  'RPWD',
];

export const FRAMEWORK_LABELS: Record<StandardRef['framework'], string> = {
  WCAG: 'WCAG 2.1 AA',
  IS_17802: 'IS 17802 (India)',
  PDF_UA: 'PDF/UA (ISO 14289-1)',
  GIGW: 'GIGW 3.0',
  RPWD: 'RPwD Act 2016',
};

export const FRAMEWORK_DESCRIPTIONS: Record<StandardRef['framework'], string> = {
  WCAG: 'Web Content Accessibility Guidelines 2.1 Level AA — the international baseline referenced by every other framework below. Applies to all organisations.',
  IS_17802:
    'IS 17802:2021, the Bureau of Indian Standards national ICT accessibility standard. Clause 10 covers non-web documents and adopts the WCAG success criteria directly.',
  PDF_UA:
    'ISO 14289-1, the technical standard for accessible PDF. Only assessed for PDF documents.',
  GIGW: 'Guidelines for Indian Government Websites 3.0, issued by MeitY. Mandatory for central and state government bodies and their vendors; informational for private-sector organisations.',
  RPWD: 'Rights of Persons with Disabilities Act 2016. Statutory obligations that these failures engage directly.',
};

/** Frameworks that only bind specific organisation types. */
const FRAMEWORK_SCOPE: Partial<Record<StandardRef['framework'], string>> = {
  GIGW: 'Government bodies and their vendors',
  RPWD: 'All establishments under the RPwD Act 2016',
};

/**
 * IS 17802 clause for a WCAG success criterion.
 *
 * IS 17802 follows the EN 301 549 structure, where clause 10 covers non-web
 * documents and each requirement is numbered `10.` + the WCAG criterion.
 */
function is17802Clause(wcagCriterion: string): string {
  return `10.${wcagCriterion}`;
}

/** Normalise a stored checkpoint id such as `GIGW_5.2.1` to `5.2.1`. */
function stripCheckpointPrefix(checkpointId: string): string {
  return checkpointId.replace(/^(GIGW|IS|PDF_UA|WCAG)[_-]?/i, '');
}

export interface ViolationLike {
  checkpoint_id?: string | null;
  standard?: string | null;
  category?: string | null;
  wcag_criterion?: string | null;
}

/**
 * Derive every framework reference a finding breaches.
 *
 * @param violation - the stored finding
 * @param documentType - lowercase extension (`pdf`, `docx`, ...). PDF/UA
 *   references are only emitted for PDFs.
 */
export function deriveStandardRefs(violation: ViolationLike, documentType: string): StandardRef[] {
  const refs: StandardRef[] = [];
  const criterion = violation.wcag_criterion?.trim() || '';
  const checkpointId = violation.checkpoint_id?.trim() || '';
  const category = violation.category?.trim() || '';
  const isPdf = documentType.toLowerCase() === 'pdf';

  // WCAG — the universal baseline. Emitted whenever we know the criterion.
  const wcag = WCAG_CRITERIA[criterion];
  if (wcag) {
    refs.push({
      framework: 'WCAG',
      frameworkLabel: FRAMEWORK_LABELS.WCAG,
      ref: criterion,
      title: wcag.title,
      level: wcag.level,
    });

    // IS 17802 adopts the WCAG criteria wholesale for documents.
    refs.push({
      framework: 'IS_17802',
      frameworkLabel: FRAMEWORK_LABELS.IS_17802,
      ref: is17802Clause(criterion),
      title: wcag.title,
      level: wcag.level,
    });
  }

  // PDF/UA — only relevant to PDFs.
  if (isPdf) {
    const direct = PDF_UA_DIRECT[checkpointId.replace(/\./g, '_')];
    const viaWcag = PDF_UA_BY_WCAG[criterion];
    const pdfUa = direct ?? viaWcag;
    if (pdfUa) {
      refs.push({
        framework: 'PDF_UA',
        frameworkLabel: FRAMEWORK_LABELS.PDF_UA,
        ref: pdfUa.ref,
        title: pdfUa.title,
      });
    }
  }

  // GIGW — government scope only.
  if (checkpointId.toUpperCase().startsWith('GIGW')) {
    const gigwRef = stripCheckpointPrefix(checkpointId);
    const gigwTitle = GIGW_CHECKPOINTS[gigwRef];
    if (gigwTitle) {
      refs.push({
        framework: 'GIGW',
        frameworkLabel: FRAMEWORK_LABELS.GIGW,
        ref: gigwRef,
        title: gigwTitle,
        scope: FRAMEWORK_SCOPE.GIGW,
      });
    }
  }

  // RPwD Act — only the categories with a direct statutory hook.
  const rpwd = RPWD_BY_CATEGORY[category];
  if (rpwd) {
    refs.push({
      framework: 'RPWD',
      frameworkLabel: FRAMEWORK_LABELS.RPWD,
      ref: rpwd.ref,
      title: rpwd.title,
      scope: FRAMEWORK_SCOPE.RPWD,
    });
  }

  return refs;
}

/** The plain-language requirement text for a WCAG criterion, if known. */
export function wcagRequirement(criterion: string | null | undefined): string | null {
  if (!criterion) return null;
  return WCAG_CRITERIA[criterion.trim()]?.requirement ?? null;
}

/** Short "WCAG 1.1.1 Non-text Content (Level A)" label for inline display. */
export function wcagLabel(criterion: string | null | undefined): string | null {
  if (!criterion) return null;
  const sc = WCAG_CRITERIA[criterion.trim()];
  if (!sc) return null;
  return `WCAG ${criterion.trim()} ${sc.title} (Level ${sc.level})`;
}

/**
 * Per-framework conformance rollup for the report's coverage tables.
 */
export interface FrameworkCoverage {
  framework: StandardRef['framework'];
  label: string;
  description: string;
  scope?: string;
  /** True when this framework is only advisory for the reader. */
  advisory: boolean;
  clauses: Array<{
    ref: string;
    title: string;
    level?: string;
    status: 'Fail';
    /** Distinct findings mapped to this clause. */
    issueCount: number;
    /** Places in the document affected by those findings. */
    occurrenceCount: number;
    worstSeverity: string;
  }>;
  totalIssues: number;
  totalOccurrences: number;
}

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  serious: 3,
  moderate: 2,
  minor: 1,
};

function worstOf(a: string, b: string): string {
  return (SEVERITY_RANK[a] ?? 0) >= (SEVERITY_RANK[b] ?? 0) ? a : b;
}

/**
 * Build the per-framework coverage tables.
 *
 * @param violations - findings, each already carrying `standardRefs`
 * @param isGovernment - when false, GIGW is marked advisory rather than binding
 */
export function buildFrameworkCoverage(
  violations: Array<{ severity: string; standardRefs: StandardRef[]; occurrenceCount?: number }>,
  isGovernment: boolean,
): FrameworkCoverage[] {
  const byFramework = new Map<
    StandardRef['framework'],
    Map<
      string,
      {
        ref: string;
        title: string;
        level?: string;
        count: number;
        occurrences: number;
        worst: string;
      }
    >
  >();

  for (const violation of violations) {
    const occurrences = Math.max(violation.occurrenceCount ?? 1, 1);

    for (const ref of violation.standardRefs) {
      let clauses = byFramework.get(ref.framework);
      if (!clauses) {
        clauses = new Map();
        byFramework.set(ref.framework, clauses);
      }
      const existing = clauses.get(ref.ref);
      if (existing) {
        existing.count += 1;
        existing.occurrences += occurrences;
        existing.worst = worstOf(existing.worst, violation.severity);
      } else {
        clauses.set(ref.ref, {
          ref: ref.ref,
          title: ref.title,
          level: ref.level,
          count: 1,
          occurrences,
          worst: violation.severity,
        });
      }
    }
  }

  const coverage: FrameworkCoverage[] = [];

  for (const framework of FRAMEWORK_ORDER) {
    const clauses = byFramework.get(framework);
    if (!clauses || clauses.size === 0) continue;

    const sorted = [...clauses.values()].sort((a, b) =>
      a.ref.localeCompare(b.ref, undefined, { numeric: true }),
    );

    coverage.push({
      framework,
      label: FRAMEWORK_LABELS[framework],
      description: FRAMEWORK_DESCRIPTIONS[framework],
      scope: FRAMEWORK_SCOPE[framework],
      advisory: framework === 'GIGW' && !isGovernment,
      clauses: sorted.map((c) => ({
        ref: c.ref,
        title: c.title,
        level: c.level,
        status: 'Fail' as const,
        issueCount: c.count,
        occurrenceCount: c.occurrences,
        worstSeverity: c.worst,
      })),
      totalIssues: sorted.reduce((sum, c) => sum + c.count, 0),
      totalOccurrences: sorted.reduce((sum, c) => sum + c.occurrences, 0),
    });
  }

  return coverage;
}
