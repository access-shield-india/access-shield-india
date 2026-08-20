'use client';

import { Building2, FileCheck, Landmark, ShieldCheck } from 'lucide-react';
import { Badge } from '@accessshield/ui';
import { ButtonAnchor, ButtonLink } from '@/components/marketing/ButtonLink';
import { MarketingImage } from '@/components/marketing/visuals/MarketingImage';
import { MARKETING_IMAGES } from '@/lib/marketing/images';
import { useDictionary } from '@/lib/i18n/locale-context';

const SECTOR_ICONS = [Building2, Landmark, ShieldCheck, FileCheck];

function CheckIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0 text-success-700"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function HeroSection() {
  const { home, common } = useDictionary();
  const { hero } = home;
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

  return (
    <section className="relative overflow-hidden border-b border-primary-100 bg-gradient-to-b from-primary-100 via-primary-50 to-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
      <div
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary-200/50 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-primary-300/40 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <div className="text-center lg:text-left">
            <ul
              className="flex flex-wrap items-center justify-center gap-2 lg:justify-start"
              aria-label={hero.urgencyAria}
            >
              {hero.badges.map((badge, i) => (
                <li key={badge}>
                  <Badge
                    variant={i === 0 ? 'accent' : 'outline'}
                    size="lg"
                    className={
                      i === 0
                        ? 'border-2 border-accent/40 shadow-sm'
                        : 'border-2 border-primary-200 bg-white shadow-sm'
                    }
                  >
                    {badge}
                  </Badge>
                </li>
              ))}
            </ul>

            <h1 className="mt-8 text-4xl font-bold leading-[1.08] tracking-tight text-text-primary sm:text-5xl lg:text-[3.5rem] xl:text-6xl">
              {hero.titleLine1} <span className="text-primary-700">{hero.titleHighlight}</span>.{' '}
              <span className="text-primary-900">{hero.titleLine2}</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary sm:text-xl lg:mx-0">
              {hero.subtitle}
            </p>

            <ul
              className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:max-w-2xl"
              aria-label={hero.sectorsAria}
            >
              {hero.sectors.map((label, index) => {
                const Icon = SECTOR_ICONS[index] ?? Building2;
                return (
                  <li
                    key={label}
                    className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white/80 px-3 py-3 text-center shadow-sm backdrop-blur-sm lg:items-start lg:text-left"
                  >
                    <Icon className="h-5 w-5 text-primary-600" aria-hidden="true" />
                    <span className="text-xs font-semibold leading-snug text-text-primary sm:text-sm">
                      {label}
                    </span>
                  </li>
                );
              })}
            </ul>

            <ul className="mx-auto mt-8 max-w-xl space-y-3 text-left lg:mx-0">
              {hero.trustPoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-base text-text-secondary">
                  <CheckIcon />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
              <ButtonAnchor
                href={calendlyUrl || '/contact?plan=enterprise'}
                size="lg"
                variant="primary"
                className="w-full min-w-[240px] sm:w-auto"
                {...(calendlyUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {common.actions.bookDemo}
              </ButtonAnchor>
              <ButtonLink
                href="/scan"
                size="lg"
                variant="secondary"
                className="w-full min-w-[240px] sm:w-auto"
              >
                {common.actions.runFreeScan}
              </ButtonLink>
            </div>

            <p className="mt-4 text-sm text-text-tertiary">{hero.footnote}</p>

            <ul
              className="mt-10 flex flex-wrap items-center justify-center gap-2 lg:justify-start"
              aria-label={hero.standardsAria}
            >
              {hero.standards.map((standard) => (
                <li key={standard}>
                  <Badge
                    variant="outline"
                    size="lg"
                    className="border-2 border-gray-300 bg-white shadow-sm"
                  >
                    {standard}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>

          <figure className="relative mx-auto w-full max-w-xl lg:mx-0">
            <div className="relative aspect-[5/4] w-full overflow-hidden rounded-2xl border-2 border-primary-200 shadow-2xl">
              <MarketingImage
                src={MARKETING_IMAGES.hero}
                alt={hero.visual.imageAlt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 540px"
                className="object-cover object-center"
              />
            </div>
            <figcaption className="sr-only">{hero.visual.figcaption}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
