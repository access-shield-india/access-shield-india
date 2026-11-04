'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';
import { AUTOMATION_DISCLAIMER } from '@/lib/pricing/catalog';

const STEPS = [
  {
    id: 'assets',
    title: 'Connect assets',
    description: 'Add websites / apps to monitor under your organisation.',
    href: '/dashboard/assets',
  },
  {
    id: 'baseline',
    title: 'Baseline audit engagement',
    description: 'Request a documented accessibility audit (automated + manual).',
    href: '/dashboard/engagements',
  },
  {
    id: 'monitoring',
    title: 'Monitoring schedule',
    description: 'Run Professional/Enterprise scans on a recurring cadence.',
    href: '/dashboard/scans',
  },
  {
    id: 'evidence',
    title: 'Evidence packs',
    description: 'Generate WCAG / RPwD / GIGW / SEBI reports for stakeholders.',
    href: '/dashboard/reports',
  },
  {
    id: 'review',
    title: 'Quarterly review',
    description: 'Book CSM / expert review to close open critical issues.',
    href: '/contact?plan=enterprise',
  },
] as const;

interface OnboardingChecklistProps {
  /** Completed step ids */
  completed?: string[];
}

export function OnboardingChecklist({ completed = [] }: OnboardingChecklistProps) {
  return (
    <section
      aria-labelledby="enterprise-onboarding"
      className="rounded-lg border border-border bg-white p-6"
    >
      <h2 id="enterprise-onboarding" className="text-lg font-semibold text-text-primary">
        Enterprise programme onboarding
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        Annual contracts combine software, monitoring, reporting, training, and expert support.
      </p>
      <ol className="mt-4 space-y-3">
        {STEPS.map((step, index) => {
          const done = completed.includes(step.id);
          return (
            <li key={step.id} className="flex gap-3">
              <span className="mt-0.5 shrink-0" aria-hidden="true">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-success-700" />
                ) : (
                  <Circle className="h-5 w-5 text-text-tertiary" />
                )}
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  <span className="sr-only">Step {index + 1}. </span>
                  {step.title}
                  {done && <span className="sr-only"> (completed)</span>}
                </p>
                <p className="text-sm text-text-secondary">{step.description}</p>
                {!done && (
                  <Link
                    href={step.href}
                    className="mt-1 inline-block text-sm font-medium text-primary-600 hover:text-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                  >
                    Continue →
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-xs text-text-tertiary" role="note">
        {AUTOMATION_DISCLAIMER}
      </p>
    </section>
  );
}
