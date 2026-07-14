/**
 * Unit tests for AI hourly rate limit config.
 */

import { describe, expect, it } from 'vitest';
import { getAiHourlyLimit } from './ai-rate-limit';

describe('getAiHourlyLimit', () => {
  it('blocks starter / trial', () => {
    expect(getAiHourlyLimit('starter')).toBe(0);
    expect(getAiHourlyLimit('trial')).toBe(0);
  });

  it('allows professional and enterprise', () => {
    expect(getAiHourlyLimit('professional')).toBe(500);
    expect(getAiHourlyLimit('enterprise')).toBe(2000);
  });
});
