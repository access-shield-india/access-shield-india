import type { PricingDict } from '../types';

export const pricing: PricingDict = {
  page: {
    title: 'Indian Rupees में Transparent Pricing',
    description:
      'INR में clear, honest pricing। +18% GST · हर payment पर GST invoice · कोई agency fees नहीं',
    eyebrow: 'Pricing',
  },
  hero: {
    title: 'Indian Rupees में transparent pricing',
    subtitle: '+18% GST · हर payment पर GST invoice · कोई agency fees नहीं',
  },
  oneTime: {
    title: 'One-time compliance',
    badge: 'Deadline-driven buyers के लिए',
    product: {
      name: 'Certification Pass',
      price: '₹19,999–₹34,999',
      description:
        'Deadline-driven और first-time compliance buyers के लिए। Full audit + certificate, कोई subscription नहीं।',
      features: [
        'Full automated + manual WCAG 2.2 AA audit',
        'Public verification certificate',
        'WCAG Compliance Report (VPAT-style)',
        '30 days के लिए priority email support',
        'Optional: renewal पर Starter में convert हो सकता है',
      ],
      cta: 'Certified हो जाइए',
    },
  },
  subscriptions: {
    title: 'Subscription plans',
    billingToggle: {
      monthly: 'Monthly',
      annual: 'Annual',
      save: '17% बचाएँ',
    },
    plans: [
      {
        id: 'starter',
        name: 'Starter',
        badge: null,
        monthlyPrice: '₹4,999',
        annualPrice: '₹49,999',
        description: 'Compliance start करने वाली small sites के लिए',
        features: [
          '1 asset',
          'महीने में 3 scans',
          'Automated axe-core + IS 17802 scanning',
          'AI fix suggestions',
          'Issue tracking',
          'Email support',
        ],
        cta: 'Free trial शुरू करें',
      },
      {
        id: 'professional',
        name: 'Professional',
        badge: 'सबसे popular',
        monthlyPrice: '₹9,999',
        annualPrice: '₹99,999',
        description: 'Accessible products ship करने वाली teams के लिए',
        features: [
          '10 assets',
          'Unlimited scans',
          'Starter में सब कुछ, plus:',
          'Accessibility widget (Hindi + English)',
          'AI remediation guidance',
          'WCAG Compliance Report',
          'Audit के बाद certification badge',
          'Priority support',
          '1 training session (onboarding)',
        ],
        cta: 'Free trial शुरू करें',
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        badge: null,
        monthlyPrice: '₹2.5L/yr से',
        annualPrice: null,
        description: 'Regulated entities और large teams के लिए',
        features: [
          'Unlimited assets',
          'Unlimited scans',
          'Professional में सब कुछ, plus:',
          'Manual IAAP-certified audit',
          'SEBI Digital Accessibility Report',
          'Quarterly compliance re-scans',
          'Dedicated success manager',
          'Custom SLA',
          'API access',
        ],
        cta: 'Sales से contact करें',
      },
    ],
    comparisonTable: {
      title: 'Plans compare करें',
      rows: [
        { feature: 'Assets', starter: '1', professional: '10', enterprise: 'Unlimited' },
        {
          feature: 'महीने में scans',
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
          professional: 'Audit के बाद',
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
          'Disabilities वाले real users आपकी critical journeys test करते हैं। Disability-organisation partners के साथ deliver किया जाता है।',
      },
      {
        name: 'Developer Training',
        price: '₹4,999 per session',
        description: 'Live 2-hour WCAG 2.2 / IS 17802 / screen reader testing workshops।',
      },
      {
        name: 'Managed Remediation',
        price: '₹14,999–₹2,49,999',
        description:
          'हमारे developers आपके लिए fixes implement करते हैं। Scope के base पर pricing।',
      },
      {
        name: 'SEBI Compliance Bundle',
        price: '₹49,999',
        description: 'Full SEBI submission package: audit, report, evidence pack, annual re-scan।',
      },
    ],
  },
  sebiCallout: {
    title: 'SEBI-regulated entity हैं?',
    description:
      'SEBI Compliance Bundle में आपकी April 2026 deadline के लिए सब कुछ शामिल है: WCAG 2.1 AA audit, SEBI-formatted report, evidence pack, remediation guidance, और annual re-audit schedule।',
    cta: 'SEBI compliance के बारे में जानें',
  },
  faq: {
    title: 'अक्सर पूछे जाने वाले सवाल',
    questions: [
      {
        question: 'क्या आप GST invoices provide करते हैं?',
        answer:
          'हाँ। हर payment में हमारे GSTIN के साथ GST-compliant invoice शामिल है। Invoices automatically भेजे जाते हैं और आपके dashboard में available होते हैं।',
      },
      {
        question: 'आपकी refund policy क्या है?',
        answer:
          'हम सभी subscription plans पर 14-day money-back guarantee offer करते हैं। अगर satisfied नहीं हैं, तो purchase के 14 days के अंदर email करें full refund के लिए। Certification Pass purchases audit deliver होने के बाद non-refundable हैं।',
      },
      {
        question: 'क्या मैं बाद में plans change कर सकता हूँ?',
        answer:
          'हाँ। आप किसी भी time upgrade या downgrade कर सकते हैं। Upgrades immediately effect में आते हैं। Downgrades अगले billing cycle में effect में आते हैं। Prorated credits आपके account में apply किए जाते हैं।',
      },
      {
        question: 'मेरी Certification Pass expire होने के बाद क्या होता है?',
        answer:
          'Certification Pass 12 months के लिए valid है। Expiry के बाद, आप certification renew कर सकते हैं (₹9,999) या continuous monitoring maintain करने के लिए Starter subscription में convert कर सकते हैं।',
      },
      {
        question:
          'क्या आप non-profits या educational institutions के लिए discounts offer करते हैं?',
        answer:
          'हाँ। हम India में registered non-profits और educational institutions के लिए Professional plans पर 30% off offer करते हैं। अपने registration documents के साथ sales से contact करें।',
      },
    ],
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
