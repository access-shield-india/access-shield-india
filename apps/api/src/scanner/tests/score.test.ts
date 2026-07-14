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

  it('deducts 10 points per critical violation', () => {
    const violations = [makeViolation('critical'), makeViolation('critical')];
    expect(calculateScore(violations, 1)).toBe(80);
  });

  it('deducts 5 points per serious violation', () => {
    const violations = [makeViolation('serious'), makeViolation('serious')];
    expect(calculateScore(violations, 1)).toBe(90);
  });

  it('deducts 2 points per moderate violation', () => {
    expect(calculateScore([makeViolation('moderate')], 1)).toBe(98);
  });

  it('deducts 0.5 points per minor violation', () => {
    expect(calculateScore([makeViolation('minor')], 1)).toBe(99.5);
  });

  it('never returns negative score', () => {
    const violations = Array(15)
      .fill(null)
      .map(() => makeViolation('critical'));
    expect(calculateScore(violations, 1)).toBe(0);
  });

  it('handles mixed severity violations correctly', () => {
    const violations = [
      makeViolation('critical'), // -10
      makeViolation('serious'), // -5
      makeViolation('moderate'), // -2
      makeViolation('minor'), // -0.5
    ];
    expect(calculateScore(violations, 1)).toBe(82.5);
  });

  it('rounds to 2 decimal places', () => {
    const violations = Array(3)
      .fill(null)
      .map(() => makeViolation('minor')); // -1.5
    expect(calculateScore(violations, 1)).toBe(98.5);
  });

  it('handles single critical violation', () => {
    expect(calculateScore([makeViolation('critical')], 1)).toBe(90);
  });

  it('handles single serious violation', () => {
    expect(calculateScore([makeViolation('serious')], 1)).toBe(95);
  });

  it('caps deduction at 100 points', () => {
    const violations = Array(20)
      .fill(null)
      .map(() => makeViolation('critical'));
    const score = calculateScore(violations, 1);
    expect(score).toBe(0);
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
    expect(score).toBe(50);
  });

  it('handles maximum deduction scenario with mixed types', () => {
    const violations = [
      ...Array(5)
        .fill(null)
        .map(() => makeViolation('critical')), // -50
      ...Array(6)
        .fill(null)
        .map(() => makeViolation('serious')), // -30
      ...Array(10)
        .fill(null)
        .map(() => makeViolation('moderate')), // -20
    ];
    const score = calculateScore(violations, 1);
    expect(score).toBe(0);
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
    expect(result.score).toBe(68.5);
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

    expect(result.score).toBe(0);
    expect(result.scoreDelta).toBe(-50);
  });
});
