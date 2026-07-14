import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@accessshield/ui';
import { CTABanner } from '@/components/marketing/home/CTABanner';
import { FAQSection } from '@/components/marketing/pricing/FAQSection';
import { GuideCheckItem } from '@/components/marketing/guides/GuideCheckItem';
import { GuideSectionNav } from '@/components/marketing/guides/GuideSectionNav';
import { GuideStepList } from '@/components/marketing/guides/GuideStepList';
import { GovernmentGuideIllustration, GuidePageHero } from '@/components/marketing/visuals';

export const metadata: Metadata = {
  title: 'GIGW 3.0 — Guidelines for Indian Government Websites',
  description:
    'Plain-English guide to GIGW 3.0 — the Indian government website framework. Who must comply, conformance levels, and how GIGW relates to IS 17802 and WCAG.',
  alternates: { canonical: 'https://accessshield.in/gigw' },
};

const sections = [
  { id: 'what-is-heading', label: 'What is it' },
  { id: 'who-affected-heading', label: "Who's affected" },
  { id: 'requirements-heading', label: 'Requirements' },
  { id: 'standards-heading', label: 'Standards map' },
  { id: 'comply-heading', label: 'How to comply' },
  { id: 'faq-heading', label: 'FAQ' },
];

const faqs = [
  {
    question: 'Is GIGW 3.0 still the current version?',
    answer:
      'Yes. GIGW 3.0 (Guidelines for Indian Government Websites, version 3.0) is the active framework issued by the National Informatics Centre (NIC) under the Ministry of Electronics and Information Technology (MeitY). It supersedes earlier GIGW versions and aligns with Digital India accessibility goals.',
  },
  {
    question: 'What accessibility level does GIGW 3.0 require?',
    answer:
      'GIGW 3.0 mandates WCAG 2.0 Level A as the minimum accessibility conformance level for government websites. However, the RPwD Act and IS 17802 require a higher bar (WCAG 2.1 AA). Government sites should target IS 17802/WCAG 2.1 AA, not just the GIGW minimum.',
  },
  {
    question: 'Does GIGW apply to state government websites?',
    answer:
      'Yes. GIGW 3.0 applies to central government ministries, departments, and agencies. State governments are encouraged to adopt the same guidelines, and many states have issued circulars mandating GIGW compliance for their portals.',
  },
  {
    question: 'What is the difference between GIGW and IS 17802?',
    answer:
      'GIGW is a broad policy framework covering content, security, design, and accessibility for government websites. IS 17802 is the BIS technical standard specifically defining ICT accessibility requirements under the RPwD Act. GIGW references WCAG 2.0 Level A; IS 17802 requires WCAG 2.1 AA plus India-specific rules. IS 17802 is the higher technical bar.',
  },
  {
    question: 'Who audits GIGW compliance?',
    answer:
      'NIC conducts periodic quality assessments of government websites. Additionally, the Chief Commissioner for Persons with Disabilities can receive complaints under the RPwD Act. Internal audits using automated tools plus manual review are recommended before any official assessment.',
  },
  {
    question: 'Does GIGW cover mobile apps and PDFs?',
    answer:
      'GIGW 3.0 primarily addresses websites. Mobile apps and PDFs fall under IS 17802 and RPwD Act ICT provisions. Government departments with mobile apps or document portals must ensure those assets are accessible separately.',
  },
];

const complySteps = [
  {
    title: 'Register and classify your government website',
    description:
      'Ensure your site is registered with NIC, has a valid domain (.gov.in or approved subdomain), and is categorised correctly under the National Portal of India framework.',
  },
  {
    title: 'Meet GIGW content and design guidelines',
    description:
      'Follow GIGW requirements for homepage structure, navigation, copyright notices, Hindi/English bilingual content, and standard government branding elements.',
  },
  {
    title: 'Achieve WCAG 2.0 Level A minimum — then target IS 17802',
    description:
      'Run accessibility scans against WCAG 2.0 Level A for GIGW baseline, then remediate to WCAG 2.1 AA / IS 17802 for RPwD Act compliance. Do not stop at Level A.',
  },
  {
    title: 'Implement India-specific accessibility rules',
    description:
      'Hindi lang attributes, DD/MM/YYYY dates, ₹ formatting, keyboard navigation, screen reader compatibility, and accessible PDF alternatives per IS 17802.',
  },
  {
    title: 'Publish accessibility statement and grievance mechanism',
    description:
      'GIGW and RPwD both require a public accessibility statement with contact details for users to report barriers. Include conformance level claimed and known limitations.',
  },
];

export default function GIGWPage() {
  return (
    <>
      <GuidePageHero
        eyebrow="Government framework"
        title="GIGW 3.0 — Government Website Guidelines"
        description="The official framework for accessible, secure, and citizen-friendly Indian government websites"
        visual={<GovernmentGuideIllustration />}
        visualLabel="Indian government website guidelines"
        badges={
          <>
            <Badge variant="secondary" size="md">
              NIC / MeitY
            </Badge>
            <Badge variant="secondary" size="md">
              WCAG 2.0 Level A minimum
            </Badge>
            <Badge variant="secondary" size="md">
              Digital India
            </Badge>
            <Badge variant="secondary" size="md">
              .gov.in domains
            </Badge>
          </>
        }
      />

      <GuideSectionNav sections={sections} />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <section aria-labelledby="what-is-heading" className="scroll-mt-20">
          <h2 id="what-is-heading" className="text-3xl font-bold text-text-primary" tabIndex={-1}>
            What is GIGW 3.0?
          </h2>
          <div className="mt-6 space-y-4 text-base leading-normal text-text-secondary">
            <p>
              <strong>Guidelines for Indian Government Websites (GIGW) 3.0</strong> is the
              comprehensive policy framework published by the National Informatics Centre (NIC) for
              designing, developing, and maintaining government websites in India.
            </p>
            <p>
              GIGW covers far more than accessibility — it addresses content quality, security,
              privacy, open data, mobile responsiveness, and citizen engagement. However,{' '}
              <strong>accessibility is a mandatory component</strong>, requiring conformance with
              WCAG 2.0 Level A at minimum.
            </p>
            <p>
              GIGW 3.0 works alongside the{' '}
              <Link
                href="/rpwd-act"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                RPwD Act 2016
              </Link>{' '}
              and{' '}
              <Link
                href="/is-17802"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                IS 17802
              </Link>
              , which set a higher accessibility bar than GIGW&apos;s WCAG 2.0 Level A floor.
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
          <ul className="mt-6 space-y-4">
            <GuideCheckItem title="Central government ministries and departments">
              All websites under ministries of the Government of India — from MHA to MeitY to MoHFW.
            </GuideCheckItem>
            <GuideCheckItem title="Attached and subordinate offices">
              Autonomous bodies, PSUs, and agencies under central government administrative control
              with public-facing websites.
            </GuideCheckItem>
            <GuideCheckItem title="State and UT government portals">
              State government websites, district portals, and e-governance initiatives (adoption
              varies by state but is strongly encouraged).
            </GuideCheckItem>
            <GuideCheckItem title="Government contractors building websites">
              Vendors developing or maintaining government websites must deliver GIGW-compliant
              outputs as part of contract deliverables.
            </GuideCheckItem>
          </ul>
        </section>

        <section aria-labelledby="requirements-heading" className="mt-16 scroll-mt-20">
          <h2
            id="requirements-heading"
            className="text-3xl font-bold text-text-primary"
            tabIndex={-1}
          >
            Key GIGW 3.0 requirements
          </h2>
          <div className="mt-6 space-y-4 text-base leading-normal text-text-secondary">
            <p>GIGW 3.0 spans multiple domains. The accessibility-related requirements include:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>WCAG 2.0 Level A</strong> conformance for all government web content
              </li>
              <li>
                <strong>Bilingual content</strong> — Hindi and English as minimum; regional language
                support encouraged
              </li>
              <li>
                <strong>Text resizing</strong> — content must remain usable at 200% zoom without
                horizontal scrolling
              </li>
              <li>
                <strong>Keyboard accessibility</strong> — all functionality operable without a mouse
              </li>
              <li>
                <strong>Alternative text</strong> for informative images and charts
              </li>
              <li>
                <strong>Colour contrast</strong> meeting minimum ratios for text and UI components
              </li>
              <li>
                <strong>Accessible forms</strong> with visible labels and clear error messages
              </li>
              <li>
                <strong>Mobile responsiveness</strong> — sites must work on smartphones used by
                citizens in rural and urban India
              </li>
            </ul>
          </div>
        </section>

        <section aria-labelledby="standards-heading" className="mt-16 scroll-mt-20">
          <h2 id="standards-heading" className="text-3xl font-bold text-text-primary" tabIndex={-1}>
            GIGW vs IS 17802 vs WCAG — which to target?
          </h2>
          <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-text-primary">Standard</th>
                  <th className="px-4 py-3 font-semibold text-text-primary">Level</th>
                  <th className="px-4 py-3 font-semibold text-text-primary">Applies to</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-text-secondary">
                <tr>
                  <td className="px-4 py-3 font-medium text-text-primary">GIGW 3.0</td>
                  <td className="px-4 py-3">WCAG 2.0 Level A</td>
                  <td className="px-4 py-3">Government websites (policy)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-text-primary">
                    <Link href="/is-17802" className="text-primary-600 hover:text-primary-700">
                      IS 17802
                    </Link>
                  </td>
                  <td className="px-4 py-3">WCAG 2.1 AA + India rules</td>
                  <td className="px-4 py-3">All ICT under RPwD Act (legal)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-text-primary">
                    <Link href="/wcag-2-2-aa" className="text-primary-600 hover:text-primary-700">
                      WCAG 2.2 AA
                    </Link>
                  </td>
                  <td className="px-4 py-3">Latest international standard</td>
                  <td className="px-4 py-3">Global best practice</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-base leading-normal text-text-secondary">
            <strong>Recommendation:</strong> Government sites should meet GIGW 3.0 policy
            requirements while targeting IS 17802 / WCAG 2.1 AA as the actual accessibility
            conformance level. WCAG 2.2 AA is ideal for new projects.
          </p>
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
