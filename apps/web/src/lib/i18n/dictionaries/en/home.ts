import type { HomeDict } from '../types';

export const home: HomeDict = {
  meta: {
    title: 'Accessible to all Indians. Auditable for your regulators.',
    description:
      'Enterprise accessibility platform for BFSI, PSUs, and government vendors — scan websites and mobile apps, fix barriers for people with disabilities, and produce RPwD, GIGW, IS 17802 & SEBI audit evidence.',
  },
  hero: {
    urgencyAria: 'Compliance urgency',
    badges: ['SEBI deadline Apr 2026', 'GIGW 3.0 · Govt portals', 'RPwD Act 2016'],
    titleLine1: 'Accessible to',
    titleHighlight: 'all Indians',
    titleLine2: 'Auditable for your regulators.',
    subtitle:
      "India's platform for BFSI, PSUs, and government vendors — scan websites and mobile apps, remove barriers for people with disabilities, and produce RPwD, GIGW, IS 17802 & SEBI evidence your audit file demands.",
    sectorsAria: 'Who we serve',
    sectors: ['BFSI & listed cos.', 'PSUs & ministries', 'Govt vendors', 'Audit-ready reports'],
    trustPoints: [
      'WCAG 2.2 AA + IS 17802 scans for websites & mobile apps',
      'Audit-ready PDFs for SEBI, RPwD, GIGW & tender committees',
      'Remediation, widget, monitoring & IAAP sign-off pathways',
    ],
    bookDemo: 'Book enterprise demo',
    runScan: 'Run free scan',
    footnote: 'GST invoicing · PO & annual contracts for government · No credit card for free scan',
    standardsAria: 'Supported compliance standards',
    standards: ['RPwD Act 2016', 'IS 17802', 'WCAG 2.2 AA', 'GIGW 3.0', 'SEBI 2024'],
    reportCard: {
      title: 'Enterprise compliance report',
      auditFile: 'Audit file',
      scoreLabel: 'Accessibility score',
      scoreMeta: '25 barriers · 12 pages scanned',
      exportsTitle: 'Regulator-ready exports',
      exports: [
        { label: 'RPwD evidence pack', status: 'Ready' },
        { label: 'GIGW 3.0 summary', status: 'Ready' },
        { label: 'SEBI assessment', status: 'In review' },
      ],
      download: 'Download PDF for audit committee',
    },
    visual: {
      scanComplete: 'Scan complete',
      scanTime: '68 seconds',
      figcaption:
        'Enterprise team in India reviewing digital accessibility, with a sample compliance report showing accessibility score and regulator-ready exports.',
      imageAlt:
        'Diverse Indian professionals in an enterprise office using laptops and assistive technology to access digital services',
    },
  },
  ticker: {
    aria: 'Sectors we serve across India',
    sectors: [
      'BFSI & listed companies',
      'PSUs & central ministries',
      'State govt portals',
      'SEBI-regulated entities',
      'Government ICT vendors',
      'Healthcare & insurance',
      'E-commerce & fintech',
      'Public sector banks',
    ],
    items: [
      'SEBI: All regulated entities must meet WCAG 2.1 AA by April 2026',
      'GIGW 3.0: Government websites must comply with IS 17802',
      'RPwD Act 2016: Digital services must be accessible to persons with disabilities',
      "IS 17802: India's national ICT accessibility standard (BIS 2021)",
    ],
  },
  riskStats: {
    title: 'Accessibility in India — by the numbers',
    intro: 'The web was built to be universal. Too many Indian sites still leave people out.',
    stats: [
      { value: '2.68 Cr+', label: 'Indians with visual disability (Census 2011)' },
      { value: '70M+', label: 'People with disabilities in India' },
      { value: '21', label: 'Disability types recognised under RPwD Act' },
      { value: 'Apr 2026', label: 'SEBI accessibility deadline for listed cos.' },
    ],
  },
  whoWeBuildFor: {
    title: 'Built for real users, not just PDFs',
    subtitle:
      'When someone with a disability cannot pay a bill, read a menu, or complete a form on your site, the service is not truly public. We find those barriers — then help you remove them.',
    imageAlt:
      'Indian users with visual, hearing, and motor disabilities independently using smartphones, laptops, and accessible keyboards',
    quote:
      'The power of the Web is in its universality. Access by everyone regardless of disability is an essential aspect.',
    quoteAuthor: 'Tim Berners-Lee',
    cards: [
      {
        title: 'Blind & low-vision users',
        barrier: 'Missing alt text, poor contrast, broken screen-reader order',
        checks: 'WCAG 1.1.1, 1.4.3, focus order, ARIA labels',
      },
      {
        title: 'Deaf & hard-of-hearing users',
        barrier: 'Videos without captions, audio-only alerts',
        checks: 'WCAG 1.2 multimedia, transcripts, visual alternatives',
      },
      {
        title: 'Motor & cognitive disabilities',
        barrier: 'Tiny buttons, keyboard traps, confusing forms',
        checks: 'WCAG 2.1 keyboard access, 2.5.8 touch targets, IS 17802',
      },
    ],
    barrierLabel: 'Common barrier:',
    checksLabel: 'What we check:',
    footer:
      'Fix these barriers and you welcome crores of Indians who rely on screen readers, magnifiers, voice control, and other assistive technology every day — with the scans and reports regulators expect under RPwD, IS 17802, GIGW, and SEBI.',
    figcaption:
      'People with disabilities using assistive technology to access digital services in India',
  },
  howItWorks: {
    title: 'From barriers to welcome — in 4 steps',
    subtitle:
      'Find what excludes people, fix it, and document progress for your team and regulators',
    stepLabel: 'Step',
    steps: [
      {
        title: 'Discover',
        description:
          'See your site through the eyes of users with disabilities — automated scan plus real barrier detection in 60–90 seconds.',
      },
      {
        title: 'Understand',
        description:
          'Prioritised issues: what blocks someone from paying, signing up, or reading your content — mapped to WCAG and IS 17802.',
      },
      {
        title: 'Fix',
        description:
          'Code-level remediation guidance and AI suggestions your dev team can ship — alt text, contrast, keyboard access, and more.',
      },
      {
        title: 'Prove',
        description:
          'Reports and certificates for RPwD, SEBI, GIGW, and your audit file — so compliance follows inclusion, not the other way around.',
      },
    ],
  },
  standards: {
    title: 'The proof your auditors need — after you fix the barriers',
    subtitle: 'One scan covers every Indian standard. Compliance follows inclusion.',
    items: [
      {
        name: 'RPwD Act 2016',
        description: 'Rights of Persons with Disabilities Act — mandatory for government websites',
        href: '/rpwd-act',
      },
      {
        name: 'IS 17802',
        description: 'Indian Standard for ICT Accessibility — aligned with WCAG 2.1 AA',
        href: '/is-17802',
      },
      {
        name: 'GIGW 3.0',
        description: 'Guidelines for Indian Government Websites — WCAG 2.0 Level A compliance',
        href: '/gigw',
      },
      {
        name: 'WCAG 2.2 AA',
        description: 'Web Content Accessibility Guidelines — international accessibility standard',
        href: '/wcag-2-2-aa',
      },
      {
        name: 'SEBI 2024',
        description: 'SEBI accessibility circular — mandatory for listed companies by Apr 2026',
        href: '/sebi-accessibility',
      },
    ],
  },
  testimonials: {
    title: 'Teams building for everyone across India',
    subtitle: 'Compliance gets you the certificate. Accessibility gets you the customer.',
    items: [
      {
        quote:
          'We thought we were fine until we realised a blind user could not complete our KYC flow. AccessShield showed us exactly what to fix — and gave us SEBI-ready reports.',
        name: 'Priya Sharma',
        role: 'Head of Compliance',
        company: 'Leading Fintech',
        starsAria: '5 out of 5 stars',
      },
      {
        quote:
          'Our government tender required GIGW compliance. AccessShield translated that into real barriers for users with disabilities — not just a checklist.',
        name: 'Rajesh Kumar',
        role: 'CTO',
        company: 'E-commerce Platform',
        starsAria: '5 out of 5 stars',
      },
      {
        quote:
          'The widget helps visitors with low vision and dyslexia today. The remediation work helps everyone tomorrow. That is the right order.',
        name: 'Meera Patel',
        role: 'Product Manager',
        company: 'SaaS Startup',
        starsAria: '5 out of 5 stars',
      },
    ],
  },
  blogPreview: {
    title: 'Latest from the compliance desk',
    subtitle: 'Stay updated on Indian accessibility laws and best practices',
    viewAll: 'View all articles →',
    empty: 'No posts yet — check back soon.',
  },
  cta: {
    badge: 'SEBI deadline: April 2026',
    title: 'Everyone deserves to use your website',
    body: 'Crores of Indians live with a disability. If they cannot complete a payment, sign up, or read your content, your product is not finished. SEBI, RPwD, and GIGW require accessible digital services — but the real reason to act is simpler: inclusion is good business.',
    scanCta: 'Scan for accessibility barriers',
    expertCta: 'Talk to an expert',
  },
};
