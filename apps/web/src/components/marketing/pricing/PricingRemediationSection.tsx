import { ButtonLink } from '@/components/marketing/ButtonLink';
import { formatInr, PRICING_CATALOG, type OneTimeSku } from '@/lib/pricing/catalog';

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
      <div className="mt-4 flex flex-wrap items-baseline gap-2">
        {service.originalPriceInr && (
          <span className="text-lg text-text-tertiary line-through">
            {formatInr(service.originalPriceInr)}
          </span>
        )}
        <span className="text-3xl font-bold text-text-primary">
          {formatInr(service.priceInr)}
          <span className="ml-1 text-base font-normal text-text-tertiary">one-time</span>
        </span>
      </div>
      {service.priceNote && <p className="mt-1 text-xs text-text-tertiary">{service.priceNote}</p>}
      <p className="mt-1 text-xs text-text-tertiary">+ 18% GST</p>
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
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Step 02</p>
        <h2
          id="remediation-heading"
          className="mt-2 text-2xl font-bold text-text-primary sm:text-3xl"
        >
          Remediation, priced by site size
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-normal text-text-secondary">
          Remove code-level barriers so people with disabilities can pay, sign up, and read your
          content — then move to ongoing monitoring. All prices exclude 18% GST.
        </p>
      </div>
      <div className="mt-10 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        {PRICING_CATALOG.remediation.map((tier) => (
          <OneTimeCard key={tier.id} service={tier} />
        ))}
      </div>
    </section>
  );
}

export function PricingStandaloneAuditSection() {
  const audit = PRICING_CATALOG.standaloneAssessment;

  return (
    <section id="step-audit" className="mt-16 scroll-mt-20" aria-labelledby="audit-addon-heading">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
          Most companies start here
        </p>
        <h2
          id="audit-addon-heading"
          className="mt-2 text-2xl font-bold text-text-primary sm:text-3xl"
        >
          Compliance Website Audit &amp; Scan
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-normal text-text-secondary">
          Know exactly where your site stands for users with disabilities — automated WCAG 2.2 + IS
          17802 scan paired with hands-on specialist review.{' '}
          <strong className="font-semibold text-text-primary">
            Free for the first 100 customers
          </strong>{' '}
          (₹4,999 one-time thereafter). Available standalone; no subscription required.
        </p>
      </div>
      <div className="mx-auto mt-10 max-w-2xl">
        <OneTimeCard service={audit} />
      </div>
    </section>
  );
}

export function PricingAddonsSection() {
  const addons = PRICING_CATALOG.addons;

  return (
    <section className="mt-16" aria-labelledby="extra-addons-heading">
      <h2 id="extra-addons-heading" className="text-center text-xl font-bold text-text-primary">
        More add-ons
      </h2>
      <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-6 lg:grid-cols-2">
        {addons.map((addon) => (
          <OneTimeCard key={addon.id} service={addon} />
        ))}
      </div>
    </section>
  );
}
