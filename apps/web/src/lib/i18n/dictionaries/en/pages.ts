import type { PagesDict } from '../types';

export const pages: PagesDict = {
  about: {
    meta: {
      title: 'About Us',
      description:
        'AccessibleNow is a Pune-based company helping Indian organisations achieve RPwD, IS 17802, GIGW, WCAG 2.2 AA, and SEBI digital accessibility compliance.',
    },
    title: 'About AccessibleNow',
    description:
      'A Pune-based company making digital accessibility compliance practical for Indian businesses, government vendors, and regulated industries.',
    sections: [
      {
        id: 'mission',
        heading: 'Our mission',
        body: "Everyone deserves equal access to digital services — from banking and healthcare to government portals and investor platforms. AccessibleNow exists to close the gap between India's accessibility laws and what teams can actually ship on tight deadlines and budgets.",
      },
      {
        id: 'what-we-do',
        heading: 'What we do',
        body: 'We are an AI-powered SaaS platform for continuous accessibility compliance. Teams use AccessibleNow to scan websites, prioritise issues, track remediation, generate audit-ready reports, and demonstrate progress toward RPwD Act 2016, IS 17802, GIGW 3.0, WCAG 2.2 AA, and SEBI accessibility requirements.',
        list: [
          'Automated scanning with India-specific rules (IS 17802, GIGW)',
          'Issue tracking and remediation workflows for dev and compliance teams',
          'Compliance reports for executives, auditors, and regulators',
          'Optional accessibility widget for end-user experience improvements',
        ],
      },
      {
        id: 'why-india',
        heading: 'Built in India, for India',
        body: "We are headquartered in Pune, Maharashtra. That shapes how we build: Indian language support, rupee pricing with GST invoicing, and standards aligned with BIS (IS 17802) and SEBI's 2024 accessibility circular — not generic checklists copied from US-only tooling.",
      },
      {
        id: 'who-we-serve',
        heading: 'Who we serve',
        body: '',
        list: [
          'BFSI and SEBI-regulated entities facing the April 2026 deadline',
          'Government vendors and public-sector digital teams (GIGW 3.0)',
          'Mid-market companies preparing for RPwD and IS 17802 alignment',
          'Developers and accessibility officers who need actionable fixes, not PDF dumps',
        ],
      },
    ],
  },
  contact: {
    meta: {
      title: 'Contact',
      description:
        'Get in touch with AccessibleNow for demos, enterprise pricing, and compliance questions.',
    },
    title: 'Contact us',
    description:
      'Questions about RPwD, SEBI, pricing, or a demo? We respond within one business day.',
    form: {
      name: 'Your name',
      email: 'Work email',
      company: 'Company',
      message: 'How can we help?',
      submit: 'Send message',
    },
  },
  scan: {
    meta: {
      title: 'Free Accessibility Scan',
      description: 'Scan any public URL for WCAG 2.2 and IS 17802 issues in under 90 seconds.',
    },
    title: 'Free accessibility scan',
    description: 'Enter a URL to see critical barriers — no signup required for your first scan.',
  },
  widget: {
    meta: {
      title: 'Accessibility Widget',
      description:
        'Embed an accessibility toolbar on your website — Hindi and English, WCAG-compliant UI.',
    },
    title: 'Accessibility widget for your website',
    description:
      'Let visitors adjust text size, contrast, and navigation — without rebuilding your site.',
  },
  documentScanner: {
    meta: {
      title: 'Document Scanner — PDF, Word, PowerPoint, Excel',
      description:
        'Scan government documents for accessibility issues before publishing. Detects untagged PDFs, missing alt text, inaccessible tables, and 40+ WCAG 2.1 AA / GIGW 3.0 issues.',
    },
    title: 'Is Your Government PDF Accessible?',
    description:
      'Scan PDF, Word, PowerPoint, and Excel files for 40+ WCAG 2.1 AA, GIGW 3.0, and RPwD Act 2016 issues — with plain-English remediation for each.',
  },
  services: {
    meta: {
      title: 'Services',
      description:
        'Accessibility auditing, consulting, training, compliance reports, and testing services built for Indian compliance.',
    },
    title: 'Services',
    description:
      'From free scan to enterprise regulatory defense — pick the path that fits your team, then contact sales.',
  },
  servicesHub: {
    meta: {
      title: 'Accessibility Services Built for Indian Compliance',
      description:
        'From automated scanning to human audits, developer training, and done-for-you remediation — every service mapped to RPwD Act, IS 17802, GIGW 3.0, and SEBI 2024 mandate.',
    },
    hero: {
      title: 'Accessibility services built for Indian compliance',
      subtitle:
        "From automated scanning to human audits, developer training, and done-for-you remediation — every service mapped to the RPwD Act, IS 17802, GIGW 3.0, and SEBI's 2024 mandate.",
      primaryCta: 'Get a free scan',
      secondaryCta: 'Book a free consultation',
    },
    servicesGrid: [
      {
        id: 'auditing',
        name: 'Accessibility Auditing',
        description: 'Automated + manual audits by IAAP-certified experts',
        href: '/services/accessibility-auditing',
      },
      {
        id: 'consulting',
        name: 'Accessibility Consulting',
        description: 'Strategy, roadmaps, and regulatory guidance',
        href: '/services/accessibility-consulting',
      },
      {
        id: 'training',
        name: 'Accessibility Training',
        description: 'Live sessions for developers, QA, and designers',
        href: '/services/accessibility-training',
      },
      {
        id: 'reports',
        name: 'Compliance Reports & VPAT',
        description: 'Audit-ready reports for regulators and stakeholders',
        href: '/services/compliance-reports',
      },
      {
        id: 'testing',
        name: 'Accessibility Testing',
        description: 'Screen reader and keyboard testing services',
        href: '/services/accessibility-testing',
      },
      {
        id: 'multilingual',
        name: 'Multilingual Accessibility',
        description: 'Hindi, Bengali, Tamil support and Devanagari testing',
        href: '/services/multilingual-accessibility',
      },
    ],
    whyIndia: {
      title: 'Why India-specific matters',
      stats: [
        {
          value: '155',
          label: 'Organisations penalised by CCPD by 2025',
        },
        {
          value: '2024 INSC 858',
          label: 'Supreme Court ruling making standards enforceable',
        },
        {
          value: 'July 2026',
          label: 'SEBI phased compliance deadlines',
        },
      ],
    },
  },
  accessibilityAuditing: {
    meta: {
      title: 'Accessibility Auditing for Indian Standards',
      description:
        'Automated scanning plus a 50-item manual WCAG 2.2 AA audit, signed off by IAAP-certified auditors.',
    },
    hero: {
      title: 'Accessibility auditing for Indian standards',
      subtitle:
        'Automated scanning plus a 50-item manual WCAG 2.2 AA audit, signed off by IAAP-certified auditors.',
    },
    whatCovered: {
      title: 'What an audit covers',
      automated: {
        title: 'Automated layer',
        items: [
          'axe-core engine (same engine used by Google and Microsoft)',
          'IS 17802 custom rule set (unique to AccessShield)',
          'GIGW 3.0 checks for government sites',
          'Full-site crawl, screenshot evidence per violation',
        ],
      },
      manual: {
        title: 'Manual layer',
        items: [
          '50-item WCAG 2.2 AA checklist',
          'Screen reader walkthroughs (NVDA, TalkBack, VoiceOver)',
          'Keyboard-only navigation testing',
          'Colour and zoom testing at 200%',
        ],
      },
    },
    process: {
      title: 'Process timeline',
      steps: [
        {
          step: '1',
          title: 'Scan',
          description: 'Instant automated results',
        },
        {
          step: '2',
          title: 'Manual audit',
          description: '3-5 business days',
        },
        {
          step: '3',
          title: 'Report',
          description: 'WCAG Compliance Report + prioritised fix list',
        },
        {
          step: '4',
          title: 'Certification',
          description: 'Public verify URL once score ≥ 80 with zero critical issues',
        },
      ],
    },
    deliverables: {
      title: 'Deliverables',
      items: [
        'Score report',
        'Violation list with AI fix suggestions',
        'WCAG Compliance Report (VPAT-style)',
        'IS 17802 evidence pack',
        'Certificate with public verification page',
      ],
    },
    pricing: {
      automated: 'Included free with every scan',
      certification: 'Certification Pass from ₹19,999',
      linkText: 'View pricing',
    },
    faq: {
      title: 'Frequently asked questions',
      questions: [
        {
          question: 'What is the difference between automated and manual auditing?',
          answer:
            'Automated auditing uses software to detect common issues like missing alt text and colour contrast problems. Manual auditing involves human testers using screen readers and keyboards to catch issues machines miss — like confusing navigation or inaccessible workflows.',
        },
        {
          question: 'Is an AccessShield audit accepted for SEBI compliance?',
          answer:
            'Yes. SEBI requires WCAG 2.1 AA compliance. Our Certification Pass includes a WCAG Compliance Report and evidence pack that meets regulatory documentation requirements. We recommend consulting with your legal team for final sign-off.',
        },
        {
          question: 'How long does a full audit take?',
          answer:
            'Automated scanning is instant. Manual audits take 3-5 business days depending on the size and complexity of your site. We provide a timeline estimate before you purchase.',
        },
        {
          question: 'Do you audit mobile apps too?',
          answer:
            'Yes. We offer mobile app accessibility auditing for iOS and Android. Contact us for pricing and timelines.',
        },
        {
          question: 'What happens if my site fails the audit?',
          answer:
            'Every audit includes a prioritised fix list with AI-generated suggestions. You can remediate issues in-house or purchase our Remediation service where our developers implement the fixes for you.',
        },
      ],
    },
  },
  accessibilityConsulting: {
    meta: {
      title: 'Accessibility Consulting for Regulated Entities',
      description:
        'Strategy, roadmaps, and regulatory guidance from teams who work with Indian accessibility law every day.',
    },
    hero: {
      title: 'Accessibility consulting for regulated entities',
      subtitle:
        'Strategy, roadmaps, and regulatory guidance from teams who work with Indian accessibility law every day.',
    },
    tracks: {
      title: 'Consulting tracks',
      items: [
        {
          id: 'sebi',
          title: 'SEBI compliance roadmap',
          description:
            'For listed companies, brokers, AMCs, depositories. Gap assessment → phased remediation plan → evidence pack for SEBI submission.',
        },
        {
          id: 'rpwd',
          title: 'RPwD Act risk assessment',
          description:
            'For enterprises. Exposure analysis across web, mobile, documents; CCPD complaint-readiness review.',
        },
        {
          id: 'gigw',
          title: 'GIGW 3.0 for government',
          description:
            'Ministries, departments, PSUs. Compliance assessment against the mandatory 2023 guidelines.',
        },
        {
          id: 'design',
          title: 'Accessible-by-design product consulting',
          description:
            'For teams building new products. Design reviews, component library audits, CI integration planning.',
        },
      ],
    },
    howItWorks: {
      title: 'How engagements work',
      steps: [
        'Free 30-min consultation',
        'Scoped proposal with fixed price',
        'Delivery with weekly checkpoints',
      ],
    },
    team: {
      title: 'Who you work with',
      description:
        'IAAP-certified consultants (CPACC/WAS), experience across BFSI/government/e-commerce. Our consultants hold multiple accessibility certifications and have hands-on experience with RPwD, SEBI, and GIGW compliance.',
    },
    cta: {
      title: 'Book a free 30-minute consultation',
      description: 'No commitment. We respond within one business day.',
    },
  },
  accessibilityTraining: {
    meta: {
      title: 'Accessibility Training for Indian Development Teams',
      description:
        'Live, practical sessions that leave your team able to build and test accessible products — priced per session, not per seat.',
    },
    hero: {
      title: 'Accessibility training for Indian development teams',
      subtitle:
        'Live, practical sessions that leave your team able to build and test accessible products — priced per session, not per seat.',
    },
    catalogue: {
      title: 'Training catalogue',
      items: [
        {
          id: 'wcag',
          title: 'WCAG 2.2 AA Foundations',
          duration: '2 hours',
          price: '₹4,999/session',
          capacity: 'up to 25 participants',
          description: 'Semantic HTML, ARIA, forms, images, contrast, the 9 new WCAG 2.2 criteria',
        },
        {
          id: 'is17802',
          title: 'IS 17802 & Indian Compliance Deep-Dive',
          duration: '2 hours',
          price: '₹4,999/session',
          capacity: 'up to 25 participants',
          description:
            'What IS 17802 adds beyond WCAG, Devanagari Unicode requirements, DD/MM/YYYY announcements, GIGW 3.0 for government teams, SEBI evidence expectations',
        },
        {
          id: 'screenreader',
          title: 'Screen Reader Testing Workshop',
          duration: '2 hours',
          price: '₹4,999/session',
          capacity: 'up to 25 participants',
          description:
            'Hands-on NVDA + TalkBack + VoiceOver, testing OTP flows, testing data tables and charts',
        },
      ],
    },
    format: {
      title: 'Format',
      items: [
        'Live online (Google Meet/Zoom)',
        'Recording provided',
        'Certificate of participation',
        'Follow-up Q&A channel for 30 days',
      ],
    },
    whoFor: {
      title: "Who it's for",
      roles: ['Developers', 'QA Engineers', 'Designers', 'Product Managers'],
    },
    bundle: {
      text: 'Training is included in the Professional plan onboarding and available as an add-on to any plan',
      linkText: 'View pricing',
    },
  },
  complianceReports: {
    meta: {
      title: 'Compliance Reports Regulators Actually Accept',
      description:
        'Every report AccessShield generates is mapped to the Indian regulation it satisfies — ready for SEBI submissions, government tenders, and CCPD responses.',
    },
    hero: {
      title: 'Compliance reports regulators actually accept',
      subtitle:
        'Every report AccessShield generates is mapped to the Indian regulation it satisfies — ready for SEBI submissions, government tenders, and CCPD responses.',
    },
    catalogue: {
      title: 'Report catalogue',
      reports: [
        {
          id: 'wcag',
          title: 'WCAG Compliance Report (VPAT-style)',
          description:
            'Criterion-by-criterion conformance table, Supports/Partially Supports/Does Not Support, auditor sign-off block.',
          includedIn: 'Professional+',
        },
        {
          id: 'sebi',
          title: 'SEBI Digital Accessibility Report',
          description:
            'Formatted for SEBI submission: scope, standards, findings, remediation timeline, annual re-audit schedule.',
          includedIn: 'Enterprise / SEBI bundle',
        },
        {
          id: 'is17802',
          title: 'IS 17802 Evidence Pack',
          description: 'Per-rule evidence with screenshots, the exact clause each check maps to.',
          includedIn: 'Professional+',
        },
        {
          id: 'rpwd',
          title: 'RPwD Act Compliance Statement',
          description:
            'Plain-language statement for legal/procurement teams referencing Sections 40-46.',
          includedIn: 'All paid plans',
        },
      ],
    },
    howGenerated: {
      title: 'How reports are generated',
      description:
        'Automated data + manual audit findings + IAAP auditor review → PDF + shareable link',
    },
    sample: {
      title: 'Download a sample WCAG Compliance Report',
      description: 'See what a full compliance report looks like',
      ctaText: 'Get sample report',
    },
  },
  accessibilityTesting: {
    meta: {
      title: 'Testing That Goes Beyond Automated Scans',
      description:
        'Automated tools catch at most 40% of accessibility issues. Our layered testing methodology covers the rest.',
    },
    hero: {
      title: 'Testing that goes beyond automated scans',
      subtitle:
        'Automated tools catch at most 40% of accessibility issues. Our layered testing methodology covers the rest.',
    },
    layers: {
      title: 'The four testing layers',
      subtitle: 'A comprehensive testing pyramid that catches what automated tools miss',
      items: [
        {
          layer: '1',
          title: 'Automated',
          description: 'axe-core + IS 17802 + GIGW rules, every page, continuous. Catches ~35-40%.',
        },
        {
          layer: '2',
          title: 'Manual expert',
          description:
            '50-item WCAG 2.2 AA checklist, screen reader walkthroughs, keyboard-only journeys.',
        },
        {
          layer: '3',
          title: 'Assistive technology matrix',
          description:
            'NVDA + JAWS (Windows), VoiceOver (macOS/iOS), TalkBack (Android) across top user journeys.',
        },
        {
          layer: '4',
          title: 'PwD user testing',
          description:
            'Real users with visual, motor, and cognitive disabilities complete your critical journeys and report friction. Add-on ₹8,999 · delivered with our disability-organisation partners.',
        },
      ],
    },
    whySebi: {
      title: 'Why this matters for SEBI',
      description:
        "SEBI's circular expects testing by certified professionals and ongoing validation. Our layered approach maps directly to these requirements — automated monitoring (Layer 1), professional audit (Layers 2-3), and real user validation (Layer 4).",
    },
    mobileDocuments: {
      title: 'Beyond web: mobile + documents',
      description:
        'The same methodology covers Android/iOS apps (Appium-based scanning) and PDF/Office documents. Every platform, one consistent testing approach.',
    },
  },
  multilingualAccessibility: {
    meta: {
      title: 'Accessibility in the Languages India Actually Speaks',
      description:
        'Screen readers cannot read transliterated text. We make accessibility work in Hindi and regional languages — as IS 17802 requires.',
    },
    hero: {
      title: 'Accessibility in the languages India actually speaks',
      subtitle:
        'Screen readers cannot read transliterated text. We make accessibility work in Hindi and regional languages — as IS 17802 requires.',
    },
    problem: {
      title: 'The transliteration problem',
      description:
        'ASCII transliteration ("namaste" written in Latin letters) is announced incorrectly by TalkBack/NVDA, while true Devanagari Unicode (U+0900–U+097F) is announced correctly. IS 17802 IS-002 makes correct Unicode a compliance requirement, not a nice-to-have.',
      example: {
        wrong: 'namaste (Latin letters) → "en-ay-em-ay-es-tee-ee"',
        right: 'नमस्ते (Unicode) → "namaste" (correct pronunciation)',
      },
    },
    whatWeProvide: {
      title: 'What AccessShield provides',
      items: [
        {
          id: 'widget',
          title: 'Widget in Hindi today',
          description: 'Tamil, Telugu, Kannada, Marathi, Bengali rolling out through 2026',
        },
        {
          id: 'scanner',
          title: 'Scanner rule IS-002',
          description: 'Automatically detects transliteration-instead-of-Unicode in your content',
        },
        {
          id: 'statements',
          title: 'Bilingual accessibility statements',
          description: 'EN + HI generated by our AI service',
        },
        {
          id: 'consulting',
          title: 'Multilingual content strategy',
          description: 'Consulting for regional language accessibility',
        },
      ],
    },
    languageCoverage: {
      title: 'Language coverage',
      columns: ['Language', 'Widget status', 'Scanner detection'],
      rows: [
        { language: 'Hindi (हिन्दी)', widget: 'Live', scanner: 'Live' },
        { language: 'Tamil (தமிழ்)', widget: 'Q3 2026', scanner: 'Live' },
        { language: 'Telugu (తెలుగు)', widget: 'Q3 2026', scanner: 'Live' },
        { language: 'Kannada (ಕನ್ನಡ)', widget: 'Q4 2026', scanner: 'Live' },
        { language: 'Marathi (मराठी)', widget: 'Q4 2026', scanner: 'Live' },
        { language: 'Bengali (বাংলা)', widget: 'Q4 2026', scanner: 'Live' },
      ],
    },
  },
  docs: {
    meta: {
      title: 'Documentation',
      description: 'Install guides, API reference, and widget setup for AccessibleNow.',
    },
    title: 'Documentation',
    description: 'Setup guides for widget embed, scanning API, and dashboard workflows.',
  },
  careers: {
    meta: {
      title: 'Careers',
      description:
        'Join AccessibleNow — accessibility engineering, sales, and compliance roles in Pune.',
    },
    title: 'Careers',
    description: "Help make India's digital services accessible to everyone.",
  },
  waitlist: {
    meta: {
      title: 'Waitlist',
      description: 'Join the AccessibleNow waitlist for early access.',
    },
    title: 'Join the waitlist',
    description: 'Be first to know when new features launch.',
  },
  privacy: {
    meta: {
      title: 'Privacy Policy',
      description: 'How AccessibleNow collects and protects your data.',
    },
    title: 'Privacy Policy',
    description: "Last updated June 2026. We comply with India's DPDP Act principles.",
  },
  terms: {
    meta: {
      title: 'Terms of Service',
      description: 'Terms governing use of AccessibleNow platform and services.',
    },
    title: 'Terms of Service',
    description: 'Please read these terms before using our platform.',
  },
  refund: {
    meta: {
      title: 'Refund Policy',
      description: 'AccessibleNow refund and cancellation policy.',
    },
    title: 'Refund Policy',
    description: '14-day trial and subscription refund terms.',
  },
  accessibilityStatement: {
    meta: {
      title: 'Accessibility Statement',
      description: 'Our commitment to WCAG 2.2 AA for the AccessibleNow platform.',
    },
    title: 'Accessibility Statement',
    description: 'We hold ourselves to the same standards we help customers meet.',
  },
  guides: {
    rpwd: {
      meta: {
        title: 'RPwD Act 2016 Guide',
        description:
          'Plain-English guide to the Rights of Persons with Disabilities Act for Indian businesses.',
      },
      eyebrow: 'Legal guide',
      title: 'Rights of Persons with Disabilities Act, 2016',
      description: 'Plain-English guide for Indian businesses and website owners',
      badges: [
        'Act No. 49 of 2016',
        'Gazette: 28 Dec 2016',
        '21 disabilities recognised',
        'Enforced by DEPwD',
      ],
    },
    is17802: {
      meta: {
        title: 'IS 17802 Guide',
        description: "India's BIS standard for ICT accessibility — built on WCAG 2.1 AA.",
      },
      eyebrow: 'Technical standard',
      title: 'IS 17802 — ICT Accessibility Standard',
      description: 'BIS 2021 national standard for websites, apps, and digital documents',
    },
    gigw: {
      meta: {
        title: 'GIGW 3.0 Guide',
        description: 'Guidelines for Indian Government Websites — accessibility requirements.',
      },
      eyebrow: 'Government guide',
      title: 'GIGW 3.0 — Government Web Guidelines',
      description: 'Mandatory accessibility requirements for Indian government portals',
    },
    wcag: {
      meta: {
        title: 'WCAG 2.2 AA Guide',
        description: 'Web Content Accessibility Guidelines explained for Indian teams.',
      },
      eyebrow: 'Global standard',
      title: 'WCAG 2.2 Level AA',
      description: 'The international baseline for accessible web content',
    },
    sebi: {
      meta: {
        title: 'SEBI Accessibility Guide',
        description: 'SEBI 2024 circular — WCAG 2.1 AA deadline April 2026.',
      },
      eyebrow: 'Regulatory guide',
      title: 'SEBI Digital Accessibility Circular',
      description: 'Requirements for all SEBI-regulated entities',
    },
  },
};
