import type { PagesDict } from '../types';

export const pages: PagesDict = {
  about: {
    meta: {
      title: 'हमारे बारे में',
      description:
        'AccessShield India Pune-based company है जो Indian organisations को RPwD, IS 17802, GIGW, WCAG 2.2 AA और SEBI digital accessibility compliance में मदद करती है।',
    },
    title: 'AccessShield India के बारे में',
    description:
      'Pune-based company जो Indian businesses, government vendors और regulated industries के लिए digital accessibility compliance practical बनाती है।',
    sections: [
      {
        id: 'mission',
        heading: 'हमारा mission',
        body: 'हर कोई banking, healthcare, government portals और investor platforms जैसी digital services तक बराबर पहुँच का हक़दार है। AccessShield India India के accessibility laws और tight deadlines व budgets पर teams जो actually ship कर सकती हैं, उनके बीच का gap कम करता है।',
      },
      {
        id: 'what-we-do',
        heading: 'हम क्या करते हैं',
        body: 'हम continuous accessibility compliance के लिए AI-powered SaaS platform हैं। Teams AccessShield से websites scan करती हैं, issues prioritise करती हैं, remediation track करती हैं, audit-ready reports बनाती हैं, और RPwD Act 2016, IS 17802, GIGW 3.0, WCAG 2.2 AA और SEBI requirements की तरफ progress दिखाती हैं।',
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
        'Demos, enterprise pricing और compliance सवालों के लिए AccessShield India से संपर्क करें।',
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
      title: 'Services & Pricing',
      description: 'Widget, scanning, remediation और compliance plans — INR में।',
    },
    title: 'Services & Pricing',
    description: 'Free scan से enterprise regulatory defense तक — अपनी team के लिए सही path चुनें।',
  },
  docs: {
    meta: {
      title: 'Documentation',
      description: 'AccessShield India के लिए install guides, API reference और widget setup।',
    },
    title: 'Documentation',
    description: 'Widget embed, scanning API और dashboard workflows के setup guides।',
  },
  careers: {
    meta: {
      title: 'Careers',
      description:
        'AccessShield India में शामिल हों — Pune में accessibility, sales और compliance roles।',
    },
    title: 'Careers',
    description: 'India की digital services सभी के लिए accessible बनाने में मदद करें।',
  },
  waitlist: {
    meta: {
      title: 'Waitlist',
      description: 'Early access के लिए AccessShield India waitlist में जुड़ें।',
    },
    title: 'Waitlist में जुड़ें',
    description: 'नई features launch होते ही सबसे पहले जानें।',
  },
  privacy: {
    meta: {
      title: 'Privacy Policy',
      description: 'AccessShield India आपका data कैसे collect और protect करता है।',
    },
    title: 'Privacy Policy',
    description: 'Last updated June 2026. हम India के DPDP Act principles follow करते हैं।',
  },
  terms: {
    meta: {
      title: 'Terms of Service',
      description: 'AccessShield India platform और services use करने की terms।',
    },
    title: 'Terms of Service',
    description: 'Platform use करने से पहले ये terms पढ़ें।',
  },
  refund: {
    meta: {
      title: 'Refund Policy',
      description: 'AccessShield India refund और cancellation policy।',
    },
    title: 'Refund Policy',
    description: '14-day trial और subscription refund terms।',
  },
  accessibilityStatement: {
    meta: {
      title: 'Accessibility Statement',
      description: 'AccessShield platform के लिए WCAG 2.2 AA commitment।',
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
