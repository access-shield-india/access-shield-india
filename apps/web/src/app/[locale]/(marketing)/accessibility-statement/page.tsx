import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingContentPage } from '@/components/marketing/MarketingContentPage';

export const metadata: Metadata = {
  title: 'Accessibility Statement',
  description:
    'AccessibleNow commitment to WCAG 2.2 AA accessibility for our website and platform.',
};

export default function AccessibilityStatementPage() {
  return (
    <MarketingContentPage
      title="Accessibility Statement"
      description="We practise what we preach — this site and our product aim to meet WCAG 2.2 Level AA."
    >
      <section>
        <h2 className="text-xl font-semibold text-text-primary">Our commitment</h2>
        <p className="mt-2">
          AccessibleNow is committed to ensuring digital accessibility for people with
          disabilities. We continually improve the user experience for everyone and apply relevant
          accessibility standards including WCAG 2.2 Level AA and IS 17802.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">Measures we take</h2>
        <ul className="mt-2 list-disc space-y-2 pl-6">
          <li>Semantic HTML, visible focus indicators, and keyboard navigation on all pages</li>
          <li>Colour contrast verified against WCAG 1.4.3 and 1.4.11 requirements</li>
          <li>Skip links, form labels, and ARIA patterns per WAI-ARIA Authoring Practices</li>
          <li>
            Automated axe-core checks on all marketing pages (`pnpm test:a11y`) and Playwright
            audits (`pnpm audit:a11y:marketing`)
          </li>
          <li>Support for prefers-reduced-motion and text resizing up to 200%</li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">Conformance status</h2>
        <p className="mt-2">
          We target WCAG 2.2 Level AA conformance for accessshield.in and the customer portal. Some
          third-party content (e.g. embedded calendars or payment widgets) may not be fully under
          our control; we work with vendors to improve accessibility.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">Feedback</h2>
        <p className="mt-2">
          If you encounter accessibility barriers on our website or product, please contact us:
        </p>
        <ul className="mt-2 list-disc space-y-2 pl-6">
          <li>
            Email:{' '}
            <a
              href="mailto:accessibility@accessshield.in"
              className="text-primary-600 hover:text-primary-700"
            >
              accessibility@accessshield.in
            </a>
          </li>
          <li>
            <Link href="/contact" className="text-primary-600 hover:text-primary-700">
              Contact form
            </Link>
          </li>
        </ul>
        <p className="mt-2">
          We aim to respond within 2 business days and will work with you to provide the information
          or functionality you need through an alternative accessible format where possible.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">Assessment approach</h2>
        <p className="mt-2">
          This statement was prepared in June 2026. Accessibility is evaluated through
          self-assessment, automated scanning with axe-core, and periodic expert review.
        </p>
      </section>
    </MarketingContentPage>
  );
}
