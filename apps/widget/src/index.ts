import { applyEarlyVisualPreferences } from './modules/visual';
import { Widget } from './widget';
import type {
  FontSize,
  Language,
  PreferenceUpdate,
  WidgetInitOptions,
  WidgetPosition,
  WidgetPreferences,
} from './types/preferences';
import { DEFAULT_PREFERENCES } from './types/preferences';
import { PreferencesManager } from './utils/preferences';

const DEFAULT_API_URL = 'https://api.accessshield.in';
const VERIFY_TIMEOUT_MS = 3000;

/** Read configuration from the embedding script tag */
function getScriptConfig(): WidgetInitOptions | null {
  const script =
    (document.currentScript as HTMLScriptElement | null) ??
    document.querySelector<HTMLScriptElement>('script[data-token]');

  if (!script) return null;

  const token = script.dataset.token;
  if (!token) return null;

  const position = (script.dataset.position ?? 'bottom-right') as WidgetPosition;
  const lang = (script.dataset.lang ?? 'en') as Language;
  const apiUrl = script.dataset.apiUrl ?? DEFAULT_API_URL;

  return { token, position, lang, apiUrl };
}

/** Verify widget token against API — fail open on timeout */
async function verifyToken(token: string, apiUrl: string): Promise<boolean | 'timeout'> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  try {
    const res = await fetch(`${apiUrl}/api/v1/widget/verify?token=${encodeURIComponent(token)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return false;

    const body = (await res.json()) as { data?: { valid?: boolean } };
    return body?.data?.valid === true;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === 'AbortError') {
      return 'timeout';
    }
    return 'timeout';
  }
}

/** Bootstrap widget — restore prefs before render, verify token */
async function init(): Promise<void> {
  if (document.getElementById('accessshield-widget')) return;

  const config = getScriptConfig();
  if (!config) {
    console.warn('[AccessShield] Missing data-token attribute on widget script tag.');
    return;
  }

  const savedPrefs = PreferencesManager.loadFromStorage(config.token) ?? undefined;

  if (savedPrefs) {
    applyEarlyVisualPreferences(savedPrefs);
  }

  const result = await verifyToken(config.token, config.apiUrl);

  if (result === false) {
    console.warn('[AccessShield] Invalid widget token — widget will not render.');
    return;
  }

  new Widget(config, savedPrefs);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void init());
} else {
  void init();
}

export { Widget };
export { DEFAULT_PREFERENCES };
export type {
  FontSize,
  Language,
  PreferenceUpdate,
  WidgetInitOptions,
  WidgetPosition,
  WidgetPreferences,
};
