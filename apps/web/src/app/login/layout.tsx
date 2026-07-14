import { getDictionary } from '@/lib/i18n/get-dictionary';
import { getLocale } from '@/lib/i18n/server';
import { LoginLayoutClient } from './LoginLayoutClient';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const dictionary = getDictionary(locale);

  return (
    <LoginLayoutClient locale={locale} dictionary={dictionary}>
      {children}
    </LoginLayoutClient>
  );
}
