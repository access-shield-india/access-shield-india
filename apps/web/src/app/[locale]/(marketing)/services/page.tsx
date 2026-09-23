import type { Metadata } from 'next';
import {
  FileCheck,
  UserCheck,
  GraduationCap,
  FileText,
  TestTube,
  Languages,
} from 'lucide-react';
import { LocaleLink } from '@/components/common/LocaleLink';
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

  return {
    title: dict.pages.servicesHub.meta.title,
    description: dict.pages.servicesHub.meta.description,
    openGraph: {
      title: `${dict.pages.servicesHub.meta.title} | ${dict.common.brand}`,
      description: dict.pages.servicesHub.meta.description,
      type: 'website',
    },
    alternates: {
      canonical: 'https://accessshield.in/services',
    },
  };
}

const SERVICE_ICONS = {
  auditing: FileCheck,
  consulting: UserCheck,
  training: GraduationCap,
  reports: FileText,
  testing: TestTube,
  multilingual: Languages,
} as const;

export default async function ServicesHubPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const { servicesHub } = dict.pages;

  return (
    <>
      {/* JSON-LD Service schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'AccessShield India Accessibility Services',
            description: servicesHub.meta.description,
            provider: {
              '@type': 'Organization',
              name: dict.common.brand,
              url: 'https://accessshield.in',
            },
            areaServed: {
              '@type': 'Country',
              name: 'India',
            },
            serviceType: 'Digital Accessibility Compliance',
          }),
        }}
      />

      {/* Hero */}
      <header className="border-b border-gray-200 bg-gradient-to-b from-primary-50 via-white to-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:text-[3.25rem] lg:leading-tight">
            {servicesHub.hero.title}
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-text-secondary sm:text-xl">
            {servicesHub.hero.subtitle}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <ButtonLink
              href="/scan"
              size="lg"
              variant="primary"
              className="min-w-[240px]"
            >
              {servicesHub.hero.primaryCta}
            </ButtonLink>
            <ButtonLink
              href="/contact?type=consultation"
              size="lg"
              variant="secondary"
              className="min-w-[240px]"
            >
              {servicesHub.hero.secondaryCta}
            </ButtonLink>
          </div>
        </div>
      </header>

      {/* Services Grid */}
      <section
        aria-labelledby="services-grid-heading"
        className="border-b border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <h2 id="services-grid-heading" className="sr-only">
            Our services
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {servicesHub.servicesGrid.map(({ id, name, description, href }) => {
              const Icon = SERVICE_ICONS[id as keyof typeof SERVICE_ICONS];
              return (
                <LocaleLink
                  key={id}
                  href={href}
                  className="group flex flex-col gap-4 rounded-xl border border-border bg-bg-secondary p-6 transition-all hover:border-primary-600 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
                >
                  <article>
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white"
                      aria-hidden="true"
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-text-primary">
                      {name}
                    </h3>
                    <p className="mt-2 text-base leading-normal text-text-secondary">
                      {description}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-600 group-hover:underline">
                      {dict.common.actions.learnMore}
                      <span aria-hidden="true">→</span>
                    </span>
                  </article>
                </LocaleLink>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why India-specific matters */}
      <section
        aria-labelledby="why-india-heading"
        className="border-b border-gray-200 bg-bg-secondary px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <h2
            id="why-india-heading"
            className="text-center text-3xl font-bold text-text-primary"
          >
            {servicesHub.whyIndia.title}
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {servicesHub.whyIndia.stats.map(({ value, label }) => (
              <LocaleLink
                key={value}
                href="/rpwd-act"
                className="flex flex-col items-center rounded-xl border border-border bg-white p-8 text-center transition-all hover:border-primary-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
              >
                <p className="text-4xl font-bold text-primary-600">{value}</p>
                <p className="mt-3 text-base leading-normal text-text-secondary">
                  {label}
                </p>
              </LocaleLink>
            ))}
          </div>
        </div>
      </section>

      <ComplianceStrip />
    </>
  );
}
