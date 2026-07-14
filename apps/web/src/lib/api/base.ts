/**
 * API base URL for browser and server fetches.
 * Browser defaults to same-origin `/api/v1` (proxied via next.config rewrites).
 * Server-side code falls back to the internal API URL.
 */
export function getApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    return '';
  }

  return (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
}

export function apiUrl(path: string): string {
  const base = getApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
}
