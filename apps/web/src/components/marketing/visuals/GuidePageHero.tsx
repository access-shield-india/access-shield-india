import type { ReactNode } from 'react';
import { MarketingVisual } from './MarketingVisual';

export interface GuidePageHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  badges?: ReactNode;
  visual?: ReactNode;
  visualLabel?: string;
}

/** Hero for compliance guide pages — badges plus side illustration on large screens. */
export function GuidePageHero({
  eyebrow,
  title,
  description,
  badges,
  visual,
  visualLabel,
}: GuidePageHeroProps) {
  return (
    <header className="border-b border-gray-200 bg-gradient-to-b from-primary-50 via-white to-white px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_minmax(220px,360px)] lg:gap-12">
        <div className="text-center lg:text-left">
          <p className="text-sm font-medium uppercase tracking-wide text-primary-700">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
            {title}
          </h1>
          <p className="mt-6 text-lg leading-normal text-text-secondary">{description}</p>
          {badges && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              {badges}
            </div>
          )}
        </div>

        {visual && (
          <MarketingVisual label={visualLabel} className="mx-auto w-full max-w-sm lg:max-w-none">
            {visual}
          </MarketingVisual>
        )}
      </div>
    </header>
  );
}
