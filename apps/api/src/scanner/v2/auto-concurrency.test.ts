/**
 * Unit tests for auto concurrency resolver.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { resolveScanConcurrency } from './auto-concurrency';

describe('resolveScanConcurrency', () => {
  afterEach(() => {
    delete process.env.SCAN_CONCURRENT_PAGES;
  });

  it('honours SCAN_CONCURRENT_PAGES when set', () => {
    process.env.SCAN_CONCURRENT_PAGES = '3';
    expect(resolveScanConcurrency()).toBe(3);
  });

  it('clamps env override to max 10', () => {
    process.env.SCAN_CONCURRENT_PAGES = '99';
    expect(resolveScanConcurrency()).toBe(10);
  });

  it('returns at least 2 when auto-tuning', () => {
    delete process.env.SCAN_CONCURRENT_PAGES;
    const n = resolveScanConcurrency();
    expect(n).toBeGreaterThanOrEqual(2);
    expect(n).toBeLessThanOrEqual(10);
  });
});
