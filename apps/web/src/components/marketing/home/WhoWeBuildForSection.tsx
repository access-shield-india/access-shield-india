import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { MARKETING_IMAGES } from '@/lib/marketing/images';
import { MarketingImage } from '@/components/marketing/visuals/MarketingImage';

export function WhoWeBuildForSection({ locale }: { locale: Locale }) {
  const { home } = getDictionary(locale);
  const w = home.whoWeBuildFor;

  return (
    <section
      className="border-y border-gray-200 bg-white px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
      aria-labelledby="who-we-build-for-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2
            id="who-we-build-for-heading"
            className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl"
          >
            {w.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-normal text-text-secondary">
            {w.subtitle}
          </p>
        </div>

        <figure className="relative mx-auto mt-12 max-w-5xl overflow-hidden rounded-2xl border border-gray-200 shadow-lg">
          <div className="relative aspect-[21/9] w-full">
            <MarketingImage
              src={MARKETING_IMAGES.accessibilityBanner}
              alt={w.imageAlt}
              fill
              sizes="(max-width: 1280px) 100vw, 1024px"
              className="object-cover object-center"
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-primary-900/70 via-primary-900/25 to-transparent"
              aria-hidden="true"
            />
            <blockquote className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:max-w-xl lg:p-10">
              <p className="text-lg font-medium leading-relaxed text-white sm:text-xl">
                &ldquo;{w.quote}&rdquo;
              </p>
              <footer className="mt-3 text-sm text-primary-100">— {w.quoteAuthor}</footer>
            </blockquote>
          </div>
          <figcaption className="sr-only">{w.figcaption}</figcaption>
        </figure>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {w.cards.map((group) => (
            <article
              key={group.title}
              className="rounded-lg border border-gray-200 bg-bg-secondary p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-text-primary">{group.title}</h3>
              <p className="mt-3 text-sm leading-normal text-text-secondary">
                <span className="font-medium text-text-primary">{w.barrierLabel}</span>{' '}
                {group.barrier}
              </p>
              <p className="mt-2 text-sm leading-normal text-text-secondary">
                <span className="font-medium text-text-primary">{w.checksLabel}</span>{' '}
                {group.checks}
              </p>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-base leading-normal text-text-secondary">
          {w.footer}
        </p>
      </div>
    </section>
  );
}
