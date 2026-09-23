import type { PricingDict } from '../types';

export const pricing: PricingDict = {
  page: {
    title: 'Transparent pricing in Indian Rupees',
    description:
      'Clear, honest pricing in INR. +18% GST · GST invoice on every payment · No agency fees',
    eyebrow: 'Pricing',
  },
  hero: {
    title: 'Transparent pricing in Indian Rupees',
    subtitle: '+18% GST · GST invoice on every payment · No agency fees',
  },
  oneTime: {
    title: 'One-time compliance',
    badge: 'For deadline-driven buyers',
    product: {
      name: 'Certification Pass',
      price: '₹19,999–₹34,999',
      description:
        'For deadline-driven and first-time compliance buyers. Full audit + certificate, no subscription.',
      features: [
        'Full automated + manual WCAG 2.2 AA audit',
        'Public verification certificate',
        'WCAG Compliance Report (VPAT-style)',
        'Priority email support for 30 days',
        'Optional: Converts to Starter at renewal',
      ],
      cta: 'Get certified',
    },
  },
  subscriptions: {
    title: 'Subscription plans',
    billingToggle: {
      monthly: 'Monthly',
      annual: 'Annual',
      save: 'Save 17%',
    },
    plans: [
      {
        id: 'starter',
        name: 'Starter',
        badge: null,
        monthlyPrice: '₹4,999',
        annualPrice: '₹49,999',
        description: 'For small sites getting started with compliance',
        features: [
          '1 asset',
          '3 scans per month',
          'Automated axe-core + IS 17802 scanning',
          'AI fix suggestions',
          'Issue tracking',
          'Email support',
        ],
        cta: 'Start free trial',
      },
      {
        id: 'professional',
        name: 'Professional',
        badge: 'Most popular',
        monthlyPrice: '₹9,999',
        annualPrice: '₹99,999',
        description: 'For teams shipping accessible products',
        features: [
          '10 assets',
          'Unlimited scans',
          'Everything in Starter, plus:',
          'Accessibility widget (Hindi + English)',
          'AI remediation guidance',
          'WCAG Compliance Report',
          'Certification badge after audit',
          'Priority support',
          '1 training session (onboarding)',
        ],
        cta: 'Start free trial',
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        badge: null,
        monthlyPrice: 'From ₹2.5L/yr',
        annualPrice: null,
        description: 'For regulated entities and large teams',
        features: [
          'Unlimited assets',
          'Unlimited scans',
          'Everything in Professional, plus:',
          'Manual IAAP-certified audit',
          'SEBI Digital Accessibility Report',
          'Quarterly compliance re-scans',
          'Dedicated success manager',
          'Custom SLA',
          'API access',
        ],
        cta: 'Contact sales',
      },
    ],
    comparisonTable: {
      title: 'Compare plans',
      rows: [
        { feature: 'Assets', starter: '1', professional: '10', enterprise: 'Unlimited' },
        {
          feature: 'Scans per month',
          starter: '3',
          professional: 'Unlimited',
          enterprise: 'Unlimited',
        },
        {
          feature: 'Widget',
          starter: '✗',
          professional: '✓',
          enterprise: '✓',
        },
        {
          feature: 'AI remediation',
          starter: 'Basic',
          professional: 'Advanced',
          enterprise: 'Advanced',
        },
        {
          feature: 'WCAG Report',
          starter: '✗',
          professional: '✓',
          enterprise: '✓',
        },
        {
          feature: 'Certification badge',
          starter: '✗',
          professional: 'After audit',
          enterprise: 'Included',
        },
        {
          feature: 'Manual audit',
          starter: 'Add-on',
          professional: 'Add-on',
          enterprise: 'Included',
        },
        {
          feature: 'SEBI report',
          starter: '✗',
          professional: '✗',
          enterprise: '✓',
        },
        {
          feature: 'Compliance re-scan',
          starter: '✗',
          professional: '✗',
          enterprise: 'Quarterly',
        },
        {
          feature: 'Support',
          starter: 'Email',
          professional: 'Priority',
          enterprise: 'Dedicated',
        },
      ],
    },
  },
  addOns: {
    title: 'Add-ons',
    items: [
      {
        name: 'PwD User Testing',
        price: '₹8,999',
        description:
          'Real users with disabilities test your critical journeys. Delivered with disability-organisation partners.',
      },
      {
        name: 'Developer Training',
        price: '₹4,999 per session',
        description: 'Live 2-hour WCAG 2.2 / IS 17802 / screen reader testing workshops.',
      },
      {
        name: 'Managed Remediation',
        price: '₹14,999–₹2,49,999',
        description: 'Our developers implement the fixes for you. Pricing based on scope.',
      },
      {
        name: 'SEBI Compliance Bundle',
        price: '₹49,999',
        description: 'Full SEBI submission package: audit, report, evidence pack, annual re-scan.',
      },
    ],
  },
  sebiCallout: {
    title: 'SEBI-regulated entity?',
    description:
      'The SEBI Compliance Bundle includes everything needed for your April 2026 deadline: WCAG 2.1 AA audit, SEBI-formatted report, evidence pack, remediation guidance, and annual re-audit schedule.',
    cta: 'Learn about SEBI compliance',
  },
  faq: {
    title: 'Frequently asked questions',
    questions: [
      {
        question: 'Do you provide GST invoices?',
        answer:
          'Yes. Every payment includes a GST-compliant invoice with our GSTIN. Invoices are sent automatically and available in your dashboard.',
      },
      {
        question: 'What is your refund policy?',
        answer:
          "We offer a 14-day money-back guarantee on all subscription plans. If you're not satisfied, email us within 14 days of purchase for a full refund. Certification Pass purchases are non-refundable after the audit is delivered.",
      },
      {
        question: 'Can I change plans later?',
        answer:
          'Yes. You can upgrade or downgrade at any time. Upgrades take effect immediately. Downgrades take effect at the next billing cycle. Prorated credits are applied to your account.',
      },
      {
        question: 'What happens after my Certification Pass expires?',
        answer:
          'Certification Pass is valid for 12 months. After expiry, you can renew the certification (₹9,999) or convert to a Starter subscription to maintain continuous monitoring.',
      },
      {
        question: 'Do you offer discounts for non-profits or educational institutions?',
        answer:
          'Yes. We offer 30% off Professional plans for registered non-profits and educational institutions in India. Contact sales with your registration documents.',
      },
    ],
  },
  sections: {
    auditFirst: 'Start with an audit',
    step01: 'Step 01 — Choose your plan',
    step02: 'Step 02 — Remediation',
    monitoring: 'Ongoing monitoring',
    faq: 'Frequently asked questions',
    costOfInaction: 'Cost of inaction',
  },
  billing: {
    monthly: 'Monthly',
    annual: 'Annual',
    save: 'Save 17%',
    exclGst: 'Prices excl. 18% GST',
  },
  freeTier: {
    name: 'Free scan',
    description: '1 website · 1 scan per month · issue summary',
    cta: 'Run free scan',
    signupCta: 'Create free account',
  },
};
