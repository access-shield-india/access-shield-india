import type { Metadata } from 'next';
import { ButtonLink } from '@/components/marketing/ButtonLink';
import { DeadlineBanner } from '@/components/marketing/sebi/DeadlineBanner';
import { EntityGrid } from '@/components/marketing/sebi/EntityGrid';
import { FAQSection } from '@/components/marketing/pricing/FAQSection';
import { FinanceGuideIllustration, GuidePageHero } from '@/components/marketing/visuals';

export const metadata: Metadata = {
  title: 'SEBI Accessibility Compliance Guide 2026',
  description:
    'Everything SEBI-regulated entities need to know about the 2024 accessibility circular. Deadline April 2026.',
};

const sebiFaqs = [
  {
    question: 'What is the exact deadline for SEBI compliance?',
    answer:
      'April 30, 2026 is the deadline for completing the first WCAG 2.1 Level AA accessibility assessment. After that, annual re-assessments are mandatory. The circular was issued in 2024, giving entities approximately 18-24 months to achieve initial compliance.',
  },
  {
    question: 'What are the penalties for non-compliance with the SEBI circular?',
    answer:
      'SEBI has not specified exact monetary penalties in the circular. However, non-compliance can result in: regulatory enforcement actions, orders to cease non-compliant operations until remediation is complete, reputational damage through public disclosure of non-compliance, and potential liability under the broader RPwD Act framework (₹10,000-₹5,00,000 fines).',
  },
  {
    question: 'What does "IAAP-certified accessibility professional" mean?',
    answer:
      'The International Association of Accessibility Professionals (IAAP) is the global certifying body for accessibility specialists. The SEBI circular requires assessments to be conducted or validated by someone holding an IAAP certification such as CPACC (Certified Professional in Accessibility Core Competencies) or WAS (Web Accessibility Specialist). This ensures the audit is performed by a qualified expert, not just automated tools.',
  },
  {
    question: 'Do I need to make every single page WCAG 2.1 AA compliant?',
    answer:
      'The circular emphasises critical user functions: login, trading, fund transfers, account statements, and customer support interfaces. While best practice is to make your entire digital platform accessible, priority must be given to these core transactional and informational functions. Third-party embedded content (ads, analytics) should be accessible where possible, but documented exceptions may be acceptable if remediation is not in your control.',
  },
  {
    question: 'Can I use an automated tool like AccessShield for the SEBI audit?',
    answer:
      'Automated tools are an essential part of the audit process, but the SEBI circular requires validation by an IAAP-certified professional. AccessShield provides AI-powered automated scans plus manual review by IAAP-certified auditors, ensuring both speed and regulatory compliance. The final report is signed off by a certified auditor, meeting SEBI requirements.',
  },
  {
    question: 'What if my platform is already accessible — do I still need the audit?',
    answer:
      'Yes. Even if you believe your platform is compliant, the SEBI circular requires formal documentation via an accessibility assessment conducted or validated by an IAAP-certified professional. This assessment serves as proof of compliance and must be repeated annually.',
  },
];

export default function SEBIAccessibilityPage() {
  return (
    <>
      <div className="border-b border-gray-200 bg-white">
        <DeadlineBanner />
      </div>

      <GuidePageHero
        eyebrow="SEBI circular 2024"
        title="SEBI digital accessibility compliance"
        description="SEBI's 2024 circular requires all stock brokers, AMCs, depositories, and investment advisers to audit their digital platforms for WCAG 2.1 AA accessibility by April 2026."
        visual={<FinanceGuideIllustration />}
        visualLabel="SEBI regulated financial platform accessibility"
      />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <section aria-labelledby="entities-heading">
          <h2 id="entities-heading" className="text-3xl font-bold text-text-primary">
            Which entities are affected?
          </h2>
          <p className="mt-4 text-base leading-normal text-text-secondary">
            The 2024 SEBI accessibility circular applies to all entities regulated by the Securities
            and Exchange Board of India. If you operate a digital platform providing trading,
            investment, or financial services, you must comply.
          </p>
          <EntityGrid />
        </section>

        <section aria-labelledby="requirements-heading" className="mt-16">
          <h2 id="requirements-heading" className="text-3xl font-bold text-text-primary">
            What does the circular require?
          </h2>
          <ul className="mt-6 space-y-4">
            <li className="flex items-start gap-3">
              <svg
                className="mt-1 h-6 w-6 shrink-0 text-success-700"
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
                <strong className="text-base font-semibold text-text-primary">
                  WCAG 2.1 Level AA conformance assessment
                </strong>
                <p className="mt-1 text-base leading-normal text-text-secondary">
                  Your website, mobile applications (Android and iOS), and all customer-facing
                  digital interfaces must be assessed against the international Web Content
                  Accessibility Guidelines (WCAG) 2.1 Level AA standard.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="mt-1 h-6 w-6 shrink-0 text-success-700"
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
                <strong className="text-base font-semibold text-text-primary">
                  Assessment conducted by an IAAP-certified accessibility professional
                </strong>
                <p className="mt-1 text-base leading-normal text-text-secondary">
                  Automated tools alone are not sufficient. The circular requires your audit to be
                  conducted or validated by an International Association of Accessibility
                  Professionals (IAAP) certified expert, ensuring the assessment meets professional
                  standards.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="mt-1 h-6 w-6 shrink-0 text-success-700"
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
                <strong className="text-base font-semibold text-text-primary">
                  Annual re-assessment
                </strong>
                <p className="mt-1 text-base leading-normal text-text-secondary">
                  This is not a one-time exercise. After achieving initial compliance by April 2026,
                  you must conduct a fresh accessibility audit every year to maintain compliance as
                  your platform evolves.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="mt-1 h-6 w-6 shrink-0 text-success-700"
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
                <strong className="text-base font-semibold text-text-primary">
                  Published accessibility statement
                </strong>
                <p className="mt-1 text-base leading-normal text-text-secondary">
                  You must publish an accessibility statement on your website declaring your
                  conformance status, listing any known limitations, and providing contact details
                  for users to report accessibility issues or request accommodations.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="mt-1 h-6 w-6 shrink-0 text-success-700"
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
                <strong className="text-base font-semibold text-text-primary">
                  Accessible critical functions
                </strong>
                <p className="mt-1 text-base leading-normal text-text-secondary">
                  Priority must be given to core user journeys: login and authentication, trading
                  and order placement, fund transfers and withdrawals, account statements and
                  transaction history, customer support interfaces (chat, email, phone). These
                  functions must be fully accessible to persons with disabilities.
                </p>
              </div>
            </li>
          </ul>
        </section>

        <section aria-labelledby="timeline-heading" className="mt-16">
          <h2 id="timeline-heading" className="text-3xl font-bold text-text-primary">
            Key dates
          </h2>
          <ol className="mt-6 space-y-4 border-l-2 border-primary-600 pl-6">
            <li>
              <p className="text-sm font-semibold text-primary-700">2024 Q3</p>
              <p className="mt-1 text-base font-semibold text-text-primary">SEBI circular issued</p>
              <p className="mt-1 text-sm leading-normal text-text-secondary">
                SEBI published the accessibility compliance circular, formally notifying all
                regulated entities of the new requirements.
              </p>
            </li>
            <li>
              <p className="text-sm font-semibold text-primary-700">2025-2026</p>
              <p className="mt-1 text-base font-semibold text-text-primary">
                Assessment and remediation period
              </p>
              <p className="mt-1 text-sm leading-normal text-text-secondary">
                Entities should conduct their WCAG 2.1 AA audit, prioritise and remediate critical
                violations, and prepare compliance documentation.
              </p>
            </li>
            <li>
              <p className="text-sm font-semibold text-primary-700">April 30, 2026</p>
              <p className="mt-1 text-base font-semibold text-text-primary">Compliance deadline</p>
              <p className="mt-1 text-sm leading-normal text-text-secondary">
                All SEBI-regulated entities must have completed their initial accessibility
                assessment by this date. Non-compliance may result in enforcement actions.
              </p>
            </li>
            <li>
              <p className="text-sm font-semibold text-primary-700">Annual</p>
              <p className="mt-1 text-base font-semibold text-text-primary">
                Re-assessment required
              </p>
              <p className="mt-1 text-sm leading-normal text-text-secondary">
                After the initial 2026 deadline, entities must re-assess their digital platforms
                annually to maintain compliance as systems and content evolve.
              </p>
            </li>
          </ol>
        </section>

        <section className="mt-16">
          <div className="rounded-xl border-2 border-primary-600 bg-primary-50 p-8 text-center">
            <h3 className="text-2xl font-bold text-primary-900">AccessShield SEBI Report</h3>
            <p className="mt-4 text-base leading-normal text-primary-900">
              WCAG 2.1 AA audit • IAAP auditor sign-off • SEBI-format report • Accessibility
              statement • Annual renewal
            </p>
            <div className="mt-6">
              <ButtonLink href="/signup?interest=sebi" size="lg" variant="primary">
                Get SEBI report
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-primary-800">
              Meet the April 2026 deadline with confidence. Our IAAP-certified auditors provide
              regulatory-compliant reports designed specifically for SEBI entities.
            </p>
          </div>
        </section>

        <section className="mt-16">
          <FAQSection items={sebiFaqs} />
        </section>
      </div>
    </>
  );
}
