import type { Locale } from './config';
import { defaultLocale } from './config';

/** Routes where locale is cookie-only — URL must not get /hi prefix */
const LOCALE_AGNOSTIC_PREFIXES = [
  '/dashboard',
  '/login',
  '/signup',
  '/auth',
  '/onboarding',
  '/verify',
] as const;

export function isLocaleAgnosticPath(path: string): boolean {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return LOCALE_AGNOSTIC_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

/** Strip /hi prefix from pathname */
export function stripLocalePrefix(pathname: string): string {
  if (pathname === '/hi') return '/';
  if (pathname.startsWith('/hi/')) return pathname.slice(3) || '/';
  return pathname;
}

/** Whether pathname uses Hindi URL prefix */
export function pathnameHasHiPrefix(pathname: string): boolean {
  return pathname === '/hi' || pathname.startsWith('/hi/');
}

/** Build localized href for marketing routes */
export function localizedHref(path: string, locale: Locale): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (locale === defaultLocale || isLocaleAgnosticPath(normalized)) return normalized;
  if (normalized === '/') return '/hi';
  return `/hi${normalized}`;
}

/** Alternate locale for language switcher */
export function alternateLocale(locale: Locale): Locale {
  return locale === 'en' ? 'hi' : 'en';
}
