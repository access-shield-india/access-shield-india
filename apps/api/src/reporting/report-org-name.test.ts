import { describe, expect, it } from 'vitest';
import { formatReportOrgName, isInternalOrgName } from './report-org-name';

describe('formatReportOrgName', () => {
  it('replaces AccessShield Test Org with AccessibleNow', () => {
    expect(formatReportOrgName('AccessShield Test Org')).toBe('AccessibleNow');
    expect(formatReportOrgName('  accessshield test org ')).toBe('AccessibleNow');
  });

  it('replaces other internal/seed orgs with AccessibleNow', () => {
    expect(formatReportOrgName('Public Scans')).toBe('AccessibleNow');
    expect(formatReportOrgName('AccessibleNow Platform')).toBe('AccessibleNow');
    expect(formatReportOrgName('My Test Org')).toBe('AccessibleNow');
  });

  it('falls back to AccessibleNow for missing names', () => {
    expect(formatReportOrgName(null)).toBe('AccessibleNow');
    expect(formatReportOrgName(undefined)).toBe('AccessibleNow');
    expect(formatReportOrgName('   ')).toBe('AccessibleNow');
  });

  it('leaves real customer organisation names unchanged', () => {
    expect(formatReportOrgName('KSPG Consulting Pvt Ltd')).toBe('KSPG Consulting Pvt Ltd');
    expect(formatReportOrgName('Digiaccess Private Limited')).toBe('Digiaccess Private Limited');
  });
});

describe('isInternalOrgName', () => {
  it('flags internal names and passes real customers', () => {
    expect(isInternalOrgName('AccessShield Test Org')).toBe(true);
    expect(isInternalOrgName('Acme Corp')).toBe(false);
  });
});
