import { describe, expect, it } from 'vitest';
import { summariseIssues } from '@accessshield/types';

describe('summariseIssues', () => {
  it('collapses repeated rules into a plain-language card', () => {
    const summaries = summariseIssues([
      {
        id: '1',
        ruleId: 'button-name',
        impact: 'critical',
        description: 'Buttons must have discernible text',
        wcagCriteria: ['4.1.2'],
        standard: 'WCAG22',
        pageUrl: 'https://example.com/about',
        selector: 'button.next',
      },
      {
        id: '2',
        ruleId: 'button-name',
        impact: 'serious',
        description: 'Buttons must have discernible text',
        wcagCriteria: ['4.1.2'],
        pageUrl: 'https://example.com/about',
        selector: 'button.prev',
      },
      {
        id: '3',
        ruleId: 'color-contrast',
        impact: 'serious',
        description: 'Elements must have sufficient color contrast',
        wcagCriteria: ['1.4.3'],
        pageUrl: 'https://example.com/',
        selector: 'p.muted',
      },
    ]);

    expect(summaries).toHaveLength(2);
    expect(summaries[0]).toMatchObject({
      ruleId: 'button-name',
      count: 2,
      pageCount: 1,
      severity: 'critical',
      headline: '2 buttons have no name',
      owner: 'Development team',
      priority: 'High',
    });
    expect(summaries[1]).toMatchObject({
      ruleId: 'color-contrast',
      headline: "1 text element doesn't have sufficient colour contrast",
      owner: 'Design team',
      priority: 'High',
      impact: 'Users with low vision may struggle to read this content.',
    });
  });
});
