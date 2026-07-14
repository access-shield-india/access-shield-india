import { PRICING_CATALOG } from '@/lib/pricing/catalog';

export function PricingReportFeaturesSection() {
  return (
    <section className="mt-24" aria-labelledby="report-features-heading">
      <div className="rounded-xl border border-gray-200 bg-bg-secondary px-6 py-10 sm:px-10">
        <h2
          id="report-features-heading"
          className="text-center text-2xl font-bold text-text-primary sm:text-3xl"
        >
          What&apos;s in your compliance report?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-normal text-text-secondary">
          Every paid scan produces documentation you can share with leadership and auditors — and a
          clearer picture of who your site is leaving out.
        </p>
        <ul className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {PRICING_CATALOG.reportFeatures.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-primary-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-sm leading-normal text-text-primary">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
