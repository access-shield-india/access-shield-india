import en from './en.json';
import type { Language } from '../types/preferences';
import { getAssetUrl } from '../utils/asset-url';

export type TranslationKey = keyof typeof en;

export const SHIPPED_LANGUAGES: ReadonlyArray<{ code: Language; nativeLabel: string }> = [
  { code: 'en', nativeLabel: 'English' },
  { code: 'hi', nativeLabel: 'हिन्दी' },
];

const locales: Record<string, Record<string, string>> = { en };
const inflight = new Map<string, Promise<void>>();

/**
 * Dynamic import of a CDN ESM URL. Variable `import()` is left as a runtime
 * call; the Function wrapper also stops esbuild from trying to bundle it.
 */
function importLangPack(url: string): Promise<{ default?: Record<string, string> }> {
  // Runtime URL — esbuild must not bundle this. Function keeps import() external.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  return new Function('u', 'return import(u)')(url) as Promise<{
    default?: Record<string, string>;
  }>;
}

/** Translate a key for the given language, with optional interpolation */
export function t(key: TranslationKey, lang: Language, vars?: Record<string, string>): string {
  const dict = locales[lang] ?? en;
  let text = dict[key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}

/** True when `document.documentElement.lang` is Hindi (BCP 47 hi / hi-IN). */
export function detectDocumentHindi(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.lang.toLowerCase().startsWith('hi');
}

/**
 * Lazy-load a non-English pack from dist/lang/{lang}.js (not in the core bundle).
 * English is always inline.
 */
export async function loadLocale(lang: Language): Promise<void> {
  if (lang === 'en' || locales[lang]) return;

  let pending = inflight.get(lang);
  if (!pending) {
    pending = importLangPack(getAssetUrl(`lang/${lang}.js`))
      .then((mod) => {
        const dict = mod.default;
        if (dict && typeof dict === 'object') {
          locales[lang] = dict;
        }
      })
      .catch(() => undefined)
      .then(() => {
        inflight.delete(lang);
      });
    inflight.set(lang, pending);
  }
  await pending;
}
