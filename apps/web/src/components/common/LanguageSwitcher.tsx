'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Locale } from '@/lib/i18n/config';
import { LOCALE_COOKIE } from '@/lib/i18n/config';
import { isLocaleAgnosticPath, localizedHref, pathnameHasHiPrefix } from '@/lib/i18n/paths';
import { useDictionary, useLocale } from '@/lib/i18n/locale-context';
import { cn } from '@/lib/utils';

const switcherClass =
  'inline-flex min-h-[44px] items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 text-sm font-medium text-text-secondary hover:border-primary-300 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2';

/** Pathname without /hi prefix — usePathname() returns internal path after rewrite */
function logicalPath(pathname: string, locale: string): string {
  if (locale === 'hi' && !pathnameHasHiPrefix(pathname)) {
    return pathname;
  }
  if (pathnameHasHiPrefix(pathname)) {
    return pathname === '/hi' ? '/' : pathname.slice(3) || '/';
  }
  return pathname;
}

function setLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const { common } = useDictionary();
  const pathname = usePathname();
  const router = useRouter();
  const path = logicalPath(pathname, locale);
  const cookieOnly = isLocaleAgnosticPath(path);

  function switchLocale(target: Locale) {
    if (target === locale) return;
    setLocaleCookie(target);
    router.refresh();
  }

  const enClass = cn(
    switcherClass,
    locale === 'en' && 'border-primary-600 bg-primary-50 text-primary-700',
  );
  const hiClass = cn(
    switcherClass,
    locale === 'hi' && 'border-primary-600 bg-primary-50 text-primary-700',
  );

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      role="group"
      aria-label={common.language.label}
    >
      {cookieOnly ? (
        <>
          <button
            type="button"
            onClick={() => switchLocale('en')}
            className={enClass}
            aria-current={locale === 'en' ? 'true' : undefined}
          >
            {common.language.en}
          </button>
          <button
            type="button"
            onClick={() => switchLocale('hi')}
            className={hiClass}
            aria-current={locale === 'hi' ? 'true' : undefined}
          >
            {common.language.hi}
          </button>
        </>
      ) : (
        <>
          <Link
            href={localizedHref(path, 'en')}
            hrefLang="en"
            className={enClass}
            aria-current={locale === 'en' ? 'true' : undefined}
          >
            {common.language.en}
          </Link>
          <Link
            href={localizedHref(path, 'hi')}
            hrefLang="hi"
            className={hiClass}
            aria-current={locale === 'hi' ? 'true' : undefined}
          >
            {common.language.hi}
          </Link>
        </>
      )}
    </div>
  );
}
