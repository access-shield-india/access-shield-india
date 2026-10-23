'use client';

import { useState } from 'react';
import { ButtonLink } from '@/components/marketing/ButtonLink';
import { useDictionary } from '@/lib/i18n/locale-context';
import { cn } from '@/lib/utils';

type ModeId = 'normal' | 'lowVision' | 'colourBlind' | 'cataract';

const DEUTERANOPIA_FILTER_ID = 'as-sim-deuteranopia';

const MODE_FILTERS: Record<ModeId, string> = {
  normal: 'none',
  lowVision: 'blur(2.5px)',
  colourBlind: `url(#${DEUTERANOPIA_FILTER_ID})`,
  cataract: 'blur(1.2px) contrast(0.45) brightness(1.3) sepia(0.35)',
};

/**
 * Lets visitors toggle common vision conditions over a sample payment screen.
 * The preview is decorative; the insight text carries the meaning for screen readers.
 */
export function DisabilitySimulator() {
  const { home } = useDictionary();
  const copy = home.simulator;
  const [active, setActive] = useState<ModeId>('normal');
  const mode = copy.modes.find((m) => m.id === active) ?? copy.modes[0];

  return (
    <section
      aria-labelledby="simulator-heading"
      className="border-b border-gray-200 bg-white px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      {/* Machado et al. deuteranopia approximation (red–green colour blindness) */}
      <svg aria-hidden="true" focusable="false" className="absolute h-0 w-0">
        <filter id={DEUTERANOPIA_FILTER_ID}>
          <feColorMatrix
            type="matrix"
            values="0.367 0.861 -0.228 0 0  0.280 0.673 0.047 0 0  -0.012 0.043 0.969 0 0  0 0 0 1 0"
          />
        </filter>
      </svg>

      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2
            id="simulator-heading"
            className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl"
          >
            {copy.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-normal text-text-secondary">
            {copy.subtitle}
          </p>
        </div>

        <div
          role="group"
          aria-label={copy.groupAria}
          className="mt-10 flex flex-wrap justify-center gap-3"
        >
          {copy.modes.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={active === m.id}
              onClick={() => setActive(m.id)}
              className={cn(
                'min-h-[44px] rounded-full border-2 px-5 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
                active === m.id
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-border bg-white text-text-primary hover:border-primary-600',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-xl border-2 border-border shadow-lg">
          <div
            aria-hidden="true"
            style={{ filter: MODE_FILTERS[active] }}
            className="space-y-5 bg-bg-secondary p-6 motion-safe:transition-[filter] motion-safe:duration-300 sm:p-8"
          >
            <p className="text-2xl font-bold text-text-primary">{copy.previewTitle}</p>
            <p className="text-sm text-text-tertiary">{copy.previewAmount}</p>
            <div className="h-11 rounded-md border border-border bg-white" />
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary">{copy.previewStatusLabel}</span>
              <span className="h-4 w-4 rounded-full bg-[#D92D20]" />
              <span className="h-4 w-4 rounded-full bg-[#12B76A]" />
            </div>
            <div className="inline-flex min-h-[44px] items-center rounded-md bg-primary-500 px-6 font-semibold text-white">
              {copy.previewPay}
            </div>
          </div>
        </div>

        <p
          aria-live="polite"
          className="mx-auto mt-6 max-w-2xl text-center text-lg font-medium leading-normal text-text-primary"
        >
          {mode?.insight}
        </p>

        <div className="mt-8 text-center">
          <ButtonLink href="/scan" size="lg" variant="primary">
            {copy.cta}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
