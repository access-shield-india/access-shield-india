import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@accessshield/ui';
import { CTABanner } from '@/components/marketing/home/CTABanner';
import { FAQSection } from '@/components/marketing/pricing/FAQSection';
import { GuideCheckItem } from '@/components/marketing/guides/GuideCheckItem';
import { GuideSectionNav } from '@/components/marketing/guides/GuideSectionNav';
import { GuideStepList } from '@/components/marketing/guides/GuideStepList';
import { GuidePageHero, StandardsGuideIllustration } from '@/components/marketing/visuals';

export const metadata: Metadata = {
  title: 'WCAG 2.2 AA — Web Accessibility Guidelines Guide',
  description:
    'Plain-English guide to WCAG 2.2 Level AA — the international web accessibility standard. POUR principles, new criteria, conformance levels, and relevance for Indian businesses.',
  alternates: { canonical: 'https://accessshield.in/wcag-2-2-aa' },
};

const sections = [
  { id: 'what-is-heading', label: 'What is it' },
  { id: 'principles-heading', label: 'POUR' },
  { id: 'new-criteria-heading', label: "What's new" },
  { id: 'levels-heading', label: 'Levels' },
  { id: 'india-context-heading', label: 'India context' },
  { id: 'comply-heading', label: 'How to comply' },
  { id: 'faq-heading', label: 'FAQ' },
];

const faqs = [
  {
    question: 'What does WCAG stand for?',
    answer:
      'Web Content Accessibility Guidelines — published by the World Wide Web Consortium (W3C) Web Accessibility Initiative (WAI). WCAG is the most widely adopted international standard for making web content accessible to people with disabilities.',
  },
  {
    question: 'Why Level AA and not Level A or AAA?',
    answer:
      'Level A covers the minimum basics but leaves significant barriers. Level AAA is the highest standard but often impractical for entire sites. Level AA is the global legal benchmark — referenced by SEBI, EU accessibility laws, US Section 508 updates, and Indian IS 17802. It balances thoroughness with achievability.',
  },
  {
    question: 'What is new in WCAG 2.2 compared to 2.1?',
    answer:
      'WCAG 2.2 adds 9 new success criteria focused on mobile/touch (target size minimum 24×24px), cognitive accessibility (consistent help, redundant entry), and authentication (accessible alternatives to cognitive function tests like CAPTCHAs). All 2.1 criteria remain — 2.2 is additive.',
  },
  {
    question: 'Is WCAG 2.2 AA legally required in India?',
    answer:
      'WCAG 2.2 AA is not explicitly named in Indian law. IS 17802 (WCAG 2.1 AA base) is the legal technical standard under RPwD Act. SEBI requires WCAG 2.1 AA. However, adopting WCAG 2.2 AA exceeds both requirements and is considered global best practice — AccessShield scans against WCAG 2.2 by default.',
  },
  {
    question: 'How many success criteria are in WCAG 2.2 AA?',
    answer:
      'WCAG 2.2 Level AA includes all Level A criteria (30), all Level AA criteria (20 additional), plus 9 new 2.2 criteria — totalling 50+ testable success criteria across perceivable, operable, understandable, and robust categories.',
  },
  {
    question: 'Can automated tools test all WCAG 2.2 AA criteria?',
    answer:
      'No. Research consistently shows automated tools detect 30–50% of WCAG issues by count, covering roughly 70–80% of common violations. Manual testing with keyboard navigation, screen readers, and cognitive walkthroughs is essential for full conformance.',
  },
];

const complySteps = [
  {
    title: 'Understand the four POUR principles',
    description:
      'Perceivable (users can see/hear content), Operable (users can navigate and interact), Understandable (content and UI are clear), Robust (works with assistive technologies). Every success criterion maps to one of these.',
  },
  {
    title: 'Run an automated WCAG 2.2 AA scan',
    description:
      'Use axe-core or AccessShield to identify violations across all pages. Prioritise templates and high-traffic flows — homepage, login, checkout, forms, and account management.',
  },
  {
    title: 'Conduct manual assistive technology testing',
    description:
      'Test keyboard-only navigation (Tab, Enter, Escape, arrow keys), screen readers (NVDA + Chrome, VoiceOver + Safari), and 200% zoom reflow on mobile and desktop.',
  },
  {
    title: 'Fix critical and serious issues first',
    description:
      'Address blocking barriers: missing form labels, keyboard traps, images without alt text, insufficient colour contrast (4.5:1 normal text, 3:1 large text/UI), and content that relies on colour alone.',
  },
  {
    title: 'Document conformance and maintain ongoing monitoring',
    description:
      'Publish an accessibility statement declaring your target level (WCAG 2.2 AA), known exceptions, and contact for feedback. Re-scan after every major release.',
  },
];

export default function WCAG22Page() {
  return (
    <>
      <GuidePageHero
        eyebrow="International standard"
        title="WCAG 2.2 Level AA"
        description="The global benchmark for accessible web content — and what Indian businesses need to know"
        visual={<StandardsGuideIllustration />}
        visualLabel="WCAG 2.2 accessibility guidelines"
        badges={
          <>
            <Badge variant="secondary" size="md">
              W3C WAI
            </Badge>
            <Badge variant="secondary" size="md">
              Published Oct 2023
            </Badge>
            <Badge variant="secondary" size="md">
              50+ AA criteria
            </Badge>
            <Badge variant="secondary" size="md">
              POUR framework
            </Badge>
          </>
        }
      />

      <GuideSectionNav sections={sections} />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <section aria-labelledby="what-is-heading" className="scroll-mt-20">
          <h2 id="what-is-heading" className="text-3xl font-bold text-text-primary" tabIndex={-1}>
            What is WCAG 2.2?
          </h2>
          <div className="mt-6 space-y-4 text-base leading-normal text-text-secondary">
            <p>
              The <strong>Web Content Accessibility Guidelines (WCAG) 2.2</strong> are the latest
              version of the W3C&apos;s international standard for accessible web content. Published
              in October 2023, WCAG 2.2 builds on 2.1 and 2.0 without removing any existing
              criteria.
            </p>
            <p>
              WCAG defines <strong>success criteria</strong> — specific, testable requirements
              organised under four principles. Conformance is measured at three levels: A (minimum),{' '}
              <strong>AA (the legal benchmark)</strong>, and AAA (enhanced).
            </p>
            <p>
              AccessShield scans every customer website against WCAG 2.2 AA by default, alongside
              India-specific{' '}
              <Link
                href="/is-17802"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                IS 17802
              </Link>{' '}
              rules.
            </p>
          </div>
        </section>

        <section aria-labelledby="principles-heading" className="mt-16 scroll-mt-20">
          <h2
            id="principles-heading"
            className="text-3xl font-bold text-text-primary"
            tabIndex={-1}
          >
            The four POUR principles
          </h2>
          <ul className="mt-6 space-y-4">
            <GuideCheckItem title="Perceivable — information must be presentable to users">
              Provide text alternatives for images, captions for video, sufficient colour contrast
              (4.5:1 for normal text), and content that reflows at 200% zoom without horizontal
              scrolling.
            </GuideCheckItem>
            <GuideCheckItem title="Operable — interface must be usable">
              All functionality available via keyboard, no keyboard traps, enough time to read and
              interact, no content that flashes more than 3 times per second, clear focus
              indicators, and descriptive page titles.
            </GuideCheckItem>
            <GuideCheckItem title="Understandable — content and operation must be clear">
              Readable text (lang attribute), predictable navigation, input assistance with visible
              labels and helpful error messages, and consistent identification of UI components.
            </GuideCheckItem>
            <GuideCheckItem title="Robust — content must work with assistive tech">
              Valid HTML, proper ARIA roles where needed, name/role/value exposed to screen readers,
              and compatibility with current and future user agents.
            </GuideCheckItem>
          </ul>
        </section>

        <section aria-labelledby="new-criteria-heading" className="mt-16 scroll-mt-20">
          <h2
            id="new-criteria-heading"
            className="text-3xl font-bold text-text-primary"
            tabIndex={-1}
          >
            What&apos;s new in WCAG 2.2
          </h2>
          <div className="mt-6 space-y-4 text-base leading-normal text-text-secondary">
            <p>WCAG 2.2 adds nine success criteria. Key additions at Level AA:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>2.4.11 Focus Not Obscured (Minimum):</strong> Focused elements must not be
                fully hidden by sticky headers, cookie banners, or modals
              </li>
              <li>
                <strong>2.5.7 Dragging Movements:</strong> Provide a single-pointer alternative to
                drag-and-drop interactions
              </li>
              <li>
                <strong>2.5.8 Target Size (Minimum):</strong> Interactive targets at least 24×24 CSS
                pixels (AccessShield enforces 44×44px per IS 17802 touch guidance)
              </li>
              <li>
                <strong>3.2.6 Consistent Help:</strong> Help mechanisms appear in the same relative
                location across pages
              </li>
              <li>
                <strong>3.3.7 Redundant Entry:</strong> Auto-fill or allow users to confirm
                previously entered information
              </li>
              <li>
                <strong>3.3.8 Accessible Authentication (Minimum):</strong> No cognitive function
                tests (CAPTCHAs) without an accessible alternative
              </li>
            </ul>
          </div>
        </section>

        <section aria-labelledby="levels-heading" className="mt-16 scroll-mt-20">
          <h2 id="levels-heading" className="text-3xl font-bold text-text-primary" tabIndex={-1}>
            Conformance levels explained
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-text-primary">Level A</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Minimum. Removes the worst barriers but significant issues remain. GIGW 3.0
                government minimum.
              </p>
            </div>
            <div className="rounded-lg border-2 border-primary-600 bg-primary-50 p-5">
              <h3 className="text-lg font-semibold text-primary-900">Level AA ★</h3>
              <p className="mt-2 text-sm text-primary-900">
                Legal benchmark globally. Required by SEBI, IS 17802, EU laws, and most enterprise
                procurement. Target this.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-text-primary">Level AAA</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Highest level. Often impractical for entire sites. Adopt for specific high-impact
                pages if needed.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="india-context-heading" className="mt-16 scroll-mt-20">
          <h2
            id="india-context-heading"
            className="text-3xl font-bold text-text-primary"
            tabIndex={-1}
          >
            WCAG in the Indian legal context
          </h2>
          <div className="mt-6 space-y-4 text-base leading-normal text-text-secondary">
            <p>Indian law references WCAG indirectly through layered standards:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <Link href="/rpwd-act" className="text-primary-600 hover:text-primary-700">
                  RPwD Act 2016
                </Link>{' '}
                — mandates accessible ICT (the law)
              </li>
              <li>
                <Link href="/is-17802" className="text-primary-600 hover:text-primary-700">
                  IS 17802
                </Link>{' '}
                — BIS standard based on WCAG 2.1 AA + India rules (the technical spec)
              </li>
              <li>
                <Link href="/gigw" className="text-primary-600 hover:text-primary-700">
                  GIGW 3.0
                </Link>{' '}
                — government policy requiring WCAG 2.0 Level A minimum
              </li>
              <li>
                <Link
                  href="/sebi-accessibility"
                  className="text-primary-600 hover:text-primary-700"
                >
                  SEBI 2024 circular
                </Link>{' '}
                — requires WCAG 2.1 AA for listed companies by April 2026
              </li>
            </ul>
            <p>
              Adopting <strong>WCAG 2.2 AA</strong> satisfies all of the above and future-proofs
              your digital properties as standards evolve.
            </p>
          </div>
        </section>

        <section aria-labelledby="comply-heading" className="mt-16 scroll-mt-20">
          <h2 id="comply-heading" className="text-3xl font-bold text-text-primary" tabIndex={-1}>
            How to comply — step by step
          </h2>
          <div className="mt-6">
            <GuideStepList steps={complySteps} />
          </div>
        </section>

        <section id="faq-heading" aria-labelledby="faq-heading" className="mt-16 scroll-mt-20">
          <FAQSection items={faqs} />
        </section>
      </div>

      <CTABanner />
    </>
  );
}
