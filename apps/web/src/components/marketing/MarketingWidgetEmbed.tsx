'use client';

import { useEffect } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';

function resolveWidgetScriptSrc(): string {
  const cdn = process.env.NEXT_PUBLIC_CDN_URL?.replace(/\/$/, '');

  // Dev dogfood: serve bundled widget from Next public/ (same origin)
  if (!cdn || cdn.includes('localhost') || cdn.includes('127.0.0.1')) {
    return '/widget.js';
  }

  return `${cdn}/widget.js`;
}

function resolveWidgetApiUrl(): string | undefined {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (!apiUrl) return undefined;

  // Prefer same-origin API proxy in dev (Next rewrites /api/v1 → Express)
  if (apiUrl.includes('localhost:4000') && typeof window !== 'undefined') {
    return window.location.origin;
  }

  return apiUrl;
}

function scheduleIdle(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout: 4000 });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(callback, 2000);
  return () => window.clearTimeout(id);
}

/**
 * Loads the AccessShield accessibility widget on marketing pages only.
 * Deferred until idle so hero/LCP content is not competing for bandwidth.
 */
export function MarketingWidgetEmbed() {
  const locale = useLocale();

  useEffect(() => {
    const enabled = process.env.NEXT_PUBLIC_WIDGET_ENABLED === 'true';
    const token = process.env.NEXT_PUBLIC_WIDGET_TOKEN;

    if (!enabled || !token) return;
    if (document.getElementById('accessshield-widget')) return;
    if (document.querySelector('script[data-token]')) return;

    const cancel = scheduleIdle(() => {
      if (document.getElementById('accessshield-widget')) return;
      if (document.querySelector('script[data-token]')) return;

      const script = document.createElement('script');
      script.id = 'accessshield-widget-loader';
      script.src = resolveWidgetScriptSrc();
      script.async = true;
      script.setAttribute('data-token', token);
      script.setAttribute('data-position', 'bottom-right');
      script.setAttribute('data-lang', locale === 'hi' ? 'hi' : 'en');

      const apiUrl = resolveWidgetApiUrl();
      if (apiUrl) {
        script.setAttribute('data-api-url', apiUrl);
      }

      document.head.appendChild(script);
    });

    return cancel;
  }, [locale]);

  return null;
}
