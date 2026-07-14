import Link from 'next/link';
import { PRICING_CATALOG } from '@/lib/pricing/catalog';

export function PricingIndiaComplianceSection() {
  const { gstNote, links } = PRICING_CATALOG.indiaCompliance;

  return (
    <section className="mt-24" aria-labelledby="india-compliance-heading">
      <div className="rounded-xl border border-primary-100 bg-primary-50 px-6 py-8 sm:px-10">
        <h2 id="india-compliance-heading" className="text-xl font-bold text-text-primary">
          Built for Indian compliance
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-normal text-text-secondary">{gstNote}</p>
        <nav className="mt-6" aria-label="India compliance guides">
          <ul className="flex flex-wrap gap-3">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex rounded-full border border-primary-200 bg-white px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
