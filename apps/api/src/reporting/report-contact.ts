/**
 * Customer-facing AccessibleNow contact shown on every generated report.
 */
export const REPORT_BRAND = 'AccessibleNow';
export const REPORT_CONTACT_EMAIL = 'nilesh@accessiblenow.in';
export const REPORT_CONTACT_WEBSITE = 'https://accessiblenow.in/';

/** HTML snippet for Contact section (Handlebars-safe static string). */
export const REPORT_CONTACT_HTML = `
<h2>Contact ${REPORT_BRAND}</h2>
<p>
  <strong>Email:</strong> <a href="mailto:${REPORT_CONTACT_EMAIL}">${REPORT_CONTACT_EMAIL}</a><br>
  <strong>Website:</strong> <a href="${REPORT_CONTACT_WEBSITE}">${REPORT_CONTACT_WEBSITE}</a>
</p>
`.trim();

/** Compact footer contact line. */
export const REPORT_CONTACT_FOOTER_LINE = `Email: ${REPORT_CONTACT_EMAIL} · Website: ${REPORT_CONTACT_WEBSITE}`;
