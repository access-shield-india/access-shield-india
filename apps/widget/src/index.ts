import { detectDocumentHindi, loadLocale } from './i18n';
import { applyEarlyEnhancements } from './modules/enhancements';
import { applyEarlyVisualPreferences } from './modules/visual';
import { Widget } from './widget';
import type {
  FontSize,
  Language,
  PreferenceUpdate,
  WidgetInitOptions,
  WidgetPosition,
  WidgetPreferences,
  WidgetSettings,
} from './types/preferences';
import { DEFAULT_PREFERENCES, parseWidgetPosition } from './types/preferences';
import { PreferencesManager } from './utils/preferences';

const DEFAULT_API_URL = 'https://api.accessshield.in';
const VERIFY_TIMEOUT_MS = 3000;

interface VerifyResult {
  valid: boolean | 'timeout';
  position?: WidgetPosition;
}

/** Read configuration from the embedding script tag */
function getScriptConfig(): WidgetInitOptions | null {
  const script =
    (document.currentScript as HTMLScriptElement | null) ??
    document.querySelector<HTMLScriptElement>('script[data-token]');

  if (!script) return null;

  const token = script.dataset.token;
  if (!token) return null;

  const position = parseWidgetPosition(script.dataset.position);
  const lang = (script.dataset.lang ?? 'en') as Language;
  const apiUrl = script.dataset.apiUrl ?? DEFAULT_API_URL;

  return { token, position, lang, apiUrl };
}

/** Verify widget token against API — fail open on timeout.
 * Uses Promise.race (not AbortController) so Next.js / Chrome don't surface
 * "AbortError: signal is aborted without reason" on marketing pages.
 */
async function verifyToken(token: string, apiUrl: string): Promise<VerifyResult> {
  const verifyUrl = `${apiUrl}/api/v1/widget/verify?token=${encodeURIComponent(token)}`;

  try {
    const result = await Promise.race([
      fetch(verifyUrl).then(async (res): Promise<VerifyResult> => {
        if (!res.ok) return { valid: false };
        const body = (await res.json()) as {
          data?: { valid?: boolean; position?: unknown };
        };
        return {
          valid: body?.data?.valid === true,
          position: body?.data?.position ? parseWidgetPosition(body.data.position) : undefined,
        };
      }),
      new Promise<VerifyResult>((resolve) => {
        setTimeout(() => resolve({ valid: 'timeout' }), VERIFY_TIMEOUT_MS);
      }),
    ]);
    return result;
  } catch {
    return { valid: 'timeout' };
  }
}

/** Bootstrap widget — restore prefs before render, verify token */
async function init(): Promise<void> {
  if (document.getElementById('accessshield-widget')) return;

  const config = getScriptConfig();
  if (!config) {
    console.warn('[AccessibleNow] Missing data-token attribute on widget script tag.');
    return;
  }

  const saved = PreferencesManager.loadFromStorage(config.token);

  if (saved?.prefs) {
    applyEarlyVisualPreferences(saved.prefs);
    applyEarlyEnhancements(saved.prefs);
  }

  const savedLang = saved?.prefs?.language;
  if (!savedLang && detectDocumentHindi()) {
    config.lang = 'hi';
    if (saved?.prefs) saved.prefs.language = 'hi';
  }

  const langToLoad = saved?.prefs?.language ?? config.lang;
  if (langToLoad && langToLoad !== 'en') {
    await loadLocale(langToLoad);
  }

  const result = await verifyToken(config.token, config.apiUrl);

  if (result.valid === false) {
    console.warn('[AccessibleNow] Invalid widget token — widget will not render.');
    return;
  }

  if (result.valid === true && result.position) {
    config.position = result.position;
  }

  new Widget(config, saved?.prefs, {
    activeProfile: saved?.activeProfile ?? null,
    preProfileSnapshot: saved?.preProfileSnapshot ?? null,
  });
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
  WidgetSettings,
};
