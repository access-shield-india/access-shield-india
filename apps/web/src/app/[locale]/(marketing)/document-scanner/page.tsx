import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  FileType,
  Check,
  Minus,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@accessshield/ui';
import { ButtonLink } from '@/components/marketing/ButtonLink';

export const metadata: Metadata = {
  title: 'Document Scanner — Accessible PDFs, Word, PowerPoint, Excel',
  description:
    'Scan government documents for accessibility issues before publishing. Detects untagged PDFs, missing alt text, inaccessible tables, and 40+ WCAG 2.1 AA / GIGW 3.0 issues.',
  openGraph: {
    title: 'Document Scanner | AccessShield India',
    description:
      'Is your government PDF accessible? Scan PDF, Word, PowerPoint, and Excel files for 40+ WCAG 2.1 AA and GIGW 3.0 accessibility issues.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://accessshield.in/document-scanner',
    languages: {
      en: 'https://accessshield.in/document-scanner',
      hi: 'https://accessshield.in/hi/document-scanner',
    },
  },
};

const STATS = [
  { value: '~7,900+', label: 'Government websites non-compliant with GIGW 3.0' },
  { value: '26.8M', label: 'Indians with disabilities unable to access inaccessible documents' },
  { value: '₹10,000', label: 'CCPD penalty per non-compliant establishment (Feb 2025)' },
];

const FORMATS = [
  {
    icon: FileText,
    name: 'PDF',
    library: 'Apache Tika + pdfplumber',
    checks: [
      'Tagged structure',
      'Alt text for images',
      'Reading order',
      'Scanned image detection',
      'Form labels',
      'Language declaration',
      'Colour contrast',
      'Security restrictions',
    ],
  },
  {
    icon: FileType,
    name: 'Word (.docx)',
    library: 'python-docx',
    checks: [
      'Heading hierarchy',
      'Image alt text',
      'Table headers',
      'Language declaration',
      'Colour-only content',
      'Generic links',
      'List structure',
    ],
  },
  {
    icon: Presentation,
    name: 'PowerPoint (.pptx)',
    library: 'python-pptx',
    checks: [
      'Slide titles',
      'Reading order',
      'Alt text for images',
      'Auto-advance timing',
      'Font size',
      'Colour contrast',
    ],
  },
  {
    icon: FileSpreadsheet,
    name: 'Excel (.xlsx)',
    library: 'openpyxl',
    checks: [
      'Table headers',
      'Chart alt text',
      'Colour-only encoding',
      'Merged cells',
      'Sheet names',
    ],
  },
];

const COMPLIANCE_MATRIX = [
  { standard: 'WCAG 2.1 Level AA', pdf: true, word: true, ppt: true, excel: true },
  { standard: 'GIGW 3.0 (NIC/MeitY)', pdf: true, word: true, ppt: true, excel: true },
  { standard: 'PDF/UA-1 (ISO 14289-1)', pdf: true, word: false, ppt: false, excel: false },
  { standard: 'IS 17802:2021', pdf: true, word: true, ppt: true, excel: true },
  { standard: 'RPwD Act 2016', pdf: true, word: true, ppt: true, excel: true },
];

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <Check
      className={`h-5 w-5 text-success-700 ${className}`}
      strokeWidth={2.5}
      aria-label="Supported"
    />
  );
}

function MinusIcon({ className = '' }: { className?: string }) {
  return (
    <Minus
      className={`h-5 w-5 text-text-tertiary ${className}`}
      strokeWidth={2.5}
      aria-label="Not applicable"
    />
  );
}

export default function DocumentScannerPage() {
  return (
    <>
      {/* Hero Section */}
      <header className="relative overflow-hidden border-b border-gray-200 bg-gradient-to-b from-primary-50 via-white to-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="relative mx-auto max-w-4xl text-center">
          <Badge variant="accent" size="lg" className="border-2 border-accent/40 shadow-sm">
            New
          </Badge>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:text-[3.25rem] lg:leading-tight">
            Is Your Government PDF Accessible?
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary sm:text-xl">
            Most government documents fail basic screen reader tests. AccessShield scans PDF, Word,
            PowerPoint, and Excel files for 40+ WCAG 2.1 AA, GIGW 3.0, and RPwD Act 2016 issues.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <ButtonLink href="/signup" size="lg" variant="primary" className="min-w-[240px]">
              Try Free Scan
            </ButtonLink>
            <ButtonLink href="/services" size="lg" variant="secondary" className="min-w-[240px]">
              View pricing
            </ButtonLink>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <section
        aria-labelledby="stats-heading"
        className="border-b border-gray-200 bg-white px-4 py-12 sm:px-6 lg:px-8"
      >
        <h2 id="stats-heading" className="sr-only">
          Accessibility statistics in India
        </h2>
        <div className="mx-auto max-w-5xl">
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {STATS.map((stat) => (
              <div
                key={stat.value}
                className="rounded-xl border border-gray-200 bg-bg-secondary p-6 text-center"
              >
                <dt className="text-3xl font-bold text-primary-700 sm:text-4xl">{stat.value}</dt>
                <dd className="mt-2 text-sm leading-normal text-text-secondary">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Formats Section */}
      <section
        aria-labelledby="formats-heading"
        className="border-b border-gray-200 bg-bg-secondary px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
              Supported Formats
            </p>
            <h2
              id="formats-heading"
              className="mt-2 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl"
            >
              Scan every document type
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-normal text-text-secondary">
              One scanner for all office formats — with India-specific GIGW and IS 17802 rules built
              in.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FORMATS.map((format) => {
              const Icon = format.icon;
              return (
                <article
                  key={format.name}
                  className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600"
                      aria-hidden="true"
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary">{format.name}</h3>
                  </div>
                  <p className="mt-2 text-xs text-text-tertiary">Engine: {format.library}</p>
                  <ul className="mt-4 space-y-2">
                    {format.checks.map((check) => (
                      <li
                        key={check}
                        className="flex items-start gap-2 text-sm text-text-secondary"
                      >
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-success-700"
                          aria-hidden="true"
                        />
                        <span>{check}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Scanned PDF Warning */}
      <section
        aria-labelledby="warning-heading"
        className="border-b border-gray-200 bg-amber-50 px-4 py-10 sm:px-6 lg:px-8"
      >
        <div className="mx-auto flex max-w-4xl items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-700" aria-hidden="true" />
          </div>
          <div>
            <h2 id="warning-heading" className="text-lg font-semibold text-amber-900">
              Why scanned PDFs are a problem
            </h2>
            <p className="mt-2 text-base leading-normal text-amber-800">
              Most government PDFs are scanned images with no text layer — completely invisible to
              screen readers. A blind citizen cannot read a notification, apply for a scheme, or
              file RTI if the PDF is just a picture of text. AccessShield detects these
              &quot;image-only&quot; PDFs and flags them for OCR remediation.
            </p>
          </div>
        </div>
      </section>

      {/* Compliance Matrix */}
      <section
        aria-labelledby="compliance-heading"
        className="border-b border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
              Compliance Standards
            </p>
            <h2
              id="compliance-heading"
              className="mt-2 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl"
            >
              One scan, all Indian standards
            </h2>
          </div>

          <div className="mt-10 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 rounded-lg border border-gray-200">
              <thead className="bg-bg-secondary">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                  >
                    Standard
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-text-primary"
                  >
                    PDF
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-text-primary"
                  >
                    Word
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-text-primary"
                  >
                    PowerPoint
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-text-primary"
                  >
                    Excel
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {COMPLIANCE_MATRIX.map((row) => (
                  <tr key={row.standard}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-text-primary">
                      {row.standard}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.pdf ? <CheckIcon /> : <MinusIcon />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.word ? <CheckIcon /> : <MinusIcon />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.ppt ? <CheckIcon /> : <MinusIcon />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.excel ? <CheckIcon /> : <MinusIcon />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-center text-sm text-text-tertiary">
            PDF/UA-1 is the ISO standard for accessible PDF documents. Word, PowerPoint, and Excel
            are checked against WCAG criteria applicable to their format.
          </p>
        </div>
      </section>

      {/* Batch Audit Promo */}
      <section
        aria-labelledby="batch-heading"
        className="border-b border-gray-200 bg-bg-secondary px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-primary-200 bg-white p-8 shadow-sm sm:p-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge variant="accent" size="sm">
                  Add-on
                </Badge>
                <h2
                  id="batch-heading"
                  className="mt-3 text-2xl font-bold text-text-primary sm:text-3xl"
                >
                  Document Accessibility Batch Audit
                </h2>
                <p className="mt-3 text-base leading-normal text-text-secondary">
                  Upload up to 500 documents for bulk compliance checking. Ideal for ministry
                  document libraries and RTI archives.
                </p>
                <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    'Up to 500 documents',
                    'Unified compliance report',
                    'GIGW checkpoint summary',
                    'Priority queue (2hr turnaround)',
                    'Certificate-ready evidence pack',
                  ].map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-text-secondary"
                    >
                      <Check className="h-4 w-4 shrink-0 text-success-700" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="shrink-0 text-center sm:text-right">
                <p className="text-3xl font-bold text-text-primary">₹15,000</p>
                <p className="text-sm text-text-tertiary">per batch + 18% GST</p>
                <ButtonLink
                  href="/contact?service=document-batch-audit"
                  size="lg"
                  variant="primary"
                  className="mt-4"
                >
                  Get Quote
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-primary-900 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Start Scanning Your Documents Today
          </h2>
          <p className="mt-6 text-lg leading-normal text-primary-100">
            Join government organisations across India using AccessShield to identify accessibility
            barriers before they reach citizens.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <ButtonLink href="/signup" size="lg" variant="onDark" className="min-w-[260px]">
              Try Free Document Scan
            </ButtonLink>
            <Link
              href="/services"
              className="inline-flex items-center gap-1 text-base font-medium text-white hover:text-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900 rounded"
            >
              View all services
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
