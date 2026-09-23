import type { Metadata } from 'next';
import { Languages, ScanSearch, FileText, Users, CheckCircle2, Clock } from 'lucide-react';
import { ComplianceStrip } from '@/components/marketing/ComplianceStrip';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import type { Locale } from '@/lib/i18n/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const page = dict.pages.multilingualAccessibility;

  return {
    title: page.meta.title,
    description: page.meta.description,
    openGraph: {
      title: `${page.meta.title} | ${dict.common.brand}`,
      description: page.meta.description,
      type: 'website',
    },
    alternates: {
      canonical: 'https://accessshield.in/services/multilingual-accessibility',
    },
  };
}

const PROVIDE_ICONS = {
  widget: Languages,
  scanner: ScanSearch,
  statements: FileText,
  consulting: Users,
} as const;

export default async function MultilingualAccessibilityPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const page = dict.pages.multilingualAccessibility;

  return (
    <>
      {/* JSON-LD Service schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: page.hero.title,
            description: page.hero.subtitle,
            provider: {
              '@type': 'Organization',
              name: dict.common.brand,
              url: 'https://accessshield.in',
            },
            areaServed: {
              '@type': 'Country',
              name: 'India',
            },
            serviceType: 'Multilingual Accessibility',
          }),
        }}
      />

      {/* Hero */}
      <header className="border-b border-gray-200 bg-gradient-to-b from-primary-50 via-white to-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
            {page.hero.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary">
            {page.hero.subtitle}
          </p>
        </div>
      </header>

      {/* The problem */}
      <section
        aria-labelledby="problem-heading"
        className="border-b border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <h2
            id="problem-heading"
            className="text-center text-3xl font-bold text-text-primary"
          >
            {page.problem.title}
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-center text-lg leading-normal text-text-secondary">
            {page.problem.description}
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-error-700 bg-error-100 p-8">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="text-2xl font-bold text-error-700"
                  aria-hidden="true"
                >
                  ✗
                </span>
                <h3 className="text-lg font-semibold text-error-700">Wrong</h3>
              </div>
              <p className="font-mono text-base text-text-secondary">
                {page.problem.example.wrong}
              </p>
            </div>
            <div className="rounded-xl border-2 border-success-700 bg-success-100 p-8">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="text-2xl font-bold text-success-700"
                  aria-hidden="true"
                >
                  ✓
                </span>
                <h3 className="text-lg font-semibold text-success-700">Right</h3>
              </div>
              <p className="text-base text-text-secondary">
                {page.problem.example.right}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What we provide */}
      <section
        aria-labelledby="provide-heading"
        className="border-b border-gray-200 bg-bg-secondary px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <h2
            id="provide-heading"
            className="text-center text-3xl font-bold text-text-primary"
          >
            {page.whatWeProvide.title}
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {page.whatWeProvide.items.map(({ id, title, description }) => {
              const Icon = PROVIDE_ICONS[id as keyof typeof PROVIDE_ICONS];
              return (
                <div
                  key={id}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-white p-6"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-primary-600"
                    aria-hidden="true"
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
                  <p className="text-sm leading-normal text-text-secondary">
                    {description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Language coverage table */}
      <section
        aria-labelledby="coverage-heading"
        className="border-b border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <h2
            id="coverage-heading"
            className="text-center text-3xl font-bold text-text-primary"
          >
            {page.languageCoverage.title}
          </h2>
          <div className="mt-12 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-border">
                  {page.languageCoverage.columns.map((col, index) => (
                    <th
                      key={index}
                      className="px-6 py-4 text-left text-sm font-semibold text-text-primary"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {page.languageCoverage.rows.map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-border hover:bg-bg-secondary"
                  >
                    <td className="px-6 py-4 text-base font-medium text-text-primary">
                      {row.language}
                    </td>
                    <td className="px-6 py-4">
                      {row.widget === 'Live' ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-success-100 px-3 py-1 text-sm font-medium text-success-700">
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          {row.widget}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-accent-100 px-3 py-1 text-sm font-medium text-accent-700">
                          <Clock className="h-4 w-4" aria-hidden="true" />
                          {row.widget}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2 rounded-full bg-success-100 px-3 py-1 text-sm font-medium text-success-700">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        {row.scanner}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ComplianceStrip />
    </>
  );
}
