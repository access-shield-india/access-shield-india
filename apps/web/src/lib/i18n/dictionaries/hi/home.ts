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
          'हम सोचते थे सब ठीक है, जब तक blind user हमारा KYC flow complete नहीं कर पाया। AccessibleNow ने बताया क्या fix करना है — और SEBI-ready reports दिए।',
        name: 'Priya Sharma',
        role: 'Head of Compliance',
        company: 'Leading Fintech',
        starsAria: '5 में से 5 stars',
      },
      {
        quote:
          'Government tender में GIGW compliance चाहिए था। AccessibleNow ने इसे real barriers में बदला — सिर्फ checklist नहीं।',
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
  storyCarousel: {
    title: 'असली लोग। असली बाधाएँ। असली समाधान।',
    subtitle: 'हर दुर्गम बटन, चित्र या वीडियो किसी को बाहर कर देता है। देखिए किसे।',
    regionAria: 'दुर्गम वेबसाइटों से प्रभावित लोगों की कहानियाँ',
    pause: 'स्लाइडशो रोकें',
    play: 'स्लाइडशो चलाएँ',
    previous: 'पिछली कहानी',
    next: 'अगली कहानी',
    goTo: 'कहानी {n} दिखाएँ: {title}',
    slideOf: '{total} में से {current}',
    slides: [
      {
        id: 'screenReader',
        eyebrow: 'स्क्रीन रीडर यूज़र · बेंगलुरु',
        title: 'वह हर बिल आवाज़ से भरता है — जब तक किसी बटन का नाम न हो।',
        body: 'स्क्रीन रीडर हर बटन बोलकर पढ़ता है। बिना लेबल वाला आइकन-बटन सिर्फ़ "बटन" सुनाई देता है, और भुगतान अधूरा छूट जाता है।',
        stat: '28%',
        statLabel: 'शीर्ष 10 लाख होम पेजों पर ऐसे बटन हैं जिनका नाम स्क्रीन रीडर नहीं बता पाता',
        imageAlt:
          'काले चश्मे और ईयरबड पहने युवा भारतीय पुरुष कैफ़े में फ़ोन पर स्क्रीन रीडर इस्तेमाल करते हुए',
        cta: 'अपनी साइट पर बिना नाम वाले बटन खोजें',
        href: '/scan',
      },
      {
        id: 'lowVision',
        eyebrow: 'कम दृष्टि · उम्र 68 · पुणे',
        title: 'वह डॉक्टर की अपॉइंटमेंट ऑनलाइन बुक करती हैं — जब टेक्स्ट बड़ा और साफ़ हो।',
        body: 'हल्का धूसर टेक्स्ट और छोटे फ़ॉन्ट करोड़ों बुज़ुर्ग भारतीयों को रोक देते हैं। 200% ज़ूम पर भी आपका लेआउट काम करना चाहिए।',
        stat: '81%',
        statLabel: 'शीर्ष होम पेजों पर टेक्स्ट का कंट्रास्ट पढ़ने के लिए बहुत कम है',
        imageAlt: 'साड़ी पहने मुस्कुराती बुज़ुर्ग भारतीय महिला बड़े, स्पष्ट बटनों वाले टैबलेट का उपयोग करते हुए',
        cta: 'उनकी नज़र से देखें',
        href: '#simulator-heading',
      },
      {
        id: 'keyboard',
        eyebrow: 'व्हीलचेयर यूज़र · सिर्फ़ कीबोर्ड · मुंबई',
        title: 'वह माउस छुए बिना अपनी टीम की रिपोर्ट चलाती हैं।',
        body: 'चलने-फिरने में अक्षम लोग कीबोर्ड या स्विच डिवाइस पर निर्भर रहते हैं। अगर मेन्यू सिर्फ़ माउस रखने पर खुलता है, तो पूरी साइट उनके लिए बंद है।',
        stat: '100%',
        statLabel: 'सुविधाएँ WCAG 2.2 और IS 17802 के तहत कीबोर्ड से चलनी चाहिए',
        imageAlt: 'व्हीलचेयर पर बैठी भारतीय पेशेवर महिला ऑफ़िस डेस्क पर लैपटॉप पर टाइप करते हुए',
        cta: 'मुफ़्त कीबोर्ड जाँच चलाएँ',
        href: '/scan',
      },
      {
        id: 'deaf',
        eyebrow: 'बधिर छात्रा · दिल्ली',
        title: 'वह हर लेक्चर ऑनलाइन देखती हैं — जब वीडियो में कैप्शन हों।',
        body: 'कैप्शन या सांकेतिक भाषा के बिना वीडियो बेकार है। GIGW 3.0 सरकारी वीडियो में कैप्शन अनिवार्य करता है।',
        stat: '6.3 करोड़',
        statLabel: 'भारतीय गंभीर श्रवण हानि के साथ जीते हैं (WHO अनुमान)',
        imageAlt: 'लाइब्रेरी में बधिर भारतीय छात्रा सांकेतिक भाषा दुभाषिए के साथ कैप्शन वाला लेक्चर देखते हुए',
        cta: 'अपने मीडिया की सुगम्यता जाँचें',
        href: '/scan',
      },
      {
        id: 'compliance',
        eyebrow: 'अनुपालन टीम · गुरुग्राम',
        title: 'पहले स्कैन से ऑडिट-तैयार प्रमाण तक, एक ही डैशबोर्ड में।',
        body: 'AccessibleNow आपकी साइट और ऐप स्कैन करता है, हर समस्या सरल भाषा में समझाता है, AI से सुधार सुझाता है, और ऑडिटर व नियामकों के लिए रिपोर्ट तैयार करता है।',
        stat: '4',
        statLabel: 'भारतीय नियम हर रिपोर्ट में: RPwD, SEBI, GIGW और IS 17802',
        imageAlt: 'बोर्डरूम में भारतीय अनुपालन टीम दीवार स्क्रीन पर सुगम्यता स्कोर डैशबोर्ड देखते हुए',
        cta: 'एंटरप्राइज़ डेमो बुक करें',
        href: '/contact?plan=enterprise',
      },
    ],
  },
  heroScan: {
    label: 'अपनी वेबसाइट 60 सेकंड में जाँचें — मुफ़्त',
    placeholder: 'yourcompany.in',
    submit: 'अभी स्कैन करें',
    invalidUrl: 'सही वेबसाइट पता दर्ज करें, जैसे yourcompany.in',
    hint: 'साइन-अप की ज़रूरत नहीं। 10 पेज तक स्कैन होते हैं।',
  },
  simulator: {
    title: 'आपकी वेबसाइट, आपके ग्राहकों की नज़र से',
    subtitle:
      '2.6 करोड़ से ज़्यादा भारतीय दिव्यांगता के साथ जीते हैं। एक व्यू चुनें और देखें कि उन्हें एक आम भुगतान स्क्रीन कैसी दिखती है।',
    groupAria: 'सिमुलेशन चुनें',
    previewTitle: 'अपने क्रेडिट कार्ड बिल का भुगतान करें',
    previewAmount: '15/10/2026 तक देय राशि: ₹12,450',
    previewStatusLabel: 'पिछले भुगतान की स्थिति',
    previewPay: 'अभी भुगतान करें',
    modes: [
      {
        id: 'normal',
        label: 'सामान्य दृश्य',
        insight: 'आपकी डिज़ाइन टीम पेज को ऐसे देखती है।',
      },
      {
        id: 'lowVision',
        label: 'कम दृष्टि',
        insight:
          'छोटा धूसर टेक्स्ट और पतली बॉर्डर धुंधली हो जाती हैं। 50 से ज़्यादा उम्र के कई लोग लगभग ऐसा ही देखते हैं।',
      },
      {
        id: 'colourBlind',
        label: 'रंग-अंधता',
        insight:
          'लाल और हरे स्टेटस डॉट एक जैसे दिखते हैं, इसलिए यह यूज़र नहीं समझ पाता कि पिछला भुगतान असफल हुआ या नहीं। लगभग 12 में से 1 पुरुष प्रभावित है।',
      },
      {
        id: 'cataract',
        label: 'मोतियाबिंद',
        insight:
          'कंट्रास्ट फीका पड़ जाता है और भुगतान बटन पृष्ठभूमि में खो जाता है। भारत में दृष्टि हानि का सबसे बड़ा कारण मोतियाबिंद है।',
      },
    ],
    cta: 'अपनी साइट पर ये समस्याएँ खोजें',
  },
  calculator: {
    title: 'दुर्गम वेबसाइट आपको कितना नुकसान पहुँचा रही है?',
    subtitle:
      'स्लाइडर को अपने ट्रैफ़िक पर ले जाएँ। हम उन ग्राहकों का अनुमान लगाते हैं जो साइट इस्तेमाल न कर पाने के कारण छोड़ देते हैं।',
    visitorsLabel: 'मासिक वेबसाइट विज़िटर',
    orderLabel: 'औसत ऑर्डर या लेन-देन मूल्य (₹)',
    resultLabel: 'हर महीने जोखिम में राजस्व',
    resultNote:
      'अनुमान में दिव्यांग विज़िटर 2.21% (जनगणना 2011) से 16% (WHO) तक और 2% रूपांतरण दर मानी गई है।',
    legalLabel: 'RPwD अधिनियम 2016, धारा 89 के तहत कानूनी जोखिम',
    legalValue: 'दोहराए गए उल्लंघन पर ₹5,00,000 तक',
    legalNote: 'साथ ही विनियमित संस्थाओं पर SEBI कार्रवाई और सरकारी निविदाओं से अयोग्यता।',
    cta: 'जानें आपकी साइट में ठीक क्या टूटा है',
  },
  quiz: {
    title: 'क्या सुगम्यता कानून आप पर लागू होता है?',
    subtitle: 'तीन सवालों के जवाब दें और देखें कि कौन-से भारतीय नियम आपके संगठन पर लागू हैं।',
    yes: 'हाँ',
    no: 'नहीं',
    questions: [
      { id: 'sebi', question: 'क्या आपका संगठन SEBI द्वारा विनियमित है (सूचीबद्ध कंपनी, ब्रोकर, AMC, RIA)?' },
      { id: 'government', question: 'क्या आप सरकारी संस्था, PSU, या सरकार के लिए काम करने वाले वेंडर हैं?' },
      { id: 'public', question: 'क्या ग्राहक या नागरिक आपकी वेबसाइट या ऐप इस्तेमाल करते हैं?' },
    ],
    resultTitle: 'आप पर लागू होने वाले नियम',
    resultPending: 'परिणाम देखने के लिए ऊपर दिए सवालों के जवाब दें।',
    resultNone:
      'आज आप पर कोई विशेष नियम लागू नहीं दिखता। फिर भी WCAG 2.2 AA सर्वोत्तम अभ्यास है — और जैसे ही आप जनता को सेवा देते हैं, सूचीबद्ध होते हैं, या सरकारी काम के लिए बोली लगाते हैं, ये नियम लागू हो जाते हैं।',
    laws: [
      {
        id: 'rpwd',
        name: 'RPwD Act 2016',
        reason: 'सार्वजनिक सेवाओं के लिए सुगम ICT अनिवार्य करता है। धारा 89 के तहत दंड।',
        href: '/rpwd-act',
      },
      {
        id: 'sebi',
        name: 'SEBI सुगम्यता परिपत्र (2024)',
        reason: 'विनियमित संस्थाओं के लिए डिजिटल सुगम्यता और ऑडिट प्रमाण अनिवार्य।',
        href: '/sebi-accessibility',
      },
      {
        id: 'gigw',
        name: 'GIGW 3.0',
        reason: 'सरकारी वेबसाइटों, ऐप्स और उन्हें बनाने वाले वेंडरों के लिए आवश्यक।',
        href: '/gigw',
      },
      {
        id: 'is17802',
        name: 'IS 17802',
        reason: 'भारत का राष्ट्रीय ICT सुगम्यता मानक, जिसका उल्लेख निविदाओं और ऑडिट में होता है।',
        href: '/is-17802',
      },
    ],
    learnMore: 'और जानें',
    cta: 'अभी अपनी अनुपालन स्थिति जाँचें',
  },
};
