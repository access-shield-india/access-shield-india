/** Rule-based / heuristic HTML fixes for AI fallback and local-dev mock. */

export interface HeuristicFixResult {
  fixHtml: string;
  explanation: string;
  beforeHtml: string;
  afterHtml: string;
  changed: boolean;
  /** True when this came from the offline mock path (AI unreachable). */
  isDevPreview: boolean;
}

export interface DevMockFixResult extends HeuristicFixResult {
  isDevPreview: true;
}

const DEV_PREVIEW_MARKER = 'Development preview:';
const HEURISTIC_MARKER = 'Heuristic assist:';

/** True when the stored fix came from the local dev mock, not Claude. */
export function isDevPreviewAiFix(
  explanation: string | null | undefined,
  fixHtml: string | null | undefined,
): boolean {
  if (explanation?.includes(DEV_PREVIEW_MARKER)) {
    return true;
  }
  if (fixHtml?.trimStart().startsWith('<!-- Dev preview fix')) {
    return true;
  }
  return false;
}

/** Strip legacy dev mock HTML comment prefix from cached fixes. */
export function stripDevPreviewComment(fixHtml: string): string {
  return fixHtml.replace(/^<!-- Dev preview fix[^>]*-->\s*/i, '').trim();
}

/**
 * Fix invalid ARIA roles (axe aria-allowed-role).
 * rowgroup is not allowed on &lt;li&gt;; carousel slides should use group + roledescription.
 */
export function fixAriaAllowedRole(elementHtml: string): string {
  if (/\brole="rowgroup"/i.test(elementHtml) && /<li\b/i.test(elementHtml)) {
    if (/slide\s*\d+/i.test(elementHtml)) {
      return elementHtml.replace(
        /\srole="rowgroup"/i,
        ' role="group" aria-roledescription="slide"',
      );
    }
    return elementHtml.replace(/\srole="rowgroup"/i, '');
  }

  if (/\brole="presentation"/i.test(elementHtml) && /<(?:button|a)\b/i.test(elementHtml)) {
    return elementHtml.replace(/\srole="presentation"/i, '');
  }

  return elementHtml;
}

/** Ensure inline styles include a high-contrast text colour (WCAG 1.4.3 assist). */
export function fixColorContrastStyles(elementHtml: string): string {
  if (!/style\s*=/i.test(elementHtml)) {
    // Attach a style if the fragment looks style-like (axe sometimes truncates the tag start)
    if (/background-color\s*:/i.test(elementHtml)) {
      return elementHtml.replace(
        /background-color\s*:/i,
        'color: #0f172a; background-color:',
      );
    }
    return elementHtml;
  }

  return elementHtml.replace(/style\s*=\s*(["'])([\s\S]*?)\1/i, (_full, quote: string, styles: string) => {
    let next = styles.trim();
    if (/background-color\s*:/i.test(next) && !/(?:^|;)\s*color\s*:/i.test(next)) {
      next = `color: #0f172a; ${next}`;
    } else if (/(?:^|;)\s*color\s*:/i.test(next)) {
      next = next.replace(/(?:^|;)\s*color\s*:\s*[^;]+/i, (match) => {
        const prefix = match.startsWith(';') ? ';' : '';
        return `${prefix} color: #0f172a`;
      });
    } else {
      next = `color: #0f172a; ${next}`;
    }
    // Soften very light greens that often fail contrast with dark text still ok;
    // prefer ensuring text colour first (already done).
    return `style=${quote}${next.trim()}${quote}`;
  });
}

function withStyleAttr(html: string, patch: (styles: string) => string): string {
  if (/style\s*=/i.test(html)) {
    return html.replace(/style\s*=\s*(["'])([\s\S]*?)\1/i, (_f, q: string, styles: string) => {
      return `style=${q}${patch(styles)}${q}`;
    });
  }
  return html;
}

const PLACEHOLDER_NAME_RE =
  /\[Describe link purpose\]|\[Describe the image purpose\]|\[Describe the action\]|\[Visible field label\]|\[Action\]/i;

const NOISE_FILENAME_TOKENS = new Set([
  'scaled',
  'final',
  'img',
  'image',
  'photo',
  'pic',
  'thumb',
  'thumbnail',
  'large',
  'small',
  'medium',
  'full',
  'original',
  'copy',
  'new',
  'old',
  'v1',
  'v2',
  'v3',
  'wp',
  'content',
  'uploads',
]);

function attrValue(html: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i');
  return html.match(re)?.[1] ?? null;
}

function titleCaseWords(raw: string): string {
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (/^[A-Z0-9]{2,6}$/.test(w)) return w;
      if (/^\d+$/.test(w)) return '';
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join(' ')
    .trim();
}

/** Turn a URL path / filename into readable words (e.g. NISM-Final-1-scaled.webp → NISM). */
export function humanizeAssetName(raw: string): string {
  const decoded = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();
  const base = decoded.replace(/\.[a-z0-9]{2,5}$/i, '');
  const tokens = base
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_./]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .filter((t) => !NOISE_FILENAME_TOKENS.has(t.toLowerCase()))
    .filter((t) => !/^\d{6,}$/.test(t));
  return titleCaseWords(tokens.join(' '));
}

function mediaKindFromUrl(url: string): 'image' | 'document' | 'page' {
  if (/\.(webp|png|jpe?g|gif|svg|avif|bmp)(\?|$)/i.test(url)) return 'image';
  if (/\.(pdf|docx?|xlsx?|pptx?|zip)(\?|$)/i.test(url)) return 'document';
  return 'page';
}

export interface AccessibleNameSuggestion {
  /** Best label to put in aria-label / alt */
  primary: string;
  /** Extra candidates for the developer to pick from */
  alternatives: string[];
}

/**
 * Derive concrete accessible-name options from href/src/filename/page context.
 * Prefer this over placeholders like "[Describe link purpose]".
 */
export function suggestAccessibleNameOptions(
  elementHtml: string,
  kind: 'link' | 'image' | 'button' | 'input' = 'link',
  pageContext?: string,
): AccessibleNameSuggestion {
  const href = attrValue(elementHtml, 'href');
  const src = attrValue(elementHtml, 'src');
  const existingAlt = attrValue(elementHtml, 'alt')?.trim();
  const title = attrValue(elementHtml, 'title')?.trim();
  const url = href || src || '';

  let assetLabel = '';
  let hostHint = '';
  let kindOf = mediaKindFromUrl(url);

  if (url) {
    try {
      const parsed = new URL(url, 'https://example.invalid');
      const file = parsed.pathname.split('/').filter(Boolean).pop() || '';
      assetLabel = humanizeAssetName(file);
      hostHint = parsed.hostname.replace(/^www\./i, '').split('.')[0] || '';
      if (hostHint) hostHint = titleCaseWords(hostHint);
    } catch {
      assetLabel = humanizeAssetName(url.split('/').pop() || url);
    }
  }

  if (!assetLabel && existingAlt && !PLACEHOLDER_NAME_RE.test(existingAlt)) {
    assetLabel = existingAlt;
  }
  if (!assetLabel && title && !PLACEHOLDER_NAME_RE.test(title)) {
    assetLabel = title;
  }

  // Pull a short phrase from page context (description / URL path)
  if (!assetLabel && pageContext) {
    const ctx = pageContext.replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim();
    const words = ctx.split(' ').filter((w) => w.length > 2).slice(0, 6);
    if (words.length >= 2) assetLabel = titleCaseWords(words.join(' ').slice(0, 48));
  }

  const alternatives: string[] = [];
  let primary = '';

  if (kind === 'image') {
    primary = assetLabel
      ? kindOf === 'image'
        ? `${assetLabel} image`
        : assetLabel
      : hostHint
        ? `${hostHint} image`
        : 'Descriptive image of page content';
    if (assetLabel) {
      alternatives.push(assetLabel, `Illustration: ${assetLabel}`);
      if (hostHint) alternatives.push(`${assetLabel} on ${hostHint}`);
    }
  } else if (kind === 'button') {
    primary = assetLabel ? assetLabel : 'Perform action';
    if (assetLabel) {
      alternatives.push(`Activate ${assetLabel}`, `${assetLabel} button`);
    } else {
      alternatives.push('Submit', 'Continue', 'Close dialog');
    }
  } else if (kind === 'input') {
    primary = assetLabel || 'Form field';
    alternatives.push('Enter your details', primary);
  } else {
    // link
    if (assetLabel && kindOf === 'image') {
      primary = `${assetLabel} image`;
      alternatives.push(
        `View ${assetLabel}`,
        `Open ${assetLabel} image`,
        hostHint ? `${assetLabel} from ${hostHint}` : `Download ${assetLabel}`,
      );
    } else if (assetLabel && kindOf === 'document') {
      primary = `${assetLabel} document`;
      alternatives.push(`Download ${assetLabel}`, `Open ${assetLabel} PDF`);
    } else if (assetLabel) {
      primary = assetLabel;
      alternatives.push(`Go to ${assetLabel}`, hostHint ? `${assetLabel} — ${hostHint}` : `Visit ${assetLabel}`);
    } else if (hostHint) {
      primary = `Link to ${hostHint}`;
      alternatives.push(`Visit ${hostHint}`, `Open ${hostHint} page`);
    } else {
      primary = 'Related page link';
      alternatives.push('Learn more', 'View details');
    }
  }

  const unique = [...new Set([primary, ...alternatives].map((s) => s.trim()).filter(Boolean))];
  return {
    primary: unique[0] ?? 'Accessible name',
    alternatives: unique.slice(1, 4),
  };
}

function formatNameOptionsNote(suggestion: AccessibleNameSuggestion): string {
  const alts =
    suggestion.alternatives.length > 0
      ? `\nOther aria-label options: ${suggestion.alternatives.map((a) => `"${a}"`).join(' · ')}`
      : '';
  return `Suggested accessible name: "${suggestion.primary}".${alts}`;
}

const VAGUE_LINK_TEXT_RE =
  /^(click here|here|read more|learn more|more|link|info|details|this|continue|go|→|»|›)$/i;

/** Visible text inside an <a> (tags stripped). */
export function getAnchorVisibleText(elementHtml: string): string {
  const match = elementHtml.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i);
  if (!match) return '';
  return match[1]!.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Title-case for ALL-CAPS / noisy menu labels (better for screen readers). */
export function toReadableLinkText(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return trimmed;
  // Already mixed case with lowercase letters — leave alone
  if (/[a-z]/.test(trimmed) && /[A-Z]/.test(trimmed)) return trimmed;
  return titleCaseWords(trimmed.toLowerCase());
}

function isDuplicateLinkPurposeIssue(ruleId: string, description: string): boolean {
  const rid = ruleId.toLowerCase();
  const desc = description.toLowerCase();
  return (
    rid === 'rule-005' ||
    rid.includes('identical-links') ||
    (desc.includes('identical text') && desc.includes('link')) ||
    (desc.includes('share') && desc.includes('destination'))
  );
}

function isLinkNameIssue(ruleId: string): boolean {
  const rid = ruleId.toLowerCase();
  return rid.includes('link-name') || rid === 'rule-005' || rid.includes('identical-links');
}

/**
 * Improve link accessible name / visible text.
 * - Empty / icon-only / vague → aria-label from URL
 * - Duplicate purpose (RULE-005) → unique aria-label from destination
 * - ALL CAPS menu text → readable title case in visible text
 * - Does NOT slap a redundant aria-label on a link that already has clear unique text
 */
export function fixLinkAccessibleName(
  elementHtml: string,
  ruleId: string,
  description: string,
): { html: string; suggestion: AccessibleNameSuggestion | null; detail: string } {
  if (!/<a\b/i.test(elementHtml)) {
    return { html: elementHtml, suggestion: null, detail: description };
  }

  const visible = getAnchorVisibleText(elementHtml);
  const suggestion = suggestAccessibleNameOptions(elementHtml, 'link', description);
  const fromUrl = suggestion.primary.replace(/"/g, "'");
  const duplicate = isDuplicateLinkPurposeIssue(ruleId, description);
  const vague = !visible || VAGUE_LINK_TEXT_RE.test(visible);
  const emptyInner = /<a\b[^>]*>\s*<\/a>/i.test(elementHtml);
  const hasAriaLabel = /\baria-label\s*=/i.test(elementHtml);

  // 1) Empty / icon-only link → put real name as visible text (preferred) or aria-label
  if (emptyInner || (!visible && !hasAriaLabel)) {
    const label = fromUrl;
    const html = emptyInner
      ? elementHtml.replace(/<a\b([^>]*)>\s*<\/a>/i, `<a$1>${label}</a>`)
      : elementHtml.replace(/<a\b/i, `<a aria-label="${label}"`);
    return {
      html,
      suggestion,
      detail:
        'This link had no discernible text. Added a clear accessible name derived from the destination URL (WCAG 2.4.4).',
    };
  }

  // 2) Vague "click here" style text → replace visible text with destination-based label
  if (vague) {
    const label = fromUrl;
    const html = elementHtml.replace(
      /(<a\b[^>]*>)([\s\S]*?)(<\/a>)/i,
      `$1${label}$3`,
    );
    return {
      html,
      suggestion,
      detail:
        'Link text was too vague (e.g. "click here"). Replaced it with text that describes the destination (WCAG 2.4.4).',
    };
  }

  // 3) Duplicate identical link text → unique aria-label from href (overrides name for AT)
  if (duplicate) {
    const readableVisible = toReadableLinkText(visible);
    const pathBit = fromUrl;
    let unique =
      pathBit.toLowerCase() !== readableVisible.toLowerCase()
        ? `${readableVisible}: ${pathBit}`
        : hostHintFromHtml(elementHtml)
          ? `${readableVisible} (${hostHintFromHtml(elementHtml)})`
          : `${readableVisible} page`;
    unique = unique.replace(/"/g, "'");

    let html = elementHtml;
    if (hasAriaLabel) {
      html = html.replace(/\baria-label\s*=\s*["'][^"']*["']/i, `aria-label="${unique}"`);
    } else {
      html = html.replace(/<a\b/i, `<a aria-label="${unique}"`);
    }
    // Also soften ALL CAPS visible text when present
    if (visible === visible.toUpperCase() && visible.length > 3 && /[A-Z]/.test(visible)) {
      html = html.replace(
        /(<a\b[^>]*>)([\s\S]*?)(<\/a>)/i,
        `$1${readableVisible}$3`,
      );
    }

    const altSuggestion: AccessibleNameSuggestion = {
      primary: unique,
      alternatives: [
        readableVisible !== pathBit ? pathBit : `${readableVisible} — details`,
        `Go to ${pathBit}`,
        `Open ${readableVisible}`,
      ].filter((a, i, arr) => a && arr.indexOf(a) === i && a !== unique),
    };

    return {
      html,
      suggestion: altSuggestion,
      detail:
        'Several links share the same visible text but go to different URLs. Added a unique aria-label (and clearer casing) so each destination is distinguishable (WCAG 2.4.4 / RULE-005). Prefer unique visible text in the design system when you can edit the Wix/menu CMS.',
    };
  }

  // 4) ALL CAPS menu labels → title case (SRs often spell letter-by-letter)
  if (visible.length > 3 && visible === visible.toUpperCase() && /[A-Z]/.test(visible)) {
    const readable = toReadableLinkText(visible);
    if (readable && readable !== visible) {
      const html = elementHtml.replace(
        /(<a\b[^>]*>)([\s\S]*?)(<\/a>)/i,
        `$1${readable}$3`,
      );
      return {
        html,
        suggestion: {
          primary: readable,
          alternatives: [visible, fromUrl].filter((a) => a !== readable),
        },
        detail:
          'Link already has visible text. Converted ALL CAPS to title case so screen readers announce it as words, not letter-by-letter. If this was flagged for another reason (contrast, focus, duplicate links), check the Plain English explanation.',
      };
    }
  }

  // 5) Already has clear text — do not invent a redundant aria-label
  return {
    html: elementHtml,
    suggestion: {
      primary: visible,
      alternatives: [fromUrl, toReadableLinkText(visible)].filter(
        (a, i, arr) => a && a !== visible && arr.indexOf(a) === i,
      ),
    },
    detail:
      'This link already has discernible text, so the HTML snippet does not need an aria-label. If the scanner still flagged it, the issue is likely duplicate link purpose site-wide, contrast, or focus — fix in the menu CMS / CSS rather than this fragment alone.',
  };
}

function hostHintFromHtml(elementHtml: string): string {
  const href = attrValue(elementHtml, 'href');
  if (!href) return '';
  try {
    const host = new URL(href, 'https://example.invalid').hostname.replace(/^www\./i, '');
    const first = host.split('.')[0] || '';
    return first ? titleCaseWords(first) : '';
  } catch {
    return '';
  }
}

/**
 * Replace leftover placeholder accessible names in AI/heuristic HTML with derived text.
 */
export function polishPlaceholderAccessibleNames(
  html: string,
  ruleId: string,
  pageContext?: string,
): { html: string; suggestion: AccessibleNameSuggestion | null } {
  if (!PLACEHOLDER_NAME_RE.test(html)) {
    return { html, suggestion: null };
  }

  const kind: 'link' | 'image' | 'button' | 'input' = ruleId.includes('button')
    ? 'button'
    : ruleId.includes('image') || ruleId.includes('alt')
      ? 'image'
      : ruleId.includes('label') || /<input\b/i.test(html)
        ? 'input'
        : 'link';

  const suggestion = suggestAccessibleNameOptions(html, kind, pageContext);
  const label = suggestion.primary.replace(/"/g, "'");

  let next = html
    .replace(/aria-label="\[Describe link purpose\]"/gi, `aria-label="${label}"`)
    .replace(/aria-label="\[Describe the action\]"/gi, `aria-label="${label}"`)
    .replace(/aria-label="\[Visible field label\]"/gi, `aria-label="${label}"`)
    .replace(/alt="\[Describe the image purpose\]"/gi, `alt="${label}"`)
    .replace(/>\[Describe link purpose\]</gi, `>${label}<`)
    .replace(/>\[Action\]</gi, `>${label}<`);

  // Empty <a></a> with no aria-label yet
  if (/<a\b[^>]*>\s*<\/a>/i.test(next) && !/aria-label=/i.test(next)) {
    next = next.replace(/<a\b/i, `<a aria-label="${label}"`);
  }

  return { html: next, suggestion };
}

/**
 * Deterministic HTML tweaks when the model returns an unchanged snippet.
 * Used both as AI fallback and as the offline mock.
 */
export function applyHeuristicFix(
  ruleId: string,
  elementHtml: string,
  description: string,
  wcagCriterion: string,
): HeuristicFixResult {
  const beforeHtml = elementHtml;
  let afterHtml = elementHtml;
  let detail = description;
  let nameNote = '';

  const altRules = ['image-alt', 'input-image-alt', 'area-alt', 'object-alt'];
  const rid = ruleId.toLowerCase();

  // Contrast before generic <a> handling — coloured menu links must not get fake aria-labels
  if (
    rid.includes('color-contrast') ||
    rid.includes('contrast') ||
    /background-color\s*:/i.test(elementHtml)
  ) {
    afterHtml = fixColorContrastStyles(elementHtml);
    detail =
      'Text and background colours must meet WCAG 1.4.3 contrast (4.5:1 for normal text). A high-contrast text colour (#0f172a) was applied on the element — also verify theme/CSS variables that may override this inline style.';
  } else if (altRules.some((r) => ruleId.includes(r))) {
    const suggestion = suggestAccessibleNameOptions(elementHtml, 'image', description);
    const label = suggestion.primary.replace(/"/g, "'");
    afterHtml = elementHtml.includes('alt=')
      ? elementHtml.replace(/alt="[^"]*"/i, `alt="${label}"`)
      : elementHtml.replace(/<img\b/i, `<img alt="${label}"`);
    nameNote = formatNameOptionsNote(suggestion);
    detail =
      'Images require a text alternative under WCAG 1.1.1. Pick the best alt text from the suggestions (or refine for context).';
  } else if (
    // Prefer ruleId for "label" — do not match class names in HTML
    rid.includes('label') &&
    !isLinkNameIssue(ruleId) &&
    (elementHtml.includes('<input') || elementHtml.includes('<select') || elementHtml.includes('<textarea'))
  ) {
    const suggestion = suggestAccessibleNameOptions(elementHtml, 'input', description);
    const label = suggestion.primary.replace(/"/g, "'");
    afterHtml = elementHtml.replace(/<(input|select|textarea)\b/i, `<$1 aria-label="${label}"`);
    nameNote = formatNameOptionsNote(suggestion);
    detail =
      'Every form control needs a visible label or an accessible name via aria-label / aria-labelledby (WCAG 1.3.1, 4.1.2).';
  } else if (
    isLinkNameIssue(ruleId) ||
    isDuplicateLinkPurposeIssue(ruleId, description) ||
    ( /<a\b/i.test(elementHtml) &&
      (rid.includes('link') || getAnchorVisibleText(elementHtml) === '' || VAGUE_LINK_TEXT_RE.test(getAnchorVisibleText(elementHtml)) || (getAnchorVisibleText(elementHtml) === getAnchorVisibleText(elementHtml).toUpperCase() && getAnchorVisibleText(elementHtml).length > 3)))
  ) {
    const linkFix = fixLinkAccessibleName(elementHtml, ruleId, description);
    afterHtml = linkFix.html;
    detail = linkFix.detail;
    if (linkFix.suggestion) {
      nameNote = formatNameOptionsNote(linkFix.suggestion);
    }
  } else if (rid.includes('aria-allowed-role')) {
    afterHtml = fixAriaAllowedRole(elementHtml);
    detail = afterHtml !== elementHtml
      ? 'The role on this element is not allowed for its HTML tag. rowgroup is invalid on <li>; use native listitem semantics or role="group" with aria-roledescription="slide" for carousel slides (WAI-ARIA).'
      : `${description} Review the element role against the ARIA in HTML specification and remove or replace the invalid role.`;
  } else if (rid.includes('button-name') || /<button\b/i.test(elementHtml)) {
    const suggestion = suggestAccessibleNameOptions(elementHtml, 'button', description);
    const label = suggestion.primary.replace(/"/g, "'");
    if (/<button\b[^>]*>\s*<\/button>/i.test(elementHtml)) {
      afterHtml = elementHtml.replace(
        /<button\b([^>]*)>\s*<\/button>/i,
        `<button$1 aria-label="${label}">${label}</button>`,
      );
    } else if (!/aria-label=/i.test(elementHtml)) {
      afterHtml = elementHtml.replace(/<button\b/i, `<button aria-label="${label}"`);
    }
    nameNote = formatNameOptionsNote(suggestion);
    detail =
      'Buttons need an accessible name (visible text or aria-label) under WCAG 4.1.2.';
  } else if (rid.includes('html-has-lang') || rid === 'html-lang-valid') {
    afterHtml = /<html\b/i.test(elementHtml)
      ? elementHtml.replace(/<html\b(?![^>]*\blang=)/i, '<html lang="en"')
      : elementHtml;
    detail = 'Set a valid lang attribute on the document root (IS 17802 / WCAG 3.1.1).';
  } else if (rid.includes('image-redundant-alt')) {
    afterHtml = withStyleAttr(elementHtml, (s) => s);
    if (/alt="[^"]+"/i.test(elementHtml)) {
      afterHtml = elementHtml.replace(/alt="[^"]*"/i, 'alt=""');
      detail =
        'Decorative images next to redundant text should use empty alt="" so screen readers are not duplicated.';
    }
  } else if (/<a\b/i.test(elementHtml)) {
    // Last-resort link assist when rule id is unfamiliar but snippet is an anchor
    const linkFix = fixLinkAccessibleName(elementHtml, ruleId, description);
    afterHtml = linkFix.html;
    detail = linkFix.detail;
    if (linkFix.suggestion) {
      nameNote = formatNameOptionsNote(linkFix.suggestion);
    }
  }

  const changed = afterHtml.trim() !== beforeHtml.trim();
  if (!changed) {
    detail = `${detail} No automatic HTML edit changed this snippet for rule "${ruleId}". See guidance above and update CMS/CSS if needed (WCAG ${wcagCriterion}).`;
  }

  const explanationParts = [
    detail,
    nameNote,
    changed
      ? `${HEURISTIC_MARKER} applied deterministic markup assist for ${ruleId} (WCAG ${wcagCriterion}).`
      : `${HEURISTIC_MARKER} no markup delta for ${ruleId} (WCAG ${wcagCriterion}).`,
  ].filter(Boolean);

  return {
    fixHtml: afterHtml,
    beforeHtml,
    afterHtml,
    changed,
    isDevPreview: false,
    explanation: explanationParts.join('\n\n'),
  };
}

function devPreviewExplanation(ruleId: string, wcagCriterion: string, detail: string): string {
  return `${detail}\n\n${DEV_PREVIEW_MARKER} start apps/ai-service with ANTHROPIC_API_KEY (or switch org AI provider to local) for full AI-generated fixes. Rule: ${ruleId} (WCAG ${wcagCriterion}).`;
}

export function buildDevMockFix(
  ruleId: string,
  elementHtml: string,
  description: string,
  wcagCriterion: string,
): DevMockFixResult {
  const heuristic = applyHeuristicFix(ruleId, elementHtml, description, wcagCriterion);
  return {
    ...heuristic,
    isDevPreview: true,
    explanation: devPreviewExplanation(
      ruleId,
      wcagCriterion,
      heuristic.explanation.replace(new RegExp(`\\n\\n${HEURISTIC_MARKER}[\\s\\S]*$`), '').trim(),
    ),
  };
}

export function buildDevMockAltText(ruleId: string): string {
  if (ruleId.includes('image')) {
    return 'Company logo — AccessibleNow';
  }
  return 'Decorative or informational image on the page';
}
