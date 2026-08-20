import { describe, expect, it } from 'vitest';
import { hourBucket } from './analytics';

describe('hourBucket', () => {
  it('truncates to UTC hour, never minutes or seconds', () => {
    const bucket = hourBucket(new Date('2026-08-14T12:47:59.123Z'));
    expect(bucket).toBe('2026-08-14T12');
    expect(bucket).not.toMatch(/:/);
  });
});
