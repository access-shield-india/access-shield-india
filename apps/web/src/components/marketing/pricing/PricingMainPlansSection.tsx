'use client';

'use client';

import { useState } from 'react';
import { ButtonLink } from '@/components/marketing/ButtonLink';
import {
  assessCheckoutSubline,
  formatPlanPrice,
  MONTHLY_PLANS,
  type BillingPeriod,
  type MonthlyPlan,
} from '@/lib/pricing/catalog';

function PlanBadges({ plan }: { plan: MonthlyPlan }) {
  return (
    <div className="mb-3 flex flex-wrap justify-center gap-2">
      {plan.badge && (
        <span className="inline-flex rounded-full bg-primary-100 px-3 py-0.5 text-xs font-semibold text-primary-700">
          {plan.badge}
        </span>
      )}
      {plan.assessRequired && (
        <span className="inline-flex rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold text-amber-900">
          Audit recommended
        </span>
      )}
    </div>
  );
}

export function PricingMainPlansSection() {
  const [period, setPeriod] = useState<BillingPeriod>('monthly');

  return (
    <section id="step-plans" className="mt-16 scroll-mt-20" aria-labelledby="pricing-plans-heading">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
          Product revenue
        </p>
        <h2
          id="pricing-plans-heading"
          className="mt-2 text-2xl font-bold text-text-primary sm:text-3xl"
        >
          Free scan → Developer → Professional → Enterprise
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-normal text-text-secondary">
          Monetise the full accessibility improvement process — not only the scan. Prices excl.
          GST · illustrative India strategy.
        </p>
        <div className="mt-6 inline-flex rounded-md border border-border p-1">
          <button
            type="button"
            className={`min-h-11 rounded px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 ${
              period === 'monthly' ? 'bg-primary-600 text-white' : 'text-text-secondary'
            }`}
            onClick={() => setPeriod('monthly')}
            aria-pressed={period === 'monthly'}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`min-h-11 rounded px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 ${
              period === 'annual' ? 'bg-primary-600 text-white' : 'text-text-secondary'
            }`}
            onClick={() => setPeriod('annual')}
            aria-pressed={period === 'annual'}
          >
            Annual
          </button>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
        {MONTHLY_PLANS.map((plan) => (
          <article
            key={plan.id}
            className={`relative flex flex-col rounded-lg border bg-white p-6 shadow-sm ${
              plan.popular ? 'border-primary-600 border-2 shadow-lg' : 'border-gray-200'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="inline-flex rounded-full bg-primary-600 px-4 py-1 text-sm font-semibold text-white">
                  Most popular
                </span>
              </div>
            )}

            <div className="text-center">
              <PlanBadges plan={plan} />
              <h3 className="text-xl font-bold text-text-primary">{plan.name}</h3>
              <p className="mt-2 min-h-[3rem] text-sm leading-normal text-text-secondary">
                {plan.description}
              </p>
              <p className="mt-4 text-2xl font-bold text-primary-600">
                {formatPlanPrice(plan.monthlyPriceInr, plan.annualPriceInr, period)}
              </p>
              {plan.id === 'enterprise' ? (
                <p className="mt-1 text-xs text-text-tertiary">From ₹2.5L / year · custom</p>
              ) : (
                <p className="mt-1 text-xs text-text-tertiary">+18% GST</p>
              )}

              {(plan.checkoutNote === 'custom' || plan.assessRequired) && (
                <p className="mt-3 text-xs leading-normal text-text-secondary">
                  {assessCheckoutSubline()}
                </p>
              )}

              <ButtonLink
                href={plan.cta.href}
                size="lg"
                variant={plan.popular ? 'primary' : 'secondary'}
                className="mt-5 w-full"
              >
                {plan.cta.text}
              </ButtonLink>
            </div>

            <ul className="mt-6 flex-1 space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm leading-normal text-text-primary">{feature}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
