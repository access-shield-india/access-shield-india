import { ButtonLink } from '@/components/marketing/ButtonLink';
import {
  EXPERT_ADDONS,
  formatInr,
  REMEDIATION_SKUS,
  STANDALONE_AUDIT,
  type OneTimeSku,
} from '@/lib/pricing/catalog';

function OneTimeCard({ service }: { service: OneTimeSku }) {
  return (
    <article
      className={`relative flex h-full flex-col rounded-lg border bg-white p-6 shadow-sm ${
        service.popular || service.highlighted ? 'border-primary-600 border-2' : 'border-gray-200'
      }`}
    >
      {service.badge ? (
        <span className="absolute -top-3 left-4 inline-flex rounded-full bg-primary-600 px-3 py-0.5 text-xs font-semibold text-white">
          {service.badge}
        </span>
      ) : service.popular ? (
        <span className="absolute -top-3 left-4 inline-flex rounded-full bg-primary-600 px-3 py-0.5 text-xs font-semibold text-white">
          Most popular
        </span>
      ) : (
        service.highlighted && (
          <span className="absolute -top-3 left-4 inline-flex rounded-full bg-accent-100 px-3 py-0.5 text-xs font-semibold text-accent-700">
            Add-on · standalone
          </span>
        )
      )}
      <h3 className="text-lg font-bold text-text-primary">{service.name}</h3>
      <p className="mt-1 text-sm text-text-secondary">{service.subtitle}</p>
      <p className="mt-3 text-2xl font-bold text-primary-600">
        from {formatInr(service.priceInr)}
      </p>
      {service.priceNote && (
        <p className="mt-1 text-sm font-medium text-text-secondary">{service.priceNote}</p>
      )}
      <ul className="mt-4 flex-1 space-y-2">
        {service.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-text-primary">
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
            {feature}
          </li>
        ))}
      </ul>
      <ButtonLink href={service.cta.href} variant="secondary" size="md" className="mt-6 w-full">
        {service.cta.text}
      </ButtonLink>
    </article>
  );
}

export function PricingRemediationSection() {
  return (
    <section
      id="step-remediation"
      className="mt-24 scroll-mt-20"
      aria-labelledby="remediation-heading"
    >
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
          Compliance services
        </p>
        <h2
          id="remediation-heading"
          className="mt-2 text-2xl font-bold text-text-primary sm:text-3xl"
        >
          Expert remediation
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-normal text-text-secondary">
          Project-based fixes after audit — then keep improving with Professional or Enterprise
          monitoring. Contact sales for a scoped quote.
        </p>
      </div>
      <div className="mt-10 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        {REMEDIATION_SKUS.map((tier) => (
          <OneTimeCard key={tier.id} service={tier} />
        ))}
      </div>
    </section>
  );
}

export function PricingStandaloneAuditSection() {
  return (
    <section id="step-audit" className="mt-16 scroll-mt-20" aria-labelledby="audit-addon-heading">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
          Compliance services
        </p>
        <h2
          id="audit-addon-heading"
          className="mt-2 text-2xl font-bold text-text-primary sm:text-3xl"
        >
          Documented accessibility audit
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-normal text-text-secondary">
          Automated WCAG 2.2 + IS 17802 plus hands-on specialist review — the engagement banks and
          PSUs actually need after a free scan. Launch offer may apply for early customers.
        </p>
      </div>
      <div className="mx-auto mt-10 max-w-2xl">
        <OneTimeCard service={STANDALONE_AUDIT} />
      </div>
    </section>
  );
}

export function PricingAddonsSection() {
  return (
    <section className="mt-16" aria-labelledby="extra-addons-heading">
      <h2 id="extra-addons-heading" className="text-center text-xl font-bold text-text-primary">
        More expert services
      </h2>
      <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-3">
        {EXPERT_ADDONS.map((addon) => (
          <OneTimeCard key={addon.id} service={addon} />
        ))}
      </div>
    </section>
  );
}
