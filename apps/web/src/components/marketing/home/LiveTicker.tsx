'use client';

import { useEffect, useId, useState } from 'react';
import { useDictionary } from '@/lib/i18n/locale-context';

export function LiveTicker() {
  const { home, common } = useDictionary();
  const sectors = home.ticker.sectors;
  const [isPaused, setIsPaused] = useState(false);
  const controlsId = useId();

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsPaused(true);
    }
  }, []);

  return (
    <div
      className="border-y border-primary-200 bg-primary-900 py-3.5"
      aria-label={home.ticker.aria}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          aria-controls={controlsId}
          aria-pressed={isPaused}
          onClick={() => setIsPaused((prev) => !prev)}
          className="shrink-0 rounded-md border border-primary-400 bg-primary-800 px-3 py-2 text-xs font-semibold text-primary-100 hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900 min-h-[44px] min-w-[44px]"
        >
          {isPaused ? common.actions.play : common.actions.pause}
        </button>

        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div
            id={controlsId}
            className={`flex gap-10 ${isPaused ? '' : 'animate-marquee'}`}
            style={{
              animation: isPaused ? 'none' : 'marquee 45s linear infinite',
            }}
            aria-live="off"
          >
            {[...sectors, ...sectors].map((sector, i) => (
              <div key={i} className="flex items-center gap-2.5 whitespace-nowrap">
                <span
                  className="inline-block h-2 w-2 rounded-full bg-accent-600"
                  aria-hidden="true"
                />
                <span className="text-sm font-medium text-primary-100">{sector}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-marquee {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
