import type { Metadata } from 'next';
import Link from 'next/link';
import { PricingMainPlansSection } from '@/components/marketing/pricing/PricingMainPlansSection';
import { WidgetComplianceDisclaimer } from '@/components/marketing/pricing/WidgetComplianceDisclaimer';
import {
  PricingRemediationSection,
  PricingStandaloneAuditSection,
  PricingAddonsSection,
} from '@/components/marketing/pricing/PricingRemediationSection';
import { PricingReportFeaturesSection } from '@/components/marketing/pricing/PricingReportFeaturesSection';
import { PricingIndiaComplianceSection } from '@/components/marketing/pricing/PricingIndiaComplianceSection';
import { FAQSection } from '@/components/marketing/pricing/FAQSection';
import { MarketingVisual } from '@/components/marketing/visuals';
import { MarketingImage } from '@/components/marketing/visuals/MarketingImage';
import { MARKETING_IMAGES } from '@/lib/marketing/images';
import { PRICING_CATALOG } from '@/lib/pricing/catalog';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { localeFromParams } from '@/lib/i18n/server';
import { localizedHref } from '@/lib/i18n/paths';

/** ISR — pricing/services content refreshes hourly. */
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = localeFromParams(params);
  const { pages } = getDictionary(locale);
  const base = 'https://accessshield.in';
  const path = localizedHref('/services', locale);

  return {
    title: pages.services.meta.title,
    description: pages.services.meta.description,
    openGraph: {
      title: `${pages.services.meta.title} | AccessShield India`,
      description: pages.services.meta.description,
      type: 'website',
    },
    alternates: {
      canonical: path === '/services' ? `${base}/services` : `${base}${path}`,
      languages: { en: `${base}/services`, hi: `${base}/hi/services` },
    },
  };
}

const servicesFaqs = [
  {
    question: 'Is there a free option?',
    answer:
      'Yes. Run a free scan with no credit card, or sign up for a Free account — 1 website and 1 scan per month with a WCAG + IS 17802 issue summary. Upgrade to Professional (₹1,999/mo) for 20 scans, the accessibility widget, and downloadable PDF reports.',
  },
  {
    question: 'Does the accessibility widget make my site compliant?',
    answer:
      'No. The widget improves usability for visitors (font size, contrast, dyslexia-friendly fonts, keyboard tools) but does not fix underlying code issues or satisfy RPwD, SEBI, or GIGW requirements on its own. True compliance requires assessment, remediation, and documented evidence.',
  },
  {
    question: 'What is the difference between Professional and Stay Compliant?',
    answer:
      'Professional is for teams getting started: scans, reports, and the widget. Stay Compliant (₹4,999/mo) is ongoing monitoring after your site has been remediated and passed a Compliance Website Audit & Scan (₹14,999). It includes unlimited scans, quarterly spot-checks, and annual assessment reports.',
  },
  {
    question: 'Who needs Regulatory Defense?',
    answer:
      'Listed companies facing SEBI accessibility deadlines, BFSI firms, PSUs, and government vendors who need RPwD/GIGW evidence packs, SEBI assessment reports, and IAAP-certified sign-off. Pricing starts at ₹7,999/mo after remediation and baseline audit.',
  },
  {
    question: 'How does remediation pricing work?',
    answer:
      'Brochure sites (1–15 pages) are ₹49,999 one-time. Larger sites and e-commerce flows start from ₹99,999, scoped after your assessment. Additional pages beyond 15 are billed at ₹2,000/page. All remediation prices exclude 18% GST.',
  },
  {
    question: 'Do you provide a GST invoice?',
    answer:
      'Yes. All paid prices exclude 18% GST. We issue GST-compliant invoices (CGST + SGST intra-state, IGST inter-state). Registered businesses may claim input tax credit where applicable. Government departments can pay via PO or annual contract.',
  },
];

export default function ServicesPage() {
  const { freeTier, enterprise } = PRICING_CATALOG;

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_minmax(240px,400px)] lg:gap-16">
          <div className="text-center lg:text-left">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
              Services &amp; Pricing
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
              Start with an audit. Stay accessible for everyone.
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg leading-normal text-text-secondary lg:mx-0">
              Most companies begin with a Compliance Website Audit &amp; Scan — because you cannot
              fix what you cannot see. Then add the widget, ongoing monitoring, or remediation as
              you grow. Built for people with disabilities and Indian regulators alike.
            </p>
            <p className="mt-4 text-sm text-text-secondary">
              <Link
                href={freeTier.cta.href}
                className="font-medium text-primary-600 underline hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
              >
                {freeTier.cta.text}
              </Link>
              {' · '}
              <Link
                href={freeTier.signupCta.href}
                className="font-medium text-primary-600 underline hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
              >
                {freeTier.signupCta.text}
              </Link>
            </p>
          </div>

          <MarketingVisual
            label="Government and enterprise teams reviewing accessibility compliance reports"
            className="mx-auto w-full max-w-md overflow-hidden p-0 lg:max-w-none"
          >
            <div className="relative aspect-[4/3] w-full">
              <MarketingImage
                src={MARKETING_IMAGES.enterpriseCompliance}
                alt="Indian enterprise and government stakeholders reviewing digital accessibility compliance in a conference room"
                fill
                sizes="(max-width: 1024px) 100vw, 400px"
                className="object-cover object-center"
              />
            </div>
          </MarketingVisual>
        </div>

        <PricingStandaloneAuditSection />
        <PricingMainPlansSection />
        <WidgetComplianceDisclaimer />
        <PricingRemediationSection />
        <PricingAddonsSection />
        <PricingReportFeaturesSection />
        <PricingIndiaComplianceSection />

        <p className="mt-12 text-center text-sm text-text-secondary">
          {enterprise.note}{' '}
          <Link
            href={enterprise.cta.href}
            className="font-medium text-primary-600 underline hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          >
            {enterprise.cta.text}
          </Link>
        </p>

        <div className="mt-24">
          <FAQSection items={servicesFaqs} />
        </div>
      </div>
    </div>
  );
}
