import type { ReactNode } from 'react';
import { MarketingVisual } from './MarketingVisual';

export interface MarketingPageHeroProps {
  title: string;
  description?: string;
  eyebrow?: string;
  visual?: ReactNode;
  visualLabel?: string;
  centered?: boolean;
}

/** Split hero for company, contact, and docs pages — text plus optional illustration. */
export function MarketingPageHero({
  title,
  description,
  eyebrow,
  visual,
  visualLabel,
  centered = false,
}: MarketingPageHeroProps) {
  const hasVisual = Boolean(visual);

  return (
    <header className="border-b border-gray-200 bg-gradient-to-b from-primary-50 via-white to-white px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div
        className={
          hasVisual && !centered
            ? 'mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16'
            : 'mx-auto max-w-3xl text-center'
        }
      >
        <div className={hasVisual && !centered ? 'lg:pr-4' : undefined}>
          {eyebrow && (
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">
              {eyebrow}
            </p>
          )}
          <h1
            className={`font-bold tracking-tight text-text-primary ${eyebrow ? 'mt-3' : ''} text-3xl sm:text-4xl`}
          >
            {title}
          </h1>
          {description && (
            <p className="mt-4 text-lg leading-normal text-text-secondary">{description}</p>
          )}
        </div>

        {hasVisual && (
          <MarketingVisual label={visualLabel} className={centered ? 'mx-auto mt-8 max-w-md' : ''}>
            {visual}
          </MarketingVisual>
        )}
      </div>
    </header>
  );
}
