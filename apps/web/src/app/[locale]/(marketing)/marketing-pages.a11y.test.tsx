import type React from 'react';
import { describe, it } from 'vitest';
import { MARKETING_VITEST_ROUTES } from '@/lib/a11y/marketing-routes';
import { expectNoAxeViolations, renderMarketingPage } from '@/test/a11y/marketing-test-utils';

import HomePage from '@/app/[locale]/(marketing)/page';
import ServicesPage from '@/app/[locale]/(marketing)/services/page';
import ScanPage from '@/app/[locale]/(marketing)/scan/page';
import WidgetPage from '@/app/[locale]/(marketing)/widget/page';
import AboutPage from '@/app/[locale]/(marketing)/about/page';
import ContactPage from '@/app/[locale]/(marketing)/contact/page';
import CareersPage from '@/app/[locale]/(marketing)/careers/page';
import DocsPage from '@/app/[locale]/(marketing)/docs/page';
import SignupPage from '@/app/[locale]/(marketing)/signup/page';
import LoginPage from '@/app/[locale]/(marketing)/login/page';
import PrivacyPage from '@/app/[locale]/(marketing)/privacy/page';
import TermsPage from '@/app/[locale]/(marketing)/terms/page';
import RefundPage from '@/app/[locale]/(marketing)/refund/page';
import AccessibilityStatementPage from '@/app/[locale]/(marketing)/accessibility-statement/page';
import RpwdActPage from '@/app/[locale]/(marketing)/rpwd-act/page';
import Is17802Page from '@/app/[locale]/(marketing)/is-17802/page';
import GigwPage from '@/app/[locale]/(marketing)/gigw/page';
import WcagPage from '@/app/[locale]/(marketing)/wcag-2-2-aa/page';
import SebiPage from '@/app/[locale]/(marketing)/sebi-accessibility/page';
import BlogPage from '@/app/[locale]/(marketing)/blog/page';

const PAGE_COMPONENTS: Record<string, () => React.ReactNode | Promise<React.ReactNode>> = {
  '/': () => HomePage({ params: { locale: 'en' } }),
  '/services': ServicesPage,
  '/scan': ScanPage,
  '/widget': WidgetPage,
  '/about': () => AboutPage({ params: { locale: 'en' } }),
  '/contact': ContactPage,
  '/careers': CareersPage,
  '/docs': DocsPage,
  '/signup': SignupPage,
  '/login': LoginPage,
  '/privacy': PrivacyPage,
  '/terms': TermsPage,
  '/refund': RefundPage,
  '/accessibility-statement': AccessibilityStatementPage,
  '/rpwd-act': RpwdActPage,
  '/is-17802': Is17802Page,
  '/gigw': GigwPage,
  '/wcag-2-2-aa': WcagPage,
  '/sebi-accessibility': SebiPage,
  '/blog': () => BlogPage({ searchParams: {} }),
};

describe('Marketing pages accessibility (WCAG 2.2 AA)', () => {
  for (const route of MARKETING_VITEST_ROUTES) {
    if (route.path === '/waitlist') continue;

    const Page = PAGE_COMPONENTS[route.path];
    if (!Page) {
      it.skip(`${route.name} (${route.path}) — no test component mapped`, () => undefined);
      continue;
    }

    it(`${route.name} (${route.path}) has no axe violations`, async () => {
      const { container } = await renderMarketingPage(Page);
      await expectNoAxeViolations(container);
    });
  }
});
