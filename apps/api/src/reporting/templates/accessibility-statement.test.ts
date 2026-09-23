import { describe, expect, it } from 'vitest';
import { formatStatementOrgName } from './accessibility-statement';

describe('formatStatementOrgName', () => {
  it('rebrands Digiaccess Private Limited for statement display', () => {
    expect(formatStatementOrgName('Digiaccess Private Limited')).toBe(
      'AccessibleNow (Digiaccess Private Limited)',
    );
    expect(formatStatementOrgName('digiaccess private limited')).toBe(
      'AccessibleNow (Digiaccess Private Limited)',
    );
  });

  it('leaves other organisation names unchanged', () => {
    expect(formatStatementOrgName('Acme Corp')).toBe('Acme Corp');
  });
});
