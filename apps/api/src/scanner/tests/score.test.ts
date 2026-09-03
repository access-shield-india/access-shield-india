/**
 * Score Calculator Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { calculateScore, buildScanScoreResult } from '../score';
import type { RawViolation } from '../types';

/**
 * Create a minimal RawViolation with the given severity.
 */
function makeViolation(
  severity: RawViolation['severity'],
  overrides: Partial<RawViolation> = {},
): RawViolation {
  return {
    ruleId: 'test-rule',
    wcagCriterion: '1.1.1',
    wcagLevel: 'AA',
    standard: 'WCAG22',
    severity,
    elementType: 'div',
    elementHtml: '<div>test</div>',
    elementSelector: 'div.test',
    description: 'Test violation',
    helpUrl: 'https://example.com/help',
    fingerprint: `fp-${Math.random().toString(36).substring(7)}`,
    pageUrl: 'https://example.com',
    ...overrides,
  };
}

describe('calculateScore', () => {
  it('returns 100 for zero violations', () => {
    expect(calculateScore([], 1)).toBe(100);
  });

  it('applies a softened penalty for repeated critical violations', () => {
    const violations = [makeViolation('critical'), makeViolation('critical')];
    expect(calculateScore(violations, 1)).toBe(83.03);
  });

  it('applies a softened penalty for repeated serious violations', () => {
    const violations = [makeViolation('serious'), makeViolation('serious')];
    expect(calculateScore(violations, 1)).toBe(92.93);
  });

  it('weights a single moderate violation', () => {
    expect(calculateScore([makeViolation('moderate')], 1)).toBe(97.5);
  });

  it('weights a single minor violation', () => {
    expect(calculateScore([makeViolation('minor')], 1)).toBe(99);
  });

  it('never returns negative score', () => {
    const violations = Array(15)
      .fill(null)
      .map(() => makeViolation('critical'));
    expect(calculateScore(violations, 1)).toBe(53.52);
  });

  it('handles mixed severity violations correctly', () => {
    const violations = [
      makeViolation('critical'),
      makeViolation('serious'),
      makeViolation('moderate'),
      makeViolation('minor'),
    ];
    expect(calculateScore(violations, 1)).toBe(79.5);
  });

  it('rounds to 2 decimal places', () => {
    const violations = Array(3)
      .fill(null)
      .map(() => makeViolation('minor'));
    expect(calculateScore(violations, 1)).toBe(98.27);
  });

  it('handles single critical violation', () => {
    expect(calculateScore([makeViolation('critical')], 1)).toBe(88);
  });

  it('handles single serious violation', () => {
    expect(calculateScore([makeViolation('serious')], 1)).toBe(95);
  });

  it('keeps deduction bounded for very large critical counts', () => {
    const violations = Array(20)
      .fill(null)
      .map(() => makeViolation('critical'));
    const score = calculateScore(violations, 1);
    expect(score).toBe(46.33);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('handles empty pages scanned gracefully', () => {
    expect(calculateScore([], 0)).toBe(100);
  });

  it('handles large number of minor violations', () => {
    const violations = Array(100)
      .fill(null)
      .map(() => makeViolation('minor'));
    const score = calculateScore(violations, 1);
    expect(score).toBe(90);
  });

  it('keeps a non-zero score for noisy mixed scans', () => {
    const violations = [
      ...Array(5)
        .fill(null)
        .map(() => makeViolation('critical')),
      ...Array(6)
        .fill(null)
        .map(() => makeViolation('serious')),
      ...Array(10)
        .fill(null)
        .map(() => makeViolation('moderate')),
    ];
    const score = calculateScore(violations, 1);
    expect(score).toBe(53.01);
  });
});

describe('buildScanScoreResult', () => {
  it('builds complete score result with counts', async () => {
    const violations = [
      makeViolation('critical'),
      makeViolation('critical'),
      makeViolation('serious'),
      makeViolation('moderate'),
      makeViolation('moderate'),
      makeViolation('moderate'),
      makeViolation('minor'),
    ];

    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
    } as any;

    const result = await buildScanScoreResult(violations, 5, null, mockDb, 'org-123');

    expect(result.criticalCount).toBe(2);
    expect(result.seriousCount).toBe(1);
    expect(result.moderateCount).toBe(3);
    expect(result.minorCount).toBe(1);
    expect(result.pagesScanned).toBe(5);
    expect(result.scoreDelta).toBeNull();
    expect(result.score).toBe(72.7);
  });

  it('returns null scoreDelta when no previous scan', async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
    } as any;

    const result = await buildScanScoreResult([], 1, null, mockDb, 'org-123');

    expect(result.scoreDelta).toBeNull();
    expect(result.score).toBe(100);
  });

  it('calculates positive delta when score improved', async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ score: 70 }]),
          }),
        }),
      }),
    } as any;

    const result = await buildScanScoreResult([], 1, 'prev-scan-id', mockDb, 'org-123');

    expect(result.score).toBe(100);
    expect(result.scoreDelta).toBe(30);
  });

  it('calculates negative delta when score worsened', async () => {
    const violations = Array(10)
      .fill(null)
      .map(() => makeViolation('critical'));

    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ score: 50 }]),
          }),
        }),
      }),
    } as any;

    const result = await buildScanScoreResult(violations, 1, 'prev-scan-id', mockDb, 'org-123');

    expect(result.score).toBe(62.05);
    expect(result.scoreDelta).toBe(12.05);
  });
});
