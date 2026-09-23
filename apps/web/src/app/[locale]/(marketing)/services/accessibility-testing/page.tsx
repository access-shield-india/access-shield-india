import type { Metadata } from 'next';
import { Zap, Users, Monitor, Heart } from 'lucide-react';
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
  const page = dict.pages.accessibilityTesting;

  return {
    title: page.meta.title,
    description: page.meta.description,
    openGraph: {
      title: `${page.meta.title} | ${dict.common.brand}`,
      description: page.meta.description,
      type: 'website',
    },
    alternates: {
      canonical: 'https://accessshield.in/services/accessibility-testing',
    },
  };
}

const LAYER_COLORS = [
  'bg-primary-100 text-primary-600',
  'bg-accent-100 text-accent-700',
  'bg-success-100 text-success-700',
  'bg-error-100 text-error-700',
] as const;

export default async function AccessibilityTestingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const page = dict.pages.accessibilityTesting;

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
            serviceType: 'Accessibility Testing',
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

      {/* The four testing layers */}
      <section
        aria-labelledby="layers-heading"
        className="border-b border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <h2
            id="layers-heading"
            className="text-center text-3xl font-bold text-text-primary"
          >
            {page.layers.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-text-secondary">
            {page.layers.subtitle}
          </p>
          <div className="mt-12 space-y-6">
            {page.layers.items.map(({ layer, title, description }, index) => {
              const IconComponent =
                index === 0 ? Zap : index === 1 ? Users : index === 2 ? Monitor : Heart;
              const colorClass = LAYER_COLORS[index];
              return (
                <div
                  key={layer}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-bg-secondary p-8 sm:flex-row sm:items-start"
                >
                  <div className="flex items-center gap-4 sm:flex-col sm:items-center">
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white"
                      aria-hidden="true"
                    >
                      {layer}
                    </span>
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ${colorClass}`}
                      aria-hidden="true"
                    >
                      <IconComponent className="h-7 w-7" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-text-primary">{title}</h3>
                    <p className="mt-3 text-base leading-normal text-text-secondary">
                      {description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why this matters for SEBI */}
      <section
        aria-labelledby="why-sebi-heading"
        className="border-b border-gray-200 bg-bg-secondary px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-4xl">
          <h2
            id="why-sebi-heading"
            className="text-center text-3xl font-bold text-text-primary"
          >
            {page.whySebi.title}
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-center text-lg leading-normal text-text-secondary">
            {page.whySebi.description}
          </p>
        </div>
      </section>

      {/* Mobile + Documents */}
      <section
        aria-labelledby="mobile-documents-heading"
        className="border-b border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-4xl">
          <h2
            id="mobile-documents-heading"
            className="text-center text-3xl font-bold text-text-primary"
          >
            {page.mobileDocuments.title}
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-center text-lg leading-normal text-text-secondary">
            {page.mobileDocuments.description}
          </p>
        </div>
      </section>

      <ComplianceStrip />
    </>
  );
}
