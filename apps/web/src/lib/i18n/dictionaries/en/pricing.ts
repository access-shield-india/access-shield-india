import type { PricingDict } from '../types';

export const pricing: PricingDict = {
  page: {
    title: 'Services',
    description:
      'Accessibility widget, scanning, remediation, and compliance monitoring. Contact sales for a tailored quote.',
    eyebrow: 'Our services',
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
