import en from './en.json';
import hi from './hi.json';
import type { Language } from '../types/preferences';

export type TranslationKey = keyof typeof en;

const locales: Record<Language, Record<string, string>> = { en, hi };

/** Translate a key for the given language, with optional interpolation */
export function t(key: TranslationKey, lang: Language, vars?: Record<string, string>): string {
  const dict = locales[lang];
  let text = dict[key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}
