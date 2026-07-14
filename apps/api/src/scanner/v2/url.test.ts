/**
 * Unit tests for Scan Pipeline v2 URL helpers.
 */

import { describe, expect, it } from 'vitest';
import { normalizeScanPageUrl, pageScanIdempotencyKey } from './url';

describe('normalizeScanPageUrl', () => {
  it('strips hash and trailing slash', () => {
    expect(normalizeScanPageUrl('https://Example.com/path/#section')).toBe(
      'https://example.com/path',
    );
  });

  it('removes www prefix', () => {
    expect(normalizeScanPageUrl('https://www.example.com/')).toBe('https://example.com/');
  });

  it('builds page idempotency keys', () => {
    const key = pageScanIdempotencyKey('scan-1', 'https://example.com/a');
    expect(key).toBe('scan-1:https://example.com/a');
  });
});
