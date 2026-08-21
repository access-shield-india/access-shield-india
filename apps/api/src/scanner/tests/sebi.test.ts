/**
 * SEBI circular website-rule unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Page } from 'playwright';
import {
  checkColorOnlyMarketIndicators,
  checkChartsWithoutTextAlternative,
  checkLiveTickerPauseControl,
  checkSebiAccessibilityStatement,
  runSebiChecks,
} from '../rules/sebi';

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

function mockPage(evaluateImpl: ReturnType<typeof vi.fn>): Page {
  return { evaluate: evaluateImpl } as unknown as Page;
}

describe('SEBI rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('SEBI-001 flags colour-only gain/loss indicators', async () => {
    const page = mockPage(
      vi.fn().mockResolvedValue([
        { selector: 'span[sebi-001="0"]', html: '<span class="gain"></span>', elementType: 'span' },
      ]),
    );

    const violations = await checkColorOnlyMarketIndicators(
      page,
      'https://broker.example',
      'asset-1',
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]!.ruleId).toBe('SEBI-001');
    expect(violations[0]!.standard).toBe('SEBI');
    expect(violations[0]!.severity).toBe('serious');
  });

  it('SEBI-002 flags unlabelled charts', async () => {
    const page = mockPage(
      vi.fn().mockResolvedValue([
        { selector: 'canvas[sebi-002="0"]', html: '<canvas></canvas>', elementType: 'canvas' },
      ]),
    );

    const violations = await checkChartsWithoutTextAlternative(
      page,
      'https://broker.example',
      'asset-1',
    );

    expect(violations[0]!.ruleId).toBe('SEBI-002');
    expect(violations[0]!.standard).toBe('SEBI');
  });

  it('SEBI-003 flags tickers without pause', async () => {
    const page = mockPage(
      vi.fn().mockResolvedValue([
        {
          selector: 'div[sebi-003="0"]',
          html: '<div class="ticker">NIFTY</div>',
          elementType: 'div',
        },
      ]),
    );

    const violations = await checkLiveTickerPauseControl(page, 'https://broker.example', 'asset-1');
    expect(violations[0]!.ruleId).toBe('SEBI-003');
  });

  it('SEBI-005 flags missing accessibility statement', async () => {
    const page = mockPage(vi.fn().mockResolvedValue(false));
    const violations = await checkSebiAccessibilityStatement(
      page,
      'https://broker.example',
      'asset-1',
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]!.ruleId).toBe('SEBI-005');
  });

  it('runSebiChecks merges all rule results', async () => {
    const page = mockPage(
      vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(false),
    );

    const violations = await runSebiChecks(page, 'https://broker.example', 'asset-1');
    expect(violations.some((v) => v.ruleId === 'SEBI-005')).toBe(true);
    expect(violations.every((v) => v.standard === 'SEBI')).toBe(true);
  });
});
