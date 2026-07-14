/**
 * IS 17802 Rules Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Page } from 'playwright';
import {
  checkHtmlLanguage,
  checkDevanagariEncoding,
  checkDateInputFormat,
  checkFormHelpTextLanguage,
  checkCaptchaAudioAlternative,
  checkPdfAccessibleAlternative,
  runIS17802Rules,
} from '../rules/is17802';

vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../axe-runner', () => ({
  computeFingerprint: vi
    .fn()
    .mockImplementation((assetId: string, ruleId: string, selector: string) =>
      `${assetId}-${ruleId}-${selector}`.substring(0, 16),
    ),
}));

/**
 * Create a mock Playwright Page object.
 */
function mockPage(
  overrides: Partial<{
    $eval: ReturnType<typeof vi.fn>;
    evaluate: ReturnType<typeof vi.fn>;
    $$eval: ReturnType<typeof vi.fn>;
  }> = {},
): Page {
  return {
    $eval: vi.fn(),
    evaluate: vi.fn(),
    $$eval: vi.fn(),
    ...overrides,
  } as unknown as Page;
}

describe('IS 17802 Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('IS-001 checkHtmlLanguage', () => {
    it('returns critical violation when lang attribute is missing', async () => {
      const page = mockPage({
        $eval: vi.fn().mockResolvedValue(null),
      });

      const violations = await checkHtmlLanguage(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(1);
      expect(violations[0]!.severity).toBe('critical');
      expect(violations[0]!.ruleId).toBe('IS-001');
      expect(violations[0]!.description).toContain('missing');
    });

    it('returns critical violation when lang attribute is empty', async () => {
      const page = mockPage({
        $eval: vi.fn().mockResolvedValue(''),
      });

      const violations = await checkHtmlLanguage(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(1);
      expect(violations[0]!.severity).toBe('critical');
      expect(violations[0]!.ruleId).toBe('IS-001');
    });

    it('returns serious violation when lang is not a valid Indian language code', async () => {
      const page = mockPage({
        $eval: vi.fn().mockResolvedValue('xyz'),
      });

      const violations = await checkHtmlLanguage(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(1);
      expect(violations[0]!.severity).toBe('serious');
      expect(violations[0]!.ruleId).toBe('IS-001');
      expect(violations[0]!.description).toContain('xyz');
    });

    it('returns no violation for valid lang="hi"', async () => {
      const page = mockPage({
        $eval: vi.fn().mockResolvedValue('hi'),
      });

      const violations = await checkHtmlLanguage(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(0);
    });

    it('returns no violation for valid lang="en-IN"', async () => {
      const page = mockPage({
        $eval: vi.fn().mockResolvedValue('en-IN'),
      });

      const violations = await checkHtmlLanguage(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(0);
    });

    it('returns no violation for valid lang="en"', async () => {
      const page = mockPage({
        $eval: vi.fn().mockResolvedValue('en'),
      });

      const violations = await checkHtmlLanguage(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(0);
    });

    it('returns no violation for valid lang="bn"', async () => {
      const page = mockPage({
        $eval: vi.fn().mockResolvedValue('bn'),
      });

      const violations = await checkHtmlLanguage(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(0);
    });

    it('handles case-insensitive lang attribute', async () => {
      const page = mockPage({
        $eval: vi.fn().mockResolvedValue('HI'),
      });

      const violations = await checkHtmlLanguage(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(0);
    });
  });

  describe('IS-002 checkDevanagariEncoding', () => {
    it('returns serious violation when Hindi page has no Devanagari content', async () => {
      const page = mockPage({
        $eval: vi.fn().mockResolvedValue('hi'),
        evaluate: vi.fn().mockResolvedValue('This is all ASCII text without any Hindi'),
      });

      const violations = await checkDevanagariEncoding(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(1);
      expect(violations[0]!.ruleId).toBe('IS-002');
      expect(violations[0]!.severity).toBe('serious');
      expect(violations[0]!.description).toContain('ASCII transliteration');
    });

    it('returns no violation when Hindi page has Devanagari content', async () => {
      const page = mockPage({
        $eval: vi.fn().mockResolvedValue('hi'),
        evaluate: vi.fn().mockResolvedValue('नमस्ते, यह हिंदी में है'),
      });

      const violations = await checkDevanagariEncoding(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(0);
    });

    it('skips check for non-Hindi pages', async () => {
      const page = mockPage({
        $eval: vi.fn().mockResolvedValue('en'),
        evaluate: vi.fn(),
      });

      const violations = await checkDevanagariEncoding(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(0);
      expect(page.evaluate).not.toHaveBeenCalled();
    });

    it('skips check when lang attribute is null', async () => {
      const page = mockPage({
        $eval: vi.fn().mockResolvedValue(null),
        evaluate: vi.fn(),
      });

      const violations = await checkDevanagariEncoding(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(0);
    });

    it('handles mixed content with some Devanagari', async () => {
      const page = mockPage({
        $eval: vi.fn().mockResolvedValue('hi'),
        evaluate: vi.fn().mockResolvedValue('Welcome to our site. भारत सरकार'),
      });

      const violations = await checkDevanagariEncoding(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(0);
    });
  });

  describe('IS-004 checkDateInputFormat', () => {
    it('returns violation for MM/DD/YYYY placeholder', async () => {
      const page = mockPage({
        evaluate: vi.fn().mockResolvedValue([
          {
            selector: 'input#date',
            html: '<input id="date" placeholder="MM/DD/YYYY">',
            placeholder: 'MM/DD/YYYY',
            ariaLabel: null,
            type: 'text',
          },
        ]),
      });

      const violations = await checkDateInputFormat(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(1);
      expect(violations[0]!.ruleId).toBe('IS-004');
      expect(violations[0]!.description).toContain('non-Indian date format');
    });

    it('returns violation for YYYY-MM-DD placeholder', async () => {
      const page = mockPage({
        evaluate: vi.fn().mockResolvedValue([
          {
            selector: 'input#dob',
            html: '<input id="dob" placeholder="YYYY-MM-DD">',
            placeholder: 'YYYY-MM-DD',
            ariaLabel: null,
            type: 'text',
          },
        ]),
      });

      const violations = await checkDateInputFormat(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(1);
      expect(violations[0]!.ruleId).toBe('IS-004');
    });

    it('returns no violation for DD/MM/YYYY placeholder', async () => {
      const page = mockPage({
        evaluate: vi.fn().mockResolvedValue([
          {
            selector: 'input#date',
            html: '<input id="date" placeholder="DD/MM/YYYY">',
            placeholder: 'DD/MM/YYYY',
            ariaLabel: null,
            type: 'text',
          },
        ]),
      });

      const violations = await checkDateInputFormat(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(0);
    });

    it('returns no violation when no date inputs found', async () => {
      const page = mockPage({
        evaluate: vi.fn().mockResolvedValue([]),
      });

      const violations = await checkDateInputFormat(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(0);
    });

    it('checks aria-label for date format hints', async () => {
      const page = mockPage({
        evaluate: vi.fn().mockResolvedValue([
          {
            selector: 'input#birth',
            html: '<input id="birth" aria-label="Date of Birth (MM/DD/YYYY)">',
            placeholder: null,
            ariaLabel: 'Date of Birth (MM/DD/YYYY)',
            type: 'text',
          },
        ]),
      });

      const violations = await checkDateInputFormat(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(1);
      expect(violations[0]!.ruleId).toBe('IS-004');
    });
  });

  describe('IS-003 checkFormHelpTextLanguage', () => {
    it('returns violation when label and help text languages differ', async () => {
      const page = mockPage({
        evaluate: vi.fn().mockResolvedValue([
          {
            inputSelector: 'input#name',
            inputHtml: '<input id="name" aria-describedby="name-help">',
            labelText: 'नाम',
            helpText: 'Enter your full name',
          },
        ]),
      });

      const violations = await checkFormHelpTextLanguage(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(1);
      expect(violations[0]!.ruleId).toBe('IS-003');
      expect(violations[0]!.severity).toBe('moderate');
    });

    it('returns no violation when languages match (both English)', async () => {
      const page = mockPage({
        evaluate: vi.fn().mockResolvedValue([
          {
            inputSelector: 'input#email',
            inputHtml: '<input id="email" aria-describedby="email-help">',
            labelText: 'Email Address',
            helpText: 'Enter your email address',
          },
        ]),
      });

      const violations = await checkFormHelpTextLanguage(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(0);
    });

    it('returns no violation when languages match (both Hindi)', async () => {
      const page = mockPage({
        evaluate: vi.fn().mockResolvedValue([
          {
            inputSelector: 'input#name',
            inputHtml: '<input id="name" aria-describedby="name-help">',
            labelText: 'नाम',
            helpText: 'अपना पूरा नाम दर्ज करें',
          },
        ]),
      });

      const violations = await checkFormHelpTextLanguage(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toHaveLength(0);
    });
  });

  describe('IS-005 checkCaptchaAudioAlternative', () => {
    it('returns violation for CAPTCHA without audio alternative', async () => {
      const page = mockPage({
        evaluate: vi.fn().mockResolvedValue([
          {
            selector: 'div#captcha',
            html: '<div id="captcha" class="captcha-container">...</div>',
            hasAudioAlternative: false,
          },
        ]),
      });

      const violations = await checkCaptchaAudioAlternative(
        page,
        'https://test.gov.in',
        'asset-123',
      );

      expect(violations).toHaveLength(1);
      expect(violations[0]!.ruleId).toBe('IS-005');
      expect(violations[0]!.severity).toBe('critical');
    });

    it('returns no violation when CAPTCHA has audio alternative', async () => {
      const page = mockPage({
        evaluate: vi.fn().mockResolvedValue([
          {
            selector: 'div#captcha',
            html: '<div id="captcha" class="captcha-container">...</div>',
            hasAudioAlternative: true,
          },
        ]),
      });

      const violations = await checkCaptchaAudioAlternative(
        page,
        'https://test.gov.in',
        'asset-123',
      );

      expect(violations).toHaveLength(0);
    });

    it('returns no violation when no CAPTCHA detected', async () => {
      const page = mockPage({
        evaluate: vi.fn().mockResolvedValue([]),
      });

      const violations = await checkCaptchaAudioAlternative(
        page,
        'https://test.gov.in',
        'asset-123',
      );

      expect(violations).toHaveLength(0);
    });
  });

  describe('IS-006 checkPdfAccessibleAlternative', () => {
    it('returns violation for PDF link without accessible alternative', async () => {
      const page = mockPage({
        evaluate: vi.fn().mockResolvedValue([
          {
            selector: 'a.pdf-link',
            html: '<a href="report.pdf" class="pdf-link">Download Report (PDF)</a>',
            hasAlternative: false,
          },
        ]),
      });

      const violations = await checkPdfAccessibleAlternative(
        page,
        'https://test.gov.in',
        'asset-123',
      );

      expect(violations).toHaveLength(1);
      expect(violations[0]!.ruleId).toBe('IS-006');
      expect(violations[0]!.severity).toBe('moderate');
    });

    it('returns no violation when PDF has accessible alternative nearby', async () => {
      const page = mockPage({
        evaluate: vi.fn().mockResolvedValue([
          {
            selector: 'a.pdf-link',
            html: '<a href="report.pdf" class="pdf-link">Download Report (PDF)</a>',
            hasAlternative: true,
          },
        ]),
      });

      const violations = await checkPdfAccessibleAlternative(
        page,
        'https://test.gov.in',
        'asset-123',
      );

      expect(violations).toHaveLength(0);
    });

    it('returns no violation when no PDF links found', async () => {
      const page = mockPage({
        evaluate: vi.fn().mockResolvedValue([]),
      });

      const violations = await checkPdfAccessibleAlternative(
        page,
        'https://test.gov.in',
        'asset-123',
      );

      expect(violations).toHaveLength(0);
    });
  });

  describe('runIS17802Rules', () => {
    it('runs all rules and merges results', async () => {
      const page = mockPage({
        $eval: vi.fn().mockResolvedValue(null),
        evaluate: vi.fn().mockResolvedValue([]),
      });

      const violations = await runIS17802Rules(page, 'https://test.gov.in', 'asset-123');

      expect(violations.length).toBeGreaterThanOrEqual(1);
      expect(violations.some((v) => v.ruleId === 'IS-001')).toBe(true);
    });

    it('handles errors gracefully and continues', async () => {
      const page = mockPage({
        $eval: vi.fn().mockRejectedValue(new Error('Page error')),
        evaluate: vi.fn().mockResolvedValue([]),
      });

      const violations = await runIS17802Rules(page, 'https://test.gov.in', 'asset-123');

      expect(violations).toBeDefined();
      expect(Array.isArray(violations)).toBe(true);
    });
  });
});
