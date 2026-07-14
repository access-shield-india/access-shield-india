import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@accessshield/ui';
import { SectionNav } from '@/components/marketing/rpwd/SectionNav';
import { PenaltyCard } from '@/components/marketing/rpwd/PenaltyCard';
import { CTABanner } from '@/components/marketing/home/CTABanner';
import { FAQSection } from '@/components/marketing/pricing/FAQSection';
import { GuidePageHero, LegalGuideIllustration } from '@/components/marketing/visuals';

export const metadata: Metadata = {
  title: 'RPwD Act 2016 — Digital Accessibility Guide',
  description:
    'Plain-English guide to the Rights of Persons with Disabilities Act 2016 for Indian businesses. Learn who must comply, what the penalties are, and how to get started.',
};

const rpwdFaqs = [
  {
    question: 'Does the RPwD Act apply to private companies?',
    answer:
      'The Act primarily targets government and public sector organisations under Sections 40-46. However, private companies increasingly face compliance requirements when bidding for government contracts, operating in regulated sectors (SEBI, healthcare, education), or serving public-facing digital services. The 2024 SEBI circular extended requirements to all SEBI-regulated entities.',
  },
  {
    question: 'What counts as "ICT" under the Act?',
    answer:
      'Information and Communication Technology (ICT) includes websites, web applications, mobile applications (Android and iOS), digital documents (PDFs, Word), kiosks, ATMs, and any digital interface used to deliver services or information. Essentially, if a person with a disability interacts with it digitally, it is covered.',
  },
  {
    question: 'Is WCAG 2.2 AA legally required, or just IS 17802?',
    answer:
      'IS 17802 is the official BIS standard implementing the Act. IS 17802 itself is built on WCAG 2.1 Level AA with India-specific additions. WCAG 2.2 AA is not explicitly named in the Act, but following WCAG 2.2 AA exceeds IS 17802 requirements and is considered best practice. Most government and SEBI guidelines now reference WCAG 2.1 or 2.2 AA directly.',
  },
  {
    question: 'What is the difference between RPwD Act compliance and SEBI compliance?',
    answer:
      'The RPwD Act is the overarching disability rights law applying broadly to government and certain sectors. SEBI compliance refers specifically to the 2024 SEBI circular requiring all SEBI-regulated entities (stock brokers, AMCs, depositories, etc.) to audit their digital platforms for WCAG 2.1 AA by April 2026. SEBI compliance is a subset enforcement of the broader RPwD Act framework.',
  },
  {
    question: 'Can I be sued under the RPwD Act for an inaccessible website?',
    answer:
      'While the Act does not create a private right of action like the US ADA, individuals can file complaints with the Chief Commissioner for Persons with Disabilities or State Commissioners. These bodies have quasi-judicial powers to issue orders, impose penalties, and mandate remediation. Non-compliance can result in fines, tender disqualification, and reputational harm.',
  },
  {
    question: 'How often do I need to re-audit my website?',
    answer:
      'Best practice is an annual comprehensive audit, with continuous monitoring for major content or design changes. The SEBI circular explicitly requires annual re-assessment. Government vendors are often required to certify accessibility on each new project or major release.',
  },
  {
    question: 'Does the Act apply to mobile apps too?',
    answer:
      'Yes. Mobile applications (both Android and iOS) are considered ICT under the Act and must meet IS 17802 requirements, which incorporate WCAG 2.1 Level AA mobile-specific success criteria. This includes touch target sizes, orientation support, and screen reader compatibility.',
  },
  {
    question: 'What is DEPwD and what is its role?',
    answer:
      'The Department of Empowerment of Persons with Disabilities (DEPwD) under the Ministry of Social Justice and Empowerment is the central authority responsible for implementing the RPwD Act. DEPwD issues policy guidance, coordinates with sector regulators (SEBI, RBI, etc.), and oversees the Chief Commissioner for Persons with Disabilities who adjudicates complaints.',
  },
];

export default function RPwDActPage() {
  return (
    <>
      <GuidePageHero
        eyebrow="Legal guide"
        title="Rights of Persons with Disabilities Act, 2016"
        description="Plain-English guide for Indian businesses and website owners"
        visual={<LegalGuideIllustration />}
        visualLabel="RPwD Act 2016 legal framework"
        badges={
          <>
            <Badge variant="secondary" size="md">
              Act No. 49 of 2016
            </Badge>
            <Badge variant="secondary" size="md">
              Gazette: 28 Dec 2016
            </Badge>
            <Badge variant="secondary" size="md">
              21 disabilities recognised
            </Badge>
            <Badge variant="secondary" size="md">
              Enforced by DEPwD
            </Badge>
          </>
        }
      />

      <SectionNav />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <section aria-labelledby="what-is-heading" className="scroll-mt-20">
          <h2 id="what-is-heading" className="text-3xl font-bold text-text-primary" tabIndex={-1}>
            What is the RPwD Act?
          </h2>
          <div className="mt-6 space-y-4 text-base leading-normal text-text-secondary">
            <p>
              The Rights of Persons with Disabilities Act, 2016 (RPwD Act) is India&apos;s primary
              disability rights legislation. It replaced the outdated Persons with Disabilities
              (Equal Opportunities, Protection of Rights and Full Participation) Act, 1995, marking
              a significant step forward in recognising and protecting the rights of persons with
              disabilities.
            </p>
            <p>
              The Act recognises <strong>21 types of disabilities</strong> (up from 7 in the 1995
              Act), including blindness, low vision, hearing impairment, speech and language
              disabilities, intellectual disabilities, autism spectrum disorder, cerebral palsy,
              muscular dystrophy, chronic neurological conditions, and multiple disabilities among
              others.
            </p>
            <p>
              <strong>Sections 40-46</strong> of the Act specifically mandate accessibility of
              Information and Communication Technology (ICT). This means all government websites,
              public sector digital services, and increasingly private sector digital platforms must
              be accessible to persons with disabilities. The Act emphasises universal design,
              reasonable accommodation, and non-discrimination in digital access.
            </p>
          </div>
        </section>

        <section aria-labelledby="who-affected-heading" className="mt-16 scroll-mt-20">
          <h2
            id="who-affected-heading"
            className="text-3xl font-bold text-text-primary"
            tabIndex={-1}
          >
            Who is affected?
          </h2>
          <div className="mt-6 space-y-4 text-base leading-normal text-text-secondary">
            <p>
              Sections 40-46 of the RPwD Act apply directly to government and public sector
              organisations. However, the compliance net is widening rapidly across private sector
              entities through sectoral regulations and practical business requirements.
            </p>
          </div>
          <ul className="mt-6 space-y-4">
            <li className="flex items-start gap-3">
              <svg
                className="mt-1 h-6 w-6 shrink-0 text-primary-600"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <strong className="text-text-primary">Government websites and portals</strong>
                <p className="mt-1 text-text-secondary">
                  Central and state government websites, e-governance portals, digital India
                  initiatives, and public service delivery platforms must meet IS 17802
                  requirements.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="mt-1 h-6 w-6 shrink-0 text-primary-600"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <strong className="text-text-primary">
                  SEBI-regulated entities (stock brokers, AMCs, depositories)
                </strong>
                <p className="mt-1 text-text-secondary">
                  The 2024 SEBI circular mandates WCAG 2.1 AA compliance for all digital platforms
                  by April 2026, with annual audits by IAAP-certified professionals.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="mt-1 h-6 w-6 shrink-0 text-primary-600"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <strong className="text-text-primary">Healthcare and telemedicine platforms</strong>
                <p className="mt-1 text-text-secondary">
                  Digital health services, hospital portals, and telemedicine apps must be
                  accessible to persons with disabilities as part of the right to health under the
                  Act.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="mt-1 h-6 w-6 shrink-0 text-primary-600"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <strong className="text-text-primary">Education portals and e-learning</strong>
                <p className="mt-1 text-text-secondary">
                  Universities, schools, and online education platforms must provide accessible
                  digital learning materials and interfaces.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="mt-1 h-6 w-6 shrink-0 text-primary-600"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <strong className="text-text-primary">
                  Private companies bidding for government tenders
                </strong>
                <p className="mt-1 text-text-secondary">
                  Accessibility compliance is increasingly a mandatory criterion in government
                  procurement processes. Non-compliance can disqualify bids.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="mt-1 h-6 w-6 shrink-0 text-primary-600"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <strong className="text-text-primary">E-commerce and consumer-facing apps</strong>
                <p className="mt-1 text-text-secondary">
                  While not yet explicitly mandated for all private sector websites, e-commerce
                  platforms and consumer apps face increasing pressure from advocacy groups, legal
                  complaints, and brand reputation considerations to be accessible.
                </p>
              </div>
            </li>
          </ul>
        </section>

        <section aria-labelledby="penalties-heading" className="mt-16 scroll-mt-20">
          <h2 id="penalties-heading" className="text-3xl font-bold text-text-primary" tabIndex={-1}>
            What are the penalties?
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PenaltyCard title="First offence" amount="₹10,000–25,000" />
            <PenaltyCard title="Subsequent offences" amount="₹50,000–5,00,000" />
          </div>
          <div className="mt-6 space-y-4 text-base leading-normal text-text-secondary">
            <p>
              These monetary penalties are outlined in <strong>Section 92</strong> of the RPwD Act.
              However, the real consequences of non-compliance extend far beyond fines:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Tender disqualification:</strong> Many government contracts now require
                accessibility certification, and failure to comply can automatically disqualify your
                bid.
              </li>
              <li>
                <strong>Tribunal-ordered remediation:</strong> The Chief Commissioner for Persons
                with Disabilities can issue binding orders to fix accessibility issues within a
                specified timeframe.
              </li>
              <li>
                <strong>Reputational impact:</strong> Public complaints and media coverage of
                accessibility failures can significantly damage brand reputation, especially for
                consumer-facing organisations.
              </li>
              <li>
                <strong>SEBI enforcement actions:</strong> For SEBI-regulated entities, failure to
                meet the 2024 circular deadline can result in additional regulatory penalties and
                scrutiny.
              </li>
            </ul>
            <p>
              Individuals can file complaints with the <strong>Chief Commissioner</strong> or{' '}
              <strong>State Commissioners for Persons with Disabilities</strong>. These
              quasi-judicial bodies have the power to summon evidence, examine witnesses, and issue
              binding orders. The complaint process is relatively accessible and does not require
              extensive legal representation, making enforcement increasingly practical.
            </p>
          </div>
        </section>

        <section aria-labelledby="is17802-heading" className="mt-16 scroll-mt-20">
          <h2 id="is17802-heading" className="text-3xl font-bold text-text-primary" tabIndex={-1}>
            IS 17802 — the technical standard
          </h2>
          <div className="mt-6 space-y-4 text-base leading-normal text-text-secondary">
            <p>
              <strong>IS 17802:2020</strong> is the Bureau of Indian Standards (BIS) technical
              specification that implements the RPwD Act&apos;s digital accessibility mandate. It
              defines the specific technical requirements that websites, mobile apps, and digital
              documents must meet to be considered accessible under Indian law.
            </p>
            <p>
              IS 17802 is built on the international <strong>WCAG 2.1 Level AA</strong> standard but
              adds India-specific requirements that reflect local context and needs:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                Support for <strong>Indian languages</strong> including Hindi, Bengali, Tamil,
                Telugu, and other scheduled languages with proper Unicode rendering
              </li>
              <li>
                <strong>DD/MM/YYYY date format</strong> requirements (Indian standard, not US-style
                MM/DD/YYYY)
              </li>
              <li>
                <strong>₹ rupee symbol</strong> and Indian numbering format (lakhs and crores)
                requirements for financial content
              </li>
              <li>
                Enhanced requirements for <strong>keyboard navigation</strong> in multilingual
                contexts
              </li>
              <li>
                Specific guidance on <strong>CAPTCHA alternatives</strong> and form validation in
                Indic scripts
              </li>
            </ul>
            <p>
              Following IS 17802 ensures you meet the legal baseline. However, many organisations
              also adopt <strong>WCAG 2.2 Level AA</strong> (the latest version) which includes
              additional success criteria like target size minimums and consistent help mechanisms
              that exceed IS 17802 requirements and represent global best practice.
            </p>
            <p>
              <Link
                href="/is-17802"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Read our full IS 17802 guide →
              </Link>
              {' · '}
              <Link
                href="/wcag-2-2-aa"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                WCAG 2.2 AA guide →
              </Link>
            </p>
          </div>
        </section>

        <section aria-labelledby="comply-heading" className="mt-16 scroll-mt-20">
          <h2 id="comply-heading" className="text-3xl font-bold text-text-primary" tabIndex={-1}>
            How to comply — step by step
          </h2>
          <ol className="mt-6 space-y-6">
            <li className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
                1
              </span>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  Audit your current digital properties against WCAG 2.2 AA and IS 17802
                </h3>
                <p className="mt-2 text-base leading-normal text-text-secondary">
                  Conduct a comprehensive accessibility assessment of your website, mobile apps, and
                  digital documents. Use automated tools like axe-core for quick scans, but also
                  include manual testing with screen readers and keyboard-only navigation.
                  AccessShield provides AI-powered audits that combine automated detection with
                  contextual analysis.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
                2
              </span>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  Prioritise and remediate critical and serious violations first
                </h3>
                <p className="mt-2 text-base leading-normal text-text-secondary">
                  Not all accessibility issues have equal impact. Focus first on critical barriers
                  that completely block access for users with disabilities: missing alt text on
                  informative images, keyboard traps, form inputs without labels, insufficient
                  colour contrast on primary content. These are often quick wins that dramatically
                  improve accessibility.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
                3
              </span>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  Document your compliance process and known limitations
                </h3>
                <p className="mt-2 text-base leading-normal text-text-secondary">
                  Maintain records of your accessibility audit, remediation efforts, testing
                  results, and any third-party content or legacy systems that have known
                  accessibility issues. This documentation demonstrates good-faith effort and is
                  essential if you face a complaint.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
                4
              </span>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  Publish an accessibility statement with grievance contact details
                </h3>
                <p className="mt-2 text-base leading-normal text-text-secondary">
                  Your accessibility statement should: declare your commitment to accessibility,
                  specify which standard you conform to (e.g., &ldquo;WCAG 2.1 AA&rdquo; or
                  &ldquo;IS 17802&rdquo;), list any known limitations, and provide a clear way for
                  users to report accessibility issues or request accommodations. Include an email
                  address and phone number for accessibility queries.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
                5
              </span>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  Re-assess periodically and after major content/design changes
                </h3>
                <p className="mt-2 text-base leading-normal text-text-secondary">
                  Accessibility is not a one-time project. New content, design updates, and feature
                  additions can introduce new violations. Conduct annual comprehensive audits and
                  lightweight checks after every major release. For SEBI-regulated entities, annual
                  audits are mandatory.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section aria-labelledby="faq-heading" className="mt-16 scroll-mt-20">
          <FAQSection items={rpwdFaqs} />
        </section>
      </div>

      <CTABanner />
    </>
  );
}
