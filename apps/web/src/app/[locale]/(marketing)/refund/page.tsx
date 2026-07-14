import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingContentPage } from '@/components/marketing/MarketingContentPage';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'Cancellation and refund terms for AccessShield India subscriptions.',
};

export default function RefundPage() {
  return (
    <MarketingContentPage title="Refund Policy" description="Last updated: June 2026.">
      <section>
        <h2 className="text-xl font-semibold text-text-primary">Free trial</h2>
        <p className="mt-2">
          New customers may start with a free trial as described on our{' '}
          <Link href="/services" className="text-primary-600 hover:text-primary-700">
            services page
          </Link>
          . No payment is charged during the trial unless you upgrade to a paid plan.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">Paid subscriptions</h2>
        <p className="mt-2">
          Monthly and annual plans are billed in advance. You may cancel at any time from your
          account settings or by emailing{' '}
          <a
            href="mailto:billing@accessshield.in"
            className="text-primary-600 hover:text-primary-700"
          >
            billing@accessshield.in
          </a>
          . Cancellation stops future renewals; access continues until the end of the current
          billing period.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">Refunds</h2>
        <p className="mt-2">
          If you cancel within 7 days of your first paid charge and have not substantially used paid
          features (e.g. more than 3 scans or generated reports), you may request a full refund.
          Refunds are processed to the original payment method within 7–10 business days via
          Razorpay.
        </p>
        <p className="mt-2">
          Partial refunds for mid-cycle cancellations are not offered except where required by law
          or at our discretion for service outages.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-text-primary">Enterprise &amp; government</h2>
        <p className="mt-2">
          Custom contracts may include different refund terms as specified in your order form or
          purchase agreement.
        </p>
      </section>
      <p>
        For billing support, see{' '}
        <Link href="/contact" className="text-primary-600 hover:text-primary-700">
          Contact
        </Link>{' '}
        or email{' '}
        <a
          href="mailto:billing@accessshield.in"
          className="text-primary-600 hover:text-primary-700"
        >
          billing@accessshield.in
        </a>
        .
      </p>
    </MarketingContentPage>
  );
}
