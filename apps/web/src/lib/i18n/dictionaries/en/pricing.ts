import type { PricingDict } from '../types';

export const pricing: PricingDict = {
  page: {
    title: 'AccessibleNow pricing — India',
    description:
      'Free scan acquisition, Developer & Professional SaaS, Enterprise programmes, and expert services. +18% GST. Illustrative strategy prices.',
    eyebrow: 'Pricing',
  },
  hero: {
    title: 'From free scan to RPwD-ready programme',
    subtitle:
      '+18% GST · Illustrative India pricing · Automated scans alone do not equal full conformance',
  },
  oneTime: {
    title: 'Expert services',
    badge: 'Compliance revenue',
    product: {
      name: 'Documented accessibility audit',
      price: 'From ₹24,999',
      description:
        'Automated + manual WCAG 2.2 / IS 17802 audit with remediation roadmap — what banks and PSUs need after a free scan.',
      features: [
        'Full automated + specialist review',
        'Prioritized remediation plan with owners',
        'Keyboard & screen-reader testing options',
        'Evidence pack for compliance stakeholders',
        'Pairs with Professional or Enterprise monitoring',
      ],
      cta: 'Book audit',
    },
  },
  subscriptions: {
    title: 'Product subscriptions',
    billingToggle: {
      monthly: 'Monthly',
      annual: 'Annual',
      save: 'Save ~17%',
    },
    plans: [
      {
        id: 'developer',
        name: 'Developer',
        badge: null,
        monthlyPrice: '₹1,499',
        annualPrice: '₹14,990',
        description: 'Detailed findings and AI guidance for one site',
        features: [
          '1 asset',
          '10 scans per month',
          'Detailed axe-core + IS 17802 findings',
          'AI remediation guidance (limited)',
          'Issue tracking',
          'Email support',
        ],
        cta: 'Start Developer',
      },
      {
        id: 'professional',
        name: 'Professional',
        badge: 'Most popular',
        monthlyPrice: '₹7,999',
        annualPrice: '₹79,990',
        description: 'Multi-project teams with reports and widget',
        features: [
          '10 assets · unlimited scans',
          'Everything in Developer, plus:',
          'Accessibility widget (Hindi + English)',
          'PDF reports · team workflows',
          'Policy PR Gate · Dynamic journeys',
          'Learn progress · priority support',
        ],
        cta: 'Start Professional',
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        badge: null,
        monthlyPrice: 'From ₹2.5L/yr',
        annualPrice: null,
        description: 'Monitoring, governance, and expert programme',
        features: [
          'Unlimited assets & scans',
          'Posture · Analytics · Policy · Red',
          'SEBI / GIGW / RPwD evidence packs',
          'Training · dedicated CSM · custom SLA',
          'SSO / API · annual contract',
        ],
        cta: 'Talk to sales',
      },
    ],
    comparisonTable: {
      title: 'Compare plans',
      rows: [
        { feature: 'Assets', developer: '1', professional: '10', enterprise: 'Unlimited' },
        {
          feature: 'Scans per month',
          developer: '10',
          professional: 'Unlimited',
          enterprise: 'Unlimited',
        },
        {
          feature: 'Widget',
          developer: '✗',
          professional: '✓',
          enterprise: '✓',
        },
        {
          feature: 'AI remediation',
          developer: 'Limited',
          professional: 'Advanced',
          enterprise: 'Advanced',
        },
        {
          feature: 'WCAG Report',
          developer: '✗',
          professional: '✓',
          enterprise: '✓',
        },
        {
          feature: 'Journeys / Red',
          developer: '✗',
          professional: '✓',
          enterprise: '✓',
        },
        {
          feature: 'SEBI / evidence packs',
          developer: '✗',
          professional: 'Basic',
          enterprise: '✓',
        },
        {
          feature: 'Manual audit',
          developer: 'Add-on',
          professional: 'Add-on',
          enterprise: 'In programme',
        },
        {
          feature: 'Support',
          developer: 'Email',
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
        question: 'Does an automated scan mean we are compliant?',
        answer:
          'No. Automated scanning alone cannot establish full WCAG, RPwD, IS 17802, GIGW, or SEBI conformance. Paid offers include or recommend manual testing and expert review.',
      },
      {
        question: 'Do you offer discounts for non-profits or educational institutions?',
        answer:
          'Yes. We offer 30% off Professional plans for registered non-profits and educational institutions in India. Contact sales with your registration documents.',
      },
    ],
  },
  sections: {
    auditFirst: 'Start with expert services',
    step01: 'Product subscriptions',
    step02: 'Remediation & services',
    monitoring: 'Enterprise programme',
    faq: 'Frequently asked questions',
    costOfInaction: 'Cost of inaction',
  },
  billing: {
    monthly: 'Monthly',
    annual: 'Annual',
    save: 'Save ~17%',
    exclGst: 'Prices excl. 18% GST · illustrative strategy',
  },
  freeTier: {
    name: 'Free scan',
    description: '1 website · 1 scan · issue summary — acquisition channel',
    cta: 'Run free scan',
    signupCta: 'Start Developer',
  },
};
