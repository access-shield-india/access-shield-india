import { describe, expect, it } from 'vitest';
import { applicableLaws } from './ComplianceQuiz';
import { normaliseScanUrl } from './HeroScanInput';
import { estimateRevenueRisk } from './RiskCalculator';

describe('normaliseScanUrl', () => {
  it('adds https:// to bare domains', () => {
    expect(normaliseScanUrl('accessiblenow.in')).toBe('https://accessiblenow.in/');
  });

  it('keeps explicit http(s) URLs', () => {
    expect(normaliseScanUrl('http://example.com/path')).toBe('http://example.com/path');
  });

  it('rejects empty and dotless input', () => {
    expect(normaliseScanUrl('   ')).toBeNull();
    expect(normaliseScanUrl('localhost')).toBeNull();
    expect(normaliseScanUrl('not a url')).toBeNull();
  });
});

describe('estimateRevenueRisk', () => {
  it('returns paise range using 2.21% and 16% shares at 2% conversion', () => {
    // 50,000 visitors × share × 2% × ₹2,000
    expect(estimateRevenueRisk(50_000, 2_000)).toEqual({
      lowPaise: 4_420_000,
      highPaise: 32_000_000,
    });
  });

  it('clamps negative inputs to zero', () => {
    expect(estimateRevenueRisk(-10, -5)).toEqual({ lowPaise: 0, highPaise: 0 });
  });
});

describe('applicableLaws', () => {
  it('returns nothing when every answer is no', () => {
    expect(applicableLaws({ sebi: false, government: false, public: false })).toEqual([]);
  });

  it('flags SEBI and RPwD for regulated entities', () => {
    expect(applicableLaws({ sebi: true, government: false, public: false })).toEqual([
      'rpwd',
      'sebi',
    ]);
  });

  it('flags GIGW and IS 17802 for government work', () => {
    expect(applicableLaws({ sebi: false, government: true, public: false })).toEqual([
      'rpwd',
      'gigw',
      'is17802',
    ]);
  });

  it('returns all four in stable order when everything applies', () => {
    expect(applicableLaws({ sebi: true, government: true, public: true })).toEqual([
      'rpwd',
      'sebi',
      'gigw',
      'is17802',
    ]);
  });
});
