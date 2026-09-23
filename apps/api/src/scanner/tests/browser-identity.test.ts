import { describe, expect, it } from 'vitest';
import {
  SITE_BLOCKED_MESSAGE,
  isBlockedHttpStatus,
  looksLikeBlockedPage,
  summarisePageScanFailures,
} from '../browser-identity';

describe('browser-identity', () => {
  it('treats common WAF status codes as blocked', () => {
    expect(isBlockedHttpStatus(403)).toBe(true);
    expect(isBlockedHttpStatus(401)).toBe(true);
    expect(isBlockedHttpStatus(429)).toBe(true);
    expect(isBlockedHttpStatus(200)).toBe(false);
    expect(isBlockedHttpStatus(null)).toBe(false);
  });

  it('detects challenge / access-denied page bodies', () => {
    expect(looksLikeBlockedPage('Access Denied')).toBe(true);
    expect(looksLikeBlockedPage('<html>Just a moment... cf-browser-verification</html>')).toBe(
      true,
    );
    expect(
      looksLikeBlockedPage(
        '<html><body><h1>Welcome to Ministry of Coal</h1><p>Policies and strategies</p></body></html>',
      ),
    ).toBe(false);
  });

  it('summarises blocked page failures with a clear user message', () => {
    const message = summarisePageScanFailures(3, [
      `https://www.coal.nic.in/: ${SITE_BLOCKED_MESSAGE}`,
    ]);
    expect(message).toContain('blocked the accessibility scanner');
    expect(message).toContain('3 page(s)');
  });

  it('falls back to a generic summary when failures are unrelated', () => {
    const message = summarisePageScanFailures(2, [
      'https://example.com/: Navigation timeout',
      'https://example.com/about: net::ERR_CONNECTION_RESET',
    ]);
    expect(message).toContain('All 2 page(s) failed to scan');
    expect(message).toContain('Navigation timeout');
  });
});
