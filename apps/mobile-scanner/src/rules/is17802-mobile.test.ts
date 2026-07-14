/**
 * Unit Tests for IS 17802 Mobile Rules
 *
 * Tests all 14 IS 17802 mobile accessibility rules.
 */

import { describe, it, expect } from 'vitest';
import type { MobileElement, ScreenState, MobilePlatform, ElementBounds } from '../types.js';
import {
  flattenElements,
  isInteractive,
  isTouchableTarget,
  isDevanagariUnicode,
  isAsciiTransliteration,
  checkContentDescriptions,
  checkDevanagariEncoding,
  checkTouchTargetSizes,
  checkDatePickerFormat,
  checkOtpFields,
  checkChartAccessibility,
  checkErrorAnnouncements,
  checkColorOnlyInformation,
  checkTradingKeyboardAccess,
  checkDialogAccessibility,
  checkTableAccessibility,
  checkKycScreens,
  checkPaymentPinScreens,
} from './is17802-mobile.js';

// ─── Test Fixtures ────────────────────────────────────────────────────────────

function createBounds(width: number, height: number, x = 0, y = 0): ElementBounds {
  return { x, y, width, height };
}

function createMobileElement(overrides: Partial<MobileElement> = {}): MobileElement {
  return {
    elementId: overrides.elementId ?? 'e1',
    text: overrides.text ?? null,
    contentDesc: overrides.contentDesc ?? null,
    label: overrides.label ?? null,
    hint: overrides.hint ?? null,
    role: overrides.role ?? null,
    bounds: overrides.bounds ?? createBounds(100, 100),
    isClickable: overrides.isClickable ?? false,
    isFocusable: overrides.isFocusable ?? false,
    isEnabled: overrides.isEnabled ?? true,
    isVisible: overrides.isVisible ?? true,
    className: overrides.className ?? null,
    resourceId: overrides.resourceId ?? null,
    children: overrides.children ?? [],
  };
}

function createScreenState(
  elements: MobileElement[],
  overrides: Partial<ScreenState> = {},
): ScreenState {
  return {
    screenId: overrides.screenId ?? 'screen-1',
    activityName: overrides.activityName ?? 'com.app.MainActivity',
    title: overrides.title ?? 'Test Screen',
    elements,
    screenshotS3Key: overrides.screenshotS3Key ?? null,
    timestamp: overrides.timestamp ?? Date.now(),
  };
}

// ─── Helper Function Tests ────────────────────────────────────────────────────

describe('Helper Functions', () => {
  describe('flattenElements', () => {
    it('flattens nested element tree', () => {
      const child1 = createMobileElement({ elementId: 'child1' });
      const child2 = createMobileElement({ elementId: 'child2' });
      const parent = createMobileElement({ elementId: 'parent', children: [child1, child2] });

      const flattened = flattenElements([parent]);

      expect(flattened).toHaveLength(3);
      expect(flattened.map((e) => e.elementId)).toEqual(['parent', 'child1', 'child2']);
    });

    it('handles deeply nested elements', () => {
      const grandchild = createMobileElement({ elementId: 'grandchild' });
      const child = createMobileElement({ elementId: 'child', children: [grandchild] });
      const parent = createMobileElement({ elementId: 'parent', children: [child] });

      const flattened = flattenElements([parent]);

      expect(flattened).toHaveLength(3);
      expect(flattened.map((e) => e.elementId)).toEqual(['parent', 'child', 'grandchild']);
    });
  });

  describe('isInteractive', () => {
    it('returns true for clickable elements', () => {
      const el = createMobileElement({ isClickable: true });
      expect(isInteractive(el)).toBe(true);
    });

    it('returns true for focusable elements', () => {
      const el = createMobileElement({ isFocusable: true });
      expect(isInteractive(el)).toBe(true);
    });

    it('returns true for button role', () => {
      const el = createMobileElement({ role: 'button' });
      expect(isInteractive(el)).toBe(true);
    });

    it('returns false for static elements', () => {
      const el = createMobileElement({ isClickable: false, isFocusable: false, role: 'text' });
      expect(isInteractive(el)).toBe(false);
    });
  });

  describe('isTouchableTarget', () => {
    it('returns true for interactive element with valid bounds', () => {
      const el = createMobileElement({ isClickable: true, bounds: createBounds(48, 48) });
      expect(isTouchableTarget(el)).toBe(true);
    });

    it('returns false for element with zero-width bounds', () => {
      const el = createMobileElement({ isClickable: true, bounds: createBounds(0, 48) });
      expect(isTouchableTarget(el)).toBe(false);
    });

    it('returns false for non-interactive element', () => {
      const el = createMobileElement({ isClickable: false, bounds: createBounds(48, 48) });
      expect(isTouchableTarget(el)).toBe(false);
    });
  });

  describe('isDevanagariUnicode', () => {
    it('returns true for Devanagari text', () => {
      expect(isDevanagariUnicode('नमस्ते')).toBe(true);
    });

    it('returns false for ASCII text', () => {
      expect(isDevanagariUnicode('namaste')).toBe(false);
    });

    it('returns true for mixed text with Devanagari', () => {
      expect(isDevanagariUnicode('Hello नमस्ते World')).toBe(true);
    });
  });

  describe('isAsciiTransliteration', () => {
    it('returns true for common Hindi transliteration', () => {
      expect(isAsciiTransliteration('aap ka swagat hai')).toBe(true);
      expect(isAsciiTransliteration('dhanyavaad')).toBe(true);
      expect(isAsciiTransliteration('namaste')).toBe(true);
    });

    it('returns false for English text', () => {
      expect(isAsciiTransliteration('hello world')).toBe(false);
    });

    it('returns false if Devanagari is present', () => {
      expect(isAsciiTransliteration('namaste नमस्ते')).toBe(false);
    });
  });
});

// ─── Rule Tests ───────────────────────────────────────────────────────────────

describe('M-IS-001: Content Descriptions', () => {
  const platform: MobilePlatform = 'android';

  it('should PASS for interactive element with contentDesc', async () => {
    const el = createMobileElement({
      isClickable: true,
      contentDesc: 'Submit button',
    });
    const screen = createScreenState([el]);

    const violations = await checkContentDescriptions([el], screen, platform);

    expect(violations).toHaveLength(0);
  });

  it('should PASS for interactive element with text', async () => {
    const el = createMobileElement({
      isClickable: true,
      text: 'Submit',
    });
    const screen = createScreenState([el]);

    const violations = await checkContentDescriptions([el], screen, platform);

    expect(violations).toHaveLength(0);
  });

  it('should FAIL for interactive element without accessible name (Android)', async () => {
    const el = createMobileElement({
      elementId: 'btn1',
      isClickable: true,
      className: 'android.widget.Button',
    });
    const screen = createScreenState([el]);

    const violations = await checkContentDescriptions([el], screen, 'android');

    expect(violations).toHaveLength(1);
    const v = violations[0]!;
    expect(v.ruleId).toBe('M-IS-001');
    expect(v.severity).toBe('critical');
    expect(v.description).toContain('contentDescription');
  });

  it('should FAIL for interactive element without accessible name (iOS)', async () => {
    const el = createMobileElement({
      elementId: 'btn1',
      isClickable: true,
      className: 'XCUIElementTypeButton',
    });
    const screen = createScreenState([el]);

    const violations = await checkContentDescriptions([el], screen, 'ios');

    expect(violations).toHaveLength(1);
    expect(violations[0]!.description).toContain('accessibilityLabel');
  });

  it('should PASS when child has text (text propagation)', async () => {
    const child = createMobileElement({ text: 'Click me' });
    const el = createMobileElement({
      isClickable: true,
      children: [child],
    });
    const screen = createScreenState([el]);

    const violations = await checkContentDescriptions([el, child], screen, platform);

    expect(violations).toHaveLength(0);
  });

  it('should skip non-visible elements', async () => {
    const el = createMobileElement({
      isClickable: true,
      isVisible: false,
    });
    const screen = createScreenState([el]);

    const violations = await checkContentDescriptions([el], screen, platform);

    expect(violations).toHaveLength(0);
  });
});

describe('M-IS-002: Devanagari Encoding', () => {
  const platform: MobilePlatform = 'android';

  it('should PASS for proper Devanagari Unicode', async () => {
    const el = createMobileElement({
      contentDesc: 'जमा करें',
      text: 'जमा',
    });
    const screen = createScreenState([el]);

    const violations = await checkDevanagariEncoding([el], screen, platform);

    expect(violations).toHaveLength(0);
  });

  it('should FAIL for ASCII transliteration', async () => {
    const el = createMobileElement({
      elementId: 'label1',
      contentDesc: 'aapka swagat hai',
    });
    const screen = createScreenState([el]);

    const violations = await checkDevanagariEncoding([el], screen, platform);

    expect(violations).toHaveLength(1);
    const v = violations[0]!;
    expect(v.ruleId).toBe('M-IS-002');
    expect(v.severity).toBe('serious');
    expect(v.description).toContain('ASCII transliteration');
  });

  it('should PASS for English text', async () => {
    const el = createMobileElement({
      contentDesc: 'Submit your form',
    });
    const screen = createScreenState([el]);

    const violations = await checkDevanagariEncoding([el], screen, platform);

    expect(violations).toHaveLength(0);
  });
});

describe('M-IS-003: Touch Target Sizes', () => {
  it('should PASS for adequately sized touch target (Android)', async () => {
    const el = createMobileElement({
      isClickable: true,
      bounds: createBounds(48, 48),
    });
    const screen = createScreenState([el]);

    const violations = await checkTouchTargetSizes([el], screen, 'android');

    expect(violations).toHaveLength(0);
  });

  it('should PASS for adequately sized touch target (iOS)', async () => {
    const el = createMobileElement({
      isClickable: true,
      bounds: createBounds(44, 44),
    });
    const screen = createScreenState([el]);

    const violations = await checkTouchTargetSizes([el], screen, 'ios');

    expect(violations).toHaveLength(0);
  });

  it('should FAIL for undersized touch target (Android)', async () => {
    const el = createMobileElement({
      elementId: 'btn1',
      isClickable: true,
      isFocusable: true,
      bounds: createBounds(32, 32),
    });
    const screen = createScreenState([el]);

    const violations = await checkTouchTargetSizes([el], screen, 'android');

    expect(violations).toHaveLength(1);
    const v = violations[0]!;
    expect(v.ruleId).toBe('M-IS-003');
    expect(v.severity).toBe('serious');
    expect(v.description).toContain('Touch target too small');
  });

  it('should FAIL for undersized touch target (iOS)', async () => {
    const el = createMobileElement({
      elementId: 'btn1',
      isClickable: true,
      bounds: createBounds(30, 30),
    });
    const screen = createScreenState([el]);

    const violations = await checkTouchTargetSizes([el], screen, 'ios');

    expect(violations).toHaveLength(1);
    expect(violations[0]!.description).toContain('44x44pt');
  });

  it('should handle pixel values by converting to dp (Android)', async () => {
    const el = createMobileElement({
      elementId: 'btn1',
      isClickable: true,
      isFocusable: true,
      bounds: createBounds(80, 80),
    });
    const screen = createScreenState([el]);

    const violations = await checkTouchTargetSizes([el], screen, 'android');

    expect(violations).toHaveLength(0);
  });

  it('should skip non-interactive elements', async () => {
    const el = createMobileElement({
      isClickable: false,
      bounds: createBounds(10, 10),
    });
    const screen = createScreenState([el]);

    const violations = await checkTouchTargetSizes([el], screen, 'android');

    expect(violations).toHaveLength(0);
  });
});

describe('M-IS-004: Date Picker Format', () => {
  const platform: MobilePlatform = 'android';

  it('should PASS for DD/MM/YYYY format', async () => {
    const el = createMobileElement({
      className: 'DatePicker',
      contentDesc: 'Select date: 25/12/2024',
    });
    const screen = createScreenState([el]);

    const violations = await checkDatePickerFormat([el], screen, platform);

    expect(violations).toHaveLength(0);
  });

  it('should FAIL for MM/DD/YYYY format', async () => {
    const el = createMobileElement({
      elementId: 'date1',
      className: 'DatePicker',
      contentDesc: '12/25/2024',
    });
    const screen = createScreenState([el]);

    const violations = await checkDatePickerFormat([el], screen, platform);

    expect(violations).toHaveLength(1);
    const v = violations[0]!;
    expect(v.ruleId).toBe('M-IS-004');
    expect(v.severity).toBe('moderate');
    expect(v.description).toContain('DD/MM/YYYY');
  });

  it('should skip non-date elements', async () => {
    const el = createMobileElement({
      className: 'android.widget.Button',
      contentDesc: '12/25/2024',
    });
    const screen = createScreenState([el]);

    const violations = await checkDatePickerFormat([el], screen, platform);

    expect(violations).toHaveLength(0);
  });
});

describe('M-IS-005: OTP Fields', () => {
  const platform: MobilePlatform = 'android';

  it('should PASS for OTP field with accessible label', async () => {
    const el = createMobileElement({
      className: 'android.widget.EditText',
      resourceId: 'otp_input',
      contentDesc: 'Enter OTP code',
    });
    const screen = createScreenState([el]);

    const violations = await checkOtpFields([el], screen, platform);

    expect(violations).toHaveLength(0);
  });

  it('should FAIL for OTP field without accessible label', async () => {
    const el = createMobileElement({
      elementId: 'otp1',
      className: 'android.widget.EditText',
      resourceId: 'otp_input',
    });
    const screen = createScreenState([el]);

    const violations = await checkOtpFields([el], screen, platform);

    expect(violations).toHaveLength(1);
    const v = violations[0]!;
    expect(v.ruleId).toBe('M-IS-005');
    expect(v.severity).toBe('critical');
    expect(v.description).toContain('OTP/PIN');
  });

  it('should skip non-OTP text fields', async () => {
    const el = createMobileElement({
      className: 'android.widget.EditText',
      resourceId: 'name_input',
    });
    const screen = createScreenState([el]);

    const violations = await checkOtpFields([el], screen, platform);

    expect(violations).toHaveLength(0);
  });
});

describe('M-IS-006: Chart Accessibility', () => {
  const platform: MobilePlatform = 'android';

  it('should PASS for chart with contentDesc', async () => {
    const el = createMobileElement({
      className: 'ChartView',
      contentDesc: 'Bar chart showing monthly revenue: January 100k, February 120k, March 150k',
    });
    const screen = createScreenState([el]);

    const violations = await checkChartAccessibility([el], screen, platform);

    expect(violations).toHaveLength(0);
  });

  it('should FAIL for chart without text alternative', async () => {
    const el = createMobileElement({
      elementId: 'chart1',
      className: 'ChartView',
      resourceId: 'pie_chart',
    });
    const screen = createScreenState([el]);

    const violations = await checkChartAccessibility([el], screen, platform);

    expect(violations).toHaveLength(1);
    const v = violations[0]!;
    expect(v.ruleId).toBe('M-IS-006');
    expect(v.severity).toBe('critical');
    expect(v.description).toContain('Chart/graph');
  });

  it('should detect Canvas-based charts', async () => {
    const el = createMobileElement({
      elementId: 'canvas1',
      className: 'android.view.SurfaceView',
      resourceId: 'candlestick_chart',
    });
    const screen = createScreenState([el]);

    const violations = await checkChartAccessibility([el], screen, platform);

    expect(violations).toHaveLength(1);
  });

  it('should skip non-chart elements', async () => {
    const el = createMobileElement({
      className: 'android.widget.TextView',
    });
    const screen = createScreenState([el]);

    const violations = await checkChartAccessibility([el], screen, platform);

    expect(violations).toHaveLength(0);
  });
});

describe('M-IS-007: Error Announcements', () => {
  const platform: MobilePlatform = 'android';

  it('should flag error elements as informational', async () => {
    const el = createMobileElement({
      elementId: 'error1',
      resourceId: 'error_message',
      text: 'Invalid email address',
    });
    const screen = createScreenState([el]);

    const violations = await checkErrorAnnouncements([el], screen, platform);

    expect(violations).toHaveLength(1);
    const v = violations[0]!;
    expect(v.ruleId).toBe('M-IS-007');
    expect(v.severity).toBe('minor');
    expect(v.description).toContain('accessibilityLiveRegion');
  });

  it('should PASS for screens without error elements', async () => {
    const el = createMobileElement({
      resourceId: 'welcome_text',
      text: 'Welcome to the app',
    });
    const screen = createScreenState([el]);

    const violations = await checkErrorAnnouncements([el], screen, platform);

    expect(violations).toHaveLength(0);
  });
});

describe('M-IS-008: Color Only Information', () => {
  const platform: MobilePlatform = 'android';

  it('should FAIL for color-only contentDesc', async () => {
    const el = createMobileElement({
      elementId: 'indicator1',
      contentDesc: 'green',
    });
    const screen = createScreenState([el]);

    const violations = await checkColorOnlyInformation([el], screen, platform);

    expect(violations).toHaveLength(1);
    const v = violations[0]!;
    expect(v.ruleId).toBe('M-IS-008');
    expect(v.severity).toBe('moderate');
    expect(v.description).toContain('colour alone');
  });

  it('should PASS for descriptive text with color', async () => {
    const el = createMobileElement({
      contentDesc: 'Portfolio up 5.2%, shown in green',
    });
    const screen = createScreenState([el]);

    const violations = await checkColorOnlyInformation([el], screen, platform);

    expect(violations).toHaveLength(0);
  });

  it('should PASS for non-color text', async () => {
    const el = createMobileElement({
      contentDesc: 'Submit button',
    });
    const screen = createScreenState([el]);

    const violations = await checkColorOnlyInformation([el], screen, platform);

    expect(violations).toHaveLength(0);
  });
});

describe('M-IS-009 (SEBI): Trading Keyboard Access', () => {
  const platform: MobilePlatform = 'android';

  it('should PASS for focusable trading button', async () => {
    const el = createMobileElement({
      isClickable: true,
      isFocusable: true,
      resourceId: 'buy_button',
      text: 'Buy',
    });
    const screen = createScreenState([el]);

    const violations = await checkTradingKeyboardAccess([el], screen, platform);

    expect(violations).toHaveLength(0);
  });

  it('should FAIL for non-focusable trading button', async () => {
    const el = createMobileElement({
      elementId: 'buy1',
      isClickable: true,
      isFocusable: false,
      resourceId: 'sell_button',
      text: 'Sell',
    });
    const screen = createScreenState([el]);

    const violations = await checkTradingKeyboardAccess([el], screen, platform);

    expect(violations).toHaveLength(1);
    const v = violations[0]!;
    expect(v.ruleId).toBe('M-IS-009');
    expect(v.standard).toBe('SEBI');
    expect(v.severity).toBe('critical');
    expect(v.description).toContain('SEBI mandate');
  });

  it('should skip non-trading elements', async () => {
    const el = createMobileElement({
      isClickable: true,
      isFocusable: false,
      resourceId: 'settings_button',
    });
    const screen = createScreenState([el]);

    const violations = await checkTradingKeyboardAccess([el], screen, platform);

    expect(violations).toHaveLength(0);
  });
});

describe('M-IS-010 (SEBI): Dialog Accessibility', () => {
  const platform: MobilePlatform = 'android';

  it('should PASS for dialog with accessible name', async () => {
    const el = createMobileElement({
      className: 'androidx.appcompat.app.AlertDialog',
      contentDesc: 'Confirm order dialog',
    });
    const screen = createScreenState([el]);

    const violations = await checkDialogAccessibility([el], screen, platform);

    expect(violations).toHaveLength(0);
  });

  it('should FAIL for dialog without accessible name', async () => {
    const el = createMobileElement({
      elementId: 'dialog1',
      className: 'androidx.appcompat.app.AlertDialog',
    });
    const screen = createScreenState([el]);

    const violations = await checkDialogAccessibility([el], screen, platform);

    expect(violations).toHaveLength(1);
    const v = violations[0]!;
    expect(v.ruleId).toBe('M-IS-010');
    expect(v.standard).toBe('SEBI');
    expect(v.severity).toBe('critical');
  });

  it('should detect BottomSheet dialogs', async () => {
    const el = createMobileElement({
      elementId: 'sheet1',
      className: 'com.google.android.material.bottomsheet.BottomSheetDialog',
    });
    const screen = createScreenState([el]);

    const violations = await checkDialogAccessibility([el], screen, platform);

    expect(violations).toHaveLength(1);
  });
});

describe('M-IS-011 (SEBI): Table Accessibility', () => {
  const platform: MobilePlatform = 'android';

  it('should PASS for table with accessible headers', async () => {
    const header = createMobileElement({ contentDesc: 'Stock name' });
    const tableRow = createMobileElement({
      className: 'androidx.recyclerview.widget.RecyclerView',
      children: [header],
    });
    const context = createMobileElement({ text: 'Your portfolio holdings' });
    const screen = createScreenState([tableRow, context]);

    const violations = await checkTableAccessibility([tableRow, context], screen, platform);

    expect(violations).toHaveLength(0);
  });

  it('should FAIL for table without accessible headers in financial context', async () => {
    const cell = createMobileElement({ text: 'RELIANCE' });
    const tableRow = createMobileElement({
      elementId: 'table1',
      className: 'androidx.recyclerview.widget.RecyclerView',
      children: [cell],
    });
    const context = createMobileElement({ text: 'Your portfolio holdings' });
    const screen = createScreenState([tableRow, context]);

    const violations = await checkTableAccessibility([tableRow, context], screen, platform);

    expect(violations).toHaveLength(1);
    const v = violations[0]!;
    expect(v.ruleId).toBe('M-IS-011');
    expect(v.standard).toBe('SEBI');
    expect(v.severity).toBe('serious');
  });

  it('should skip tables without financial context', async () => {
    const cell = createMobileElement({ text: 'Item 1' });
    const tableRow = createMobileElement({
      className: 'androidx.recyclerview.widget.RecyclerView',
      children: [cell],
    });
    const context = createMobileElement({ text: 'Settings menu' });
    const screen = createScreenState([tableRow, context]);

    const violations = await checkTableAccessibility([tableRow, context], screen, platform);

    expect(violations).toHaveLength(0);
  });
});

describe('M-IS-013 (SEBI): KYC Screens', () => {
  const platform: MobilePlatform = 'android';

  it('should PASS for KYC screen with instructions', async () => {
    const instruction = createMobileElement({
      contentDesc: 'Please position your face within the oval frame and ensure good lighting',
    });
    const camera = createMobileElement({ resourceId: 'camera_preview' });
    const screen = createScreenState([instruction, camera]);

    const violations = await checkKycScreens([instruction, camera], screen, platform);

    expect(violations).toHaveLength(0);
  });

  it('should FAIL for KYC screen without instructions', async () => {
    const camera = createMobileElement({
      resourceId: 'selfie_capture',
      contentDesc: 'Camera',
    });
    const button = createMobileElement({
      resourceId: 'capture_btn',
      text: 'Capture',
    });
    const screen = createScreenState([camera, button]);

    const violations = await checkKycScreens([camera, button], screen, platform);

    expect(violations).toHaveLength(1);
    const v = violations[0]!;
    expect(v.ruleId).toBe('M-IS-013');
    expect(v.standard).toBe('SEBI');
    expect(v.severity).toBe('critical');
    expect(v.description).toContain('KYC');
  });

  it('should skip non-KYC screens', async () => {
    const el = createMobileElement({
      resourceId: 'welcome_screen',
      text: 'Welcome',
    });
    const screen = createScreenState([el]);

    const violations = await checkKycScreens([el], screen, platform);

    expect(violations).toHaveLength(0);
  });
});

describe('M-IS-014 (SEBI): Payment PIN Screens', () => {
  const platform: MobilePlatform = 'android';

  it('should PASS for payment screen with labeled inputs', async () => {
    const input = createMobileElement({
      className: 'android.widget.EditText',
      resourceId: 'mpin_input',
      contentDesc: 'Enter your 4-digit MPIN',
    });
    const screen = createScreenState([input]);

    const violations = await checkPaymentPinScreens([input], screen, platform);

    expect(violations).toHaveLength(0);
  });

  it('should FAIL for payment screen with unlabeled inputs', async () => {
    const input1 = createMobileElement({
      className: 'android.widget.EditText',
      resourceId: 'pin_digit_1',
    });
    const input2 = createMobileElement({
      className: 'android.widget.EditText',
      resourceId: 'pin_digit_2',
    });
    const label = createMobileElement({
      text: 'Enter UPI PIN',
    });
    const screen = createScreenState([input1, input2, label]);

    const violations = await checkPaymentPinScreens([input1, input2, label], screen, platform);

    expect(violations).toHaveLength(1);
    const v = violations[0]!;
    expect(v.ruleId).toBe('M-IS-014');
    expect(v.standard).toBe('SEBI');
    expect(v.severity).toBe('critical');
    expect(v.description).toContain('Payment/authentication');
  });

  it('should skip non-payment screens', async () => {
    const input = createMobileElement({
      className: 'android.widget.EditText',
      resourceId: 'search_input',
    });
    const screen = createScreenState([input]);

    const violations = await checkPaymentPinScreens([input], screen, platform);

    expect(violations).toHaveLength(0);
  });
});

// ─── Integration Tests ────────────────────────────────────────────────────────

describe('MobileRuleEngine Integration', () => {
  it('should detect multiple violations on a complex screen', async () => {
    const elements: MobileElement[] = [
      createMobileElement({
        elementId: 'btn1',
        isClickable: true,
        className: 'android.widget.Button',
      }),
      createMobileElement({
        elementId: 'chart1',
        className: 'ChartView',
        resourceId: 'portfolio_chart',
      }),
      createMobileElement({
        elementId: 'indicator1',
        contentDesc: 'red',
      }),
    ];
    const screen = createScreenState(elements);

    const contentViolations = await checkContentDescriptions(elements, screen, 'android');
    const chartViolations = await checkChartAccessibility(elements, screen, 'android');
    const colorViolations = await checkColorOnlyInformation(elements, screen, 'android');

    expect(contentViolations.length).toBeGreaterThanOrEqual(1);
    expect(chartViolations.length).toBeGreaterThanOrEqual(1);
    expect(colorViolations.length).toBeGreaterThanOrEqual(1);
  });

  it('should produce no violations for a fully accessible screen', async () => {
    const elements: MobileElement[] = [
      createMobileElement({
        isClickable: true,
        isFocusable: true,
        contentDesc: 'Submit form',
        bounds: createBounds(100, 50),
      }),
      createMobileElement({
        className: 'ChartView',
        contentDesc: 'Portfolio performance chart showing 10% growth this month',
      }),
      createMobileElement({
        contentDesc: 'Status: Successful - shown in green',
      }),
    ];
    const screen = createScreenState(elements);

    const contentViolations = await checkContentDescriptions(elements, screen, 'android');
    const chartViolations = await checkChartAccessibility(elements, screen, 'android');
    const colorViolations = await checkColorOnlyInformation(elements, screen, 'android');

    expect(contentViolations).toHaveLength(0);
    expect(chartViolations).toHaveLength(0);
    expect(colorViolations).toHaveLength(0);
  });
});
