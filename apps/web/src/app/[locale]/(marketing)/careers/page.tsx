import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingContentPage } from '@/components/marketing/MarketingContentPage';
import { CareersIllustration } from '@/components/marketing/visuals';

export const metadata: Metadata = {
  title: 'Careers',
  description: 'Join AccessShield India and help make the web accessible for everyone in India.',
};

export default function CareersPage() {
  return (
    <MarketingContentPage
      title="Careers"
      description="We're building India's leading accessibility compliance platform. Come help us make the web work for everyone."
      visual={<CareersIllustration />}
      visualLabel="Career growth and team building"
    >
      <p>
        We&apos;re a small, mission-driven team in Pune. We care deeply about accessibility,
        inclusive design, and building software that meets WCAG 2.2 AA standards — including our own
        product.
      </p>
      <p>
        Open roles are posted as we grow. If you&apos;re passionate about accessibility engineering,
        full-stack development, or B2B SaaS in India, we&apos;d love to hear from you.
      </p>
      <p>
        Send your CV and a short note to{' '}
        <a
          href="mailto:careers@accessshield.in"
          className="text-primary-600 hover:text-primary-700"
        >
          careers@accessshield.in
        </a>
        .
      </p>
      <p>
        <Link href="/about" className="font-medium text-primary-600 hover:text-primary-700">
          Learn more about us →
        </Link>
      </p>
    </MarketingContentPage>
  );
}
