import { SkipLink } from '@accessshield/ui';
import { Sidebar } from '@/components/dashboard/layout/Sidebar';
import { TopBar } from '@/components/dashboard/layout/TopBar';
import { DashboardActivityBar } from '@/components/dashboard/common/DashboardActivityBar';
import { DashboardProviders } from '@/providers/DashboardProviders';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { requireServerAccessToken } from '@/lib/auth/session';
import { getDashboardRole } from '@/lib/dashboard/session';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { LocaleProvider } from '@/lib/i18n/locale-context';
import { getLocale } from '@/lib/i18n/server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireServerAccessToken();
  const userRole = getDashboardRole();
  const locale = getLocale();
  const dictionary = getDictionary(locale);

  return (
    <LocaleProvider locale={locale} dictionary={dictionary}>
      <DashboardProviders>
        <SkipLink href="#main-content" />
        <div className="dashboard-shell flex h-screen overflow-hidden bg-gray-50">
          <Sidebar userRole={userRole} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-end gap-2 border-b border-gray-100 bg-white px-4 py-2">
              <LanguageSwitcher />
            </div>
            <TopBar />
            <DashboardActivityBar />
            <main
              id="main-content"
              className="flex-1 overflow-y-auto p-5 md:p-6"
              aria-label="Main content"
            >
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          </div>
        </div>
      </DashboardProviders>
    </LocaleProvider>
  );
}
