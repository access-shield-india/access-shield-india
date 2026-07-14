import { cookies, headers } from 'next/headers';
import { defaultLocale, isLocale, LOCALE_COOKIE, LOCALE_HEADER } from './config';
import type { Locale } from './config';
import { pathnameHasHiPrefix } from './paths';

export function localeFromParams(params: { locale?: string }): Locale {
  return params.locale && isLocale(params.locale) ? params.locale : defaultLocale;
}

/**
 * Read active locale for routes outside [locale] (dashboard, app login).
 */
export function getLocale(): Locale {
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  if (cookieLocale && isLocale(cookieLocale)) return cookieLocale;

  const headerLocale = headers().get(LOCALE_HEADER);
  if (headerLocale && isLocale(headerLocale)) return headerLocale;

  const asPath = headers().get('x-as-pathname');
  if (asPath && pathnameHasHiPrefix(asPath)) return 'hi';

  return defaultLocale;
}
