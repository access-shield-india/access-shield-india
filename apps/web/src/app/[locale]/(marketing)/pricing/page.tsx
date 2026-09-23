'use client';

import { useState } from 'react';
import type { Metadata } from 'next';
import { Check, X } from 'lucide-react';
import { ButtonLink } from '@/components/marketing/ButtonLink';
import { useDictionary } from '@/lib/i18n/locale-context';
import { cn } from '@/lib/utils';
import * as Accordion from '@radix-ui/react-accordion';

export default function PricingPage() {
  const { pricing, common } = useDictionary();
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <>
      {/* Hero */}
      <header className="border-b border-gray-200 bg-gradient-to-b from-primary-50 via-white to-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
            {pricing.hero.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary">
            {pricing.hero.subtitle}
          </p>
        </div>
      </header>

      {/* One-time Certification Pass */}
      <section
        aria-labelledby="onetime-heading"
        className="border-b border-gray-200 bg-accent-50 px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center justify-center gap-3">
            <h2 id="onetime-heading" className="text-3xl font-bold text-text-primary">
              {pricing.oneTime.title}
            </h2>
            <span className="rounded-full bg-accent-600 px-3 py-1 text-sm font-semibold text-white">
              {pricing.oneTime.badge}
            </span>
          </div>
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border-2 border-accent-600 bg-white p-8 shadow-xl">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-text-primary">
                {pricing.oneTime.product.name}
              </h3>
              <p className="mt-2 text-4xl font-bold text-primary-600">
                {pricing.oneTime.product.price}
              </p>
              <p className="mt-4 text-base text-text-secondary">
                {pricing.oneTime.product.description}
              </p>
            </div>
            <ul className="mt-8 space-y-3">
              {pricing.oneTime.product.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-success-700" aria-hidden="true" />
                  <span className="text-base text-text-secondary">{feature}</span>
                </li>
              ))}
            </ul>
            <ButtonLink
              href="/contact?type=certification"
              size="lg"
              variant="primary"
              className="mt-8 w-full"
            >
              {pricing.oneTime.product.cta}
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Subscription plans */}
      <section
        aria-labelledby="subscriptions-heading"
        className="border-b border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <h2
            id="subscriptions-heading"
            className="text-center text-3xl font-bold text-text-primary"
          >
            {pricing.subscriptions.title}
          </h2>

          {/* Billing toggle */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <span
              className={cn(
                'text-base font-medium',
                !isAnnual ? 'text-text-primary' : 'text-text-tertiary',
              )}
            >
              {pricing.subscriptions.billingToggle.monthly}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isAnnual}
              aria-label={`${pricing.subscriptions.billingToggle.monthly} or ${pricing.subscriptions.billingToggle.annual} billing`}
              onClick={() => setIsAnnual(!isAnnual)}
              className={cn(
                'relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
                isAnnual ? 'bg-primary-600' : 'bg-gray-300',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  isAnnual ? 'translate-x-6' : 'translate-x-0',
                )}
              />
            </button>
            <span
              className={cn(
                'text-base font-medium',
                isAnnual ? 'text-text-primary' : 'text-text-tertiary',
              )}
            >
              {pricing.subscriptions.billingToggle.annual}
            </span>
            <span className="ml-2 rounded-full bg-success-100 px-3 py-1 text-sm font-semibold text-success-700">
              {pricing.subscriptions.billingToggle.save}
            </span>
          </div>

          {/* Plan cards */}
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {pricing.subscriptions.plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  'relative flex flex-col rounded-2xl border-2 bg-white p-8',
                  plan.badge ? 'border-primary-600 shadow-xl' : 'border-border shadow-md',
                )}
              >
                {plan.badge && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-4 py-1 text-sm font-semibold text-white">
                    {plan.badge}
                  </span>
                )}
                <div>
                  <h3 className="text-2xl font-bold text-text-primary">{plan.name}</h3>
                  <p className="mt-4 text-4xl font-bold text-primary-600">
                    {isAnnual ? plan.annualPrice || plan.monthlyPrice : plan.monthlyPrice}
                  </p>
                  {isAnnual && plan.annualPrice && (
                    <p className="mt-1 text-sm text-text-tertiary">{pricing.billing.exclGst}</p>
                  )}
                  <p className="mt-4 text-base text-text-secondary">{plan.description}</p>
                </div>
                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check
                        className="mt-0.5 h-5 w-5 shrink-0 text-primary-600"
                        aria-hidden="true"
                      />
                      <span className="text-sm text-text-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>
                <ButtonLink
                  href={plan.id === 'enterprise' ? '/contact' : '/signup'}
                  size="lg"
                  variant={plan.badge ? 'primary' : 'secondary'}
                  className="mt-8 w-full"
                >
                  {plan.cta}
                </ButtonLink>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section
        aria-labelledby="comparison-heading"
        className="border-b border-gray-200 bg-bg-secondary px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <h2 id="comparison-heading" className="text-center text-3xl font-bold text-text-primary">
            {pricing.subscriptions.comparisonTable.title}
          </h2>
          <div className="mt-12 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
                    Feature
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-text-primary">
                    Starter
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-text-primary">
                    Professional
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-text-primary">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {pricing.subscriptions.comparisonTable.rows.map((row, index) => (
                  <tr key={index} className="border-b border-border hover:bg-white">
                    <td className="px-6 py-4 text-base font-medium text-text-primary">
                      {row.feature}
                    </td>
                    <td className="px-6 py-4 text-center text-base text-text-secondary">
                      {row.starter === '✓' ? (
                        <Check className="mx-auto h-5 w-5 text-success-700" aria-label="Included" />
                      ) : row.starter === '✗' ? (
                        <X
                          className="mx-auto h-5 w-5 text-text-tertiary"
                          aria-label="Not included"
                        />
                      ) : (
                        row.starter
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-base text-text-secondary">
                      {row.professional === '✓' ? (
                        <Check className="mx-auto h-5 w-5 text-success-700" aria-label="Included" />
                      ) : row.professional === '✗' ? (
                        <X
                          className="mx-auto h-5 w-5 text-text-tertiary"
                          aria-label="Not included"
                        />
                      ) : (
                        row.professional
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-base text-text-secondary">
                      {row.enterprise === '✓' ? (
                        <Check className="mx-auto h-5 w-5 text-success-700" aria-label="Included" />
                      ) : row.enterprise === '✗' ? (
                        <X
                          className="mx-auto h-5 w-5 text-text-tertiary"
                          aria-label="Not included"
                        />
                      ) : (
                        row.enterprise
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section
        aria-labelledby="addons-heading"
        className="border-b border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <h2 id="addons-heading" className="text-center text-3xl font-bold text-text-primary">
            {pricing.addOns.title}
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {pricing.addOns.items.map((addon, index) => (
              <div key={index} className="rounded-xl border border-border bg-bg-secondary p-6">
                <h3 className="text-xl font-semibold text-text-primary">{addon.name}</h3>
                <p className="mt-2 text-2xl font-bold text-primary-600">{addon.price}</p>
                <p className="mt-3 text-base leading-normal text-text-secondary">
                  {addon.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEBI callout */}
      <section
        aria-labelledby="sebi-heading"
        className="border-b border-gray-200 bg-primary-900 px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="sebi-heading" className="text-3xl font-bold tracking-tight text-white">
            {pricing.sebiCallout.title}
          </h2>
          <p className="mt-6 text-lg leading-normal text-primary-100">
            {pricing.sebiCallout.description}
          </p>
          <ButtonLink
            href="/sebi-accessibility"
            size="lg"
            variant="onDark"
            className="mt-8 min-w-[280px]"
          >
            {pricing.sebiCallout.cta}
          </ButtonLink>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 id="faq-heading" className="text-center text-3xl font-bold text-text-primary">
            {pricing.faq.title}
          </h2>
          <Accordion.Root type="single" collapsible className="mt-12 space-y-4">
            {pricing.faq.questions.map(({ question, answer }, index) => (
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
                    <p className="text-base leading-normal text-text-secondary">{answer}</p>
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>
      </section>
    </>
  );
}
