import type { Metadata } from 'next';
import { CheckCircle2 } from 'lucide-react';
import { ButtonLink } from '@/components/marketing/ButtonLink';
import { ComplianceStrip } from '@/components/marketing/ComplianceStrip';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import type { Locale } from '@/lib/i18n/config';
import * as Accordion from '@radix-ui/react-accordion';
import { cn } from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const page = dict.pages.accessibilityAuditing;

  return {
    title: page.meta.title,
    description: page.meta.description,
    openGraph: {
      title: `${page.meta.title} | ${dict.common.brand}`,
      description: page.meta.description,
      type: 'website',
    },
    alternates: {
      canonical: 'https://accessshield.in/services/accessibility-auditing',
    },
  };
}

export default async function AccessibilityAuditingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const page = dict.pages.accessibilityAuditing;

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
            serviceType: 'Accessibility Auditing',
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

      {/* What an audit covers */}
      <section
        aria-labelledby="what-covered-heading"
        className="border-b border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <h2
            id="what-covered-heading"
            className="text-center text-3xl font-bold text-text-primary"
          >
            {page.whatCovered.title}
          </h2>
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {/* Automated layer */}
            <div className="rounded-xl border border-border bg-bg-secondary p-8">
              <h3 className="text-2xl font-semibold text-text-primary">
                {page.whatCovered.automated.title}
              </h3>
              <ul className="mt-6 space-y-4">
                {page.whatCovered.automated.items.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2
                      className="mt-0.5 h-5 w-5 shrink-0 text-primary-600"
                      aria-hidden="true"
                    />
                    <span className="text-base leading-normal text-text-secondary">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Manual layer */}
            <div className="rounded-xl border border-border bg-bg-secondary p-8">
              <h3 className="text-2xl font-semibold text-text-primary">
                {page.whatCovered.manual.title}
              </h3>
              <ul className="mt-6 space-y-4">
                {page.whatCovered.manual.items.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2
                      className="mt-0.5 h-5 w-5 shrink-0 text-primary-600"
                      aria-hidden="true"
                    />
                    <span className="text-base leading-normal text-text-secondary">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Process timeline */}
      <section
        aria-labelledby="process-heading"
        className="border-b border-gray-200 bg-bg-secondary px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <h2
            id="process-heading"
            className="text-center text-3xl font-bold text-text-primary"
          >
            {page.process.title}
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {page.process.steps.map(({ step, title, description }) => (
              <div
                key={step}
                className="flex flex-col gap-4 rounded-xl border border-border bg-white p-6"
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white"
                  aria-hidden="true"
                >
                  {step}
                </span>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary">
                    {title}
                  </h3>
                  <p className="mt-2 text-base leading-normal text-text-secondary">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Deliverables */}
      <section
        aria-labelledby="deliverables-heading"
        className="border-b border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <h2
            id="deliverables-heading"
            className="text-center text-3xl font-bold text-text-primary"
          >
            {page.deliverables.title}
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {page.deliverables.items.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary p-4"
              >
                <CheckCircle2
                  className="h-5 w-5 shrink-0 text-primary-600"
                  aria-hidden="true"
                />
                <span className="text-base font-medium text-text-primary">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing anchor */}
      <section
        aria-labelledby="pricing-heading"
        className="border-b border-gray-200 bg-primary-50 px-4 py-12 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-4xl text-center">
          <h2
            id="pricing-heading"
            className="text-2xl font-bold text-text-primary"
          >
            Pricing
          </h2>
          <div className="mt-6 flex flex-col items-center justify-center gap-6 sm:flex-row">
            <div className="rounded-lg border border-border bg-white px-6 py-4">
              <p className="text-sm font-medium text-text-secondary">
                Automated scanning
              </p>
              <p className="mt-1 text-xl font-bold text-primary-600">
                {page.pricing.automated}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-white px-6 py-4">
              <p className="text-sm font-medium text-text-secondary">
                Full audit + certification
              </p>
              <p className="mt-1 text-xl font-bold text-primary-600">
                {page.pricing.certification}
              </p>
            </div>
          </div>
          <ButtonLink
            href="/pricing"
            size="md"
            variant="secondary"
            className="mt-8"
          >
            {page.pricing.linkText}
          </ButtonLink>
        </div>
      </section>

      {/* FAQ */}
      <section
        aria-labelledby="faq-heading"
        className="border-b border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-3xl">
          <h2
            id="faq-heading"
            className="text-center text-3xl font-bold text-text-primary"
          >
            {page.faq.title}
          </h2>
          <Accordion.Root
            type="single"
            collapsible
            className="mt-12 space-y-4"
          >
            {page.faq.questions.map(({ question, answer }, index) => (
              <Accordion.Item
                key={index}
                value={`item-${index}`}
                className="rounded-lg border border-border bg-bg-secondary"
              >
                <Accordion.Header>
                  <Accordion.Trigger
                    className={cn(
                      'flex w-full items-center justify-between gap-4 px-6 py-4 text-left',
                      'text-lg font-semibold text-text-primary',
                      'hover:text-primary-600',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded-lg',
                      'transition-colors',
                    )}
                  >
                    <span>{question}</span>
                    <span
                      className="shrink-0 text-2xl text-primary-600 transition-transform duration-200 [&[data-state=open]]:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <div className="px-6 pb-4 pt-2">
                    <p className="text-base leading-normal text-text-secondary">
                      {answer}
                    </p>
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>
      </section>

      <ComplianceStrip />
    </>
  );
}
