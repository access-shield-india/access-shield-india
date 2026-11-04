import type { PricingDict } from '../types';

export const pricing: PricingDict = {
  page: {
    title: 'AccessibleNow pricing — भारत',
    description:
      'Free scan, Developer और Professional SaaS, Enterprise programmes, और expert services. +18% GST. Illustrative strategy prices.',
    eyebrow: 'Pricing',
  },
  hero: {
    title: 'Free scan से RPwD-ready programme तक',
    subtitle:
      '+18% GST · भारत के लिए illustrative pricing · केवल automated scan = पूर्ण conformance नहीं',
  },
  oneTime: {
    title: 'Expert services',
    badge: 'Compliance revenue',
    product: {
      name: 'Documented accessibility audit',
      price: '₹24,999 से',
      description:
        'Automated + manual WCAG 2.2 / IS 17802 audit और remediation roadmap — banks और PSUs को free scan के बाद यही चाहिए।',
      features: [
        'Full automated + specialist review',
        'Prioritized remediation plan with owners',
        'Keyboard और screen-reader testing options',
        'Compliance stakeholders के लिए evidence pack',
        'Professional या Enterprise monitoring के साथ जोड़ा जा सकता है',
      ],
      cta: 'Audit बुक करें',
    },
  },
  subscriptions: {
    title: 'Product subscriptions',
    billingToggle: {
      monthly: 'Monthly',
      annual: 'Annual',
      save: '~17% बचाएँ',
    },
    plans: [
      {
        id: 'developer',
        name: 'Developer',
        badge: null,
        monthlyPrice: '₹1,499',
        annualPrice: '₹14,990',
        description: 'एक site के लिए detailed findings और AI guidance',
        features: [
          '1 asset',
          'महीने में 10 scans',
          'Detailed axe-core + IS 17802 findings',
          'AI remediation guidance (limited)',
          'Issue tracking',
          'Email support',
        ],
        cta: 'Developer शुरू करें',
      },
      {
        id: 'professional',
        name: 'Professional',
        badge: 'सबसे popular',
        monthlyPrice: '₹7,999',
        annualPrice: '₹79,990',
        description: 'Multi-project teams — reports और widget के साथ',
        features: [
          '10 assets · unlimited scans',
          'Developer में सब कुछ, plus:',
          'Accessibility widget (Hindi + English)',
          'PDF reports · team workflows',
          'Policy PR Gate · Dynamic journeys',
          'Learn progress · priority support',
        ],
        cta: 'Professional शुरू करें',
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        badge: null,
        monthlyPrice: '₹2.5L/yr से',
        annualPrice: null,
        description: 'Monitoring, governance, और expert programme',
        features: [
          'Unlimited assets & scans',
          'Posture · Analytics · Policy · Red',
          'SEBI / GIGW / RPwD evidence packs',
          'Training · dedicated CSM · custom SLA',
          'SSO / API · annual contract',
        ],
        cta: 'Sales से बात करें',
      },
    ],
    comparisonTable: {
      title: 'Plans की तुलना',
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
          enterprise: 'Programme में',
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
    title: 'Add-ons और expert SKUs',
    items: [
      {
        name: 'Screen reader & keyboard testing',
        price: '₹19,999 से',
        description: 'Critical journeys पर AT-assisted testing और evidence notes.',
      },
      {
        name: 'Developer Training',
        price: '₹4,999 / session',
        description: 'Live 2-hour WCAG 2.2 / IS 17802 / screen reader workshops.',
      },
      {
        name: 'Managed Remediation',
        price: '₹75,000–₹2,00,000 से',
        description: 'हमारी team fixes लागू करती है। Scope पर pricing.',
      },
      {
        name: 'SEBI Compliance Bundle',
        price: '₹49,999 से',
        description: 'SEBI submission package: audit, report, evidence pack, annual re-scan option.',
      },
    ],
  },
  sebiCallout: {
    title: 'SEBI-regulated entity?',
    description:
      'SEBI Compliance Bundle में April 2026 deadline के लिए ज़रूरी चीज़ें: WCAG audit, SEBI-formatted report, evidence pack, remediation guidance, और annual re-audit schedule.',
    cta: 'SEBI compliance जानें',
  },
  faq: {
    title: 'अक्सर पूछे जाने वाले प्रश्न',
    questions: [
      {
        question: 'क्या आप GST invoice देते हैं?',
        answer:
          'हाँ। हर payment पर GST-compliant invoice हमारे GSTIN के साथ। Invoice dashboard में भी उपलब्ध।',
      },
      {
        question: 'Refund policy क्या है?',
        answer:
          'Subscription plans पर 14-day money-back guarantee। Purchase के 14 दिनों में email करें। Expert audit delivery के बाद non-refundable।',
      },
      {
        question: 'क्या बाद में plan बदल सकते हैं?',
        answer:
          'हाँ। Upgrade तुरंत लागू होता है। Downgrade अगले billing cycle से। Prorated credits account में लगते हैं।',
      },
      {
        question: 'क्या automated scan का मतलब compliant है?',
        answer:
          'नहीं। केवल automated scanning से पूर्ण WCAG, RPwD, IS 17802, GIGW, या SEBI conformance सिद्ध नहीं होती। Paid offers में manual testing और expert review शामिल या अनुशंसित है।',
      },
      {
        question: 'Non-profits या education के लिए discount?',
        answer:
          'हाँ। भारत में registered non-profits और educational institutions को Professional पर 30% off। Registration documents के साथ sales से संपर्क करें।',
      },
    ],
  },
  sections: {
    auditFirst: 'Expert services से शुरू करें',
    step01: 'Product subscriptions',
    step02: 'Remediation और services',
    monitoring: 'Enterprise programme',
    faq: 'अक्सर पूछे जाने वाले प्रश्न',
    costOfInaction: 'Cost of inaction',
  },
  billing: {
    monthly: 'Monthly',
    annual: 'Annual',
    save: '~17% बचाएँ',
    exclGst: 'Prices excl. 18% GST · illustrative strategy',
  },
  freeTier: {
    name: 'Free scan',
    description: '1 website · 1 scan · issue summary — acquisition channel',
    cta: 'Free scan चलाएँ',
    signupCta: 'Developer शुरू करें',
  },
};
