import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/get-dictionary';

export function RiskStatsBar({ locale }: { locale: Locale }) {
  const { home } = getDictionary(locale);
  const { riskStats } = home;

  return (
    <section className="bg-primary-900 px-4 py-12 sm:px-6 lg:px-8" aria-label={riskStats.title}>
      <div className="mx-auto max-w-7xl">
        <p className="mb-8 text-center text-sm font-medium text-primary-100">{riskStats.intro}</p>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {riskStats.stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-white sm:text-4xl">{stat.value}</div>
              <div className="mt-2 text-sm leading-normal text-primary-100 sm:text-base">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
