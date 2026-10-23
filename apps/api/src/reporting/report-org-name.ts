/**
 * Display name for the organisation on generated reports.
 *
 * Internal / seed organisations (test org, public free-scan org, platform
 * org, legacy AccessShield brand) must never appear on customer-facing
 * reports — they are shown as AccessibleNow. Real customer organisation
 * names pass through unchanged.
 */
export const REPORT_BRAND_NAME = 'AccessibleNow';

const INTERNAL_ORG_PATTERNS: RegExp[] = [
  /accessshield/i, // legacy brand + "AccessShield Test Org"
  /\btest\s+org(anisation|anization)?\b/i, // any seeded test org variant
  /^public\s+scans$/i, // free public-scan system org
  /^accessiblenow\s+platform$/i, // internal platform org
];

/** True when the org is one of our internal/seed orgs, not a real customer. */
export function isInternalOrgName(orgName: string): boolean {
  const trimmed = orgName.trim();
  if (!trimmed) return true;
  return INTERNAL_ORG_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Org name safe to print on a report.
 * Internal/seed orgs (and missing names) become "AccessibleNow".
 */
export function formatReportOrgName(orgName: string | null | undefined): string {
  const trimmed = orgName?.trim() ?? '';
  if (!trimmed || isInternalOrgName(trimmed)) return REPORT_BRAND_NAME;
  return trimmed;
}
