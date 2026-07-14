/**
 * Accessibility Statement Template
 *
 * Generates a WCAG 2.2 AA compliant HTML accessibility statement
 * suitable for publishing on client websites. Supports English and Hindi.
 */

import Handlebars from 'handlebars';
import type { ReportTemplateData } from '../types';

/** Grievance officer contact information */
export interface GrievanceOfficer {
  name: string;
  email: string;
  phone: string;
}

/** Options for accessibility statement generation */
export interface AccessibilityStatementOptions {
  language: 'en' | 'hi';
  grievanceOfficer: GrievanceOfficer;
}

/** Accessibility statement CSS - WCAG 2.2 AA compliant */
const STATEMENT_CSS = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  main {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #1A1A2E;
    background-color: #FFFFFF;
    max-width: 800px;
    margin: 0 auto;
    padding: 32px 24px;
    line-height: 1.6;
    font-size: 1rem;
  }

  h1 {
    font-size: 1.75rem;
    color: #0D2E5A;
    margin-bottom: 24px;
    line-height: 1.3;
  }

  h2 {
    font-size: 1.25rem;
    color: #1A3A5C;
    margin-top: 32px;
    margin-bottom: 12px;
    line-height: 1.4;
  }

  p {
    margin-bottom: 16px;
  }

  ul {
    margin: 16px 0;
    padding-left: 24px;
  }

  li {
    margin-bottom: 8px;
  }

  a {
    color: #1A56A0;
    text-decoration: underline;
  }

  a:hover {
    color: #0D2E5A;
  }

  a:focus {
    outline: 2px solid #1A56A0;
    outline-offset: 2px;
    border-radius: 2px;
  }

  address {
    font-style: normal;
    background-color: #F4F8FD;
    border: 1px solid #EBF3FB;
    border-radius: 8px;
    padding: 16px 20px;
    margin: 16px 0;
  }

  address p {
    margin-bottom: 8px;
  }

  address p:last-child {
    margin-bottom: 0;
  }

  strong {
    font-weight: 600;
  }

  section {
    margin-bottom: 24px;
  }

  .conformance-level {
    display: inline-block;
    background-color: #E6F4EC;
    color: #1A6B3C;
    padding: 4px 12px;
    border-radius: 4px;
    font-weight: 600;
  }

  .conformance-partial {
    background-color: #FEF3C7;
    color: #92400E;
  }

  .conformance-non {
    background-color: #FEE2E2;
    color: #991B1B;
  }
`;

/** English content */
const ENGLISH_CONTENT = {
  title: 'Accessibility Statement for',
  commitment: {
    heading: 'Our Commitment',
    text: (orgName: string) =>
      `${orgName} is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.`,
  },
  conformance: {
    heading: 'Conformance Status',
    intro: 'This website has been assessed against the following standards:',
    levelLabel: 'Conformance level:',
  },
  limitations: {
    heading: 'Known Limitations',
    hasIssues:
      'Despite our best efforts, some content may not yet be fully accessible. Known limitations include:',
    noIssues:
      'No significant accessibility barriers were identified in our most recent assessment.',
  },
  assessment: {
    heading: 'Assessment Approach',
    text: (date: string) =>
      `This statement is based on an assessment conducted on ${date} using a combination of automated testing tools and manual review by accessibility professionals.`,
  },
  feedback: {
    heading: 'Feedback and Contact Information',
    intro:
      'We welcome your feedback on the accessibility of this website. Please let us know if you encounter accessibility barriers:',
    grievanceLabel: 'Grievance Officer:',
    emailLabel: 'Email:',
    phoneLabel: 'Phone:',
    response:
      'We aim to respond to accessibility feedback within 30 days, in accordance with the Information Technology (Intermediary Guidelines) Rules.',
  },
  review: {
    heading: 'Review Date',
    text: (date: string) =>
      `This statement was last reviewed on ${date}. We plan to review it again within 12 months.`,
  },
};

/** Hindi content (Devanagari Unicode per IS 17802 IS-002) */
const HINDI_CONTENT = {
  title: 'के लिए अभिगम्यता विवरण',
  commitment: {
    heading: 'हमारी प्रतिबद्धता',
    text: (orgName: string) =>
      `${orgName} विकलांग व्यक्तियों के लिए डिजिटल अभिगम्यता सुनिश्चित करने के लिए प्रतिबद्ध है। हम सभी के लिए उपयोगकर्ता अनुभव में निरंतर सुधार कर रहे हैं और प्रासंगिक अभिगम्यता मानकों को लागू कर रहे हैं।`,
  },
  conformance: {
    heading: 'अनुपालन स्थिति',
    intro: 'इस वेबसाइट का निम्नलिखित मानकों के विरुद्ध मूल्यांकन किया गया है:',
    levelLabel: 'अनुपालन स्तर:',
  },
  limitations: {
    heading: 'ज्ञात सीमाएँ',
    hasIssues:
      'हमारे सर्वोत्तम प्रयासों के बावजूद, कुछ सामग्री अभी तक पूरी तरह से सुलभ नहीं हो सकती है। ज्ञात सीमाओं में शामिल हैं:',
    noIssues: 'हमारे सबसे हाल के मूल्यांकन में कोई महत्वपूर्ण अभिगम्यता बाधाएँ नहीं पाई गईं।',
  },
  assessment: {
    heading: 'मूल्यांकन पद्धति',
    text: (date: string) =>
      `यह विवरण ${date} को किए गए मूल्यांकन पर आधारित है जिसमें स्वचालित परीक्षण उपकरणों और अभिगम्यता विशेषज्ञों द्वारा मैन्युअल समीक्षा के संयोजन का उपयोग किया गया था।`,
  },
  feedback: {
    heading: 'प्रतिक्रिया और संपर्क जानकारी',
    intro:
      'हम इस वेबसाइट की अभिगम्यता पर आपकी प्रतिक्रिया का स्वागत करते हैं। कृपया हमें बताएं यदि आप अभिगम्यता बाधाओं का सामना करते हैं:',
    grievanceLabel: 'शिकायत अधिकारी:',
    emailLabel: 'ईमेल:',
    phoneLabel: 'फ़ोन:',
    response:
      'हम सूचना प्रौद्योगिकी (मध्यवर्ती दिशानिर्देश) नियमों के अनुसार 30 दिनों के भीतर अभिगम्यता प्रतिक्रिया का जवाब देने का लक्ष्य रखते हैं।',
  },
  review: {
    heading: 'समीक्षा तिथि',
    text: (date: string) =>
      `इस विवरण की अंतिम समीक्षा ${date} को की गई थी। हम 12 महीनों के भीतर इसकी फिर से समीक्षा करने की योजना बना रहे हैं।`,
  },
};

/** Standard display names */
const STANDARD_DISPLAY_NAMES: Record<string, string> = {
  'WCAG 2.2 AA': 'WCAG 2.2 Level AA',
  'WCAG 2.1 AA': 'WCAG 2.1 Level AA',
  'IS 17802': 'IS 17802:2021 (Indian Standard for ICT Accessibility)',
  'GIGW 3.0': 'GIGW 3.0 (Guidelines for Indian Government Websites)',
};

/** Conformance level based on score and violations */
function getConformanceLevel(
  score: number,
  criticalCount: number,
  seriousCount: number,
): { level: string; levelHi: string; className: string } {
  if (criticalCount === 0 && seriousCount === 0 && score >= 90) {
    return { level: 'Fully Conformant', levelHi: 'पूर्ण अनुपालन', className: 'conformance-level' };
  }
  if (criticalCount === 0 && score >= 70) {
    return {
      level: 'Partially Conformant',
      levelHi: 'आंशिक अनुपालन',
      className: 'conformance-level conformance-partial',
    };
  }
  return {
    level: 'Non-Conformant',
    levelHi: 'गैर-अनुपालन',
    className: 'conformance-level conformance-non',
  };
}

/** Get standard conformance text */
function getStandardConformance(
  standard: string,
  score: number,
  criticalCount: number,
  isHindi: boolean,
): string {
  const displayName = STANDARD_DISPLAY_NAMES[standard] ?? standard;
  const { level, levelHi } = getConformanceLevel(score, criticalCount, 0);
  const conformanceText = isHindi ? levelHi : level;
  return `${displayName} — ${conformanceText}`;
}

/** Get unique limitation descriptions */
function getLimitations(data: ReportTemplateData, maxItems: number = 10): string[] {
  const seen = new Set<string>();
  const limitations: string[] = [];

  for (const v of data.violations) {
    if (v.severity !== 'critical' && v.severity !== 'serious') continue;

    const description = v.aiExplanation ?? v.description;
    const simplified =
      description.length > 100 ? description.substring(0, 100) + '...' : description;

    if (seen.has(v.wcagCriterion)) continue;
    seen.add(v.wcagCriterion);

    limitations.push(simplified);
    if (limitations.length >= maxItems) break;
  }

  return limitations;
}

/** Handlebars helper for escaping HTML */
Handlebars.registerHelper('escapeHtml', function (text: string) {
  return new Handlebars.SafeString(
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;'),
  );
});

const ENGLISH_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Statement - {{organisation.name}}</title>
  <style>${STATEMENT_CSS}</style>
</head>
<body>
<main lang="en">
  <h1>Accessibility Statement for {{asset.url}}</h1>

  <section aria-labelledby="commitment-heading">
    <h2 id="commitment-heading">Our Commitment</h2>
    <p>{{commitmentText}}</p>
  </section>

  <section aria-labelledby="standards-heading">
    <h2 id="standards-heading">Conformance Status</h2>
    <p>This website has been assessed against the following standards:</p>
    <ul>
      {{#each standardsConformance}}
      <li>{{this}}</li>
      {{/each}}
    </ul>
    <p>Conformance level: <strong class="{{conformanceLevelClass}}">{{conformanceLevel}}</strong></p>
  </section>

  <section aria-labelledby="limitations-heading">
    <h2 id="limitations-heading">Known Limitations</h2>
    {{#if hasLimitations}}
    <p>Despite our best efforts, some content may not yet be fully accessible. Known limitations include:</p>
    <ul>
      {{#each limitations}}
      <li>{{this}}</li>
      {{/each}}
    </ul>
    {{else}}
    <p>No significant accessibility barriers were identified in our most recent assessment.</p>
    {{/if}}
  </section>

  <section aria-labelledby="assessment-heading">
    <h2 id="assessment-heading">Assessment Approach</h2>
    <p>{{assessmentText}}</p>
  </section>

  <section aria-labelledby="feedback-heading">
    <h2 id="feedback-heading">Feedback and Contact Information</h2>
    <p>We welcome your feedback on the accessibility of this website. Please let us know if you encounter accessibility barriers:</p>
    <address>
      <p>Grievance Officer: {{grievanceOfficer.name}}</p>
      <p>Email: <a href="mailto:{{grievanceOfficer.email}}">{{grievanceOfficer.email}}</a></p>
      <p>Phone: <a href="tel:{{grievanceOfficer.phone}}">{{grievanceOfficer.phone}}</a></p>
    </address>
    <p>We aim to respond to accessibility feedback within 30 days, in accordance with the Information Technology (Intermediary Guidelines) Rules.</p>
  </section>

  <section aria-labelledby="date-heading">
    <h2 id="date-heading">Review Date</h2>
    <p>{{reviewText}}</p>
  </section>
</main>
</body>
</html>
`;

const HINDI_TEMPLATE = `
<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>अभिगम्यता विवरण - {{organisation.name}}</title>
  <style>${STATEMENT_CSS}</style>
</head>
<body>
<main lang="hi">
  <h1>{{asset.url}} के लिए अभिगम्यता विवरण</h1>

  <section aria-labelledby="commitment-heading">
    <h2 id="commitment-heading">हमारी प्रतिबद्धता</h2>
    <p>{{commitmentText}}</p>
  </section>

  <section aria-labelledby="standards-heading">
    <h2 id="standards-heading">अनुपालन स्थिति</h2>
    <p>इस वेबसाइट का निम्नलिखित मानकों के विरुद्ध मूल्यांकन किया गया है:</p>
    <ul>
      {{#each standardsConformance}}
      <li>{{this}}</li>
      {{/each}}
    </ul>
    <p>अनुपालन स्तर: <strong class="{{conformanceLevelClass}}">{{conformanceLevel}}</strong></p>
  </section>

  <section aria-labelledby="limitations-heading">
    <h2 id="limitations-heading">ज्ञात सीमाएँ</h2>
    {{#if hasLimitations}}
    <p>हमारे सर्वोत्तम प्रयासों के बावजूद, कुछ सामग्री अभी तक पूरी तरह से सुलभ नहीं हो सकती है। ज्ञात सीमाओं में शामिल हैं:</p>
    <ul>
      {{#each limitations}}
      <li>{{this}}</li>
      {{/each}}
    </ul>
    {{else}}
    <p>हमारे सबसे हाल के मूल्यांकन में कोई महत्वपूर्ण अभिगम्यता बाधाएँ नहीं पाई गईं।</p>
    {{/if}}
  </section>

  <section aria-labelledby="assessment-heading">
    <h2 id="assessment-heading">मूल्यांकन पद्धति</h2>
    <p>{{assessmentText}}</p>
  </section>

  <section aria-labelledby="feedback-heading">
    <h2 id="feedback-heading">प्रतिक्रिया और संपर्क जानकारी</h2>
    <p>हम इस वेबसाइट की अभिगम्यता पर आपकी प्रतिक्रिया का स्वागत करते हैं। कृपया हमें बताएं यदि आप अभिगम्यता बाधाओं का सामना करते हैं:</p>
    <address>
      <p>शिकायत अधिकारी: {{grievanceOfficer.name}}</p>
      <p>ईमेल: <a href="mailto:{{grievanceOfficer.email}}">{{grievanceOfficer.email}}</a></p>
      <p>फ़ोन: <a href="tel:{{grievanceOfficer.phone}}">{{grievanceOfficer.phone}}</a></p>
    </address>
    <p>हम सूचना प्रौद्योगिकी (मध्यवर्ती दिशानिर्देश) नियमों के अनुसार 30 दिनों के भीतर अभिगम्यता प्रतिक्रिया का जवाब देने का लक्ष्य रखते हैं।</p>
  </section>

  <section aria-labelledby="date-heading">
    <h2 id="date-heading">समीक्षा तिथि</h2>
    <p>{{reviewText}}</p>
  </section>
</main>
</body>
</html>
`;

/**
 * Render the Accessibility Statement template.
 *
 * This is the ONLY template that outputs public-facing HTML meant to be
 * embedded on the client's own website. The HTML is WCAG 2.2 AA compliant.
 *
 * @param data - Complete report template data
 * @param options - Language and grievance officer options
 * @returns Rendered HTML string
 */
export function renderAccessibilityStatementTemplate(
  data: ReportTemplateData,
  options: AccessibilityStatementOptions,
): string {
  const { language, grievanceOfficer } = options;
  const isHindi = language === 'hi';
  const content = isHindi ? HINDI_CONTENT : ENGLISH_CONTENT;

  const conformanceInfo = getConformanceLevel(
    data.scan.score,
    data.scan.criticalCount,
    data.scan.seriousCount,
  );

  const standardsConformance = data.asset.standards.map((std) =>
    getStandardConformance(std, data.scan.score, data.scan.criticalCount, isHindi),
  );

  const limitations = getLimitations(data);
  const hasLimitations = limitations.length > 0;

  const templateData = {
    ...data,
    grievanceOfficer,
    commitmentText: content.commitment.text(data.organisation.name),
    standardsConformance,
    conformanceLevel: isHindi ? conformanceInfo.levelHi : conformanceInfo.level,
    conformanceLevelClass: conformanceInfo.className,
    hasLimitations,
    limitations,
    assessmentText: content.assessment.text(data.scan.completedAt),
    reviewText: content.review.text(data.scan.completedAt),
  };

  const templateStr = isHindi ? HINDI_TEMPLATE : ENGLISH_TEMPLATE;
  const template = Handlebars.compile(templateStr);
  return template(templateData);
}
