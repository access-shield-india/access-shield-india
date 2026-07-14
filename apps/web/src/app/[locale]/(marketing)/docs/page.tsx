import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingContentPage } from '@/components/marketing/MarketingContentPage';
import { DocsIllustration } from '@/components/marketing/visuals';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'Getting started with AccessShield India — scans, remediation, reports, and certification.',
};

export default function DocsPage() {
  return (
    <MarketingContentPage
      title="Documentation"
      description="Quick start guide for AccessShield India customers."
      visual={<DocsIllustration />}
      visualLabel="Documentation and getting started guides"
    >
      <section>
        <h2 className="text-xl font-semibold text-text-primary">1. Start a free scan</h2>
        <p className="mt-2">
          Use our{' '}
          <Link href="/scan" className="text-primary-600 hover:text-primary-700">
            public scan tool
          </Link>{' '}
          to check any website for WCAG 2.2 and IS 17802 issues — no account required.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">2. Create your account</h2>
        <p className="mt-2">
          <Link href="/signup" className="text-primary-600 hover:text-primary-700">
            Start a free trial
          </Link>{' '}
          to register assets, run unlimited scans (on paid plans), track issues, and generate
          compliance reports.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">3. Sign in to the portal</h2>
        <p className="mt-2">
          Existing customers can{' '}
          <Link href="/login" className="text-primary-600 hover:text-primary-700">
            sign in
          </Link>{' '}
          to manage scans, issues, certificates, and billing.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">Compliance standards</h2>
        <p className="mt-2">
          Learn about{' '}
          <Link href="/rpwd-act" className="text-primary-600 hover:text-primary-700">
            RPwD Act
          </Link>
          ,{' '}
          <Link href="/is-17802" className="text-primary-600 hover:text-primary-700">
            IS 17802
          </Link>
          ,{' '}
          <Link href="/gigw" className="text-primary-600 hover:text-primary-700">
            GIGW 3.0
          </Link>
          ,{' '}
          <Link href="/wcag-2-2-aa" className="text-primary-600 hover:text-primary-700">
            WCAG 2.2 AA
          </Link>
          , and{' '}
          <Link href="/sebi-accessibility" className="text-primary-600 hover:text-primary-700">
            SEBI accessibility requirements
          </Link>
          .
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">Need help?</h2>
        <p className="mt-2">
          Contact{' '}
          <a
            href="mailto:support@accessshield.in"
            className="text-primary-600 hover:text-primary-700"
          >
            support@accessshield.in
          </a>{' '}
          or visit our{' '}
          <Link href="/contact" className="text-primary-600 hover:text-primary-700">
            contact page
          </Link>
          .
        </p>
      </section>
    </MarketingContentPage>
  );
}
