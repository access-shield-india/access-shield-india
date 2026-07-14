/**
 * Scan Pipeline v2 — helpers for page jobs and URL normalization.
 */

/**
 * Normalize a URL for idempotent page-job keys within a scan.
 * Strips hash, trailing slash (except root), lowercases host.
 */
export function normalizeScanPageUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    u.hash = '';
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    let path = u.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    u.pathname = path;
    // Drop default ports
    if (
      (u.protocol === 'https:' && u.port === '443') ||
      (u.protocol === 'http:' && u.port === '80')
    ) {
      u.port = '';
    }
    return u.toString();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

/** Idempotency key for a page scan message */
export function pageScanIdempotencyKey(scanId: string, urlNormalized: string): string {
  return `${scanId}:${urlNormalized}`;
}
