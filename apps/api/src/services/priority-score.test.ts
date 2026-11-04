import { describe, expect, it } from 'vitest';
import { prioritizeViolations, scoreViolation } from './priority-score';

describe('priority-score', () => {
  it('ranks IS 17802 critical above WCAG minor', () => {
    const high = scoreViolation({
      id: '1',
      ruleId: 'IS-011',
      impact: 'critical',
      standard: 'IS17802',
    });
    const low = scoreViolation({
      id: '2',
      ruleId: 'region',
      impact: 'minor',
      standard: 'WCAG22',
    });
    expect(high.priorityScore).toBeGreaterThan(low.priorityScore);
  });

  it('builds a sprint under hour budget', () => {
    const result = prioritizeViolations(
      [
        { id: 'a', ruleId: 'image-alt', impact: 'serious', standard: 'WCAG22' },
        { id: 'b', ruleId: 'color-contrast', impact: 'serious', standard: 'WCAG22' },
        { id: 'c', ruleId: 'button-name', impact: 'critical', standard: 'WCAG22' },
      ],
      null,
      2,
    );
    expect(result.sprintRecommendation.length).toBeGreaterThan(0);
    expect(result.totalHours).toBeLessThanOrEqual(2);
    expect(result.violations[0]?.priorityScore).toBeGreaterThanOrEqual(
      result.violations[result.violations.length - 1]?.priorityScore ?? 0,
    );
  });
});
