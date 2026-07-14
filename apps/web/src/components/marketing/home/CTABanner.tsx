'use client';

import { Badge } from '@accessshield/ui';
import { ButtonAnchor, ButtonLink } from '@/components/marketing/ButtonLink';
import { MARKETING_IMAGES } from '@/lib/marketing/images';
import { MarketingImage } from '@/components/marketing/visuals/MarketingImage';
import { useDictionary } from '@/lib/i18n/locale-context';

export function CTABanner() {
  const { home } = useDictionary();
  const { cta } = home;
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

  return (
    <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="absolute inset-0" aria-hidden="true">
        <MarketingImage
          src={MARKETING_IMAGES.enterpriseCompliance}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-primary-900/88" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        <div className="flex justify-center">
          <Badge
            variant="outline"
            size="lg"
            className="border-2 border-primary-400 bg-primary-800/80 text-primary-100"
          >
            {cta.badge}
          </Badge>
        </div>
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {cta.title}
        </h2>
        <p className="mt-6 text-lg leading-normal text-primary-100">{cta.body}</p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <ButtonLink href="/scan" size="lg" variant="onDark" className="min-w-[220px]">
            {cta.scanCta}
          </ButtonLink>
          <ButtonAnchor
            href={calendlyUrl || '/contact'}
            size="lg"
            variant="onDark"
            className="min-w-[220px] border-2 border-white bg-transparent text-white hover:bg-white/10"
            {...(calendlyUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {cta.expertCta}
          </ButtonAnchor>
        </div>
      </div>
    </section>
  );
}
