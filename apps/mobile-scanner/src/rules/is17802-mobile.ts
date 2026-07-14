/**
 * IS 17802 Mobile Accessibility Rules
 *
 * India's national ICT accessibility standard (BIS 2021) adapted for mobile apps.
 * These rules evaluate accessibility tree elements captured from Android/iOS.
 */

import type {
  MobileElement,
  MobileViolation,
  MobilePlatform,
  ScreenState,
  ComplianceStandard,
  ElementBounds,
} from '../types.js';
import type { IssueSeverity } from '@accessshield/types';

const IS17802_HELP_BASE = 'https://accessshield.in/docs/is17802';
const SEBI_HELP_BASE = 'https://accessshield.in/docs/sebi';

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Flatten an element tree into a single array (depth-first).
 */
export function flattenElements(elements: MobileElement[]): MobileElement[] {
  const result: MobileElement[] = [];

  function traverse(element: MobileElement): void {
    result.push(element);
    for (const child of element.children) {
      traverse(child);
    }
  }

  for (const el of elements) {
    traverse(el);
  }

  return result;
}

/**
 * Check if element is an iOS XCUIElement type.
 */
export function isIosElement(el: MobileElement): boolean {
  return el.className?.startsWith('XCUIElementType') ?? false;
}

/**
 * Check if element is an Android element type.
 */
export function isAndroidElement(el: MobileElement): boolean {
  return (
    el.className?.startsWith('android.') ||
    el.className?.startsWith('androidx.') ||
    el.className?.includes('.widget.') ||
    false
  );
}

/**
 * Get the semantic role for iOS elements, handling XCUI types.
 */
export function getIosSemanticRole(el: MobileElement): string | null {
  const className = el.className;
  if (!className?.startsWith('XCUIElementType')) {
    return el.role;
  }

  const roleMap: Record<string, string> = {
    XCUIElementTypeButton: 'button',
    XCUIElementTypeStaticText: 'text',
    XCUIElementTypeTextField: 'textbox',
    XCUIElementTypeSecureTextField: 'textbox',
    XCUIElementTypeTextView: 'textbox',
    XCUIElementTypeImage: 'image',
    XCUIElementTypeSwitch: 'switch',
    XCUIElementTypeSlider: 'slider',
    XCUIElementTypeTable: 'list',
    XCUIElementTypeCollectionView: 'list',
    XCUIElementTypeCell: 'listitem',
    XCUIElementTypeNavigationBar: 'navigation',
    XCUIElementTypeTabBar: 'tablist',
    XCUIElementTypeTab: 'tab',
    XCUIElementTypeLink: 'link',
    XCUIElementTypeAlert: 'alertdialog',
    XCUIElementTypeSheet: 'dialog',
    XCUIElementTypeSearchField: 'searchbox',
    XCUIElementTypePicker: 'combobox',
    XCUIElementTypeDatePicker: 'datepicker',
    XCUIElementTypeProgressIndicator: 'progressbar',
    XCUIElementTypeActivityIndicator: 'progressbar',
  };

  return roleMap[className] ?? null;
}

/**
 * Get accessible name for an element, handling platform differences.
 */
export function getAccessibleName(el: MobileElement, platform: MobilePlatform): string | null {
  if (platform === 'android') {
    return el.contentDesc?.trim() || el.text?.trim() || null;
  }

  return el.label?.trim() || el.hint?.trim() || el.text?.trim() || null;
}

/**
 * Check if iOS element is accessible (should be announced by VoiceOver).
 */
export function isIosAccessible(el: MobileElement): boolean {
  if (!isIosElement(el)) {
    return el.isFocusable;
  }

  if (el.isFocusable) {
    return true;
  }

  const alwaysAccessibleTypes = [
    'XCUIElementTypeButton',
    'XCUIElementTypeLink',
    'XCUIElementTypeSwitch',
    'XCUIElementTypeSlider',
    'XCUIElementTypeTextField',
    'XCUIElementTypeSecureTextField',
    'XCUIElementTypeTextView',
    'XCUIElementTypeSearchField',
    'XCUIElementTypeCell',
    'XCUIElementTypeTab',
    'XCUIElementTypeDatePicker',
    'XCUIElementTypePicker',
  ];

  return alwaysAccessibleTypes.includes(el.className ?? '');
}

/**
 * Check if an element is interactive (clickable, focusable, or has interactive role).
 */
export function isInteractive(el: MobileElement): boolean {
  if (el.isClickable || el.isFocusable) {
    return true;
  }

  const interactiveRoles = [
    'button',
    'link',
    'menuitem',
    'checkbox',
    'radio',
    'switch',
    'slider',
    'combobox',
  ];
  if (el.role && interactiveRoles.includes(el.role.toLowerCase())) {
    return true;
  }

  return false;
}

/**
 * Check if an element is a touchable target (interactive with valid bounds).
 */
export function isTouchableTarget(el: MobileElement): boolean {
  return isInteractive(el) && el.bounds.width > 0 && el.bounds.height > 0;
}

/**
 * Check if text contains actual Devanagari Unicode characters.
 */
export function isDevanagariUnicode(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Check if text appears to be ASCII transliteration of Hindi.
 * Looks for common Hindi word patterns in ASCII without any Devanagari.
 */
export function isAsciiTransliteration(text: string): boolean {
  if (!text || isDevanagariUnicode(text)) {
    return false;
  }

  const normalizedText = text.toLowerCase();

  const hindiTranslitPatterns = [
    'aap',
    'namaste',
    'dhanyavaad',
    'dhanyawad',
    'anukram',
    'khata',
    'bharan',
    'shubh',
    'swagat',
    'kripya',
    'nahi',
    'haan',
    'theek',
    'accha',
    'bahut',
    'kaise',
    'kahan',
    'kyun',
    'kab',
    'kaun',
    'abhi',
    'yahan',
    'wahan',
    'paisa',
    'rupaya',
    'rashi',
    'dhan',
    'jama',
    'kharcha',
    'bachat',
    'login',
    'logout',
    'signup',
    'bharein',
    'jankari',
    'madad',
    'sahayata',
    'prashna',
    'uttar',
    'janmadin',
    'pata',
    'mobile',
    'sankhya',
    'dainik',
    'masik',
    'varshik',
    'naya',
    'purana',
    'safal',
    'asafal',
    'sthiti',
    'pravishtikaran',
    'vishesh',
    'sampark',
    'seva',
  ];

  for (const pattern of hindiTranslitPatterns) {
    if (normalizedText.includes(pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * Factory function to create a MobileViolation.
 */
function makeViolation(params: {
  ruleId: string;
  wcagCriterion: string;
  standard: ComplianceStandard;
  severity: IssueSeverity;
  description: string;
  screen: ScreenState;
  element?: MobileElement;
  helpUrl: string;
}): MobileViolation {
  const { ruleId, wcagCriterion, standard, severity, description, screen, element, helpUrl } =
    params;

  return {
    ruleId,
    wcagCriterion,
    standard,
    severity,
    description,
    screenTitle: screen.title,
    screenActivity: screen.activityName,
    screenshotS3Key: screen.screenshotS3Key,
    elementId: element?.elementId ?? null,
    elementClass: element?.className ?? null,
    elementResourceId: element?.resourceId ?? null,
    elementBounds: element?.bounds ?? null,
    helpUrl,
  };
}

/**
 * Check if any child element has non-empty text (text propagation check).
 */
function hasChildWithText(element: MobileElement): boolean {
  for (const child of element.children) {
    if (child.text && child.text.trim().length > 0) {
      return true;
    }
    if (hasChildWithText(child)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if an element is a child of a button/interactive parent.
 */
function hasInteractiveParent(element: MobileElement, allElements: MobileElement[]): boolean {
  const flatList = allElements;
  for (const el of flatList) {
    if (el.elementId === element.elementId) continue;
    const isParent = flattenElements([el]).some((child) => child.elementId === element.elementId);
    if (isParent && isInteractive(el)) {
      return true;
    }
  }
  return false;
}

/**
 * Get accessible text for an element (combines all possible sources).
 */
function getAccessibleText(el: MobileElement): string {
  return [el.contentDesc, el.label, el.text, el.hint].filter(Boolean).join(' ').trim();
}

// ─── Rule Implementations ─────────────────────────────────────────────────────

/**
 * M-IS-001: Check content descriptions for interactive elements.
 * Android: contentDescription required, iOS: accessibilityLabel required.
 */
export async function checkContentDescriptions(
  elements: MobileElement[],
  screen: ScreenState,
  platform: MobilePlatform,
): Promise<MobileViolation[]> {
  const violations: MobileViolation[] = [];

  for (const el of elements) {
    const isIos = platform === 'ios';

    const shouldCheck = isIos
      ? (isInteractive(el) || isIosAccessible(el)) && el.isVisible
      : isInteractive(el) && el.isVisible;

    if (!shouldCheck) continue;

    const hasAccessibleName = !!getAccessibleName(el, platform);

    if (!hasAccessibleName) {
      if (hasChildWithText(el)) continue;

      const elementRole = isIos ? getIosSemanticRole(el) || el.role : el.role;
      const roleHint = elementRole ? ` (${elementRole})` : '';

      const description =
        platform === 'android'
          ? `Interactive element${roleHint} missing contentDescription. TalkBack users cannot identify this element.`
          : `Interactive element${roleHint} missing accessibilityLabel. VoiceOver users cannot identify this element.`;

      violations.push(
        makeViolation({
          ruleId: 'M-IS-001',
          wcagCriterion: '4.1.2',
          standard: 'IS17802',
          severity: 'critical',
          description,
          screen,
          element: el,
          helpUrl: `${IS17802_HELP_BASE}/M-IS-001`,
        }),
      );
    }
  }

  return violations;
}

/**
 * M-IS-002: Check Devanagari encoding for Hindi content.
 * Flag ASCII transliteration that should be Unicode Devanagari.
 */
export async function checkDevanagariEncoding(
  elements: MobileElement[],
  screen: ScreenState,
  _platform: MobilePlatform,
): Promise<MobileViolation[]> {
  const violations: MobileViolation[] = [];

  for (const el of elements) {
    if (!el.isVisible) continue;

    const textsToCheck = [el.contentDesc, el.label, el.text].filter(Boolean) as string[];

    for (const text of textsToCheck) {
      if (isAsciiTransliteration(text) && !isDevanagariUnicode(text)) {
        violations.push(
          makeViolation({
            ruleId: 'M-IS-002',
            wcagCriterion: '3.1.1',
            standard: 'IS17802',
            severity: 'serious',
            description:
              'Hindi/regional language text appears to use ASCII transliteration. ' +
              'Screen readers cannot correctly announce transliterated text. ' +
              'Use Devanagari Unicode (IS 17802 Rule IS-002).',
            screen,
            element: el,
            helpUrl: `${IS17802_HELP_BASE}/M-IS-002`,
          }),
        );
        break;
      }
    }
  }

  return violations;
}

/**
 * M-IS-003: Check touch target sizes.
 * Android minimum: 48dp, iOS minimum: 44pt.
 */
export async function checkTouchTargetSizes(
  elements: MobileElement[],
  screen: ScreenState,
  platform: MobilePlatform,
): Promise<MobileViolation[]> {
  const violations: MobileViolation[] = [];

  const MIN_SIZE_ANDROID_DP = 48;
  const MIN_SIZE_IOS_PT = 44;
  const PIXEL_RATIO_THRESHOLD = 200;
  const ASSUMED_ANDROID_DENSITY = 2.75;

  const minSize = platform === 'android' ? MIN_SIZE_ANDROID_DP : MIN_SIZE_IOS_PT;

  for (const el of elements) {
    if (!isTouchableTarget(el) || !el.isVisible) continue;

    if (hasInteractiveParent(el, elements)) continue;

    let { width, height } = el.bounds;

    if (
      platform === 'android' &&
      (width > PIXEL_RATIO_THRESHOLD || height > PIXEL_RATIO_THRESHOLD)
    ) {
      width = Math.round(width / ASSUMED_ANDROID_DENSITY);
      height = Math.round(height / ASSUMED_ANDROID_DENSITY);
    }

    if (width < minSize || height < minSize) {
      const unit = platform === 'android' ? 'dp' : 'pt';
      violations.push(
        makeViolation({
          ruleId: 'M-IS-003',
          wcagCriterion: '2.5.8',
          standard: 'IS17802',
          severity: 'serious',
          description:
            `Touch target too small: ${width}x${height}${unit}. ` +
            `IS 17802 and WCAG 2.5.8 require minimum ${minSize}x${minSize}${unit} on ${platform === 'android' ? 'Android' : 'iOS'}.`,
          screen,
          element: el,
          helpUrl: `${IS17802_HELP_BASE}/M-IS-003`,
        }),
      );
    }
  }

  return violations;
}

/**
 * M-IS-004: Check date picker format.
 * Flag MM/DD/YYYY format which should be DD/MM/YYYY for Indian context.
 */
export async function checkDatePickerFormat(
  elements: MobileElement[],
  screen: ScreenState,
  _platform: MobilePlatform,
): Promise<MobileViolation[]> {
  const violations: MobileViolation[] = [];

  const US_DATE_PATTERN = /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/\d{4}\b/;

  for (const el of elements) {
    if (!el.isVisible) continue;

    const isDateRelated =
      el.className?.toLowerCase().includes('datepicker') ||
      el.className?.toLowerCase().includes('timepicker') ||
      el.contentDesc?.toLowerCase().includes('date') ||
      el.contentDesc?.toLowerCase().includes('month') ||
      el.contentDesc?.toLowerCase().includes('year') ||
      el.label?.toLowerCase().includes('date') ||
      el.label?.toLowerCase().includes('month') ||
      el.label?.toLowerCase().includes('year');

    if (!isDateRelated) continue;

    const textToCheck = getAccessibleText(el);
    if (US_DATE_PATTERN.test(textToCheck)) {
      violations.push(
        makeViolation({
          ruleId: 'M-IS-004',
          wcagCriterion: '1.3.5',
          standard: 'IS17802',
          severity: 'moderate',
          description:
            'Date format may not follow IS 17802 IS-004 requirement for DD/MM/YYYY in Indian context.',
          screen,
          element: el,
          helpUrl: `${IS17802_HELP_BASE}/M-IS-004`,
        }),
      );
    }
  }

  return violations;
}

/**
 * M-IS-005: Check OTP/PIN field accessibility.
 */
export async function checkOtpFields(
  elements: MobileElement[],
  screen: ScreenState,
  _platform: MobilePlatform,
): Promise<MobileViolation[]> {
  const violations: MobileViolation[] = [];

  const OTP_KEYWORDS = ['otp', 'pin', 'code', 'verify', 'verification', 'passcode'];

  for (const el of elements) {
    if (!el.isVisible) continue;

    const isEditText =
      el.className?.toLowerCase().includes('edittext') ||
      el.className?.toLowerCase().includes('textfield') ||
      el.role === 'textbox';

    if (!isEditText) continue;

    const resourceIdLower = el.resourceId?.toLowerCase() ?? '';
    const labelLower = el.label?.toLowerCase() ?? '';
    const hintLower = el.hint?.toLowerCase() ?? '';

    const isOtpField = OTP_KEYWORDS.some(
      (kw) => resourceIdLower.includes(kw) || labelLower.includes(kw) || hintLower.includes(kw),
    );

    if (!isOtpField) continue;

    if (!el.contentDesc?.trim() && !el.label?.trim() && !el.hint?.trim()) {
      violations.push(
        makeViolation({
          ruleId: 'M-IS-005',
          wcagCriterion: '1.3.5',
          standard: 'IS17802',
          severity: 'critical',
          description:
            'OTP/PIN input field missing accessible label. ' +
            'Screen reader users cannot identify the purpose of this field (IS 17802 + WCAG 1.3.5).',
          screen,
          element: el,
          helpUrl: `${IS17802_HELP_BASE}/M-IS-005`,
        }),
      );
    }
  }

  return violations;
}

/**
 * M-IS-006: Check chart/graph accessibility.
 */
export async function checkChartAccessibility(
  elements: MobileElement[],
  screen: ScreenState,
  _platform: MobilePlatform,
): Promise<MobileViolation[]> {
  const violations: MobileViolation[] = [];

  const CHART_CLASS_PATTERNS = ['chart', 'graph', 'canvas', 'webview'];
  const CHART_ID_PATTERNS = [
    'chart',
    'graph',
    'pie',
    'line',
    'bar',
    'candlestick',
    'donut',
    'area',
  ];

  for (const el of elements) {
    if (!el.isVisible) continue;

    const classNameLower = el.className?.toLowerCase() ?? '';
    const resourceIdLower = el.resourceId?.toLowerCase() ?? '';

    const isChartElement =
      CHART_CLASS_PATTERNS.some((p) => classNameLower.includes(p)) ||
      CHART_ID_PATTERNS.some((p) => resourceIdLower.includes(p));

    if (!isChartElement) continue;

    if (!el.contentDesc?.trim() && !el.label?.trim()) {
      violations.push(
        makeViolation({
          ruleId: 'M-IS-006',
          wcagCriterion: '1.1.1',
          standard: 'IS17802',
          severity: 'critical',
          description:
            'Chart/graph element has no text alternative. ' +
            'Screen reader users receive no information about this data visualisation (IS 17802 + WCAG 1.1.1).',
          screen,
          element: el,
          helpUrl: `${IS17802_HELP_BASE}/M-IS-006`,
        }),
      );
    }
  }

  return violations;
}

/**
 * M-IS-007: Check error announcement patterns.
 * This is informational since runtime behavior cannot be verified statically.
 */
export async function checkErrorAnnouncements(
  elements: MobileElement[],
  screen: ScreenState,
  _platform: MobilePlatform,
): Promise<MobileViolation[]> {
  const violations: MobileViolation[] = [];

  const ERROR_KEYWORDS = ['error', 'invalid', 'failed', 'alert', 'warning'];

  for (const el of elements) {
    if (!el.isVisible) continue;

    const resourceIdLower = el.resourceId?.toLowerCase() ?? '';
    const labelLower = el.label?.toLowerCase() ?? '';
    const textLower = el.text?.toLowerCase() ?? '';
    const contentDescLower = el.contentDesc?.toLowerCase() ?? '';

    const isErrorElement = ERROR_KEYWORDS.some(
      (kw) =>
        resourceIdLower.includes(kw) ||
        labelLower.includes(kw) ||
        textLower.includes(kw) ||
        contentDescLower.includes(kw),
    );

    if (isErrorElement) {
      violations.push(
        makeViolation({
          ruleId: 'M-IS-007',
          wcagCriterion: '4.1.3',
          standard: 'IS17802',
          severity: 'minor',
          description:
            'Error message detected. Verify it is announced via accessibilityLiveRegion ' +
            '(Android: ACCESSIBILITY_LIVE_REGION_POLITE) or UIAccessibilityPostNotification (iOS) — ' +
            'cannot be verified through static tree inspection.',
          screen,
          element: el,
          helpUrl: `${IS17802_HELP_BASE}/M-IS-007`,
        }),
      );
      break;
    }
  }

  return violations;
}

/**
 * M-IS-008: Check color-only information patterns.
 */
export async function checkColorOnlyInformation(
  elements: MobileElement[],
  screen: ScreenState,
  _platform: MobilePlatform,
): Promise<MobileViolation[]> {
  const violations: MobileViolation[] = [];

  const COLOR_ONLY_PATTERN = /^(red|green|blue|yellow|orange|grey|gray|white|black|purple|pink)$/i;

  for (const el of elements) {
    if (!el.isVisible) continue;

    const textsToCheck = [el.contentDesc?.trim(), el.label?.trim()].filter(Boolean) as string[];

    for (const text of textsToCheck) {
      if (COLOR_ONLY_PATTERN.test(text)) {
        violations.push(
          makeViolation({
            ruleId: 'M-IS-008',
            wcagCriterion: '1.4.1',
            standard: 'IS17802',
            severity: 'moderate',
            description:
              'Element may convey information through colour alone without a text alternative ' +
              '(IS 17802 + WCAG 1.4.1).',
            screen,
            element: el,
            helpUrl: `${IS17802_HELP_BASE}/M-IS-008`,
          }),
        );
        break;
      }
    }
  }

  return violations;
}

/**
 * M-IS-009 (SEBI): Check trading element keyboard/switch accessibility.
 */
export async function checkTradingKeyboardAccess(
  elements: MobileElement[],
  screen: ScreenState,
  _platform: MobilePlatform,
): Promise<MobileViolation[]> {
  const violations: MobileViolation[] = [];

  const TRADING_KEYWORDS = [
    'buy',
    'sell',
    'order',
    'trade',
    'bid',
    'ask',
    'quantity',
    'amount',
    'confirm',
  ];

  for (const el of elements) {
    if (!el.isVisible) continue;
    if (!isInteractive(el)) continue;

    const resourceIdLower = el.resourceId?.toLowerCase() ?? '';
    const labelLower = el.label?.toLowerCase() ?? '';
    const textLower = el.text?.toLowerCase() ?? '';
    const contentDescLower = el.contentDesc?.toLowerCase() ?? '';

    const isTradingElement = TRADING_KEYWORDS.some(
      (kw) =>
        resourceIdLower.includes(kw) ||
        labelLower.includes(kw) ||
        textLower.includes(kw) ||
        contentDescLower.includes(kw),
    );

    if (!isTradingElement) continue;

    if (!el.isFocusable) {
      violations.push(
        makeViolation({
          ruleId: 'M-IS-009',
          wcagCriterion: '2.1.1',
          standard: 'SEBI',
          severity: 'critical',
          description:
            'Trading action element is not keyboard/switch-accessible. ' +
            'SEBI mandate requires all investor actions to be operable without touch (SEBI 2024 + WCAG 2.1.1).',
          screen,
          element: el,
          helpUrl: `${SEBI_HELP_BASE}/M-IS-009`,
        }),
      );
    }
  }

  return violations;
}

/**
 * M-IS-010 (SEBI): Check dialog/modal accessibility.
 */
export async function checkDialogAccessibility(
  elements: MobileElement[],
  screen: ScreenState,
  _platform: MobilePlatform,
): Promise<MobileViolation[]> {
  const violations: MobileViolation[] = [];

  const DIALOG_CLASS_PATTERNS = ['dialog', 'bottomsheet', 'modal', 'alert', 'popup', 'sheet'];

  for (const el of elements) {
    if (!el.isVisible) continue;

    const classNameLower = el.className?.toLowerCase() ?? '';

    const isDialogElement = DIALOG_CLASS_PATTERNS.some((p) => classNameLower.includes(p));

    if (!isDialogElement) continue;

    if (!el.contentDesc?.trim() && !el.label?.trim()) {
      violations.push(
        makeViolation({
          ruleId: 'M-IS-010',
          wcagCriterion: '4.1.2',
          standard: 'SEBI',
          severity: 'critical',
          description:
            'Dialog/modal container missing accessible name. ' +
            'Screen reader users cannot identify the purpose of this overlay (SEBI 2024 + WCAG 4.1.2).',
          screen,
          element: el,
          helpUrl: `${SEBI_HELP_BASE}/M-IS-010`,
        }),
      );
    }
  }

  return violations;
}

/**
 * M-IS-011 (SEBI): Check table/list accessibility for financial data.
 */
export async function checkTableAccessibility(
  elements: MobileElement[],
  screen: ScreenState,
  _platform: MobilePlatform,
): Promise<MobileViolation[]> {
  const violations: MobileViolation[] = [];

  const TABLE_CLASS_PATTERNS = ['tablerow', 'tablelayout', 'recyclerview', 'listview'];
  const FINANCIAL_KEYWORDS = [
    'portfolio',
    'holdings',
    'watchlist',
    'transactions',
    'fund',
    'stock',
    'mutual',
  ];

  for (const el of elements) {
    if (!el.isVisible) continue;

    const classNameLower = el.className?.toLowerCase() ?? '';
    const isTableElement = TABLE_CLASS_PATTERNS.some((p) => classNameLower.includes(p));

    if (!isTableElement) continue;

    const allScreenText = elements
      .map((e) => [e.text, e.contentDesc, e.label].filter(Boolean).join(' '))
      .join(' ')
      .toLowerCase();

    const hasFinancialContext = FINANCIAL_KEYWORDS.some((kw) => allScreenText.includes(kw));

    if (!hasFinancialContext) continue;

    const children = el.children.slice(0, 5);
    const hasAccessibleHeaders = children.some(
      (child) => child.contentDesc?.trim() || child.label?.trim(),
    );

    if (!hasAccessibleHeaders) {
      violations.push(
        makeViolation({
          ruleId: 'M-IS-011',
          wcagCriterion: '1.3.1',
          standard: 'SEBI',
          severity: 'serious',
          description:
            'Portfolio/holdings data table may lack accessible column headers (SEBI 2024 + WCAG 1.3.1).',
          screen,
          element: el,
          helpUrl: `${SEBI_HELP_BASE}/M-IS-011`,
        }),
      );
    }
  }

  return violations;
}

/**
 * M-IS-013 (SEBI): Check KYC/camera screen accessibility.
 */
export async function checkKycScreens(
  elements: MobileElement[],
  screen: ScreenState,
  _platform: MobilePlatform,
): Promise<MobileViolation[]> {
  const violations: MobileViolation[] = [];

  const KYC_KEYWORDS = ['kyc', 'camera', 'selfie', 'document', 'aadhaar', 'pan', 'capture', 'scan'];
  const MIN_INSTRUCTION_LENGTH = 20;

  const allText = elements
    .map((e) => [e.resourceId, e.contentDesc, e.label, e.text].filter(Boolean).join(' '))
    .join(' ')
    .toLowerCase();

  const isKycScreen = KYC_KEYWORDS.some((kw) => allText.includes(kw));

  if (!isKycScreen) return violations;

  const hasInstructions = elements.some((el) => {
    const accessibleText = getAccessibleText(el);
    return accessibleText.length >= MIN_INSTRUCTION_LENGTH;
  });

  if (!hasInstructions) {
    violations.push(
      makeViolation({
        ruleId: 'M-IS-013',
        wcagCriterion: '3.3.2',
        standard: 'SEBI',
        severity: 'critical',
        description:
          'KYC/document capture screen may lack accessible instructions for screen reader users. ' +
          'Provide alternative text-based guidance (SEBI 2024).',
        screen,
        helpUrl: `${SEBI_HELP_BASE}/M-IS-013`,
      }),
    );
  }

  return violations;
}

/**
 * M-IS-014 (SEBI): Check payment/PIN screen accessibility.
 */
export async function checkPaymentPinScreens(
  elements: MobileElement[],
  screen: ScreenState,
  _platform: MobilePlatform,
): Promise<MobileViolation[]> {
  const violations: MobileViolation[] = [];

  const PAYMENT_KEYWORDS = ['pin', 'mpin', 'password', 'payment', 'upi', 'otp', 'secure', 'tpin'];

  const allText = elements
    .map((e) => [e.resourceId, e.label, e.text].filter(Boolean).join(' '))
    .join(' ')
    .toLowerCase();

  const isPaymentScreen = PAYMENT_KEYWORDS.some((kw) => allText.includes(kw));

  if (!isPaymentScreen) return violations;

  const editTextElements = elements.filter(
    (el) =>
      el.isVisible &&
      (el.className?.toLowerCase().includes('edittext') ||
        el.className?.toLowerCase().includes('textfield') ||
        el.role === 'textbox'),
  );

  if (editTextElements.length === 0) return violations;

  const allLacksAccessibleName = editTextElements.every(
    (el) => !el.contentDesc?.trim() && !el.label?.trim() && !el.hint?.trim(),
  );

  if (allLacksAccessibleName) {
    violations.push(
      makeViolation({
        ruleId: 'M-IS-014',
        wcagCriterion: '4.1.2',
        standard: 'SEBI',
        severity: 'critical',
        description:
          'Payment/authentication screen input fields lack accessible labels. ' +
          'Users with disabilities cannot identify which field to complete (SEBI 2024 + WCAG 4.1.2).',
        screen,
        helpUrl: `${SEBI_HELP_BASE}/M-IS-014`,
      }),
    );
  }

  return violations;
}
