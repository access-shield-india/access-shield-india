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
        <span
          className={`inline-flex rounded-full px-3 py-0.5 text-xs font-semibold ${
            plan.noAuditRequired
              ? 'bg-accent-100 text-accent-700'
              : 'bg-primary-100 text-primary-700'
          }`}
        >
          {plan.badge}
        </span>
      )}
      {plan.remediationRequired && (
        <span className="inline-flex rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold text-amber-900">
          Remediation required
        </span>
      )}
    </div>
  );
}

export function PricingMainPlansSection() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  return (
    <section id="step-plans" className="mt-16 scroll-mt-20" aria-labelledby="pricing-plans-heading">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Step 01</p>
        <h2
          id="pricing-plans-heading"
          className="mt-2 text-2xl font-bold text-text-primary sm:text-3xl"
        >
          Pick your monthly plan
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-normal text-text-secondary">
          Ongoing plans to keep your site welcoming after remediation — widget, scans, and
          monitoring for teams and regulators. All prices exclude 18% GST. Annual billing saves
          ~17%.
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <div
          role="group"
          aria-label="Billing period"
          className="inline-flex rounded-lg border border-gray-300 bg-white p-1 shadow-sm"
        >
          <button
            type="button"
            onClick={() => setBillingPeriod('monthly')}
            aria-pressed={billingPeriod === 'monthly'}
            className={`rounded-md px-6 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 ${
              billingPeriod === 'monthly'
                ? 'border-2 border-primary-700 bg-primary-600 text-white shadow-sm'
                : 'border-2 border-transparent bg-white text-text-secondary hover:bg-gray-100'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingPeriod('annual')}
            aria-pressed={billingPeriod === 'annual'}
            className={`rounded-md px-6 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 ${
              billingPeriod === 'annual'
                ? 'border-2 border-primary-700 bg-primary-600 text-white shadow-sm'
                : 'border-2 border-transparent bg-white text-text-secondary hover:bg-gray-100'
            }`}
          >
            Annual
            <span className="ml-1.5 text-xs">(Save ~17%)</span>
          </button>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 xl:grid-cols-4">
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
                  Recommended
                </span>
              </div>
            )}

            <div className="text-center">
              <PlanBadges plan={plan} />
              <h3 className="text-xl font-bold text-text-primary">{plan.name}</h3>
              <p className="mt-2 min-h-[3rem] text-sm leading-normal text-text-secondary">
                {plan.description}
              </p>

              <div className="mt-4">
                <div className="text-3xl font-bold text-text-primary">
                  {formatPlanPrice(plan.monthlyPriceInr, plan.annualPriceInr, billingPeriod)}
                </div>
                {billingPeriod === 'annual' && (
                  <p className="mt-1 text-sm text-text-tertiary">
                    {formatPlanPrice(plan.annualPriceInr / 12, plan.annualPriceInr, 'monthly')}{' '}
                    billed annually
                  </p>
                )}
                <p className="mt-1 text-xs text-text-tertiary">+ 18% GST</p>
              </div>

              {plan.checkoutNote === 'assess' && (
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
