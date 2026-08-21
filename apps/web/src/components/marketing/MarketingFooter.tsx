'use client';

import { LocaleLink } from '@/components/common/LocaleLink';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useDictionary } from '@/lib/i18n/locale-context';

const footerLinkClass =
  'text-base text-text-secondary hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded-sm';

export function MarketingFooter() {
  const { common } = useDictionary();
  const currentYear = new Date().getFullYear();
  const { footer: f, brand } = common;

  return (
    <footer className="border-t border-primary-100 bg-primary-50/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10">
          <LocaleLink
            href="/"
            className="inline-block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
            aria-label={brand}
          >
            <BrandLogo variant="full" height={64} decorative />
          </LocaleLink>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-700">
              {f.compliance}
            </h2>
            <ul className="mt-4 space-y-3">
              <li>
                <LocaleLink href="/rpwd-act" className={footerLinkClass}>
                  {f.links.rpwd}
                </LocaleLink>
              </li>
              <li>
                <LocaleLink href="/is-17802" className={footerLinkClass}>
                  {f.links.is17802}
                </LocaleLink>
              </li>
              <li>
                <LocaleLink href="/gigw" className={footerLinkClass}>
                  {f.links.gigw}
                </LocaleLink>
              </li>
              <li>
                <LocaleLink href="/wcag-2-2-aa" className={footerLinkClass}>
                  {f.links.wcag}
                </LocaleLink>
              </li>
              <li>
                <LocaleLink href="/sebi-accessibility" className={footerLinkClass}>
                  {f.links.sebi}
                </LocaleLink>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-700">
              {f.product}
            </h2>
            <ul className="mt-4 space-y-3">
              <li>
                <LocaleLink href="/scan" className={footerLinkClass}>
                  {f.links.freeScan}
                </LocaleLink>
              </li>
              <li>
                <LocaleLink href="/services" className={footerLinkClass}>
                  {f.links.services}
                </LocaleLink>
              </li>
              <li>
                <LocaleLink href="/widget" className={footerLinkClass}>
                  {f.links.widget}
                </LocaleLink>
              </li>
              <li>
                <LocaleLink href="/document-scanner" className={footerLinkClass}>
                  {f.links.documentScanner}
                </LocaleLink>
              </li>
              <li>
                <LocaleLink href="/docs" className={footerLinkClass}>
                  {f.links.docs}
                </LocaleLink>
              </li>
              <li>
                <LocaleLink href="/blog" className={footerLinkClass}>
                  {f.links.blog}
                </LocaleLink>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-700">
              {f.company}
            </h2>
            <ul className="mt-4 space-y-3">
              <li>
                <LocaleLink href="/about" className={footerLinkClass}>
                  {f.links.about}
                </LocaleLink>
              </li>
              <li>
                <LocaleLink href="/contact" className={footerLinkClass}>
                  {f.links.contact}
                </LocaleLink>
              </li>
              <li>
                <LocaleLink href="/careers" className={footerLinkClass}>
                  {f.links.careers}
                </LocaleLink>
              </li>
              <li>
                <a
                  href={process.env.NEXT_PUBLIC_CALENDLY_URL || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={footerLinkClass}
                >
                  {f.bookDemo}
                  <span className="sr-only"> {f.opensNewTab}</span>
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-700">
              {f.legal}
            </h2>
            <ul className="mt-4 space-y-3">
              <li>
                <LocaleLink href="/privacy" className={footerLinkClass}>
                  {f.links.privacy}
                </LocaleLink>
              </li>
              <li>
                <LocaleLink href="/terms" className={footerLinkClass}>
                  {f.links.terms}
                </LocaleLink>
              </li>
              <li>
                <LocaleLink href="/refund" className={footerLinkClass}>
                  {f.links.refund}
                </LocaleLink>
              </li>
              <li>
                <LocaleLink href="/accessibility-statement" className={footerLinkClass}>
                  {f.links.accessibility}
                </LocaleLink>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-primary-100 pt-8">
          <p className="text-sm text-text-secondary">
            &copy; {currentYear} {brand}. {f.copyright}
            <span className="ml-4">{f.gstin}</span>
            <span className="ml-4">{f.location}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
