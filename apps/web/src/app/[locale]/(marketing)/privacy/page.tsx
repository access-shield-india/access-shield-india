import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingContentPage } from '@/components/marketing/MarketingContentPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How AccessShield India collects, uses, and protects your personal data.',
};

export default function PrivacyPage() {
  return (
    <MarketingContentPage
      title="Privacy Policy"
      description="Last updated: June 2026. This policy explains how AccessShield India handles your information."
    >
      <section>
        <h2 className="text-xl font-semibold text-text-primary">1. Who we are</h2>
        <p className="mt-2">
          AccessShield India (&quot;we&quot;, &quot;us&quot;) provides digital accessibility
          compliance software to organisations in India. For privacy questions, contact{' '}
          <a
            href="mailto:privacy@accessshield.in"
            className="text-primary-600 hover:text-primary-700"
          >
            privacy@accessshield.in
          </a>
          .
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">2. Information we collect</h2>
        <ul className="mt-2 list-disc space-y-2 pl-6">
          <li>Account details: name, email, organisation, phone (optional)</li>
          <li>
            Billing details: GSTIN, billing address, payment references (processed via Razorpay)
          </li>
          <li>Usage data: scans run, assets registered, feature usage, audit logs</li>
          <li>
            Public scan tool: URL submitted, email (if provided), IP address for rate limiting
          </li>
          <li>Support communications and feedback you send us</li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">3. How we use your data</h2>
        <p className="mt-2">
          We use your information to provide the service, generate compliance reports, process
          payments, send transactional emails, improve our product, and comply with legal
          obligations. We do not sell your personal data.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">4. AI and third parties</h2>
        <p className="mt-2">
          AI remediation features may send anonymised violation snippets to our AI provider after
          data-loss-prevention scrubbing (Aadhaar, PAN, phone numbers, and similar identifiers are
          redacted). We use Supabase (auth), AWS (hosting), Razorpay (payments), and email/SMS
          providers for operations.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">5. Data retention</h2>
        <p className="mt-2">
          Account data is retained while your subscription is active and for a reasonable period
          after cancellation for legal and billing purposes. You may request deletion by contacting
          support, subject to statutory retention requirements.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">6. Your rights</h2>
        <p className="mt-2">
          Under applicable Indian law, you may request access, correction, or deletion of your
          personal data. Contact{' '}
          <a
            href="mailto:privacy@accessshield.in"
            className="text-primary-600 hover:text-primary-700"
          >
            privacy@accessshield.in
          </a>
          .
        </p>
      </section>
      <p>
        See also our{' '}
        <Link href="/terms" className="text-primary-600 hover:text-primary-700">
          Terms of Service
        </Link>
        .
      </p>
    </MarketingContentPage>
  );
}
