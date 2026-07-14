/**
 * Mobile Accessibility Rules
 *
 * WCAG 2.2, IS 17802, and SEBI-specific accessibility rules for mobile apps.
 * These rules analyze the accessibility tree extracted from Android/iOS apps.
 */

import type { MobileElement, MobileViolation, ComplianceStandard, ScreenState } from '../types.js';
import type { IssueSeverity } from '@accessshield/types';

interface RuleDefinition {
  id: string;
  wcagCriterion: string;
  standard: ComplianceStandard;
  severity: IssueSeverity;
  description: string;
  helpUrl: string;
  check: (element: MobileElement, screen: ScreenState) => boolean;
}

const WCAG_HELP_BASE = 'https://www.w3.org/WAI/WCAG22/Understanding';
const IS17802_HELP_BASE = 'https://accessshield.in/docs/is17802';

const mobileRules: RuleDefinition[] = [
  {
    id: 'M-WCAG-1.1.1-missing-content-desc',
    wcagCriterion: '1.1.1',
    standard: 'WCAG22',
    severity: 'critical',
    description:
      'Interactive element missing content description (Android) or accessibility label (iOS)',
    helpUrl: `${WCAG_HELP_BASE}/non-text-content`,
    check: (element) => {
      if (!element.isClickable && !element.isFocusable) return false;
      const hasDescription = element.contentDesc || element.label || element.text || element.hint;
      return !hasDescription;
    },
  },
  {
    id: 'M-WCAG-1.1.1-image-no-alt',
    wcagCriterion: '1.1.1',
    standard: 'WCAG22',
    severity: 'critical',
    description: 'Image element missing accessibility text',
    helpUrl: `${WCAG_HELP_BASE}/non-text-content`,
    check: (element) => {
      const isImage =
        element.className?.includes('ImageView') ||
        element.className?.includes('Image') ||
        element.role === 'image';
      if (!isImage) return false;
      return !element.contentDesc && !element.label;
    },
  },
  {
    id: 'M-WCAG-2.4.4-link-no-label',
    wcagCriterion: '2.4.4',
    standard: 'WCAG22',
    severity: 'serious',
    description: 'Link or button without accessible text',
    helpUrl: `${WCAG_HELP_BASE}/link-purpose-in-context`,
    check: (element) => {
      const isLinkOrButton =
        element.isClickable ||
        element.className?.includes('Button') ||
        element.className?.includes('Link') ||
        element.role === 'button' ||
        element.role === 'link';
      if (!isLinkOrButton) return false;
      return !element.text && !element.contentDesc && !element.label;
    },
  },
  {
    id: 'M-WCAG-2.5.5-touch-target-size',
    wcagCriterion: '2.5.5',
    standard: 'WCAG22',
    severity: 'moderate',
    description: 'Touch target is smaller than 44x44 CSS pixels',
    helpUrl: `${WCAG_HELP_BASE}/target-size-enhanced`,
    check: (element) => {
      if (!element.isClickable) return false;
      const minSize = 44;
      return element.bounds.width < minSize || element.bounds.height < minSize;
    },
  },
  {
    id: 'M-WCAG-2.5.8-touch-target-minimum',
    wcagCriterion: '2.5.8',
    standard: 'WCAG22',
    severity: 'serious',
    description: 'Touch target is smaller than 24x24 CSS pixels (WCAG 2.2 minimum)',
    helpUrl: `${WCAG_HELP_BASE}/target-size-minimum`,
    check: (element) => {
      if (!element.isClickable) return false;
      const minSize = 24;
      return element.bounds.width < minSize || element.bounds.height < minSize;
    },
  },
  {
    id: 'M-WCAG-4.1.2-name-role-value',
    wcagCriterion: '4.1.2',
    standard: 'WCAG22',
    severity: 'critical',
    description: 'Interactive element missing proper role or accessible name',
    helpUrl: `${WCAG_HELP_BASE}/name-role-value`,
    check: (element) => {
      if (!element.isClickable && !element.isFocusable) return false;
      const hasName = element.text || element.contentDesc || element.label;
      return !hasName;
    },
  },
  {
    id: 'M-WCAG-1.3.1-form-label',
    wcagCriterion: '1.3.1',
    standard: 'WCAG22',
    severity: 'serious',
    description: 'Form input field missing accessible label',
    helpUrl: `${WCAG_HELP_BASE}/info-and-relationships`,
    check: (element) => {
      const isInput =
        element.className?.includes('EditText') ||
        element.className?.includes('TextField') ||
        element.className?.includes('Input') ||
        element.role === 'textbox';
      if (!isInput) return false;
      return !element.contentDesc && !element.label && !element.hint;
    },
  },
  {
    id: 'M-IS-001-hindi-content-desc',
    wcagCriterion: '3.1.1',
    standard: 'IS17802',
    severity: 'moderate',
    description: 'Hindi text in UI element but content description is not in Hindi',
    helpUrl: `${IS17802_HELP_BASE}/IS-001`,
    check: (element) => {
      const hindiRegex = /[\u0900-\u097F]/;
      const hasHindiText = element.text && hindiRegex.test(element.text);
      if (!hasHindiText) return false;
      const descHasHindi =
        (element.contentDesc && hindiRegex.test(element.contentDesc)) ||
        (element.label && hindiRegex.test(element.label));
      return !descHasHindi;
    },
  },
  {
    id: 'M-IS-002-indian-phone-format',
    wcagCriterion: '1.3.5',
    standard: 'IS17802',
    severity: 'minor',
    description: 'Phone number input should support +91 Indian format',
    helpUrl: `${IS17802_HELP_BASE}/IS-005`,
    check: (element) => {
      const isPhoneField =
        element.hint?.toLowerCase().includes('phone') ||
        element.hint?.toLowerCase().includes('mobile') ||
        element.resourceId?.toLowerCase().includes('phone') ||
        element.resourceId?.toLowerCase().includes('mobile');
      if (!isPhoneField) return false;
      const hintHasIndianFormat =
        element.hint?.includes('+91') ||
        element.hint?.includes('91') ||
        element.hint?.includes('10 digit');
      return !hintHasIndianFormat;
    },
  },
  {
    id: 'M-IS-003-rupee-symbol',
    wcagCriterion: '1.3.1',
    standard: 'IS17802',
    severity: 'minor',
    description: 'Currency should be displayed using ₹ symbol for Indian Rupee',
    helpUrl: `${IS17802_HELP_BASE}/IS-006`,
    check: (element) => {
      const text = element.text || '';
      const hasRsFormat = /Rs\.?\s?\d/i.test(text) || /INR\s?\d/i.test(text);
      const hasRupeeSymbol = /₹/.test(text);
      return hasRsFormat && !hasRupeeSymbol;
    },
  },
  {
    id: 'M-SEBI-001-no-decorative-only',
    wcagCriterion: '1.4.1',
    standard: 'SEBI',
    severity: 'serious',
    description:
      'Information conveyed through color alone without text alternative (SEBI financial app requirement)',
    helpUrl: 'https://accessshield.in/docs/sebi/color-dependency',
    check: (element) => {
      const hasRedGreenIndicator =
        element.className?.includes('Indicator') ||
        element.className?.includes('Status') ||
        element.resourceId?.includes('indicator') ||
        element.resourceId?.includes('status');
      if (!hasRedGreenIndicator) return false;
      return !element.text && !element.contentDesc && !element.label;
    },
  },
  {
    id: 'M-WCAG-2.1.1-keyboard-accessible',
    wcagCriterion: '2.1.1',
    standard: 'WCAG22',
    severity: 'critical',
    description: 'Interactive element is not focusable for keyboard/switch access',
    helpUrl: `${WCAG_HELP_BASE}/keyboard`,
    check: (element) => {
      if (!element.isClickable) return false;
      return !element.isFocusable;
    },
  },
  {
    id: 'M-WCAG-1.4.4-text-resize',
    wcagCriterion: '1.4.4',
    standard: 'WCAG22',
    severity: 'moderate',
    description: 'Text appears to use fixed pixel sizes instead of scalable units',
    helpUrl: `${WCAG_HELP_BASE}/resize-text`,
    check: (element) => {
      const isTextElement =
        element.className?.includes('TextView') ||
        element.className?.includes('Text') ||
        element.className?.includes('Label');
      if (!isTextElement) return false;
      return element.bounds.height < 12 && (element.text?.length ?? 0) > 0;
    },
  },
];

export function getMobileRules(standards: ComplianceStandard[]): RuleDefinition[] {
  return mobileRules.filter((rule) => standards.includes(rule.standard));
}

export function runRuleOnElement(
  rule: RuleDefinition,
  element: MobileElement,
  screen: ScreenState,
): MobileViolation | null {
  const isViolation = rule.check(element, screen);

  if (!isViolation) return null;

  return {
    ruleId: rule.id,
    wcagCriterion: rule.wcagCriterion,
    standard: rule.standard,
    severity: rule.severity,
    description: rule.description,
    screenTitle: screen.title,
    screenActivity: screen.activityName,
    screenshotS3Key: screen.screenshotS3Key,
    elementId: element.elementId,
    elementClass: element.className,
    elementResourceId: element.resourceId,
    elementBounds: element.bounds,
    helpUrl: rule.helpUrl,
  };
}

export function flattenElementTree(root: MobileElement): MobileElement[] {
  const elements: MobileElement[] = [root];

  function traverse(el: MobileElement) {
    for (const child of el.children) {
      elements.push(child);
      traverse(child);
    }
  }

  traverse(root);
  return elements;
}
