export const locales = ['en', 'hi'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export const LOCALE_COOKIE = 'as_locale';
export const LOCALE_HEADER = 'x-locale';
/** Query param to switch locale on routes that keep the same URL (dashboard, login). */
export const LOCALE_QUERY = 'set_locale';

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
