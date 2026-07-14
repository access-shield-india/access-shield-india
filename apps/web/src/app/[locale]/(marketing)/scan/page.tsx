import { ScanToolWidget } from '@/components/marketing/scan/ScanToolWidget';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Website Accessibility Scan',
  description:
    'See who your website excludes — scan for barriers affecting people with disabilities. WCAG 2.2, IS 17802, and RPwD checks in 60–90 seconds. No credit card.',
  openGraph: {
    title: 'Free Website Accessibility Scan | AccessShield India',
    description:
      'Find accessibility barriers for blind, deaf, and motor-impaired users in 60–90 seconds. Free scan, no credit card.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://accessshield.in/scan',
  },
};

export default function ScanPage() {
  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
            See who your website is leaving out
          </h1>
          <p className="mt-4 text-lg leading-normal text-text-secondary">
            Find barriers for people with visual, hearing, and motor disabilities · Up to 10 pages ·
            Results in 60–90 seconds · No credit card
          </p>
        </div>

        <div className="mt-12">
          <ScanToolWidget />
        </div>
      </div>
    </div>
  );
}
