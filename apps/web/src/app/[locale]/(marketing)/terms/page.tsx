import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingContentPage } from '@/components/marketing/MarketingContentPage';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing use of AccessShield India software and services.',
};

export default function TermsPage() {
  return (
    <MarketingContentPage
      title="Terms of Service"
      description="Last updated: June 2026. By using AccessShield India, you agree to these terms."
    >
      <section>
        <h2 className="text-xl font-semibold text-text-primary">1. Service</h2>
        <p className="mt-2">
          AccessShield India provides website accessibility scanning, issue tracking, reporting, and
          related tools. Features vary by subscription plan. We may update the service with
          reasonable notice for material changes.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">2. Accounts</h2>
        <p className="mt-2">
          You are responsible for safeguarding login credentials and for all activity under your
          account. You must provide accurate registration information and notify us of unauthorised
          access.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">3. Acceptable use</h2>
        <p className="mt-2">
          You may only scan websites and assets you own or have permission to test. You must not use
          the service to attack third-party systems, circumvent rate limits, or resell access
          without written agreement.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">4. Compliance outputs</h2>
        <p className="mt-2">
          Scan results and certificates are informational tools to support accessibility efforts.
          They do not constitute legal advice or a guarantee of regulatory compliance. You remain
          responsible for your organisation&apos;s compliance obligations.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">5. Payment</h2>
        <p className="mt-2">
          Paid plans are billed in Indian Rupees (₹) inclusive of applicable GST unless stated
          otherwise. Subscriptions renew automatically unless cancelled. See our{' '}
          <Link href="/refund" className="text-primary-600 hover:text-primary-700">
            Refund Policy
          </Link>{' '}
          for cancellation terms.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">6. Limitation of liability</h2>
        <p className="mt-2">
          To the maximum extent permitted by law, AccessShield India is not liable for indirect,
          incidental, or consequential damages arising from use of the service. Our aggregate
          liability is limited to fees paid by you in the twelve months preceding the claim.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">7. Governing law</h2>
        <p className="mt-2">
          These terms are governed by the laws of India. Courts in Pune, Maharashtra shall have
          exclusive jurisdiction, subject to applicable consumer protection laws.
        </p>
      </section>
      <p>
        Questions?{' '}
        <Link href="/contact" className="text-primary-600 hover:text-primary-700">
          Contact us
        </Link>
        .
      </p>
    </MarketingContentPage>
  );
}
