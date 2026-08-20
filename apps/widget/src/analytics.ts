/**
 * Anonymous widget usage analytics — lazy chunk, not in the core bundle.
 *
 * DPDP Act 2023: aggregate only. No user ids, session ids, IPs, or page URLs.
 * Timestamp is truncated to the UTC hour.
 */

export type AnalyticsEventType =
  'panel_open' | 'profile_on' | 'profile_off' | 'setting_on' | 'language_switch';

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  feature?: string;
  tsBucket: string;
}

const FLUSH_MS = 30_000;
const MAX_BATCH = 50;
const EVENT_TYPES: ReadonlySet<string> = new Set([
  'panel_open',
  'profile_on',
  'profile_off',
  'setting_on',
  'language_switch',
]);

/** UTC hour bucket — never a precise timestamp. */
export function hourBucket(date: Date = new Date()): string {
  return date.toISOString().slice(0, 13);
}

export interface WidgetAnalyticsHandle {
  track: (type: AnalyticsEventType, feature?: string) => void;
  destroy: () => void;
}

interface AnalyticsGlobal {
  init: (token: string, apiUrl: string) => WidgetAnalyticsHandle;
}

function sanitiseFeature(feature: string | undefined): string | undefined {
  if (!feature) return undefined;
  return feature.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60) || undefined;
}

/**
 * Start batched, fail-silent analytics. Call once after first panel open.
 */
export function init(token: string, apiUrl: string): WidgetAnalyticsHandle {
  const queue: AnalyticsEvent[] = [];
  let timer: ReturnType<typeof setInterval> | null = null;
  let destroyed = false;

  function track(type: AnalyticsEventType, feature?: string): void {
    if (destroyed || !EVENT_TYPES.has(type)) return;
    try {
      queue.push({
        type,
        feature: sanitiseFeature(feature),
        tsBucket: hourBucket(),
      });
      if (queue.length >= MAX_BATCH) flush();
    } catch {
      // fail-silent
    }
  }

  function takeBatch(): AnalyticsEvent[] {
    return queue.splice(0, MAX_BATCH);
  }

  function flush(): void {
    if (destroyed || queue.length === 0) return;
    const events = takeBatch();
    const url = `${apiUrl.replace(/\/$/, '')}/api/v1/widget/analytics`;
    const body = JSON.stringify({ token, events });

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        // text/plain avoids CORS preflight — sendBeacon cannot preflight
        const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
        if (navigator.sendBeacon(url, blob)) return;
      }
    } catch {
      // fall through to fetch
    }

    try {
      void fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      // fail-silent
    }
  }

  function onPageHide(): void {
    flush();
  }

  try {
    timer = setInterval(flush, FLUSH_MS);
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', onPageHide);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flush();
      });
    }
  } catch {
    // fail-silent
  }

  function destroy(): void {
    destroyed = true;
    if (timer) clearInterval(timer);
    timer = null;
    try {
      window.removeEventListener('pagehide', onPageHide);
    } catch {
      // ignore
    }
    flush();
  }

  return { track, destroy };
}

declare global {
  interface Window {
    AccessShieldAnalytics?: AnalyticsGlobal;
  }
}

if (typeof window !== 'undefined') {
  window.AccessShieldAnalytics = { init };
}
