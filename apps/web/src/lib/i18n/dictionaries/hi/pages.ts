import type { PagesDict } from '../types';

export const pages: PagesDict = {
  about: {
    meta: {
      title: 'हमारे बारे में',
      description:
        'AccessibleNow Pune-based company है जो Indian organisations को RPwD, IS 17802, GIGW, WCAG 2.2 AA और SEBI digital accessibility compliance में मदद करती है।',
    },
    title: 'AccessibleNow के बारे में',
    description:
      'Pune-based company जो Indian businesses, government vendors और regulated industries के लिए digital accessibility compliance practical बनाती है।',
    sections: [
      {
        id: 'mission',
        heading: 'हमारा mission',
        body: 'हर कोई banking, healthcare, government portals और investor platforms जैसी digital services तक बराबर पहुँच का हक़दार है। AccessibleNow India के accessibility laws और tight deadlines व budgets पर teams जो actually ship कर सकती हैं, उनके बीच का gap कम करता है।',
      },
      {
        id: 'what-we-do',
        heading: 'हम क्या करते हैं',
        body: 'हम continuous accessibility compliance के लिए AI-powered SaaS platform हैं। Teams AccessibleNow से websites scan करती हैं, issues prioritise करती हैं, remediation track करती हैं, audit-ready reports बनाती हैं, और RPwD Act 2016, IS 17802, GIGW 3.0, WCAG 2.2 AA और SEBI requirements की तरफ progress दिखाती हैं।',
        list: [
          'India-specific rules (IS 17802, GIGW) के साथ automated scanning',
          'Dev और compliance teams के लिए issue tracking और remediation workflows',
          'Executives, auditors और regulators के लिए compliance reports',
          'End-user experience के लिए optional accessibility widget',
        ],
      },
      {
        id: 'why-india',
        heading: 'India में बना, India के लिए',
        body: 'हमारा headquarters Pune, Maharashtra में है। इससे हमारा approach बनता है: Indian language support, GST invoice के साथ rupee pricing, और BIS (IS 17802) व SEBI के 2024 accessibility circular से aligned standards — US-only tooling से copy किए generic checklists नहीं।',
      },
      {
        id: 'who-we-serve',
        heading: 'हम किसकी मदद करते हैं',
        body: '',
        list: [
          'April 2026 deadline वाले BFSI और SEBI-regulated entities',
          'Government vendors और public-sector digital teams (GIGW 3.0)',
          'RPwD और IS 17802 alignment की तैयारी कर रही mid-market companies',
          'Developers और accessibility officers जिन्हें actionable fixes चाहिए, सिर्फ PDF dumps नहीं',
        ],
      },
    ],
  },
  contact: {
    meta: {
      title: 'Contact',
      description:
        'Demos, enterprise pricing और compliance सवालों के लिए AccessibleNow से संपर्क करें।',
    },
    title: 'हमसे contact करें',
    description: 'RPwD, SEBI, pricing या demo के सवाल? हम एक business day में जवाब देते हैं।',
    form: {
      name: 'आपका नाम',
      email: 'Work email',
      company: 'Company',
      message: 'हम कैसे मदद करें?',
      submit: 'Message भेजें',
    },
  },
  scan: {
    meta: {
      title: 'Free Accessibility Scan',
      description:
        'किसी भी public URL को 90 seconds में WCAG 2.2 और IS 17802 issues के लिए scan करें।',
    },
    title: 'Free accessibility scan',
    description: 'Critical barriers देखने के लिए URL डालें — पहले scan के लिए signup ज़रूरी नहीं।',
  },
  widget: {
    meta: {
      title: 'Accessibility Widget',
      description:
        'अपनी website पर accessibility toolbar embed करें — Hindi और English, WCAG-compliant UI।',
    },
    title: 'आपकी website के लिए accessibility widget',
    description:
      'Visitors text size, contrast और navigation adjust कर सकें — पूरी site rebuild किए बिना।',
  },
  documentScanner: {
    meta: {
      title: 'Document Scanner — PDF, Word, PowerPoint, Excel',
      description:
        'Publish करने से पहले government documents को accessibility issues के लिए scan करें। Untagged PDFs, missing alt text, inaccessible tables, और 40+ WCAG 2.1 AA / GIGW 3.0 issues detect करें।',
    },
    title: 'क्या आपकी Government PDF Accessible है?',
    description:
      'PDF, Word, PowerPoint, और Excel files को 40+ WCAG 2.1 AA, GIGW 3.0, और RPwD Act 2016 issues के लिए scan करें — हर issue के लिए simple Hindi में remediation।',
  },
  services: {
    meta: {
      title: 'Services',
      description:
        'Indian compliance के लिए Accessibility auditing, consulting, training, compliance reports और testing services।',
    },
    title: 'Services',
    description:
      'Free scan से enterprise regulatory defense तक — अपनी team के लिए सही path चुनें, फिर Contact sales करें।',
  },
  servicesHub: {
    meta: {
      title: 'Indian Compliance के लिए Accessibility Services',
      description:
        'Automated scanning से human audits, developer training और done-for-you remediation तक — हर service RPwD Act, IS 17802, GIGW 3.0 और SEBI 2024 mandate से mapped।',
    },
    hero: {
      title: 'Indian compliance के लिए accessibility services',
      subtitle:
        'Automated scanning से human audits, developer training और done-for-you remediation तक — हर service RPwD Act, IS 17802, GIGW 3.0 और SEBI के 2024 mandate से mapped।',
      primaryCta: 'Free scan पाएं',
      secondaryCta: 'Free consultation book करें',
    },
    servicesGrid: [
      {
        id: 'auditing',
        name: 'Accessibility Auditing',
        description: 'IAAP-certified experts द्वारा automated + manual audits',
        href: '/services/accessibility-auditing',
      },
      {
        id: 'consulting',
        name: 'Accessibility Consulting',
        description: 'Strategy, roadmaps और regulatory guidance',
        href: '/services/accessibility-consulting',
      },
      {
        id: 'training',
        name: 'Accessibility Training',
        description: 'Developers, QA और designers के लिए live sessions',
        href: '/services/accessibility-training',
      },
      {
        id: 'reports',
        name: 'Compliance Reports & VPAT',
        description: 'Regulators और stakeholders के लिए audit-ready reports',
        href: '/services/compliance-reports',
      },
      {
        id: 'testing',
        name: 'Accessibility Testing',
        description: 'Screen reader और keyboard testing services',
        href: '/services/accessibility-testing',
      },
      {
        id: 'multilingual',
        name: 'Multilingual Accessibility',
        description: 'Hindi, Bengali, Tamil support और Devanagari testing',
        href: '/services/multilingual-accessibility',
      },
    ],
    whyIndia: {
      title: 'India-specific क्यों matter करता है',
      stats: [
        {
          value: '155',
          label: '2025 तक CCPD द्वारा penalised organisations',
        },
        {
          value: '2024 INSC 858',
          label: 'Standards enforceable बनाने वाला Supreme Court ruling',
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
      title: 'Indian Standards के लिए Accessibility Auditing',
      description:
        'IAAP-certified auditors द्वारा signed automated scanning और 50-item manual WCAG 2.2 AA audit।',
    },
    hero: {
      title: 'Indian standards के लिए accessibility auditing',
      subtitle:
        'IAAP-certified auditors द्वारा signed automated scanning और 50-item manual WCAG 2.2 AA audit।',
    },
    whatCovered: {
      title: 'Audit में क्या cover होता है',
      automated: {
        title: 'Automated layer',
        items: [
          'axe-core engine (Google और Microsoft द्वारा use किया जाने वाला same engine)',
          'IS 17802 custom rule set (AccessShield के लिए unique)',
          'Government sites के लिए GIGW 3.0 checks',
          'Full-site crawl, हर violation के लिए screenshot evidence',
        ],
      },
      manual: {
        title: 'Manual layer',
        items: [
          '50-item WCAG 2.2 AA checklist',
          'Screen reader walkthroughs (NVDA, TalkBack, VoiceOver)',
          'Keyboard-only navigation testing',
          '200% पर colour और zoom testing',
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
          description: 'Score ≥ 80 और zero critical issues पर public verify URL',
        },
      ],
    },
    deliverables: {
      title: 'Deliverables',
      items: [
        'Score report',
        'AI fix suggestions के साथ violation list',
        'WCAG Compliance Report (VPAT-style)',
        'IS 17802 evidence pack',
        'Public verification page के साथ certificate',
      ],
    },
    pricing: {
      automated: 'हर scan में free included',
      certification: '₹19,999 से Certification Pass',
      linkText: 'Pricing देखें',
    },
    faq: {
      title: 'Frequently asked questions',
      questions: [
        {
          question: 'Automated और manual auditing में क्या difference है?',
          answer:
            'Automated auditing missing alt text और colour contrast problems जैसे common issues detect करने के लिए software use करती है। Manual auditing में human testers screen readers और keyboards use करके वो issues catch करते हैं जो machines miss करती हैं — जैसे confusing navigation या inaccessible workflows।',
        },
        {
          question: 'क्या AccessShield audit SEBI compliance के लिए accepted है?',
          answer:
            'हाँ। SEBI WCAG 2.1 AA compliance require करता है। हमारे Certification Pass में WCAG Compliance Report और evidence pack शामिल है जो regulatory documentation requirements meet करता है। Final sign-off के लिए हम अपनी legal team से consult करने recommend करते हैं।',
        },
        {
          question: 'Full audit में कितना time लगता है?',
          answer:
            'Automated scanning instant है। Manual audits आपकी site के size और complexity पर depend करते हुए 3-5 business days लेते हैं। Purchase से पहले हम timeline estimate provide करते हैं।',
        },
        {
          question: 'क्या आप mobile apps भी audit करते हैं?',
          answer:
            'हाँ। हम iOS और Android के लिए mobile app accessibility auditing offer करते हैं। Pricing और timelines के लिए हमसे contact करें।',
        },
        {
          question: 'अगर मेरी site audit fail हो जाती है तो क्या होगा?',
          answer:
            'हर audit में AI-generated suggestions के साथ prioritised fix list शामिल है। आप in-house issues remediate कर सकते हैं या हमारी Remediation service purchase कर सकते हैं जहाँ हमारे developers आपके लिए fixes implement करते हैं।',
        },
      ],
    },
  },
  accessibilityConsulting: {
    meta: {
      title: 'Regulated Entities के लिए Accessibility Consulting',
      description:
        'उन teams से strategy, roadmaps और regulatory guidance जो Indian accessibility law के साथ हर दिन काम करती हैं।',
    },
    hero: {
      title: 'Regulated entities के लिए accessibility consulting',
      subtitle:
        'उन teams से strategy, roadmaps और regulatory guidance जो Indian accessibility law के साथ हर दिन काम करती हैं।',
    },
    tracks: {
      title: 'Consulting tracks',
      items: [
        {
          id: 'sebi',
          title: 'SEBI compliance roadmap',
          description:
            'Listed companies, brokers, AMCs, depositories के लिए। Gap assessment → phased remediation plan → SEBI submission के लिए evidence pack।',
        },
        {
          id: 'rpwd',
          title: 'RPwD Act risk assessment',
          description:
            'Enterprises के लिए। Web, mobile, documents में exposure analysis; CCPD complaint-readiness review।',
        },
        {
          id: 'gigw',
          title: 'Government के लिए GIGW 3.0',
          description:
            'Ministries, departments, PSUs। Mandatory 2023 guidelines के against compliance assessment।',
        },
        {
          id: 'design',
          title: 'Accessible-by-design product consulting',
          description:
            'नए products build करने वाली teams के लिए। Design reviews, component library audits, CI integration planning।',
        },
      ],
    },
    howItWorks: {
      title: 'Engagements कैसे work करती हैं',
      steps: [
        'Free 30-min consultation',
        'Fixed price के साथ scoped proposal',
        'Weekly checkpoints के साथ delivery',
      ],
    },
    team: {
      title: 'आप किसके साथ काम करेंगे',
      description:
        'IAAP-certified consultants (CPACC/WAS), BFSI/government/e-commerce में experience। हमारे consultants multiple accessibility certifications hold करते हैं और RPwD, SEBI और GIGW compliance के साथ hands-on experience रखते हैं।',
    },
    cta: {
      title: 'Free 30-minute consultation book करें',
      description: 'कोई commitment नहीं। हम एक business day में respond करते हैं।',
    },
  },
  accessibilityTraining: {
    meta: {
      title: 'Indian Development Teams के लिए Accessibility Training',
      description:
        'Live, practical sessions जो आपकी team को accessible products build और test करने में सक्षम बनाती हैं — per seat नहीं, per session pricing।',
    },
    hero: {
      title: 'Indian development teams के लिए accessibility training',
      subtitle:
        'Live, practical sessions जो आपकी team को accessible products build और test करने में सक्षम बनाती हैं — per seat नहीं, per session pricing।',
    },
    catalogue: {
      title: 'Training catalogue',
      items: [
        {
          id: 'wcag',
          title: 'WCAG 2.2 AA Foundations',
          duration: '2 hours',
          price: '₹4,999/session',
          capacity: '25 participants तक',
          description: 'Semantic HTML, ARIA, forms, images, contrast, 9 नए WCAG 2.2 criteria',
        },
        {
          id: 'is17802',
          title: 'IS 17802 & Indian Compliance Deep-Dive',
          duration: '2 hours',
          price: '₹4,999/session',
          capacity: '25 participants तक',
          description:
            'IS 17802 WCAG से क्या add करता है, Devanagari Unicode requirements, DD/MM/YYYY announcements, Government teams के लिए GIGW 3.0, SEBI evidence expectations',
        },
        {
          id: 'screenreader',
          title: 'Screen Reader Testing Workshop',
          duration: '2 hours',
          price: '₹4,999/session',
          capacity: '25 participants तक',
          description:
            'Hands-on NVDA + TalkBack + VoiceOver, OTP flows testing, data tables और charts testing',
        },
      ],
    },
    format: {
      title: 'Format',
      items: [
        'Live online (Google Meet/Zoom)',
        'Recording provided',
        'Certificate of participation',
        '30 days के लिए follow-up Q&A channel',
      ],
    },
    whoFor: {
      title: 'किसके लिए है',
      roles: ['Developers', 'QA Engineers', 'Designers', 'Product Managers'],
    },
    bundle: {
      text: 'Training Professional plan onboarding में included है और किसी भी plan में add-on के रूप में available है',
      linkText: 'Pricing देखें',
    },
  },
  complianceReports: {
    meta: {
      title: 'Compliance Reports जो Regulators Actually Accept करते हैं',
      description:
        'AccessShield द्वारा generated हर report Indian regulation से mapped है — SEBI submissions, government tenders और CCPD responses के लिए ready।',
    },
    hero: {
      title: 'Compliance reports जो regulators actually accept करते हैं',
      subtitle:
        'AccessShield द्वारा generated हर report Indian regulation से mapped है — SEBI submissions, government tenders और CCPD responses के लिए ready।',
    },
    catalogue: {
      title: 'Report catalogue',
      reports: [
        {
          id: 'wcag',
          title: 'WCAG Compliance Report (VPAT-style)',
          description:
            'Criterion-by-criterion conformance table, Supports/Partially Supports/Does Not Support, auditor sign-off block।',
          includedIn: 'Professional+',
        },
        {
          id: 'sebi',
          title: 'SEBI Digital Accessibility Report',
          description:
            'SEBI submission के लिए formatted: scope, standards, findings, remediation timeline, annual re-audit schedule।',
          includedIn: 'Enterprise / SEBI bundle',
        },
        {
          id: 'is17802',
          title: 'IS 17802 Evidence Pack',
          description:
            'Screenshots के साथ per-rule evidence, हर check जिस exact clause से map होता है।',
          includedIn: 'Professional+',
        },
        {
          id: 'rpwd',
          title: 'RPwD Act Compliance Statement',
          description:
            'Legal/procurement teams के लिए plain-language statement Sections 40-46 reference के साथ।',
          includedIn: 'सभी paid plans',
        },
      ],
    },
    howGenerated: {
      title: 'Reports कैसे generate होती हैं',
      description:
        'Automated data + manual audit findings + IAAP auditor review → PDF + shareable link',
    },
    sample: {
      title: 'Sample WCAG Compliance Report download करें',
      description: 'Full compliance report कैसी दिखती है देखें',
      ctaText: 'Sample report पाएं',
    },
  },
  accessibilityTesting: {
    meta: {
      title: 'Automated Scans से Beyond Testing',
      description:
        'Automated tools maximum 40% accessibility issues catch करते हैं। हमारी layered testing methodology बाकी को cover करती है।',
    },
    hero: {
      title: 'Automated scans से beyond testing',
      subtitle:
        'Automated tools maximum 40% accessibility issues catch करते हैं। हमारी layered testing methodology बाकी को cover करती है।',
    },
    layers: {
      title: 'चार testing layers',
      subtitle:
        'एक comprehensive testing pyramid जो automated tools miss करते हैं उसे catch करती है',
      items: [
        {
          layer: '1',
          title: 'Automated',
          description:
            'axe-core + IS 17802 + GIGW rules, हर page, continuous। ~35-40% catch करता है।',
        },
        {
          layer: '2',
          title: 'Manual expert',
          description:
            '50-item WCAG 2.2 AA checklist, screen reader walkthroughs, keyboard-only journeys।',
        },
        {
          layer: '3',
          title: 'Assistive technology matrix',
          description:
            'Top user journeys पर NVDA + JAWS (Windows), VoiceOver (macOS/iOS), TalkBack (Android)।',
        },
        {
          layer: '4',
          title: 'PwD user testing',
          description:
            'Visual, motor और cognitive disabilities वाले real users आपकी critical journeys complete करते हैं और friction report करते हैं। Add-on ₹8,999 · हमारे disability-organisation partners के साथ deliver किया जाता है।',
        },
      ],
    },
    whySebi: {
      title: 'SEBI के लिए यह क्यों matter करता है',
      description:
        'SEBI का circular certified professionals द्वारा testing और ongoing validation expect करता है। हमारा layered approach directly इन requirements से map होता है — automated monitoring (Layer 1), professional audit (Layers 2-3), और real user validation (Layer 4)।',
    },
    mobileDocuments: {
      title: 'Web के beyond: mobile + documents',
      description:
        'Same methodology Android/iOS apps (Appium-based scanning) और PDF/Office documents को cover करती है। हर platform, एक consistent testing approach।',
    },
  },
  multilingualAccessibility: {
    meta: {
      title: 'उन Languages में Accessibility जो India Actually बोलता है',
      description:
        'Screen readers transliterated text नहीं पढ़ सकते। हम Hindi और regional languages में accessibility काम करवाते हैं — जैसे IS 17802 require करता है।',
    },
    hero: {
      title: 'उन languages में accessibility जो India actually बोलता है',
      subtitle:
        'Screen readers transliterated text नहीं पढ़ सकते। हम Hindi और regional languages में accessibility काम करवाते हैं — जैसे IS 17802 require करता है।',
    },
    problem: {
      title: 'Transliteration problem',
      description:
        'ASCII transliteration ("namaste" Latin letters में लिखा) TalkBack/NVDA द्वारा incorrectly announce किया जाता है, जबकि true Devanagari Unicode (U+0900–U+097F) correctly announce होता है। IS 17802 IS-002 correct Unicode को compliance requirement बनाता है, nice-to-have नहीं।',
      example: {
        wrong: 'namaste (Latin letters) → "en-ay-em-ay-es-tee-ee"',
        right: 'नमस्ते (Unicode) → "namaste" (सही pronunciation)',
      },
    },
    whatWeProvide: {
      title: 'AccessShield क्या provide करता है',
      items: [
        {
          id: 'widget',
          title: 'आज Hindi में widget',
          description: 'Tamil, Telugu, Kannada, Marathi, Bengali 2026 में roll out हो रहे हैं',
        },
        {
          id: 'scanner',
          title: 'Scanner rule IS-002',
          description:
            'आपके content में transliteration-instead-of-Unicode automatically detect करता है',
        },
        {
          id: 'statements',
          title: 'Bilingual accessibility statements',
          description: 'हमारी AI service द्वारा EN + HI generated',
        },
        {
          id: 'consulting',
          title: 'Multilingual content strategy',
          description: 'Regional language accessibility के लिए consulting',
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
      description: 'AccessibleNow के लिए install guides, API reference और widget setup।',
    },
    title: 'Documentation',
    description: 'Widget embed, scanning API और dashboard workflows के setup guides।',
  },
  careers: {
    meta: {
      title: 'Careers',
      description:
        'AccessibleNow में शामिल हों — Pune में accessibility, sales और compliance roles।',
    },
    title: 'Careers',
    description: 'India की digital services सभी के लिए accessible बनाने में मदद करें।',
  },
  waitlist: {
    meta: {
      title: 'Waitlist',
      description: 'Early access के लिए AccessibleNow waitlist में जुड़ें।',
    },
    title: 'Waitlist में जुड़ें',
    description: 'नई features launch होते ही सबसे पहले जानें।',
  },
  privacy: {
    meta: {
      title: 'Privacy Policy',
      description: 'AccessibleNow आपका data कैसे collect और protect करता है।',
    },
    title: 'Privacy Policy',
    description: 'Last updated June 2026. हम India के DPDP Act principles follow करते हैं।',
  },
  terms: {
    meta: {
      title: 'Terms of Service',
      description: 'AccessibleNow platform और services use करने की terms।',
    },
    title: 'Terms of Service',
    description: 'Platform use करने से पहले ये terms पढ़ें।',
  },
  refund: {
    meta: {
      title: 'Refund Policy',
      description: 'AccessibleNow refund और cancellation policy।',
    },
    title: 'Refund Policy',
    description: '14-day trial और subscription refund terms।',
  },
  accessibilityStatement: {
    meta: {
      title: 'Accessibility Statement',
      description: 'AccessibleNow platform के लिए WCAG 2.2 AA commitment।',
    },
    title: 'Accessibility Statement',
    description: 'हम खुद उन्हीं standards पर खरे उतरते हैं जो customers को meet करवाते हैं।',
  },
  guides: {
    rpwd: {
      meta: {
        title: 'RPwD Act 2016 Guide',
        description:
          'Indian businesses के लिए Rights of Persons with Disabilities Act की simple guide।',
      },
      eyebrow: 'Legal guide',
      title: 'Rights of Persons with Disabilities Act, 2016',
      description: 'Indian businesses और website owners के लिए simple guide',
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
        description: 'ICT accessibility के लिए India का BIS standard — WCAG 2.1 AA पर आधारित।',
      },
      eyebrow: 'Technical standard',
      title: 'IS 17802 — ICT Accessibility Standard',
      description: 'Websites, apps और digital documents के लिए BIS 2021 national standard',
    },
    gigw: {
      meta: {
        title: 'GIGW 3.0 Guide',
        description: 'Indian Government Websites guidelines — accessibility requirements।',
      },
      eyebrow: 'Government guide',
      title: 'GIGW 3.0 — Government Web Guidelines',
      description: 'Indian government portals के लिए mandatory accessibility requirements',
    },
    wcag: {
      meta: {
        title: 'WCAG 2.2 AA Guide',
        description: 'Indian teams के लिए Web Content Accessibility Guidelines समझाया।',
      },
      eyebrow: 'Global standard',
      title: 'WCAG 2.2 Level AA',
      description: 'Accessible web content के लिए international baseline',
    },
    sebi: {
      meta: {
        title: 'SEBI Accessibility Guide',
        description: 'SEBI 2024 circular — WCAG 2.1 AA deadline April 2026।',
      },
      eyebrow: 'Regulatory guide',
      title: 'SEBI Digital Accessibility Circular',
      description: 'सभी SEBI-regulated entities के लिए requirements',
    },
  },
};
