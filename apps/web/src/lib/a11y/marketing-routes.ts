/**
 * Canonical list of public marketing routes for accessibility audits and tests.
 * Keep in sync with apps/web/src/app/(marketing)/
 */

export type MarketingRouteKind = 'static' | 'cms' | 'dynamic';

export interface MarketingRoute {
  /** URL path (no trailing slash) */
  path: string;
  /** Human-readable label for reports */
  name: string;
  kind: MarketingRouteKind;
  /** Vitest component test — false when page needs live CMS or heavy mocks */
  vitest: boolean;
  notes?: string;
}

export const MARKETING_ROUTES: readonly MarketingRoute[] = [
  { path: '/', name: 'Home', kind: 'static', vitest: true },
  { path: '/services', name: 'Services', kind: 'static', vitest: true },
  { path: '/scan', name: 'Free Scan', kind: 'static', vitest: true },
  { path: '/widget', name: 'Accessibility Widget', kind: 'static', vitest: true },
  { path: '/about', name: 'About', kind: 'static', vitest: true },
  { path: '/contact', name: 'Contact', kind: 'static', vitest: true },
  { path: '/careers', name: 'Careers', kind: 'static', vitest: true },
  { path: '/docs', name: 'Documentation', kind: 'static', vitest: true },
  { path: '/waitlist', name: 'Waitlist', kind: 'static', vitest: true },
  { path: '/signup', name: 'Sign up', kind: 'static', vitest: true },
  { path: '/login', name: 'Sign in', kind: 'static', vitest: true },
  { path: '/privacy', name: 'Privacy Policy', kind: 'static', vitest: true },
  { path: '/terms', name: 'Terms of Service', kind: 'static', vitest: true },
  { path: '/refund', name: 'Refund Policy', kind: 'static', vitest: true },
  {
    path: '/accessibility-statement',
    name: 'Accessibility Statement',
    kind: 'static',
    vitest: true,
  },
  { path: '/rpwd-act', name: 'RPwD Act Guide', kind: 'static', vitest: true },
  { path: '/is-17802', name: 'IS 17802 Guide', kind: 'static', vitest: true },
  { path: '/gigw', name: 'GIGW 3.0 Guide', kind: 'static', vitest: true },
  { path: '/wcag-2-2-aa', name: 'WCAG 2.2 AA Guide', kind: 'static', vitest: true },
  { path: '/sebi-accessibility', name: 'SEBI Accessibility', kind: 'static', vitest: true },
  {
    path: '/blog',
    name: 'Blog index',
    kind: 'cms',
    vitest: true,
    notes: 'Sanity mocked in component tests',
  },
] as const;

export const MARKETING_AUDIT_ROUTES = MARKETING_ROUTES.filter((r) => r.path !== '/blog/[slug]');

export const MARKETING_VITEST_ROUTES = MARKETING_ROUTES.filter((r) => r.vitest);

/** axe impact → fix priority for reports */
export const AXE_IMPACT_PRIORITY: Record<string, number> = {
  critical: 1,
  serious: 2,
  moderate: 3,
  minor: 4,
};
