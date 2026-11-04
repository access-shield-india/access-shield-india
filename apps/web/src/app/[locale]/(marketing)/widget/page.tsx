import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowDown, MousePointerClick, Puzzle, Shield } from 'lucide-react';
import { ButtonAnchor, ButtonLink } from '@/components/marketing/ButtonLink';
import { WidgetComplianceDisclaimer } from '@/components/marketing/pricing/WidgetComplianceDisclaimer';
import { WidgetFeatureGrid } from '@/components/marketing/widget/WidgetFeatureGrid';

export const metadata: Metadata = {
  title: 'Accessibility Widget',
  description:
    'Help visitors with disabilities use your website — font size, contrast, dyslexia tools, Hindi UI, and keyboard enhancements. Built for Indian sites.',
  openGraph: {
    title: 'Accessibility Widget | AccessibleNow',
    description:
      'A toolbar for visitors who need larger text, higher contrast, reading aids, or Hindi UI — one click, no login required.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://accessshield.in/widget',
  },
};

const INSTALL_STEPS = [
  {
    step: '01',
    title: 'Subscribe to Professional or Widget',
    description:
      'The widget is included with Professional plans, or available as a standalone Widget tier on our Services page.',
  },
  {
    step: '02',
    title: 'Copy your embed snippet',
    description:
      'After signup, open Dashboard → Settings → Widget to copy your unique token and one-line script tag.',
  },
  {
    step: '03',
    title: 'Paste before </body>',
    description:
      'Add the script to your site template. The launcher appears in seconds — isolated in Shadow DOM so styles never clash.',
  },
] as const;

export default function WidgetPage() {
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

  return (
    <>
      <header className="relative overflow-hidden border-b border-gray-200 bg-gradient-to-b from-primary-50 via-white to-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">
            The Widget
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:text-[3.25rem] lg:leading-tight">
            Help visitors with disabilities use your site
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary sm:text-xl">
            The AccessibleNow widget is a lightweight toolbar for people who need larger text,
            higher contrast, dyslexia-friendly fonts, Hindi UI, keyboard tools, or text-to-speech —
            one click, no login required.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-text-tertiary">
            <span lang="hi">सभी के लिए डिजिटल पहुँच</span> — accessibility for every visitor, on
            every page.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <ButtonLink href="/signup" size="lg" variant="primary" className="min-w-[240px]">
              Add the widget to my site
            </ButtonLink>
            <ButtonLink href="/services" size="lg" variant="secondary" className="min-w-[240px]">
              View pricing
            </ButtonLink>
          </div>
          <div className="mx-auto mt-8 max-w-2xl text-left">
            <WidgetComplianceDisclaimer />
          </div>
        </div>
      </header>

      <section
        aria-labelledby="widget-demo-heading"
        className="border-b border-gray-200 bg-gray-50 px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 id="widget-demo-heading" className="text-3xl font-bold text-text-primary">
                See it in action
              </h2>
              <p className="mt-4 text-base leading-normal text-text-secondary">
                This page loads the same widget your customers get. Look for the blue accessibility
                launcher at the bottom-right of your screen and open the panel to try every feature.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3 text-base text-text-secondary">
                  <MousePointerClick
                    className="mt-0.5 h-5 w-5 shrink-0 text-primary-600"
                    aria-hidden="true"
                  />
                  <span>One click opens the toolbar — no login required for visitors</span>
                </li>
                <li className="flex items-start gap-3 text-base text-text-secondary">
                  <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden="true" />
                  <span>Shadow DOM isolation — widget styles never leak into your site</span>
                </li>
                <li className="flex items-start gap-3 text-base text-text-secondary">
                  <Puzzle className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden="true" />
                  <span>Under 35KB gzipped — fast load on mobile networks across India</span>
                </li>
              </ul>
              <p className="mt-6 flex items-center gap-2 text-sm font-medium text-primary-700">
                <ArrowDown className="h-4 w-4 motion-safe:animate-bounce" aria-hidden="true" />
                Try the launcher below
              </p>
            </div>

            <div
              className="relative rounded-xl border-2 border-dashed border-primary-300 bg-white p-8 shadow-lg"
              role="img"
              aria-label="Illustration of the AccessibleNow widget launcher on a website"
            >
              <div className="rounded-lg border border-border bg-bg-secondary p-4">
                <div className="flex gap-2 border-b border-border pb-3">
                  <span className="h-3 w-3 rounded-full bg-red-400" aria-hidden="true" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" aria-hidden="true" />
                  <span className="h-3 w-3 rounded-full bg-green-500" aria-hidden="true" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-gray-200" aria-hidden="true" />
                  <div className="h-3 w-full rounded bg-gray-100" aria-hidden="true" />
                  <div className="h-3 w-5/6 rounded bg-gray-100" aria-hidden="true" />
                </div>
              </div>
              <div
                className="absolute bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-xl ring-4 ring-primary-100"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
                  <circle cx="12" cy="4" r="2" />
                  <path d="M12 7c-2.5 0-4.5 1.5-5.5 3.5L4 14h2.5l1-3h9l1 3H20l-2.5-3.5C16.5 8.5 14.5 7 12 7z" />
                  <path d="M8 16h8v5h-2v-3h-4v3H8v-5z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      <WidgetFeatureGrid />

      <section
        aria-labelledby="widget-install-heading"
        className="border-t border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <h2
            id="widget-install-heading"
            className="text-center text-3xl font-bold text-text-primary"
          >
            Add the widget in three steps
          </h2>
          <ol className="mt-12 space-y-8">
            {INSTALL_STEPS.map(({ step, title, description }) => (
              <li
                key={step}
                className="flex flex-col gap-4 rounded-xl border border-border bg-bg-secondary p-6 sm:flex-row sm:items-start sm:gap-6"
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white"
                  aria-hidden="true"
                >
                  {step}
                </span>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
                  <p className="mt-2 text-base leading-normal text-text-secondary">{description}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-center text-base text-text-secondary">
            Need help installing? See our{' '}
            <Link
              href="/docs"
              className="font-medium text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded"
            >
              documentation
            </Link>{' '}
            or{' '}
            <Link
              href="/contact"
              className="font-medium text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded"
            >
              contact support
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="bg-primary-900 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Accessibility shouldn&apos;t be an afterthought
          </h2>
          <p className="mt-6 text-lg leading-normal text-primary-100">
            Every visitor deserves a website they can actually use. The widget puts control in their
            hands — and signals that your brand takes inclusion seriously under RPwD and IS 17802.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <ButtonLink href="/signup" size="lg" variant="onDark" className="min-w-[220px]">
              Start free trial
            </ButtonLink>
            <ButtonAnchor
              href={calendlyUrl || '/contact'}
              size="lg"
              variant="onDark"
              className="min-w-[220px] border-2 border-white bg-transparent text-white hover:bg-white/10"
              {...(calendlyUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              Book a free consultation
            </ButtonAnchor>
          </div>
        </div>
      </section>
    </>
  );
}
