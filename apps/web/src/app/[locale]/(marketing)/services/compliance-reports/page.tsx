import type { Metadata } from 'next';
import { FileCheck, FileText, Shield, Scale } from 'lucide-react';
import { ButtonLink } from '@/components/marketing/ButtonLink';
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
  const page = dict.pages.complianceReports;

  return {
    title: page.meta.title,
    description: page.meta.description,
    openGraph: {
      title: `${page.meta.title} | ${dict.common.brand}`,
      description: page.meta.description,
      type: 'website',
    },
    alternates: {
      canonical: 'https://accessshield.in/services/compliance-reports',
    },
  };
}

const REPORT_ICONS = {
  wcag: FileCheck,
  sebi: FileText,
  is17802: Shield,
  rpwd: Scale,
} as const;

export default async function ComplianceReportsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const page = dict.pages.complianceReports;

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
            serviceType: 'Compliance Reports',
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

      {/* Report catalogue */}
      <section
        aria-labelledby="catalogue-heading"
        className="border-b border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <h2
            id="catalogue-heading"
            className="text-center text-3xl font-bold text-text-primary"
          >
            {page.catalogue.title}
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {page.catalogue.reports.map(({ id, title, description, includedIn }) => {
              const Icon = REPORT_ICONS[id as keyof typeof REPORT_ICONS];
              return (
                <div
                  key={id}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-bg-secondary p-8"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600"
                      aria-hidden="true"
                    >
                      <Icon className="h-7 w-7" />
                    </div>
                    <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent-700">
                      {includedIn}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
                  <p className="text-base leading-normal text-text-secondary">
                    {description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How reports are generated */}
      <section
        aria-labelledby="how-generated-heading"
        className="border-b border-gray-200 bg-bg-secondary px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-4xl text-center">
          <h2
            id="how-generated-heading"
            className="text-3xl font-bold text-text-primary"
          >
            {page.howGenerated.title}
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-normal text-text-secondary">
            {page.howGenerated.description}
          </p>
        </div>
      </section>

      {/* Sample download */}
      <section
        aria-labelledby="sample-heading"
        className="border-b border-gray-200 bg-primary-900 px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="sample-heading" className="text-3xl font-bold tracking-tight text-white">
            {page.sample.title}
          </h2>
          <p className="mt-4 text-lg leading-normal text-primary-100">
            {page.sample.description}
          </p>
          <ButtonLink
            href="/contact?type=sample-report"
            size="lg"
            variant="onDark"
            className="mt-8 min-w-[280px]"
          >
            {page.sample.ctaText}
          </ButtonLink>
        </div>
      </section>

      <ComplianceStrip />
    </>
  );
}
