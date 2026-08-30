import { describe, expect, it } from 'vitest';
import {
  buildPublicScanReportHtml,
  buildPublicScanReportText,
  type PublicScanReportPayload,
} from './public-scan-report';

const sample: PublicScanReportPayload = {
  scanId: '11111111-1111-1111-1111-111111111111',
  email: 'lead@example.com',
  siteUrl: 'https://example.com',
  score: 72,
  pagesScanned: 5,
  totalViolations: 12,
  severity: { critical: 1, serious: 2, moderate: 4, minor: 5 },
  topViolations: [
    {
      ruleId: 'image-alt',
      impact: 'critical',
      description: 'Images must have alternate text',
      wcagCriteria: ['1.1.1'],
    },
    {
      ruleId: 'color-contrast',
      impact: 'serious',
      description: 'Elements must have sufficient color contrast',
      wcagCriteria: ['1.4.3'],
    },
  ],
};

describe('public scan report email', () => {
  it('builds HTML with score and escaped content', () => {
    const html = buildPublicScanReportHtml({
      ...sample,
      siteUrl: 'https://example.com/<script>',
      topViolations: [
        {
          ruleId: 'x',
          impact: 'critical',
          description: 'Bad <script>alert(1)</script>',
          wcagCriteria: ['1.1.1'],
        },
      ],
    });

    expect(html).toContain('72');
    expect(html).toContain('AccessibleNow');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert');
  });

  it('builds plain-text fallback', () => {
    const text = buildPublicScanReportText(sample);
    expect(text).toContain('Score: 72/100');
    expect(text).toContain('image-alt');
    expect(text).toContain('/signup');
  });
});
