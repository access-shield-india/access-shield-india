/** Single source of truth for marketing /services pricing (INR, excl. GST). */

export type BillingPeriod = 'monthly' | 'annual';

export interface MonthlyPlan {
  id: string;
  name: string;
  description: string;
  monthlyPriceInr: number;
  annualPriceInr: number;
  badge?: string;
  popular?: boolean;
  remediationRequired?: boolean;
  assessRequired?: boolean;
  noAuditRequired?: boolean;
  features: readonly string[];
  cta: { text: string; href: string };
  checkoutNote?: string;
}

export interface OneTimeSku {
  id: string;
  name: string;
  subtitle: string;
  priceInr: number;
  priceNote?: string;
  originalPriceInr?: number;
  /** Overrides default popular / highlighted pill when set. */
  badge?: string;
  popular?: boolean;
  highlighted?: boolean;
  features: readonly string[];
  cta: { text: string; href: string };
}

export const PRICING_CATALOG = {
  freeTier: {
    name: 'Free scan',
    description: '1 website · 1 scan per month · issue summary',
    cta: { text: 'Run free scan', href: '/scan' },
    signupCta: { text: 'Create free account', href: '/signup' },
  },

  /** STEP 01 — Monthly subscriptions */
  monthlyPlans: [
    {
      id: 'widget',
      name: 'Widget Only',
      description: 'Standalone — works on any website. No audit or remediation required.',
      monthlyPriceInr: 999,
      annualPriceInr: 9990,
      badge: 'No audit required',
      noAuditRequired: true,
      features: [
        '14-day free trial',
        'Accessibility widget (Hindi + English UI)',
        'Font size, contrast & dyslexia tools',
        'Keyboard navigation enhancements',
        'Widget updates & uptime monitoring',
        '10 document scans / month',
      ],
      cta: { text: 'Get started', href: '/signup?plan=widget' },
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'Scan, report, and widget — for companies getting started with compliance.',
      monthlyPriceInr: 1999,
      annualPriceInr: 19999,
      popular: true,
      badge: 'Most popular',
      features: [
        'Everything in Widget Only',
        '20 scans per month',
        '100 document scans / month',
        'Batch upload (25 files)',
        'PDF reports (WCAG 2.2 + IS 17802)',
        'Violation severity breakdown',
        'Scan history & email export',
      ],
      cta: { text: 'Start trial', href: '/signup?plan=professional' },
    },
    {
      id: 'compliance_shield',
      name: 'Stay Compliant',
      description: 'Ongoing monitoring after your site is remediated and certified.',
      monthlyPriceInr: 4999,
      annualPriceInr: 49990,
      remediationRequired: true,
      assessRequired: true,
      features: [
        'Everything in Professional',
        'Unlimited WCAG + IS 17802 scans',
        'Unlimited document scans',
        'Batch upload (100 files)',
        'Quarterly specialist spot-check',
        'Annual compliance assessment report',
        'Badge renewal & priority support',
      ],
      cta: { text: 'Talk to sales', href: '/contact?plan=stay-compliant' },
      checkoutNote: 'assess',
    },
    {
      id: 'regulatory_defense',
      name: 'Regulatory Defense',
      description: 'For listed companies, BFSI, PSUs, and government-facing organisations.',
      monthlyPriceInr: 7999,
      annualPriceInr: 79990,
      badge: 'BFSI & Govt',
      remediationRequired: true,
      assessRequired: true,
      features: [
        'Website + mobile app monitoring',
        'Everything in Stay Compliant',
        'Unlimited document scans + API access',
        'Batch upload (500 files)',
        'SEBI assessment (1/year included)',
        'RPwD & GIGW evidence pack',
        '72-hour regulatory triage',
        'IAAP-certified sign-off (annual)',
      ],
      cta: { text: 'Book demo', href: '/contact?plan=regulatory-defense' },
      checkoutNote: 'assess',
    },
  ] satisfies MonthlyPlan[],

  widgetDisclaimer:
    'The accessibility widget is a user-experience enhancement — not a compliance mechanism. It does not, on its own, make a site RPwD-, SEBI-, or GIGW-compliant. True compliance requires a full assessment, code-level remediation, and documented evidence.',

  /** STEP 02 — Remediation */
  remediation: [
    {
      id: 'remediation-small',
      name: 'Brochure site',
      subtitle: '1–15 pages · one-time remediation',
      priceInr: 49999,
      popular: true,
      priceNote: 'Additional pages beyond 15 billed at ₹2,000/page',
      features: [
        'Alt text & colour contrast fixes',
        'Heading structure & keyboard navigation',
        'Form labels and mobile touch targets',
        'Accessibility statement page',
        'Re-scan verification before hand-off',
      ],
      cta: { text: 'Book assessment call', href: '/contact?service=remediation-small' },
    },
    {
      id: 'remediation-large',
      name: 'Larger / e-commerce site',
      subtitle: 'Transaction flows · portals',
      priceInr: 99999,
      priceNote: 'From · scoped after assessment · additional pages quoted separately',
      features: [
        'Everything in Brochure site package',
        'Checkout & payment flow accessibility',
        'Template-level site-wide remediation',
        'PDF and document review',
        'Dedicated project manager',
      ],
      cta: { text: 'Contact sales', href: '/contact?service=remediation-large' },
    },
  ] satisfies OneTimeSku[],

  /** ADD-ON — Standalone assessment */
  standaloneAssessment: {
    id: 'assess',
    name: 'Compliance Website Audit & Scan',
    subtitle: 'Standalone or bundled with monitoring',
    priceInr: 4999,
    badge: 'Free for first 100 customers',
    highlighted: true,
    priceNote:
      'Launch offer — free for the first 100 customers · standard price ₹4,999 one-time · no subscription required',
    features: [
      'WCAG 2.2 AA + IS 17802 automated scan',
      'Hands-on manual review by specialists',
      'Keyboard and screen-reader testing',
      'Severity-ranked findings report',
      'Prioritized remediation roadmap',
      'Required before Stay Compliant & Regulatory Defense',
    ],
    cta: { text: 'Buy assessment', href: '/contact?service=assess' },
  } satisfies OneTimeSku,

  addons: [
    {
      id: 'mobile-scan',
      name: 'Mobile app assessment',
      subtitle: 'Android APK / iOS IPA',
      priceInr: 9999,
      features: [
        'Native app scan (Appium)',
        'WCAG 2.2 + IS 17802 mobile rules',
        'Screen-by-screen violation report',
        'Included with Regulatory Defense',
      ],
      cta: { text: 'Add mobile scan', href: '/contact?service=mobile-scan' },
    },
    {
      id: 'document-batch-audit',
      name: 'Document Accessibility Batch Audit',
      subtitle: 'Up to 500 documents per batch',
      priceInr: 15000,
      priceNote: 'Ideal for ministry document libraries and RTI archives',
      features: [
        'Up to 500 documents (PDF, Word, PowerPoint, Excel)',
        'Unified compliance report',
        'GIGW checkpoint summary',
        'Priority queue (2hr turnaround)',
        'Certificate-ready evidence pack',
      ],
      cta: { text: 'Get quote', href: '/contact?service=document-batch-audit' },
    },
  ] satisfies OneTimeSku[],

  reportFeatures: [
    'Accessibility score and severity breakdown',
    'WCAG 2.2 AA criterion mapping',
    'IS 17802 India-specific rule coverage',
    'Page-by-page violation export',
    'Downloadable PDF for audit files',
    'GIGW & RPwD alignment summary (Regulatory Defense)',
  ],

  indiaCompliance: {
    gstNote:
      'All prices exclude 18% GST. Registered businesses may claim input tax credit (ITC) on qualifying purchases. Government departments can pay via PO or annual contract.',
    links: [
      { label: 'RPwD Act 2016', href: '/rpwd-act' },
      { label: 'IS 17802', href: '/is-17802' },
      { label: 'GIGW 3.0', href: '/gigw' },
      { label: 'SEBI Accessibility', href: '/sebi-accessibility' },
    ],
  },

  enterprise: {
    cta: { text: 'Contact enterprise sales', href: '/contact?plan=enterprise' },
    note: 'Multi-site portfolios, custom SLAs, and on-site training are scoped after your baseline scan.',
  },

  rules: {
    gstRate: 0.18,
    assessPriceInr: 4999,
    assessLaunchFreeCustomerLimit: 100,
    professionalScansPerMonth: 20,
    remediationPerPageInr: 2000,
  },
} as const;

export const MONTHLY_PLANS = PRICING_CATALOG.monthlyPlans;

/** @deprecated Use MONTHLY_PLANS */
export interface PublicPlan {
  id: string;
  name: string;
  description: string;
  monthlyPriceInr: number | null;
  annualPriceInr: number | null;
  badge?: string;
  popular?: boolean;
  features: readonly string[];
  cta: { text: string; href: string };
}

export const PUBLIC_PLANS: PublicPlan[] = [];

function formatInrStatic(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatInr(amount: number): string {
  return formatInrStatic(amount);
}

export function formatPlanPrice(
  monthlyPriceInr: number,
  annualPriceInr: number,
  period: BillingPeriod,
): string {
  const amount = period === 'monthly' ? monthlyPriceInr : annualPriceInr;
  return `${formatInr(amount)}${period === 'annual' ? '/year' : '/month'}`;
}

export function assessCheckoutSubline(): string {
  const price = formatInr(PRICING_CATALOG.rules.assessPriceInr);
  return `Compliance Website Audit & Scan (${price}) is required before Stay Compliant or Regulatory Defense monitoring begins.`;
}

export function auditCheckoutSubline(): string {
  return assessCheckoutSubline();
}

/** @deprecated */
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPriceInr: number;
  annualPriceInr: number;
  features: readonly string[];
  cta: { text: string; href: string };
}

export const MONITORING_PLANS: SubscriptionPlan[] = [];
export const SUBSCRIPTION_PLANS = MONITORING_PLANS;
export const PAID_PUBLIC_PLANS: PublicPlan[] = [];

export function formatSubscriptionPrice(
  monthlyPriceInr: number,
  annualPriceInr: number,
  period: BillingPeriod,
): string {
  return formatPlanPrice(monthlyPriceInr, annualPriceInr, period);
}
