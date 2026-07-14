import type { HomeDict } from '../types';

export const home: HomeDict = {
  meta: {
    title: 'सभी भारतीयों के लिए accessible। Regulators के लिए auditable।',
    description:
      'BFSI, PSU और government vendors के लिए enterprise accessibility platform — websites और mobile apps scan करें, disabilities वाले users की barriers हटाएँ, और RPwD, GIGW, IS 17802 व SEBI audit evidence तैयार करें।',
  },
  hero: {
    urgencyAria: 'Compliance urgency',
    badges: ['SEBI deadline Apr 2026', 'GIGW 3.0 · Govt portals', 'RPwD Act 2016'],
    titleLine1: 'सभी भारतीयों के लिए',
    titleHighlight: 'accessible',
    titleLine2: 'Regulators के लिए auditable।',
    subtitle:
      'BFSI, PSU और government vendors के लिए India का platform — websites और mobile apps scan करें, disabilities वाले लोगों की barriers हटाएँ, और RPwD, GIGW, IS 17802 व SEBI evidence बनाएँ जो audit file माँगती है।',
    sectorsAria: 'हम किसके लिए हैं',
    sectors: ['BFSI & listed cos.', 'PSU & ministries', 'Govt vendors', 'Audit-ready reports'],
    trustPoints: [
      'Websites और mobile apps के लिए WCAG 2.2 AA + IS 17802 scans',
      'SEBI, RPwD, GIGW और tender committees के लिए audit-ready PDFs',
      'Remediation, widget, monitoring और IAAP sign-off pathways',
    ],
    bookDemo: 'Enterprise demo book करें',
    runScan: 'Free scan चलाएँ',
    footnote:
      'GST invoice · Government के लिए PO और annual contracts · Free scan के लिए credit card नहीं',
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
        { label: 'SEBI assessment', status: 'Review में' },
      ],
      download: 'Audit committee के लिए PDF download करें',
    },
    visual: {
      scanComplete: 'Scan complete',
      scanTime: '68 seconds',
      figcaption:
        'India में enterprise team digital accessibility review कर रही है, sample compliance report में score और regulator-ready exports दिख रहे हैं।',
      imageAlt:
        'विविध भारतीय professionals enterprise office में laptops और assistive technology से digital services use कर रहे हैं',
    },
  },
  ticker: {
    aria: 'India भर में sectors जिनकी हम सेवा करते हैं',
    sectors: [
      'BFSI & listed companies',
      'PSU & central ministries',
      'State govt portals',
      'SEBI-regulated entities',
      'Government ICT vendors',
      'Healthcare & insurance',
      'E-commerce & fintech',
      'Public sector banks',
    ],
    items: [
      'SEBI: सभी regulated entities को April 2026 तक WCAG 2.1 AA meet करना होगा',
      'GIGW 3.0: Government websites को IS 17802 follow करना होगा',
      'RPwD Act 2016: Digital services disabilities वाले लोगों के लिए accessible होनी चाहिए',
      'IS 17802: India का national ICT accessibility standard (BIS 2021)',
    ],
  },
  riskStats: {
    title: 'India में accessibility — numbers के साथ',
    intro: 'Web universal होने के लिए बना। बहुत सी Indian sites अभी भी लोगों को बाहर रखती हैं।',
    stats: [
      { value: '2.68 Cr+', label: 'Visual disability वाले Indians (Census 2011)' },
      { value: '70M+', label: 'India में disabilities वाले लोग' },
      { value: '21', label: 'RPwD Act के तहत मान्यता प्राप्त disability types' },
      { value: 'Apr 2026', label: 'Listed cos. के लिए SEBI accessibility deadline' },
    ],
  },
  whoWeBuildFor: {
    title: 'Real users के लिए बना, सिर्फ PDFs के लिए नहीं',
    subtitle:
      'जब disability वाला कोई bill नहीं भर पाता, menu नहीं पढ़ पाता, या form complete नहीं कर पाता, तो service सच में public नहीं है। हम वो barriers ढूँढते हैं — फिर हटाने में मदद करते हैं।',
    imageAlt:
      'Visual, hearing और motor disabilities वाले Indian users independently smartphones, laptops और accessible keyboards use कर रहे हैं',
    quote:
      'Web की ताकत उसकी universality में है। Disability के बावजूद सभी की access एक ज़रूरी पहलू है।',
    quoteAuthor: 'Tim Berners-Lee',
    cards: [
      {
        title: 'Blind & low-vision users',
        barrier: 'Missing alt text, poor contrast, broken screen-reader order',
        checks: 'WCAG 1.1.1, 1.4.3, focus order, ARIA labels',
      },
      {
        title: 'Deaf & hard-of-hearing users',
        barrier: 'Videos में captions नहीं, सिर्फ audio alerts',
        checks: 'WCAG 1.2 multimedia, transcripts, visual alternatives',
      },
      {
        title: 'Motor & cognitive disabilities',
        barrier: 'छोटे buttons, keyboard traps, confusing forms',
        checks: 'WCAG 2.1 keyboard access, 2.5.8 touch targets, IS 17802',
      },
    ],
    barrierLabel: 'आम barrier:',
    checksLabel: 'हम क्या check करते हैं:',
    footer:
      'ये barriers fix करें और crores Indians का स्वागत करें जो screen readers, magnifiers, voice control और दूसरी assistive technology पर निर्भर हैं — RPwD, IS 17802, GIGW और SEBI के लिए जो scans और reports regulators expect करते हैं।',
    figcaption:
      'Assistive technology से digital services access करते disabilities वाले लोग, India में',
  },
  howItWorks: {
    title: 'Barriers से welcome तक — 4 steps में',
    subtitle:
      'जो लोगों को बाहर करता है उसे ढूँढें, fix करें, और team व regulators के लिए progress document करें',
    stepLabel: 'Step',
    steps: [
      {
        title: 'Discover',
        description:
          'Disabilities वाले users की नज़र से site देखें — 60–90 seconds में automated scan और real barrier detection।',
      },
      {
        title: 'Understand',
        description:
          'Priority issues: payment, sign-up या content पढ़ने में क्या रुकावट है — WCAG और IS 17802 से mapped।',
      },
      {
        title: 'Fix',
        description:
          'Code-level remediation guidance और AI suggestions — alt text, contrast, keyboard access और बहुत कुछ।',
      },
      {
        title: 'Prove',
        description:
          'RPwD, SEBI, GIGW के लिए reports और certificates — compliance inclusion के पीछे आए, उल्टा नहीं।',
      },
    ],
  },
  standards: {
    title: 'Auditors को जो proof चाहिए — barriers fix करने के बाद',
    subtitle: 'एक scan हर Indian standard cover करता है। Compliance inclusion के पीछे आता है।',
    items: [
      {
        name: 'RPwD Act 2016',
        description:
          'Rights of Persons with Disabilities Act — government websites के लिए mandatory',
        href: '/rpwd-act',
      },
      {
        name: 'IS 17802',
        description: 'ICT Accessibility के लिए Indian Standard — WCAG 2.1 AA aligned',
        href: '/is-17802',
      },
      {
        name: 'GIGW 3.0',
        description: 'Indian Government Websites guidelines — WCAG 2.0 Level A compliance',
        href: '/gigw',
      },
      {
        name: 'WCAG 2.2 AA',
        description: 'Web Content Accessibility Guidelines — international standard',
        href: '/wcag-2-2-aa',
      },
      {
        name: 'SEBI 2024',
        description: 'SEBI accessibility circular — Apr 2026 तक listed companies के लिए mandatory',
        href: '/sebi-accessibility',
      },
    ],
  },
  testimonials: {
    title: 'India भर में सभी के लिए बनाने वाली teams',
    subtitle: 'Compliance से certificate मिलता है। Accessibility से customer मिलता है।',
    items: [
      {
        quote:
          'हम सोचते थे सब ठीक है, जब तक blind user हमारा KYC flow complete नहीं कर पाया। AccessShield ने बताया क्या fix करना है — और SEBI-ready reports दिए।',
        name: 'Priya Sharma',
        role: 'Head of Compliance',
        company: 'Leading Fintech',
        starsAria: '5 में से 5 stars',
      },
      {
        quote:
          'Government tender में GIGW compliance चाहिए था। AccessShield ने इसे real barriers में बदला — सिर्फ checklist नहीं।',
        name: 'Rajesh Kumar',
        role: 'CTO',
        company: 'E-commerce Platform',
        starsAria: '5 में से 5 stars',
      },
      {
        quote:
          'Widget आज low vision और dyslexia वाले visitors की मदद करता है। Remediation कल सभी की मदद करेगा। यही सही order है।',
        name: 'Meera Patel',
        role: 'Product Manager',
        company: 'SaaS Startup',
        starsAria: '5 में से 5 stars',
      },
    ],
  },
  blogPreview: {
    title: 'Compliance desk से latest',
    subtitle: 'Indian accessibility laws और best practices पर updated रहें',
    viewAll: 'सभी articles देखें →',
    empty: 'अभी कोई post नहीं — जल्द वापस आएँ।',
  },
  cta: {
    badge: 'SEBI deadline: April 2026',
    title: 'हर कोई आपकी website use करने का हक़दार है',
    body: 'करोड़ों Indians disabilities के साथ रहते हैं। अगर वे payment, sign-up या content नहीं पढ़ पाते, तो product पूरा नहीं है। SEBI, RPwD और GIGW accessible digital services माँगते हैं — पर असली reason सरल है: inclusion अच्छा business है।',
    scanCta: 'Accessibility barriers के लिए scan करें',
    expertCta: 'Expert से बात करें',
  },
};
