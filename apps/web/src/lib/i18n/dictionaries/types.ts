export interface Dictionary {
  common: CommonDict;
  home: HomeDict;
  dashboard: DashboardDict;
  auth: AuthDict;
  pages: PagesDict;
  pricing: PricingDict;
}

export interface CommonDict {
  brand: string;
  nav: {
    mainAria: string;
    home: string;
    services: string;
    widget: string;
    documentScanner: string;
    blog: string;
    scan: string;
    signIn: string;
    startTrial: string;
    toggleMenu: string;
    closeMenu: string;
    mobileMenuAria: string;
  };
  language: {
    label: string;
    en: string;
    hi: string;
    switchTo: string;
  };
  footer: {
    compliance: string;
    product: string;
    company: string;
    legal: string;
    bookDemo: string;
    opensNewTab: string;
    copyright: string;
    gstin: string;
    location: string;
    links: {
      rpwd: string;
      is17802: string;
      gigw: string;
      wcag: string;
      sebi: string;
      freeScan: string;
      services: string;
      widget: string;
      documentScanner: string;
      docs: string;
      blog: string;
      about: string;
      contact: string;
      careers: string;
      privacy: string;
      terms: string;
      refund: string;
      accessibility: string;
    };
  };
  actions: {
    learnMore: string;
    getStarted: string;
    talkToUs: string;
    bookDemo: string;
    runFreeScan: string;
    readMore: string;
    viewAll: string;
    pause: string;
    play: string;
  };
  severity: {
    critical: string;
    serious: string;
    moderate: string;
    minor: string;
  };
  status: {
    ready: string;
    inReview: string;
  };
}

export interface HomeDict {
  meta: { title: string; description: string };
  hero: {
    urgencyAria: string;
    badges: string[];
    titleLine1: string;
    titleHighlight: string;
    titleLine2: string;
    subtitle: string;
    sectorsAria: string;
    sectors: string[];
    trustPoints: string[];
    bookDemo: string;
    runScan: string;
    footnote: string;
    standardsAria: string;
    standards: string[];
    reportCard: {
      title: string;
      auditFile: string;
      scoreLabel: string;
      scoreMeta: string;
      exportsTitle: string;
      exports: { label: string; status: string }[];
      download: string;
    };
    visual: {
      scanComplete: string;
      scanTime: string;
      figcaption: string;
      imageAlt: string;
    };
  };
  ticker: {
    aria: string;
    sectors: string[];
    items: string[];
  };
  riskStats: {
    title: string;
    intro: string;
    stats: { value: string; label: string }[];
  };
  whoWeBuildFor: {
    title: string;
    subtitle: string;
    imageAlt: string;
    quote: string;
    quoteAuthor: string;
    cards: { title: string; barrier: string; checks: string }[];
    barrierLabel: string;
    checksLabel: string;
    footer: string;
    figcaption: string;
  };
  howItWorks: {
    title: string;
    subtitle: string;
    stepLabel: string;
    steps: { title: string; description: string }[];
  };
  standards: {
    title: string;
    subtitle: string;
    items: { name: string; description: string; href: string }[];
  };
  testimonials: {
    title: string;
    subtitle: string;
    items: { quote: string; name: string; role: string; company: string; starsAria: string }[];
  };
  blogPreview: {
    title: string;
    subtitle: string;
    viewAll: string;
    empty: string;
  };
  cta: {
    badge: string;
    title: string;
    body: string;
    scanCta: string;
    expertCta: string;
  };
}

export interface DashboardDict {
  nav: {
    sidebarAria: string;
    expand: string;
    collapse: string;
    dashboard: string;
    assets: string;
    scans: string;
    documentScanner: string;
    issues: string;
    reports: string;
    certificates: string;
    settings: string;
    platformAdmin: string;
  };
  topBar: {
    searchPlaceholder: string;
    notifications: string;
    profile: string;
  };
}

export interface AuthDict {
  login: {
    title: string;
    subtitle: string;
    email: string;
    password: string;
    submit: string;
    forgotPassword: string;
    noAccount: string;
    signUp: string;
  };
  signup: {
    title: string;
    subtitle: string;
    name: string;
    email: string;
    password: string;
    organisation: string;
    submit: string;
    hasAccount: string;
    signIn: string;
  };
}

export interface PagesDict {
  about: PageContent;
  contact: PageContent & { form: Record<string, string> };
  scan: PageContent;
  widget: PageContent;
  documentScanner: PageContent;
  services: PageContent;
  docs: PageContent;
  careers: PageContent;
  waitlist: PageContent;
  privacy: PageContent;
  terms: PageContent;
  refund: PageContent;
  accessibilityStatement: PageContent;
  guides: {
    rpwd: GuidePageContent;
    is17802: GuidePageContent;
    gigw: GuidePageContent;
    wcag: GuidePageContent;
    sebi: GuidePageContent;
  };
}

export interface PageContent {
  meta: { title: string; description: string };
  title: string;
  description?: string;
  eyebrow?: string;
  sections?: { id: string; heading: string; body: string; list?: string[] }[];
}

export interface GuidePageContent extends PageContent {
  eyebrow: string;
  badges?: string[];
}

export interface PricingDict {
  page: { title: string; description: string; eyebrow: string };
  sections: {
    auditFirst: string;
    step01: string;
    step02: string;
    monitoring: string;
    faq: string;
    costOfInaction: string;
  };
  billing: { monthly: string; annual: string; save: string; exclGst: string };
  freeTier: { name: string; description: string; cta: string; signupCta: string };
}
