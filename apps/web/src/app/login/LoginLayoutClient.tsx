'use client';

import { AuthSessionProvider } from '@/providers/AuthSessionProvider';
import { LocaleProvider } from '@/lib/i18n/locale-context';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import type { Dictionary } from '@/lib/i18n/dictionaries/types';
import type { Locale } from '@/lib/i18n/config';

export function LoginLayoutClient({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <AuthSessionProvider>
      <LocaleProvider locale={locale} dictionary={dictionary}>
        <div className="flex justify-end p-4">
          <LanguageSwitcher />
        </div>
        {children}
      </LocaleProvider>
    </AuthSessionProvider>
  );
}
