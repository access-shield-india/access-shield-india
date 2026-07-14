import type { Metadata } from 'next';
import { MarketingContentPage } from '@/components/marketing/MarketingContentPage';
import { AboutIllustration } from '@/components/marketing/visuals';
import { CTABanner } from '@/components/marketing/home/CTABanner';
import { ButtonLink } from '@/components/marketing/ButtonLink';
import { LocaleLink } from '@/components/common/LocaleLink';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { localeFromParams } from '@/lib/i18n/server';

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = localeFromParams(params);
  const { pages } = getDictionary(locale);
  return {
    title: pages.about.meta.title,
    description: pages.about.meta.description,
    openGraph: {
      title: `${pages.about.meta.title} | AccessShield India`,
      description: pages.about.meta.description,
    },
  };
}

export default function AboutPage({ params }: { params: { locale: string } }) {
  const locale = localeFromParams(params);
  const { pages, common } = getDictionary(locale);
  const about = pages.about;

  return (
    <>
      <MarketingContentPage
        title={about.title}
        description={about.description}
        visual={<AboutIllustration />}
        visualLabel="Team collaborating on accessibility compliance"
      >
        {about.sections?.map((section) => (
          <section key={section.id} aria-labelledby={`${section.id}-heading`}>
            <h2 id={`${section.id}-heading`} className="text-xl font-semibold text-text-primary">
              {section.heading}
            </h2>
            {section.body ? <p>{section.body}</p> : null}
            {section.list ? (
              <ul className="list-disc space-y-2 pl-6">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <section aria-labelledby="standards-heading">
          <h2 id="standards-heading" className="text-xl font-semibold text-text-primary">
            {locale === 'hi' ? 'जिन standards में हम मदद करते हैं' : 'Standards we help you meet'}
          </h2>
          <p>
            {locale === 'hi'
              ? 'हमारी compliance guides देखें: '
              : 'Explore our compliance guides: '}
            <LocaleLink
              href="/rpwd-act"
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              RPwD Act
            </LocaleLink>
            ,{' '}
            <LocaleLink
              href="/is-17802"
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              IS 17802
            </LocaleLink>
            ,{' '}
            <LocaleLink
              href="/gigw"
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              GIGW 3.0
            </LocaleLink>
            ,{' '}
            <LocaleLink
              href="/wcag-2-2-aa"
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              WCAG 2.2 AA
            </LocaleLink>
            , {locale === 'hi' ? 'और ' : 'and '}
            <LocaleLink
              href="/sebi-accessibility"
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              SEBI accessibility
            </LocaleLink>
            .
          </p>
        </section>

        <div className="flex flex-wrap gap-4 pt-2">
          <ButtonLink href="/signup" variant="primary">
            {common.nav.startTrial}
          </ButtonLink>
          <ButtonLink href="/contact" variant="secondary">
            {common.actions.talkToUs}
          </ButtonLink>
        </div>
      </MarketingContentPage>
      <CTABanner />
    </>
  );
}
