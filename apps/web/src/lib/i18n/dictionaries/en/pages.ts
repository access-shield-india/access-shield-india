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
        'Widget, scanning, remediation, and compliance plans. Contact sales for a tailored quote.',
    },
    title: 'Services',
    description:
      'From free scan to enterprise regulatory defense — pick the path that fits your team, then contact sales.',
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
