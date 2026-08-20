'use client';

import { LocaleLink } from '@/components/common/LocaleLink';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { ButtonLink } from '@/components/marketing/ButtonLink';
import { MobileMenuToggle } from './MobileMenuToggle';
import { useDictionary } from '@/lib/i18n/locale-context';

const navLinkClass =
  'text-base font-medium text-text-secondary hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded-sm';

export function MarketingNav() {
  const { common } = useDictionary();

  return (
    <header className="border-b border-primary-100 bg-white">
      <div
        className="h-1 w-full bg-gradient-to-r from-primary-800 via-primary-600 to-primary-400"
        aria-hidden="true"
      />
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8"
        aria-label={common.nav.mainAria}
      >
        <LocaleLink
          href="/"
          className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          aria-label={common.brand}
        >
          <BrandLogo variant="full" height={56} priority decorative />
        </LocaleLink>

        <div className="hidden items-center gap-8 md:flex">
          <LocaleLink href="/" className={navLinkClass}>
            {common.nav.home}
          </LocaleLink>
          <LocaleLink href="/services" className={navLinkClass}>
            {common.nav.services}
          </LocaleLink>
          <LocaleLink href="/widget" className={navLinkClass}>
            {common.nav.widget}
          </LocaleLink>
          <LocaleLink
            href="/document-scanner"
            className={`${navLinkClass} inline-flex items-center gap-1.5`}
          >
            {common.nav.documentScanner}
            <span className="inline-flex rounded-full bg-accent-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-700">
              New
            </span>
          </LocaleLink>
          <LocaleLink href="/blog" className={navLinkClass}>
            {common.nav.blog}
          </LocaleLink>
          <LocaleLink href="/scan" className={navLinkClass}>
            {common.nav.scan}
          </LocaleLink>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          <ButtonLink href="/login" size="md" variant="secondary">
            {common.nav.signIn}
          </ButtonLink>
          <ButtonLink href="/signup" size="md" variant="primary">
            {common.nav.startTrial}
          </ButtonLink>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher />
          <MobileMenuToggle />
        </div>
      </nav>
    </header>
  );
}
