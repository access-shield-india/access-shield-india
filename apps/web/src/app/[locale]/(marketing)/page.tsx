import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import { HeroSection } from '@/components/marketing/home/HeroSection';
import { LiveTicker } from '@/components/marketing/home/LiveTicker';
import { RiskStatsBar } from '@/components/marketing/home/RiskStatsBar';
import { FeaturesSection } from '@/components/marketing/home/FeaturesSection';
import { WhoWeBuildForSection } from '@/components/marketing/home/WhoWeBuildForSection';
import { HowItWorksSection } from '@/components/marketing/home/HowItWorksSection';
import { StandardsSection } from '@/components/marketing/home/StandardsSection';
import { TestimonialsSection } from '@/components/marketing/home/TestimonialsSection';
import { BlogPreviewSection } from '@/components/marketing/home/BlogPreviewSection';
import { MarketingSectionSkeleton } from '@/components/marketing/MarketingSectionSkeleton';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { localeFromParams } from '@/lib/i18n/server';
import { localizedHref } from '@/lib/i18n/paths';
import type { Locale } from '@/lib/i18n/config';

/** ISR — refresh marketing home hourly (blog preview may lag up to 60s via Sanity revalidate). */
export const revalidate = 3600;

const CTABanner = dynamic(
  () =>
    import('@/components/marketing/home/CTABanner').then((mod) => ({
      default: mod.CTABanner,
    })),
  { loading: () => <MarketingSectionSkeleton className="min-h-[280px]" /> },
);

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = localeFromParams(params);
  const { home } = getDictionary(locale);
  const base = 'https://accessshield.in';

  return {
    title: home.meta.title,
    description: home.meta.description,
    openGraph: {
      title: 'Enterprise Digital Accessibility | AccessShield India',
      description: home.meta.description,
      type: 'website',
    },
    alternates: {
      canonical: localizedHref('/', locale) === '/' ? base : `${base}${localizedHref('/', locale)}`,
      languages: {
        en: base,
        hi: `${base}/hi`,
      },
    },
  };
}

export default function HomePage({ params }: { params: { locale: string } }) {
  const locale = localeFromParams(params) as Locale;

  return (
    <>
      <HeroSection />
      <LiveTicker />
      <RiskStatsBar locale={locale} />
      <FeaturesSection locale={locale} />
      <WhoWeBuildForSection locale={locale} />
      <HowItWorksSection locale={locale} />
      <StandardsSection locale={locale} />
      <TestimonialsSection locale={locale} />
      <Suspense fallback={<MarketingSectionSkeleton className="min-h-[320px]" />}>
        <BlogPreviewSection locale={locale} />
      </Suspense>
      <CTABanner />
    </>
  );
}
