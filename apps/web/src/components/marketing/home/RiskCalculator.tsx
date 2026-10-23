'use client';

import { useId, useState } from 'react';
import { ButtonLink } from '@/components/marketing/ButtonLink';
import { useDictionary, useLocale } from '@/lib/i18n/locale-context';
import { formatINR } from '@/lib/utils';

/** Census 2011 share of persons with disabilities — widely considered an undercount. */
const LOW_DISABILITY_SHARE = 0.0221;
/** WHO 2023 global estimate. */
const HIGH_DISABILITY_SHARE = 0.16;
const ASSUMED_CONVERSION_RATE = 0.02;

const MIN_VISITORS = 1_000;
const MAX_VISITORS = 10_00_000;
const VISITOR_STEP = 1_000;

export interface RevenueRiskRange {
  /** Monthly revenue at risk in paise (low estimate). */
  lowPaise: number;
  /** Monthly revenue at risk in paise (high estimate). */
  highPaise: number;
}

/** Monthly revenue lost to visitors who cannot complete a transaction, in paise. */
export function estimateRevenueRisk(
  monthlyVisitors: number,
  orderValueRupees: number,
): RevenueRiskRange {
  const visitors = Math.max(0, monthlyVisitors);
  const orderPaise = Math.max(0, Math.round(orderValueRupees * 100));
  const perShare = (share: number) =>
    Math.round(visitors * share * ASSUMED_CONVERSION_RATE * orderPaise);
  return { lowPaise: perShare(LOW_DISABILITY_SHARE), highPaise: perShare(HIGH_DISABILITY_SHARE) };
}

export function RiskCalculator() {
  const { home } = useDictionary();
  const locale = useLocale();
  const copy = home.calculator;
  const visitorsId = useId();
  const orderId = useId();
  const noteId = useId();
  const [visitors, setVisitors] = useState(50_000);
  const [orderValue, setOrderValue] = useState(2_000);

  const numberLocale = locale === 'hi' ? 'hi-IN' : 'en-IN';
  const formattedVisitors = visitors.toLocaleString(numberLocale);
  const { lowPaise, highPaise } = estimateRevenueRisk(visitors, orderValue);

  return (
    <section
      aria-labelledby="calculator-heading"
      className="border-b border-gray-200 bg-primary-50 px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
        <div>
          <h2
            id="calculator-heading"
            className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl"
          >
            {copy.title}
          </h2>
          <p className="mt-4 text-lg leading-normal text-text-secondary">{copy.subtitle}</p>

          <div className="mt-8 space-y-8">
            <div>
              <label
                htmlFor={visitorsId}
                className="flex flex-wrap justify-between gap-2 text-base font-medium text-text-primary"
              >
                <span>{copy.visitorsLabel}</span>
                <span className="font-bold text-primary-700">{formattedVisitors}</span>
              </label>
              <input
                id={visitorsId}
                type="range"
                min={MIN_VISITORS}
                max={MAX_VISITORS}
                step={VISITOR_STEP}
                value={visitors}
                aria-valuetext={formattedVisitors}
                onChange={(event) => setVisitors(Number(event.target.value))}
                className="mt-3 h-11 w-full cursor-pointer accent-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
              />
            </div>

            <div>
              <label htmlFor={orderId} className="block text-base font-medium text-text-primary">
                {copy.orderLabel}
              </label>
              <input
                id={orderId}
                type="number"
                min={0}
                step={100}
                inputMode="numeric"
                value={orderValue}
                onChange={(event) => setOrderValue(Math.max(0, Number(event.target.value) || 0))}
                className="mt-2 min-h-[44px] w-full rounded-md border-2 border-border bg-white px-4 text-base text-text-primary focus-visible:border-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-primary-200 bg-white p-8 shadow-lg">
          <div aria-live="polite" aria-atomic="true">
            <p className="text-base font-medium text-text-secondary">{copy.resultLabel}</p>
            <p className="mt-2 text-3xl font-bold text-primary-700 sm:text-4xl">
              {formatINR(lowPaise)} – {formatINR(highPaise)}
            </p>
          </div>
          <p id={noteId} className="mt-2 text-sm leading-normal text-text-secondary">
            {copy.resultNote}
          </p>

          <hr className="my-6 border-border" />

          <p className="text-base font-medium text-text-secondary">{copy.legalLabel}</p>
          <p className="mt-2 text-xl font-semibold text-error-700">{copy.legalValue}</p>
          <p className="mt-2 text-sm leading-normal text-text-secondary">{copy.legalNote}</p>

          <ButtonLink href="/scan" size="lg" variant="primary" className="mt-8 w-full">
            {copy.cta}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
