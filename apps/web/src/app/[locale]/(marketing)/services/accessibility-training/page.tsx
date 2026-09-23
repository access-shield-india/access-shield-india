import type { Metadata } from 'next';
import { Video, FileText, Award, MessageSquare, CheckCircle2 } from 'lucide-react';
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
  const page = dict.pages.accessibilityTraining;

  return {
    title: page.meta.title,
    description: page.meta.description,
    openGraph: {
      title: `${page.meta.title} | ${dict.common.brand}`,
      description: page.meta.description,
      type: 'website',
    },
    alternates: {
      canonical: 'https://accessshield.in/services/accessibility-training',
    },
  };
}

const FORMAT_ICONS = {
  video: Video,
  recording: FileText,
  certificate: Award,
  qa: MessageSquare,
} as const;

export default async function AccessibilityTrainingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const page = dict.pages.accessibilityTraining;

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
            serviceType: 'Accessibility Training',
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

      {/* Training catalogue */}
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
          <div className="mt-12 space-y-6">
            {page.catalogue.items.map(
              ({ id, title, duration, price, capacity, description }) => (
                <div
                  key={id}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-bg-secondary p-8 lg:flex-row lg:items-start lg:justify-between"
                >
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-text-primary">
                      {title}
                    </h3>
                    <p className="mt-3 text-base leading-normal text-text-secondary">
                      {description}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 lg:min-w-[240px] lg:text-right">
                    <p className="text-sm font-medium text-text-secondary">
                      {duration} · {capacity}
                    </p>
                    <p className="text-2xl font-bold text-primary-600">
                      {price}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Format */}
      <section
        aria-labelledby="format-heading"
        className="border-b border-gray-200 bg-bg-secondary px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <h2
            id="format-heading"
            className="text-center text-3xl font-bold text-text-primary"
          >
            {page.format.title}
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {page.format.items.map((item, index) => {
              const iconKey = [
                'video',
                'recording',
                'certificate',
                'qa',
              ][index] as keyof typeof FORMAT_ICONS;
              const Icon = FORMAT_ICONS[iconKey];
              return (
                <div
                  key={index}
                  className="flex flex-col items-center gap-3 rounded-lg border border-border bg-white p-6 text-center"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-primary-600"
                    aria-hidden="true"
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="text-base font-medium text-text-primary">
                    {item}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section
        aria-labelledby="who-for-heading"
        className="border-b border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <h2
            id="who-for-heading"
            className="text-center text-3xl font-bold text-text-primary"
          >
            {page.whoFor.title}
          </h2>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            {page.whoFor.roles.map((role, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-full border border-border bg-bg-secondary px-6 py-3"
              >
                <CheckCircle2
                  className="h-5 w-5 text-primary-600"
                  aria-hidden="true"
                />
                <span className="text-base font-medium text-text-primary">
                  {role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bundle note */}
      <section
        aria-labelledby="bundle-heading"
        className="border-b border-gray-200 bg-primary-50 px-4 py-12 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-4xl text-center">
          <h2 id="bundle-heading" className="sr-only">
            Training pricing
          </h2>
          <p className="text-lg leading-normal text-text-secondary">
            {page.bundle.text}
          </p>
          <ButtonLink
            href="/pricing"
            size="md"
            variant="secondary"
            className="mt-6"
          >
            {page.bundle.linkText}
          </ButtonLink>
        </div>
      </section>

      <ComplianceStrip />
    </>
  );
}
