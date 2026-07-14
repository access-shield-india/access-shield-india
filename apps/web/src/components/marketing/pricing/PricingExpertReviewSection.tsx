import Link from 'next/link';
import { ButtonLink } from '@/components/marketing/ButtonLink';
import { formatInr, PRICING_CATALOG } from '@/lib/pricing/catalog';

/** @deprecated Use PricingStandaloneAuditSection on /services */
export function PricingExpertReviewSection() {
  const review = PRICING_CATALOG.standaloneAssessment;

  return (
    <section className="mt-16" aria-labelledby="expert-review-heading">
      <div className="mx-auto max-w-3xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Optional</p>
        <h2 id="expert-review-heading" className="mt-2 text-xl font-bold text-text-primary">
          {review.name}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">{review.subtitle}</p>
        <p className="mt-4 text-3xl font-bold text-text-primary">
          {formatInr(review.priceInr)}
          <span className="ml-1 text-base font-normal text-text-tertiary">one-time</span>
        </p>
        {review.priceNote && (
          <p className="mt-1 text-xs text-text-tertiary">{review.priceNote} · + 18% GST</p>
        )}
        <ul className="mt-4 space-y-2">
          {review.features.map((feature) => (
            <li key={feature} className="text-sm text-text-primary">
              · {feature}
            </li>
          ))}
        </ul>
        <ButtonLink href={review.cta.href} variant="secondary" size="md" className="mt-6">
          {review.cta.text}
        </ButtonLink>
      </div>
      <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-text-secondary">
        {PRICING_CATALOG.enterprise.note}{' '}
        <Link
          href={PRICING_CATALOG.enterprise.cta.href}
          className="font-medium text-primary-600 underline hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          {PRICING_CATALOG.enterprise.cta.text}
        </Link>
      </p>
    </section>
  );
}
