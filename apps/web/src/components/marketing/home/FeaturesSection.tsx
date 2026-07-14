import Link from 'next/link';
import { FileText, Globe, Smartphone, ArrowRight, type LucideIcon } from 'lucide-react';
import { Badge } from '@accessshield/ui';
import type { Locale } from '@/lib/i18n/config';
import { localizedHref } from '@/lib/i18n/paths';

interface FeatureCard {
  id: string;
  icon: LucideIcon;
  title: string;
  tagline: string;
  description: string;
  standards: string[];
  highlight?: string;
  href: string;
  linkText: string;
  badge?: string;
}

const FEATURES: FeatureCard[] = [
  {
    id: 'website-scanner',
    icon: Globe,
    title: 'Website Scanner',
    tagline: 'Public URLs · Web Apps · Portals',
    description:
      'Scan any website for WCAG 2.2 AA violations, keyboard traps, missing alt text, and contrast failures — in 60–90 seconds. Includes IS 17802 and GIGW 3.0 India-specific rules.',
    standards: ['WCAG 2.2 AA', 'IS 17802', 'GIGW 3.0'],
    href: '/scan',
    linkText: 'Try free scan →',
  },
  {
    id: 'document-scanner',
    icon: FileText,
    title: 'Document Scanner',
    tagline: 'PDF · Word · PowerPoint · Excel',
    description:
      'Scan government documents before publishing. Detects untagged PDFs, missing alt text, inaccessible tables, and 40+ WCAG 2.1 AA / GIGW 3.0 issues — with plain-English remediation for each.',
    standards: ['WCAG 2.1 AA', 'GIGW 3.0', 'PDF/UA-1', 'IS 17802'],
    highlight:
      'Most government PDFs are scanned images with no text layer — completely invisible to screen readers.',
    href: '/document-scanner',
    linkText: 'Learn more →',
    badge: 'New',
  },
  {
    id: 'mobile-scanner',
    icon: Smartphone,
    title: 'Mobile App Scanner',
    tagline: 'Android APK · iOS IPA',
    description:
      'Audit native mobile apps for accessibility barriers — touch targets, screen reader compatibility, and gesture alternatives. Required for SEBI-regulated entities with customer-facing apps.',
    standards: ['WCAG 2.2 AA', 'IS 17802', 'SEBI 2024'],
    href: '/contact?service=mobile-scan',
    linkText: 'Get quote →',
  },
];

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-success-700"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function FeaturesSection({ locale }: { locale: Locale }) {
  return (
    <section
      className="border-y border-gray-200 bg-bg-secondary px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
            Scanning Products
          </p>
          <h2
            id="features-heading"
            className="mt-2 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl"
          >
            Scan websites, documents, and mobile apps
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-normal text-text-secondary">
            Find accessibility barriers before your users do. One platform for all digital assets —
            mapped to Indian and international standards.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.id}
                className="relative flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                {feature.badge && (
                  <div className="absolute -top-3 right-4">
                    <Badge
                      variant="accent"
                      size="sm"
                      className="border-2 border-accent/40 shadow-sm"
                    >
                      {feature.badge}
                    </Badge>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-primary-600"
                    aria-hidden="true"
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-text-primary">{feature.title}</h3>
                    <p className="text-sm text-text-tertiary">{feature.tagline}</p>
                  </div>
                </div>

                <p className="mt-4 flex-1 text-base leading-normal text-text-secondary">
                  {feature.description}
                </p>

                {feature.highlight && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm leading-normal text-amber-900">
                      <span className="font-semibold">Note:</span> {feature.highlight}
                    </p>
                  </div>
                )}

                <ul className="mt-4 flex flex-wrap gap-2" aria-label="Supported standards">
                  {feature.standards.map((standard) => (
                    <li key={standard} className="flex items-center gap-1 text-xs">
                      <CheckIcon />
                      <span className="font-medium text-text-primary">{standard}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={localizedHref(feature.href, locale)}
                  className="mt-6 inline-flex items-center gap-1 text-base font-medium text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded-sm"
                >
                  {feature.linkText}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
