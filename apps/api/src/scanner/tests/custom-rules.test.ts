/**
 * Custom knowledge-base rules (RULE-004 – RULE-007)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Page } from 'playwright';
import {
  isFilenameAltText,
  checkFilenameAltText,
  checkDuplicateLinkText,
  checkAutoPlayingContent,
  checkCountdownTimers,
  runCustomAxeRules,
} from '../custom-rules';

vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

function mockPage(
  evaluateImpl: ReturnType<typeof vi.fn>,
  waitForTimeout = vi.fn().mockResolvedValue(undefined),
): Page {
  return {
    evaluate: evaluateImpl,
    waitForTimeout,
  } as unknown as Page;
}

describe('isFilenameAltText (RULE-004)', () => {
  it('flags image filenames with extensions', () => {
    expect(isFilenameAltText('IMG_20240315_logo_edited.png')).toBe(true);
    expect(isFilenameAltText('myntra_product_12345_a.jpg')).toBe(true);
    expect(isFilenameAltText('hero.webp')).toBe(true);
  });

  it('flags long hash/slug alts', () => {
    expect(isFilenameAltText('acc226_8e815d707c274a138916102553ffb989')).toBe(true);
  });

  it('allows human descriptions', () => {
    expect(isFilenameAltText('Faith Automation factory floor')).toBe(false);
    expect(isFilenameAltText('Metformin 500mg Tablet, pack of 10')).toBe(false);
    expect(isFilenameAltText('')).toBe(false);
  });
});

describe('checkFilenameAltText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps filename alts to RULE-004 serious violations', async () => {
    const page = mockPage(
      vi.fn().mockResolvedValue([
        {
          selector: 'img[alt]:nth-of-type(1)',
          html: '<img alt="hero.png">',
          elementType: 'img',
          description: 'filename',
        },
      ]),
    );

    const violations = await checkFilenameAltText(page, 'https://example.com', 'asset-1');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.ruleId).toBe('RULE-004');
    expect(violations[0]!.wcagCriterion).toBe('1.1.1');
    expect(violations[0]!.severity).toBe('serious');
  });
});

describe('checkDuplicateLinkText (RULE-005)', () => {
  it('flags groups of 3+ identical texts to different destinations', async () => {
    const page = mockPage(
      vi.fn().mockResolvedValue([
        {
          text: 'read more',
          count: 6,
          destinations: 6,
          sample: {
            selector: 'a[href]:nth-of-type(1)',
            html: '<a href="/a">Read more</a>',
            elementType: 'a',
            description: '6 links share identical text',
          },
        },
      ]),
    );

    const violations = await checkDuplicateLinkText(page, 'https://example.com', 'asset-1');
    expect(violations[0]!.ruleId).toBe('RULE-005');
    expect(violations[0]!.wcagCriterion).toBe('2.4.4');
    expect(violations[0]!.severity).toBe('moderate');
  });
});

describe('checkAutoPlayingContent (RULE-006)', () => {
  it('returns serious 2.2.2 findings', async () => {
    const page = mockPage(
      vi.fn().mockResolvedValue([
        {
          selector: '#hero-carousel',
          html: '<div id="hero-carousel" class="carousel" data-autoplay="true">',
          elementType: 'div',
          description: 'no pause',
        },
      ]),
    );

    const violations = await checkAutoPlayingContent(page, 'https://example.com', 'asset-1');
    expect(violations[0]!.ruleId).toBe('RULE-006');
    expect(violations[0]!.wcagCriterion).toBe('2.2.2');
    expect(violations[0]!.severity).toBe('serious');
  });
});

describe('checkCountdownTimers (RULE-007)', () => {
  it('flags ticking aria-live OTP timers as critical', async () => {
    const evaluate = vi
      .fn()
      .mockResolvedValueOnce([
        {
          selector: '#otp-timer',
          html: '<div aria-live="polite">30 seconds remaining</div>',
          text: '30 seconds remaining',
          live: 'polite',
          role: '',
        },
      ])
      .mockResolvedValueOnce([
        {
          selector: '#otp-timer',
          html: '<div aria-live="polite">29 seconds remaining</div>',
          text: '29 seconds remaining',
          live: 'polite',
          role: '',
        },
      ]);

    const page = mockPage(evaluate);
    const violations = await checkCountdownTimers(page, 'https://hdfcbank.com', 'asset-1');

    expect(evaluate).toHaveBeenCalledTimes(2);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.ruleId).toBe('RULE-007');
    expect(violations[0]!.wcagCriterion).toBe('4.1.3');
    expect(violations[0]!.severity).toBe('critical');
  });

  it('ignores aria-live=off regions', async () => {
    const offOnly = [
      {
        selector: '#status',
        html: '<div aria-live="off">Saved</div>',
        text: 'Saved',
        live: 'off',
        role: '',
      },
    ];
    const page = mockPage(vi.fn().mockResolvedValue(offOnly));
    const violations = await checkCountdownTimers(page, 'https://example.com', 'asset-1');
    expect(violations).toHaveLength(0);
  });
});

describe('runCustomAxeRules', () => {
  it('merges findings from all custom rules', async () => {
    const evaluate = vi.fn().mockImplementation(() => Promise.resolve([]));
    const page = mockPage(evaluate);

    const violations = await runCustomAxeRules(page, 'https://example.com', 'asset-1');
    expect(Array.isArray(violations)).toBe(true);
    expect(evaluate.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
