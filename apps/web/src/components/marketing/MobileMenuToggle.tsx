'use client';

import { useState } from 'react';
import { useFocusTrap } from '@accessshield/ui';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { ButtonLink } from '@/components/marketing/ButtonLink';
import { LocaleLink } from '@/components/common/LocaleLink';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { useDictionary } from '@/lib/i18n/locale-context';

export function MobileMenuToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>({ active: isOpen });
  const { common } = useDictionary();
  const { nav } = common;

  const handleClose = () => setIsOpen(false);

  const linkClass =
    'block rounded-md px-3 py-3 text-base font-medium text-text-secondary hover:bg-gray-100 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        aria-label={nav.toggleMenu}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          aria-hidden="true"
        >
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={handleClose}
            aria-hidden="true"
          />

          <div
            id="mobile-menu"
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label={nav.mobileMenuAria}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white px-6 py-6 shadow-xl sm:max-w-sm"
          >
            <div className="flex items-center justify-between">
            <BrandLogo variant="full" height={48} decorative />
              <button
                type="button"
                onClick={handleClose}
                aria-label={nav.closeMenu}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6">
              <LanguageSwitcher />
            </div>

            <nav className="mt-8 flex flex-col gap-4">
              <LocaleLink href="/" onClick={handleClose} className={linkClass}>
                {nav.home}
              </LocaleLink>
              <LocaleLink href="/services" onClick={handleClose} className={linkClass}>
                {nav.services}
              </LocaleLink>
              <LocaleLink href="/widget" onClick={handleClose} className={linkClass}>
                {nav.widget}
              </LocaleLink>
              <LocaleLink
                href="/document-scanner"
                onClick={handleClose}
                className={`${linkClass} flex items-center gap-2`}
              >
                {nav.documentScanner}
                <span className="inline-flex rounded-full bg-accent-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-700">
                  New
                </span>
              </LocaleLink>
              <LocaleLink href="/blog" onClick={handleClose} className={linkClass}>
                {nav.blog}
              </LocaleLink>
              <LocaleLink href="/scan" onClick={handleClose} className={linkClass}>
                {nav.scan}
              </LocaleLink>

              <hr className="my-4 border-gray-200" />

              <ButtonLink
                href="/login"
                size="lg"
                variant="secondary"
                className="w-full"
                onClick={handleClose}
              >
                {nav.signIn}
              </ButtonLink>
              <ButtonLink
                href="/signup"
                size="lg"
                variant="primary"
                className="w-full"
                onClick={handleClose}
              >
                {nav.startTrial}
              </ButtonLink>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
