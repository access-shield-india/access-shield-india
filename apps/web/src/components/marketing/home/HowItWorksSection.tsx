import { Award, ClipboardList, ScanSearch, Wrench, type LucideIcon } from 'lucide-react';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/get-dictionary';

const STEP_ICONS: LucideIcon[] = [ScanSearch, ClipboardList, Wrench, Award];

export function HowItWorksSection({ locale }: { locale: Locale }) {
  const { home } = getDictionary(locale);
  const { howItWorks } = home;

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            {howItWorks.title}
          </h2>
          <p className="mt-4 text-lg leading-normal text-text-secondary">{howItWorks.subtitle}</p>
        </div>

        <ol className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {howItWorks.steps.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? ScanSearch;
            return (
              <li
                key={step.title}
                className="relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-center">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600 ring-2 ring-primary-100"
                    aria-hidden="true"
                  >
                    <Icon className="h-7 w-7" strokeWidth={1.75} />
                  </div>
                </div>
                <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wide text-primary-600">
                  {howItWorks.stepLabel} {index + 1}
                </p>
                <h3 className="mt-2 text-center text-xl font-semibold text-text-primary">
                  {step.title}
                </h3>
                <p className="mt-2 text-center text-base leading-normal text-text-secondary">
                  {step.description}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
