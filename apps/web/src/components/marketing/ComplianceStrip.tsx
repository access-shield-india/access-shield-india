import { FileText, Shield, BookOpen, Building } from 'lucide-react';
import { LocaleLink } from '@/components/common/LocaleLink';

const ACTS = [
  {
    id: 'rpwd',
    icon: Shield,
    title: 'RPwD Act 2016',
    description: 'Sections 40–46: ICT accessibility obligations',
    href: '/rpwd-act',
  },
  {
    id: 'is17802',
    icon: BookOpen,
    title: 'IS 17802:2021',
    description: 'BIS national standard for ICT accessibility',
    href: '/is-17802',
  },
  {
    id: 'gigw',
    icon: Building,
    title: 'GIGW 3.0',
    description: 'Government website & app guidelines',
    href: '/gigw',
  },
  {
    id: 'sebi',
    icon: FileText,
    title: 'SEBI 2024',
    description: 'Mandatory for all regulated entities',
    href: '/sebi-accessibility',
  },
] as const;

type ActId = (typeof ACTS)[number]['id'];

export interface ComplianceStripProps {
  /**
   * Which acts to display. Defaults to all four.
   * Pass a subset to show only specific regulations.
   */
  acts?: ActId[];
}

/**
 * ComplianceStrip — Horizontal band listing Indian regulations.
 * Use at the bottom of service pages to show compliance coverage.
 * Each card links to the dedicated marketing guide page.
 */
export function ComplianceStrip({ acts }: ComplianceStripProps) {
  const displayedActs = acts ? ACTS.filter((act) => acts.includes(act.id)) : ACTS;

  return (
    <section
      aria-labelledby="compliance-strip-heading"
      className="border-t border-gray-200 bg-bg-secondary px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <h2
          id="compliance-strip-heading"
          className="text-center text-2xl font-bold text-text-primary sm:text-3xl"
        >
          Compliance coverage
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-base text-text-secondary">
          This service addresses the following Indian accessibility regulations and standards
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {displayedActs.map(({ id, icon: Icon, title, description, href }) => (
            <LocaleLink
              key={id}
              href={href}
              className="group flex flex-col gap-3 rounded-lg border border-border bg-white p-5 transition-all hover:border-primary-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
              aria-label={`Learn about ${title} requirements`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-100 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white"
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
              </div>
              <p className="text-sm leading-normal text-text-secondary">{description}</p>
            </LocaleLink>
          ))}
        </div>
      </div>
    </section>
  );
}
