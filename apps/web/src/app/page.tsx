import HomePage, { generateMetadata as localeGenerateMetadata } from './[locale]/(marketing)/page';
import MarketingLayout from './[locale]/(marketing)/layout';
import LocaleLayout from './[locale]/layout';

export async function generateMetadata() {
  return localeGenerateMetadata({ params: { locale: 'en' } });
}

/**
 * Real `/` route. English marketing lives under `[locale]`, but Next 14.2
 * skips beforeFiles rewrites after middleware, so `/` 404s without this.
 */
export default function RootPage() {
  const params = { locale: 'en' };
  return (
    <LocaleLayout params={params}>
      <MarketingLayout>
        <HomePage params={params} />
      </MarketingLayout>
    </LocaleLayout>
  );
}
