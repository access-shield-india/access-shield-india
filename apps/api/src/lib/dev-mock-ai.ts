/** Rule-based fix suggestions when Claude is unavailable in local development. */

export interface DevMockFixResult {
  fixHtml: string;
  explanation: string;
  isDevPreview: true;
  beforeHtml: string;
  afterHtml: string;
}

const DEV_PREVIEW_MARKER = 'Development preview:';

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

function devPreviewResult(
  beforeHtml: string,
  afterHtml: string,
  explanation: string,
): DevMockFixResult {
  return {
    fixHtml: afterHtml,
    explanation,
    isDevPreview: true,
    beforeHtml,
    afterHtml,
  };
}

function devPreviewExplanation(ruleId: string, wcagCriterion: string, detail: string): string {
  return `${detail}\n\n${DEV_PREVIEW_MARKER} start apps/ai-service with ANTHROPIC_API_KEY for full Claude-generated fixes. Rule: ${ruleId} (WCAG ${wcagCriterion}).`;
}

export function buildDevMockFix(
  ruleId: string,
  elementHtml: string,
  description: string,
  wcagCriterion: string,
): DevMockFixResult {
  const altRules = ['image-alt', 'input-image-alt', 'area-alt', 'object-alt'];
  if (altRules.some((r) => ruleId.includes(r))) {
    const afterHtml = elementHtml.includes('alt=')
      ? elementHtml.replace(/alt="[^"]*"/i, 'alt="[Describe the image purpose]"')
      : elementHtml.replace(/<img\b/i, '<img alt="[Describe the image purpose]"');
    return devPreviewResult(
      elementHtml,
      afterHtml,
      devPreviewExplanation(
        ruleId,
        wcagCriterion,
        'Images require a text alternative under WCAG 1.1.1. Replace the placeholder with a concise description of the image content or function.',
      ),
    );
  }

  if (
    ruleId.includes('label') ||
    (elementHtml.includes('<input') && !/aria-label|id=/.test(elementHtml))
  ) {
    const afterHtml = elementHtml.replace(/<input\b/i, '<input aria-label="[Visible field label]"');
    return devPreviewResult(
      elementHtml,
      afterHtml,
      devPreviewExplanation(
        ruleId,
        wcagCriterion,
        'Every form control needs a visible label or an accessible name via aria-label / aria-labelledby (WCAG 1.3.1, 4.1.2).',
      ),
    );
  }

  if (ruleId.includes('link') || elementHtml.includes('<a ')) {
    const afterHtml = elementHtml.replace(
      /<a\b([^>]*)>(\s*)<\/a>/i,
      '<a$1>[Describe link purpose]</a>',
    );
    return devPreviewResult(
      elementHtml,
      afterHtml,
      devPreviewExplanation(
        ruleId,
        wcagCriterion,
        'Links must have discernible text that describes their purpose (WCAG 2.4.4). Avoid empty or vague link text like "click here".',
      ),
    );
  }

  if (ruleId.includes('aria-allowed-role')) {
    const afterHtml = fixAriaAllowedRole(elementHtml);
    const changed = afterHtml !== elementHtml;
    return devPreviewResult(
      elementHtml,
      afterHtml,
      devPreviewExplanation(
        ruleId,
        wcagCriterion,
        changed
          ? 'The role on this element is not allowed for its HTML tag. rowgroup is invalid on <li>; use native listitem semantics or role="group" with aria-roledescription="slide" for carousel slides (WAI-ARIA).'
          : `${description} Review the element role against the ARIA in HTML specification and remove or replace the invalid role.`,
      ),
    );
  }

  return devPreviewResult(
    elementHtml,
    elementHtml,
    devPreviewExplanation(
      ruleId,
      wcagCriterion,
      `${description} Minimum change: review this element against WCAG ${wcagCriterion} and update markup or ARIA as needed.`,
    ),
  );
}

export function buildDevMockAltText(ruleId: string): string {
  if (ruleId.includes('image')) {
    return 'Company logo — AccessShield India';
  }
  return 'Decorative or informational image on the page';
}
