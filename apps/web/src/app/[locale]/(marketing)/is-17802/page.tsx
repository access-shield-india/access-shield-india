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
  title: 'IS 17802 — Indian ICT Accessibility Standard Guide',
  description:
    "Plain-English guide to IS 17802:2020 — India's BIS standard for digital accessibility under the RPwD Act. Who must comply, India-specific rules, and how to get started.",
  alternates: { canonical: 'https://accessshield.in/is-17802' },
};

const sections = [
  { id: 'what-is-heading', label: 'What is it' },
  { id: 'who-affected-heading', label: "Who's affected" },
  { id: 'requirements-heading', label: 'Key requirements' },
  { id: 'wcag-relationship-heading', label: 'WCAG link' },
  { id: 'comply-heading', label: 'How to comply' },
  { id: 'faq-heading', label: 'FAQ' },
];

const faqs = [
  {
    question: 'Is IS 17802 legally mandatory?',
    answer:
      'IS 17802 is the technical standard referenced under the RPwD Act 2016 for ICT accessibility. Government websites and public sector digital services are directly mandated. Private sector entities in regulated industries (SEBI, healthcare, education) and government vendors increasingly must demonstrate IS 17802 or equivalent conformance.',
  },
  {
    question: 'What is the difference between IS 17802 and WCAG 2.2 AA?',
    answer:
      'IS 17802:2020 is built on WCAG 2.1 Level AA and adds India-specific requirements — Indian language support, DD/MM/YYYY dates, rupee formatting, and local UX conventions. WCAG 2.2 AA includes additional success criteria (e.g. target size, consistent help) beyond IS 17802. Meeting WCAG 2.2 AA generally exceeds IS 17802 baseline requirements.',
  },
  {
    question: 'Does IS 17802 apply to mobile apps?',
    answer:
      'Yes. IS 17802 covers websites, web applications, mobile apps (Android and iOS), PDFs, and other digital documents. Mobile-specific criteria include touch target sizes, orientation support, and screen reader compatibility.',
  },
  {
    question: 'Who publishes and maintains IS 17802?',
    answer:
      'The Bureau of Indian Standards (BIS) publishes IS 17802. It was notified in 2021 and aligns with the RPwD Act 2016 mandate for accessible ICT. DEPwD (Department of Empowerment of Persons with Disabilities) coordinates policy implementation.',
  },
  {
    question: 'Can automated tools verify IS 17802 compliance?',
    answer:
      'Automated tools like axe-core can detect roughly 70–80% of WCAG/IS 17802 issues. India-specific rules (language attributes, date formats, rupee display) and manual checks (keyboard navigation, screen reader testing) are still required for a complete assessment.',
  },
  {
    question: 'How does IS 17802 relate to GIGW 3.0?',
    answer:
      'GIGW 3.0 (Guidelines for Indian Government Websites) is a policy framework for government sites that references WCAG 2.0 Level A as a minimum. IS 17802 is the newer BIS technical standard (WCAG 2.1 AA base) and represents the higher bar under RPwD Act. Government sites should target IS 17802, not just GIGW minimums.',
  },
];

const complySteps = [
  {
    title: 'Run an IS 17802 + WCAG 2.2 baseline scan',
    description:
      'Use automated scanning to identify violations across perceivable, operable, understandable, and robust criteria. AccessShield maps findings to both IS 17802 custom rules and WCAG 2.2 success criteria.',
  },
  {
    title: 'Validate India-specific rules manually',
    description:
      'Check lang attributes for Hindi and regional content, DD/MM/YYYY date inputs, ₹ rupee formatting, Indian phone number patterns (+91), and Unicode rendering for Devanagari and other scripts.',
  },
  {
    title: 'Test with assistive technology',
    description:
      'Verify keyboard-only navigation, screen reader compatibility (NVDA/JAWS on desktop, TalkBack/VoiceOver on mobile), and focus order in multilingual interfaces.',
  },
  {
    title: 'Remediate by severity — critical first',
    description:
      'Fix blocking issues first: missing labels, keyboard traps, insufficient contrast on primary content, images without alt text, and forms that cannot be completed without a mouse.',
  },
  {
    title: 'Document conformance and publish an accessibility statement',
    description:
      'Record your audit methodology, known limitations, remediation timeline, and a grievance contact. Required for government portals and increasingly expected in private sector tenders.',
  },
];

export default function IS17802Page() {
  return (
    <>
      <GuidePageHero
        eyebrow="Technical standard"
        title="IS 17802 — Indian ICT Accessibility"
        description="India's national standard for accessible websites, apps, and digital documents"
        visual={<StandardsGuideIllustration />}
        visualLabel="IS 17802 accessibility standards overview"
        badges={
          <>
            <Badge variant="secondary" size="md">
              BIS IS 17802:2020
            </Badge>
            <Badge variant="secondary" size="md">
              Based on WCAG 2.1 AA
            </Badge>
            <Badge variant="secondary" size="md">
              RPwD Act aligned
            </Badge>
            <Badge variant="secondary" size="md">
              22 Indian languages
            </Badge>
          </>
        }
      />

      <GuideSectionNav sections={sections} />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <section aria-labelledby="what-is-heading" className="scroll-mt-20">
          <h2 id="what-is-heading" className="text-3xl font-bold text-text-primary" tabIndex={-1}>
            What is IS 17802?
          </h2>
          <div className="mt-6 space-y-4 text-base leading-normal text-text-secondary">
            <p>
              <strong>IS 17802:2020</strong> is the Bureau of Indian Standards (BIS) specification
              for accessibility of information and communication technology (ICT). It translates the
              RPwD Act&apos;s digital accessibility mandate into concrete, testable technical
              requirements for websites, mobile applications, and electronic documents.
            </p>
            <p>
              Unlike generic international guidelines, IS 17802 incorporates{' '}
              <strong>India-specific requirements</strong> — support for scheduled Indian languages,
              local date and currency conventions, and accessibility patterns relevant to government
              and public service delivery in India.
            </p>
            <p>
              The standard adopts <strong>WCAG 2.1 Level AA</strong> as its international
              foundation, then extends it with national provisions. Organisations targeting global
              best practice often aim for{' '}
              <Link
                href="/wcag-2-2-aa"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                WCAG 2.2 AA
              </Link>
              , which exceeds the IS 17802 baseline.
            </p>
          </div>
        </section>

        <section aria-labelledby="who-affected-heading" className="mt-16 scroll-mt-20">
          <h2
            id="who-affected-heading"
            className="text-3xl font-bold text-text-primary"
            tabIndex={-1}
          >
            Who must comply?
          </h2>
          <p className="mt-6 text-base leading-normal text-text-secondary">
            IS 17802 applies wherever the RPwD Act mandates accessible ICT — and that scope is
            expanding across the Indian digital economy.
          </p>
          <ul className="mt-6 space-y-4">
            <GuideCheckItem title="Central and state government websites">
              All e-governance portals, ministry websites, and public service delivery platforms
              under{' '}
              <Link href="/gigw" className="text-primary-600 hover:text-primary-700">
                GIGW 3.0
              </Link>{' '}
              and Digital India initiatives.
            </GuideCheckItem>
            <GuideCheckItem title="Government vendors and contractors">
              Companies bidding for government ICT projects increasingly must demonstrate IS 17802
              conformance as a tender qualification criterion.
            </GuideCheckItem>
            <GuideCheckItem title="BFSI and regulated sectors">
              SEBI-regulated entities must meet WCAG 2.1 AA (see our{' '}
              <Link href="/sebi-accessibility" className="text-primary-600 hover:text-primary-700">
                SEBI guide
              </Link>
              ), which aligns closely with IS 17802 requirements.
            </GuideCheckItem>
            <GuideCheckItem title="Healthcare, education, and public utilities">
              Digital health platforms, university portals, and utility customer interfaces serving
              the public must be accessible under the broader RPwD framework.
            </GuideCheckItem>
            <GuideCheckItem title="Private sector (recommended)">
              While not universally mandated today, IS 17802 conformance reduces legal risk,
              improves UX for 2.68 crore+ persons with disabilities in India, and strengthens brand
              trust.
            </GuideCheckItem>
          </ul>
        </section>

        <section aria-labelledby="requirements-heading" className="mt-16 scroll-mt-20">
          <h2
            id="requirements-heading"
            className="text-3xl font-bold text-text-primary"
            tabIndex={-1}
          >
            Key India-specific requirements
          </h2>
          <div className="mt-6 space-y-4 text-base leading-normal text-text-secondary">
            <p>
              Beyond standard WCAG criteria, IS 17802 and AccessShield&apos;s custom IS rules
              enforce these India-specific provisions:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Language (IS-001):</strong> Valid BCP 47 lang codes — hi, bn, te, ta, gu,
                kn, ml, and other scheduled languages; never ASCII transliteration for Hindi
              </li>
              <li>
                <strong>Date format (IS-004):</strong> DD/MM/YYYY display and input — not US-style
                MM/DD/YYYY
              </li>
              <li>
                <strong>Phone numbers (IS-005):</strong> Indian format (+91 10-digit mobile numbers)
              </li>
              <li>
                <strong>Currency (IS-006):</strong> ₹ rupee symbol with Indian numbering (lakhs and
                crores)
              </li>
              <li>
                <strong>Session timeouts (IS-007):</strong> Government/public services — minimum
                20-minute sessions with 2-minute warning
              </li>
              <li>
                <strong>PDF alternatives (IS-008):</strong> Accessible HTML version linked near
                every PDF download
              </li>
              <li>
                <strong>Error messages (IS-009):</strong> User-friendly messages only — no stack
                traces or system internals exposed
              </li>
            </ul>
          </div>
        </section>

        <section aria-labelledby="wcag-relationship-heading" className="mt-16 scroll-mt-20">
          <h2
            id="wcag-relationship-heading"
            className="text-3xl font-bold text-text-primary"
            tabIndex={-1}
          >
            How IS 17802 relates to WCAG
          </h2>
          <div className="mt-6 space-y-4 text-base leading-normal text-text-secondary">
            <p>
              Think of it as three layers: <strong>WCAG 2.2 AA</strong> (international best
              practice) → <strong>IS 17802</strong> (India&apos;s legal technical standard, WCAG 2.1
              AA + local rules) → <strong>RPwD Act</strong> (the law that mandates it).
            </p>
            <p>
              If you conform to WCAG 2.2 Level AA and implement India-specific IS rules, you exceed
              IS 17802 requirements. AccessShield scans against all three layers in a single pass.
            </p>
            <p>
              Read our{' '}
              <Link
                href="/wcag-2-2-aa"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                WCAG 2.2 AA guide
              </Link>{' '}
              for the international standard, and the{' '}
              <Link
                href="/rpwd-act"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                RPwD Act guide
              </Link>{' '}
              for the legal framework.
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
