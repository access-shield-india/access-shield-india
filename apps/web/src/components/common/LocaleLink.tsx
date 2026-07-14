'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n/config';
import { localizedHref } from '@/lib/i18n/paths';
import { useLocale } from '@/lib/i18n/locale-context';

export interface LocaleLinkProps extends Omit<React.ComponentProps<typeof Link>, 'href'> {
  href: string;
  locale?: Locale;
}

/** Link that preserves the current locale (/hi prefix for Hindi) */
export function LocaleLink({ href, locale: localeProp, ...props }: LocaleLinkProps) {
  const currentLocale = useLocale();
  const locale = localeProp ?? currentLocale;
  return <Link href={localizedHref(href, locale)} {...props} />;
}

/** Build localized path for current pathname + target locale (language switcher) */
export function useLocalizedPathname(targetLocale: Locale): string {
  const pathname = usePathname();
  return localizedHref(pathname, targetLocale);
}
