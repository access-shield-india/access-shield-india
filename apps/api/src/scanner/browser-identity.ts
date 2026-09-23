/**
 * Browser identity and bot-wall detection for the accessibility scanner.
 *
 * Many .gov.in / .nic.in / Cloudflare-protected sites block headless clients
 * that advertise a custom scanner User-Agent. Use a normal Chrome identity and
 * surface a clear error when the site refuses the scan.
 */

/** Current Chrome-on-Windows User-Agent (no product branding — WAFs key off that). */
export const SCANNER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Headers that look like a normal browser navigation. */
export const SCANNER_HTTP_HEADERS: Record<string, string> = {
  'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Upgrade-Insecure-Requests': '1',
};

/** Shown on the scan detail page when a WAF / bot wall blocks access. */
export const SITE_BLOCKED_MESSAGE =
  'This website blocked the accessibility scanner (bot protection or firewall). ' +
  'Ask the site owner to allowlist the scanner, or try again from an allowlisted network.';

const BLOCKED_STATUS = new Set([401, 403, 429, 503]);

const BLOCKED_BODY_PATTERNS: RegExp[] = [
  /access\s+denied/i,
  /request\s+blocked/i,
  /bot\s+detected/i,
  /attention\s+required/i,
  /checking\s+your\s+browser/i,
  /cf-browser-verification/i,
  /cf-challenge/i,
  /just\s+a\s+moment(?:\.\.\.|…)/i,
  /enable\s+javascript\s+and\s+cookies/i,
  /why\s+have\s+i\s+been\s+blocked/i,
  /security\s+check(?:\s+required)?/i,
  /unusual\s+traffic/i,
  /verify\s+you\s+are\s+(a\s+)?human/i,
  /complete\s+the\s+captcha/i,
  /access\s+forbidden/i,
  /403\s+forbidden/i,
  /http\s*error\s*403/i,
];

export class SiteBlockedError extends Error {
  readonly statusCode?: number;

  constructor(message = SITE_BLOCKED_MESSAGE, statusCode?: number) {
    super(message);
    this.name = 'SiteBlockedError';
    this.statusCode = statusCode;
  }
}

/**
 * True when an HTTP status typically means the edge blocked the client.
 */
export function isBlockedHttpStatus(status: number | null | undefined): boolean {
  if (status == null || !Number.isFinite(status)) return false;
  return BLOCKED_STATUS.has(status);
}

/**
 * True when page HTML looks like a WAF / challenge interstitial rather than the site.
 */
export function looksLikeBlockedPage(html: string | null | undefined): boolean {
  if (!html) return false;
  const sample = html.slice(0, 8000);
  // Tiny bodies with a challenge phrase are almost never real marketing/gov pages.
  if (sample.trim().length < 40 && /forbidden|denied|blocked/i.test(sample)) {
    return true;
  }
  return BLOCKED_BODY_PATTERNS.some((pattern) => pattern.test(sample));
}

/**
 * Build a user-facing scan failure summary from per-page errors.
 */
export function summarisePageScanFailures(
  pageCount: number,
  failureMessages: string[],
): string {
  const blocked = failureMessages.some(
    (msg) =>
      msg.includes(SITE_BLOCKED_MESSAGE) ||
      /blocked the accessibility scanner|bot protection|403|forbidden/i.test(msg),
  );

  if (blocked) {
    return `${SITE_BLOCKED_MESSAGE} (${pageCount} page(s) could not be opened.)`.substring(
      0,
      1000,
    );
  }

  const sample = failureMessages
    .slice(0, 3)
    .map((msg) => msg.replace(/^https?:\/\/\S+:\s*/i, ''))
    .join('; ');

  return `All ${pageCount} page(s) failed to scan. ${
    sample || 'No pages could be analyzed. Check site availability and scanner logs.'
  }`.substring(0, 1000);
}
