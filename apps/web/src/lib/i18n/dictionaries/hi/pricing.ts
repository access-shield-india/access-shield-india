import type { PricingDict } from '../types';

export const pricing: PricingDict = {
  page: {
    title: 'Services',
    description:
      'Accessibility widget, scanning, remediation और compliance monitoring. Quote के लिए Contact sales करें।',
    eyebrow: 'हमारी services',
  },
  sections: {
    auditFirst: 'Audit से शुरू करें',
    step01: 'Step 01 — अपना plan चुनें',
    step02: 'Step 02 — Remediation',
    monitoring: 'Ongoing monitoring',
    faq: 'अक्सर पूछे जाने वाले सवाल',
    costOfInaction: 'कुछ न करने की cost',
  },
  billing: {
    monthly: 'Monthly',
    annual: 'Annual',
    save: '17% बचाएँ',
    exclGst: 'कीमतें 18% GST अलावा',
  },
  freeTier: {
    name: 'Free scan',
    description: '1 website · महीने में 1 scan · issue summary',
    cta: 'Free scan चलाएँ',
    signupCta: 'Free account बनाएँ',
  },
};
