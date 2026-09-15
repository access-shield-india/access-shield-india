/**
 * Plain-language issue summaries for scan results.
 *
 * The scanner stores one row per broken element. This module groups those
 * rows and rewrites them so a non-technical reader can see what is wrong,
 * who it affects, how to fix it, and which team owns it — without a re-scan.
 */

type IssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor';

export type IssueOwner = 'Design team' | 'Content team' | 'Development team' | 'Compliance team';

export type IssuePriority = 'High' | 'Medium' | 'Low';

export interface PlainLanguageGuide {
  owner: IssueOwner;
  /** Why a real person is affected. */
  impact: string;
  /** One practical fix, not a code snippet. */
  fix: string;
  headline: (count: number) => string;
}

export interface IssueOccurrenceInput {
  id: string;
  pageUrl?: string | null;
  selector?: string | null;
}

export interface IssueSummaryInput {
  id: string;
  ruleId: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor' | string;
  description: string;
  wcagCriteria?: string[] | null;
  standard?: string | null;
  pageUrl?: string | null;
  selector?: string | null;
}

export interface IssueSummaryOccurrence {
  id: string;
  pageUrl: string | null;
  selector: string | null;
}

export interface IssueSummary {
  ruleId: string;
  count: number;
  pageCount: number;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  standard: string | null;
  wcagCriterion: string | null;
  headline: string;
  impact: string;
  fix: string;
  owner: IssueOwner;
  priority: IssuePriority;
  pages: string[];
  occurrences: IssueSummaryOccurrence[];
  moreOccurrences: number;
}

const SEVERITY_RANK: Record<IssueSeverity, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

const PRIORITY_RANK: Record<IssuePriority, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

/** Occurrences listed on a card before we send the reader to the technical list. */
const MAX_OCCURRENCES = 8;
const MAX_PAGES = 8;

function counted(
  count: number,
  one: string,
  other: string,
  verb: { one: string; other: string },
): string {
  const noun = count === 1 ? one : other;
  const phrase = count === 1 ? verb.one : verb.other;
  return `${count} ${noun} ${phrase}`;
}

function problem(one: string, other: string): { one: string; other: string } {
  return { one, other };
}

function guide(
  owner: IssueOwner,
  impact: string,
  fix: string,
  one: string,
  other: string,
  verb: { one: string; other: string },
): PlainLanguageGuide {
  return {
    owner,
    impact,
    fix,
    headline: (count) => counted(count, one, other, verb),
  };
}

const RULE_GUIDES: Record<string, PlainLanguageGuide> = {
  'color-contrast': guide(
    'Design team',
    'Users with low vision may struggle to read this content.',
    'Increase the contrast between the text and its background.',
    'text element',
    'text elements',
    problem("doesn't have sufficient colour contrast", "don't have sufficient colour contrast"),
  ),
  'image-alt': guide(
    'Content team',
    'People who cannot see the image miss whatever it is showing.',
    'Add a short description of what the image shows. Mark decorative images as decorative.',
    'image',
    'images',
    problem('has no description', 'have no description'),
  ),
  'input-image-alt': guide(
    'Content team',
    'People who cannot see an image button do not know what it does.',
    'Add a short description of what the image button does, such as "Search" or "Submit".',
    'image button',
    'image buttons',
    problem('has no description', 'have no description'),
  ),
  'area-alt': guide(
    'Content team',
    'People who cannot see the image map do not know where those clickable areas go.',
    'Add a short description for each clickable area on the image.',
    'clickable area',
    'clickable areas',
    problem('has no description', 'have no description'),
  ),
  'object-alt': guide(
    'Content team',
    'People who cannot see the embedded object miss its meaning.',
    'Add a short text alternative for the embedded object.',
    'embedded item',
    'embedded items',
    problem('has no description', 'have no description'),
  ),
  'svg-img-alt': guide(
    'Content team',
    'People who cannot see the icon or graphic miss its meaning.',
    'Add a short description, or mark the graphic as decorative if it adds no information.',
    'graphic',
    'graphics',
    problem('has no description', 'have no description'),
  ),
  'role-img-alt': guide(
    'Content team',
    'People who cannot see this graphic miss its meaning.',
    'Add a short description, or mark it as decorative if it adds no information.',
    'graphic',
    'graphics',
    problem('has no description', 'have no description'),
  ),
  'button-name': guide(
    'Development team',
    'Someone using a screen reader hears "button" and does not know what it does.',
    'Give each button a short visible label, such as "Next" or "Close".',
    'button',
    'buttons',
    problem('has no name', 'have no name'),
  ),
  'link-name': guide(
    'Content team',
    'People cannot tell where the link goes, especially if they cannot see the page.',
    'Replace vague or empty links with words that say where the link goes.',
    'link',
    'links',
    problem('has no clear name', 'have no clear name'),
  ),
  'link-in-text-block': guide(
    'Design team',
    'People who cannot rely on colour may not notice these links in a paragraph.',
    'Underline links, or add another visual cue besides colour.',
    'link',
    'links',
    problem('is only shown by colour', 'are only shown by colour'),
  ),
  label: guide(
    'Development team',
    'People cannot tell what to type into the field, especially if they cannot see the layout.',
    'Add a visible label next to the field, such as "Email" or "Phone number".',
    'form field',
    'form fields',
    problem('has no label', 'have no label'),
  ),
  'select-name': guide(
    'Development team',
    'People cannot tell what the dropdown is asking for.',
    'Add a visible label that names the dropdown.',
    'dropdown',
    'dropdowns',
    problem('has no label', 'have no label'),
  ),
  'input-button-name': guide(
    'Development team',
    'People cannot tell what this button will do.',
    'Give the button a clear name, such as "Search" or "Submit".',
    'button',
    'buttons',
    problem('has no name', 'have no name'),
  ),
  'document-title': guide(
    'Content team',
    'People with many tabs open cannot tell which page this is.',
    'Give the page a title that describes it, such as "Contact us — Company name".',
    'page',
    'pages',
    problem('has no useful title', 'have no useful title'),
  ),
  'html-has-lang': guide(
    'Development team',
    'Screen readers may pronounce the page in the wrong language.',
    'Set the page language, for example English or Hindi.',
    'page',
    'pages',
    problem('does not say which language it is in', 'do not say which language they are in'),
  ),
  'html-lang-valid': guide(
    'Development team',
    'Screen readers may pronounce the page in the wrong language.',
    'Use a valid language code, such as "en" or "hi".',
    'page',
    'pages',
    problem('has an invalid language setting', 'have an invalid language setting'),
  ),
  'valid-lang': guide(
    'Development team',
    'A passage may be read aloud in the wrong language.',
    'Mark that passage with the correct language.',
    'passage',
    'passages',
    problem('has an invalid language setting', 'have an invalid language setting'),
  ),
  'heading-order': guide(
    'Content team',
    'People who navigate by headings can lose their place on the page.',
    'Use headings in order — a main heading, then subheadings — and do not skip levels.',
    'heading',
    'headings',
    problem('is out of order', 'are out of order'),
  ),
  'empty-heading': guide(
    'Content team',
    'People who navigate by headings land on a blank heading and get no clue what follows.',
    'Give the heading real text, or remove it if it is not needed.',
    'heading',
    'headings',
    problem('is empty', 'are empty'),
  ),
  'page-has-heading-one': guide(
    'Content team',
    'People cannot quickly tell what the page is about.',
    'Add one clear main heading at the top of the page.',
    'page',
    'pages',
    problem('has no main heading', 'have no main heading'),
  ),
  'duplicate-id': guide(
    'Development team',
    'Assistive technology can jump to the wrong place, and forms can behave unexpectedly.',
    'Give each item on the page a unique identifier.',
    'item',
    'items',
    problem('shares an identifier with something else', 'share an identifier with something else'),
  ),
  'frame-title': guide(
    'Development team',
    'People cannot tell what the embedded frame contains before they enter it.',
    'Give the frame a short title that says what is inside.',
    'embedded frame',
    'embedded frames',
    problem('has no title', 'have no title'),
  ),
  'meta-viewport': guide(
    'Development team',
    'People who need larger text cannot zoom the page.',
    'Allow zooming. Do not lock the page at a fixed size.',
    'page',
    'pages',
    problem('blocks zooming', 'block zooming'),
  ),
  'target-size': guide(
    'Design team',
    'People with limited dexterity may miss these small clickable items.',
    'Make clickable items at least 24 by 24 pixels, with space around them.',
    'clickable item',
    'clickable items',
    problem('is too small to tap reliably', 'are too small to tap reliably'),
  ),
  bypass: guide(
    'Development team',
    'Keyboard users have to tab through the same menu on every page before they reach the content.',
    'Add a "Skip to main content" link at the top of the page.',
    'page',
    'pages',
    problem('has no way to skip repeated menus', 'have no way to skip repeated menus'),
  ),
  'nested-interactive': guide(
    'Development team',
    'A click or a keyboard press may activate the wrong control.',
    'Do not put a button or link inside another button or link. Split them apart.',
    'control',
    'controls',
    problem('is nested inside another control', 'are nested inside another control'),
  ),
  'scrollable-region-focusable': guide(
    'Development team',
    'Keyboard users cannot reach content that only appears inside a scroll box.',
    'Make the scroll box reachable with the keyboard.',
    'scroll box',
    'scroll boxes',
    problem('cannot be reached with a keyboard', 'cannot be reached with a keyboard'),
  ),
  'aria-hidden-focus': guide(
    'Development team',
    'Keyboard users can land on something the page has hidden from screen readers.',
    'If an item is hidden, also take it out of the keyboard order.',
    'hidden item',
    'hidden items',
    problem('can still be reached with a keyboard', 'can still be reached with a keyboard'),
  ),
  'IS-001': guide(
    'Development team',
    'Screen readers may pronounce the page in the wrong language.',
    'Set the page language to a valid Indian or English language code, such as "en" or "hi".',
    'page',
    'pages',
    problem('does not declare a valid language', 'do not declare a valid language'),
  ),
  'IS-002': guide(
    'Content team',
    'Hindi may be unreadable for people using a screen reader or a Hindi font.',
    'Write Hindi in Unicode Devanagari, not English letters.',
    'page',
    'pages',
    problem('shows Hindi as English letters', 'show Hindi as English letters'),
  ),
  'IS-003': guide(
    'Content team',
    'Help text in another language leaves people unsure how to fill the form.',
    'Write the help text in the same language as the field label.',
    'form field',
    'form fields',
    problem('has help text in a different language', 'have help text in a different language'),
  ),
  'IS-004': guide(
    'Development team',
    'People in India expect dates as day/month/year and may enter the wrong date.',
    'Accept and show dates as DD/MM/YYYY.',
    'date field',
    'date fields',
    problem('does not use the Indian date format', 'do not use the Indian date format'),
  ),
  'IS-005': guide(
    'Development team',
    'People who cannot see or solve an image captcha are blocked.',
    'Offer an audio or other non-visual way to pass the check.',
    'security check',
    'security checks',
    problem('has no audio alternative', 'have no audio alternative'),
  ),
  'IS-006': guide(
    'Content team',
    'People who cannot use a PDF have no other way to read the document.',
    'Add an accessible HTML version next to the PDF link.',
    'PDF link',
    'PDF links',
    problem('has no accessible HTML alternative', 'have no accessible HTML alternative'),
  ),
  'GIGW-001': guide(
    'Compliance team',
    'People cannot find how accessible the site claims to be, or how to get help.',
    'Publish an accessibility statement and link it from the site.',
    'page',
    'pages',
    problem('has no accessibility statement', 'have no accessibility statement'),
  ),
  'GIGW-002': guide(
    'Compliance team',
    'People cannot find who to contact if they cannot use the site.',
    'Add a link to the grievance officer or accessibility contact.',
    'page',
    'pages',
    problem('has no grievance contact', 'have no grievance contact'),
  ),
  'GIGW-003': guide(
    'Content team',
    'People cannot find a full list of pages when search or menus fail them.',
    'Publish a sitemap and link it from the site.',
    'page',
    'pages',
    problem('has no sitemap', 'have no sitemap'),
  ),
  'GIGW-004': guide(
    'Content team',
    'People cannot tell whether the information is still current.',
    'Show when the page was last updated, in DD/MM/YYYY.',
    'page',
    'pages',
    problem('does not show when it was last updated', 'do not show when they were last updated'),
  ),
  'GIGW-005': guide(
    'Content team',
    'Hindi-speaking users have no version of this page in their language.',
    'Offer a Hindi version of the page and link to it.',
    'page',
    'pages',
    problem('has no Hindi version', 'have no Hindi version'),
  ),
  'SEBI-001': guide(
    'Design team',
    'People who cannot tell colours apart may miss whether a price went up or down.',
    'Add text or a symbol as well as colour, such as "up" or "down".',
    'market indicator',
    'market indicators',
    problem('uses colour alone', 'use colour alone'),
  ),
  'SEBI-002': guide(
    'Content team',
    'People who cannot see a chart miss the figures it is showing.',
    'Add a text or table version of the chart.',
    'chart',
    'charts',
    problem('has no text alternative', 'have no text alternative'),
  ),
  'SEBI-003': guide(
    'Development team',
    'Moving prices can stop people from reading the rest of the page.',
    'Add a pause or stop control for live tickers and auto-updating prices.',
    'live ticker',
    'live tickers',
    problem('cannot be paused', 'cannot be paused'),
  ),
  'SEBI-004': guide(
    'Content team',
    'People who cannot use a PDF cannot read the investor document.',
    'Add an accessible HTML version next to each investor or disclosure PDF.',
    'PDF link',
    'PDF links',
    problem('has no accessible HTML alternative', 'have no accessible HTML alternative'),
  ),
  'SEBI-005': guide(
    'Compliance team',
    'People cannot find the organisation’s accessibility commitment or how to get help.',
    'Publish a public accessibility statement and link it from the site.',
    'site',
    'sites',
    problem('has no accessibility statement', 'have no accessibility statement'),
  ),
};

const CRITERION_GUIDES: Record<string, PlainLanguageGuide> = {
  '1.1.1': RULE_GUIDES['image-alt']!,
  '1.3.1': guide(
    'Development team',
    'Structure that looks obvious on screen — headings, lists, tables — may be invisible to assistive technology.',
    'Mark headings, lists and table headers in the code, not only with bold or bigger text.',
    'item',
    'items',
    problem('does not expose its structure', 'do not expose their structure'),
  ),
  '1.4.1': RULE_GUIDES['SEBI-001']!,
  '1.4.3': RULE_GUIDES['color-contrast']!,
  '1.4.4': RULE_GUIDES['meta-viewport']!,
  '2.1.1': guide(
    'Development team',
    'People who cannot use a mouse cannot operate this control.',
    'Make it work with a keyboard as well as a mouse or touch.',
    'control',
    'controls',
    problem('cannot be used with a keyboard', 'cannot be used with a keyboard'),
  ),
  '2.4.1': RULE_GUIDES.bypass!,
  '2.4.2': RULE_GUIDES['document-title']!,
  '2.4.4': RULE_GUIDES['link-name']!,
  '2.4.6': guide(
    'Content team',
    'People cannot tell what a section or field is for.',
    'Rewrite the heading or label so it describes what follows.',
    'heading or label',
    'headings or labels',
    problem('does not describe its purpose', 'do not describe their purpose'),
  ),
  '2.4.7': guide(
    'Design team',
    'Keyboard users cannot see where they are on the page.',
    'Show a clear focus outline on the item that is selected.',
    'control',
    'controls',
    problem('has no visible focus', 'have no visible focus'),
  ),
  '2.5.8': RULE_GUIDES['target-size']!,
  '3.1.1': RULE_GUIDES['html-has-lang']!,
  '3.3.2': RULE_GUIDES.label!,
  '4.1.2': guide(
    'Development team',
    'Assistive technology cannot tell what the control is or what it will do.',
    'Give the control a name, and make sure its role and state are announced.',
    'control',
    'controls',
    problem('has no name people can understand', 'have no name people can understand'),
  ),
};

const GENERIC_GUIDE: PlainLanguageGuide = {
  owner: 'Development team',
  impact: 'Some people may not be able to use this part of the page.',
  fix: 'Open the exact spots and fix the marked items. A developer can see the technical detail there.',
  headline: (count) =>
    count === 1 ? '1 item needs an accessibility fix' : `${count} items need an accessibility fix`,
};

function firstSentence(description: string): string {
  const cleaned = description.replace(/\s+/g, ' ').trim();
  const match = cleaned.match(/^[^.!?]+[.!?]?/);
  return (match?.[0] ?? cleaned).replace(/[.!?]+$/, '').trim();
}

function isSeverity(value: string): value is IssueSeverity {
  return value === 'critical' || value === 'serious' || value === 'moderate' || value === 'minor';
}

/** Map scanner severity to a business priority a non-technical reader can act on. */
export function priorityFromSeverity(
  severity: 'critical' | 'serious' | 'moderate' | 'minor',
): IssuePriority {
  if (severity === 'critical' || severity === 'serious') return 'High';
  if (severity === 'moderate') return 'Medium';
  return 'Low';
}

export function resolveIssueGuide(
  ruleId: string,
  wcagCriterion?: string | null,
  description?: string | null,
): PlainLanguageGuide {
  const byRule = RULE_GUIDES[ruleId];
  if (byRule) return byRule;

  const byCriterion = wcagCriterion ? CRITERION_GUIDES[wcagCriterion] : undefined;
  if (byCriterion) return byCriterion;

  const sentence = description ? firstSentence(description) : '';
  if (!sentence) return GENERIC_GUIDE;

  return {
    ...GENERIC_GUIDE,
    headline: (count) =>
      count === 1 ? `1 item: ${sentence}` : `${count} items: ${sentence}`,
  };
}

function worstSeverity(current: IssueSeverity, next: string): IssueSeverity {
  if (!isSeverity(next)) return current;
  return SEVERITY_RANK[next] < SEVERITY_RANK[current] ? next : current;
}

/**
 * Group raw violation rows into plain-language issue cards.
 * Grouping key is the scanner rule, so repeated buttons collapse into one card.
 */
export function summariseIssues(rows: IssueSummaryInput[]): IssueSummary[] {
  const groups = new Map<
    string,
    {
      ruleId: string;
      count: number;
      severity: IssueSeverity;
      standard: string | null;
      wcagCriterion: string | null;
      description: string;
      pages: Set<string>;
      occurrences: IssueSummaryOccurrence[];
    }
  >();

  for (const row of rows) {
    const existing = groups.get(row.ruleId);
    const severity = isSeverity(row.impact) ? row.impact : 'moderate';
    const criterion = row.wcagCriteria?.[0] ?? null;

    if (!existing) {
      const pages = new Set<string>();
      if (row.pageUrl) pages.add(row.pageUrl);
      groups.set(row.ruleId, {
        ruleId: row.ruleId,
        count: 1,
        severity,
        standard: row.standard ?? null,
        wcagCriterion: criterion,
        description: row.description,
        pages,
        occurrences: [
          {
            id: row.id,
            pageUrl: row.pageUrl ?? null,
            selector: row.selector ?? null,
          },
        ],
      });
      continue;
    }

    existing.count += 1;
    existing.severity = worstSeverity(existing.severity, row.impact);
    if (!existing.wcagCriterion && criterion) existing.wcagCriterion = criterion;
    if (!existing.standard && row.standard) existing.standard = row.standard;
    if (row.pageUrl) existing.pages.add(row.pageUrl);
    existing.occurrences.push({
      id: row.id,
      pageUrl: row.pageUrl ?? null,
      selector: row.selector ?? null,
    });
  }

  const summaries: IssueSummary[] = [];
  for (const group of groups.values()) {
    const guideForRule = resolveIssueGuide(group.ruleId, group.wcagCriterion, group.description);
    const shown = group.occurrences.slice(0, MAX_OCCURRENCES);
    summaries.push({
      ruleId: group.ruleId,
      count: group.count,
      pageCount: group.pages.size,
      severity: group.severity,
      standard: group.standard,
      wcagCriterion: group.wcagCriterion,
      headline: guideForRule.headline(group.count),
      impact: guideForRule.impact,
      fix: guideForRule.fix,
      owner: guideForRule.owner,
      priority: priorityFromSeverity(group.severity),
      pages: [...group.pages].slice(0, MAX_PAGES),
      occurrences: shown,
      moreOccurrences: Math.max(0, group.occurrences.length - shown.length),
    });
  }

  summaries.sort((a, b) => {
    const priorityDelta = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDelta !== 0) return priorityDelta;
    const severityDelta = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (severityDelta !== 0) return severityDelta;
    return b.count - a.count;
  });

  return summaries;
}
