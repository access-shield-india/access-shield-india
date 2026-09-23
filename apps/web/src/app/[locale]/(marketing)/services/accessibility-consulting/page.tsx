import type { Metadata } from 'next';
import { Shield, FileCheck, Building2, Palette } from 'lucide-react';
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
  const page = dict.pages.accessibilityConsulting;

  return {
    title: page.meta.title,
    description: page.meta.description,
    openGraph: {
      title: `${page.meta.title} | ${dict.common.brand}`,
      description: page.meta.description,
      type: 'website',
    },
    alternates: {
      canonical: 'https://accessshield.in/services/accessibility-consulting',
    },
  };
}

const TRACK_ICONS = {
  sebi: FileCheck,
  rpwd: Shield,
  gigw: Building2,
  design: Palette,
} as const;

export default async function AccessibilityConsultingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const page = dict.pages.accessibilityConsulting;

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
            serviceType: 'Accessibility Consulting',
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

      {/* Consulting tracks */}
      <section
        aria-labelledby="tracks-heading"
        className="border-b border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <h2
            id="tracks-heading"
            className="text-center text-3xl font-bold text-text-primary"
          >
            {page.tracks.title}
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {page.tracks.items.map(({ id, title, description }) => {
              const Icon = TRACK_ICONS[id as keyof typeof TRACK_ICONS];
              return (
                <div
                  key={id}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-bg-secondary p-8"
                >
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary-100 text-primary-600"
                    aria-hidden="true"
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-semibold text-text-primary">
                    {title}
                  </h3>
                  <p className="text-base leading-normal text-text-secondary">
                    {description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How engagements work */}
      <section
        aria-labelledby="how-it-works-heading"
        className="border-b border-gray-200 bg-bg-secondary px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <h2
            id="how-it-works-heading"
            className="text-center text-3xl font-bold text-text-primary"
          >
            {page.howItWorks.title}
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {page.howItWorks.steps.map((step, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-4 text-center"
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <p className="text-lg font-semibold text-text-primary">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who you work with */}
      <section
        aria-labelledby="team-heading"
        className="border-b border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-4xl text-center">
          <h2
            id="team-heading"
            className="text-3xl font-bold text-text-primary"
          >
            {page.team.title}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-normal text-text-secondary">
            {page.team.description}
          </p>
        </div>
      </section>

      {/* CTA banner */}
      <section className="border-b border-gray-200 bg-primary-900 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {page.cta.title}
          </h2>
          <p className="mt-4 text-lg leading-normal text-primary-100">
            {page.cta.description}
          </p>
          <ButtonLink
            href="/contact?type=consultation"
            size="lg"
            variant="onDark"
            className="mt-8 min-w-[280px]"
          >
            {dict.pages.servicesHub.hero.secondaryCta}
          </ButtonLink>
        </div>
      </section>

      <ComplianceStrip />
    </>
  );
}
