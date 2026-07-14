/**
 * GIGW 3.0 Checks
 *
 * Guidelines for Indian Government Websites (GIGW 3.0) compliance checks.
 * These rules only run when:
 * - config.standards includes 'GIGW3', OR
 * - The URL domain ends with .gov.in or .nic.in
 */

import type { Page } from 'playwright';
import { computeFingerprint } from '../axe-runner';
import { logger } from '../../lib/logger';
import type { RawViolation, ScanJobConfig } from '../types';

/**
 * Check if URL is a government domain.
 */
function isGovernmentDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.endsWith('.gov.in') || hostname.endsWith('.nic.in');
  } catch {
    return false;
  }
}

/**
 * Check if URL is the homepage.
 */
function isHomepage(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    return path === '/' || path === '/index' || path === '/index.html' || path === '/index.htm';
  } catch {
    return false;
  }
}

/**
 * Create a base RawViolation for GIGW rules.
 */
function createGIGWViolation(
  ruleId: string,
  severity: RawViolation['severity'],
  description: string,
  assetId: string,
  pageUrl: string,
  elementSelector: string,
  elementHtml: string = '',
  elementType: string = 'html',
): RawViolation {
  return {
    ruleId,
    wcagCriterion: 'N/A',
    wcagLevel: 'AA',
    standard: 'GIGW3',
    severity,
    elementType,
    elementHtml: elementHtml.substring(0, 2000),
    elementSelector,
    description,
    helpUrl: `https://www.accessshield.in/docs/gigw3/${ruleId}`,
    fingerprint: computeFingerprint(assetId, ruleId, elementSelector),
    pageUrl,
  };
}

/**
 * GIGW-001: Check for accessibility statement link.
 * Must have a link to an accessibility statement (required by GIGW 3.0 and RPwD Act).
 */
export async function checkAccessibilityStatementLink(
  page: Page,
  url: string,
  assetId: string,
): Promise<RawViolation[]> {
  const violations: RawViolation[] = [];

  try {
    const hasAccessibilityLink = await page.evaluate(() => {
      const keywords = [
        'accessibility',
        'accessibility statement',
        'screen reader',
        'सुगम्यता',
        'अभिगम्यता',
      ];

      const links = document.querySelectorAll('a');
      for (const link of links) {
        const text = link.textContent?.toLowerCase().trim() ?? '';
        const href = link.getAttribute('href')?.toLowerCase() ?? '';
        const ariaLabel = link.getAttribute('aria-label')?.toLowerCase() ?? '';

        if (
          keywords.some(
            (kw) =>
              text.includes(kw.toLowerCase()) ||
              href.includes(kw.toLowerCase()) ||
              ariaLabel.includes(kw.toLowerCase()),
          )
        ) {
          return true;
        }
      }

      const footer = document.querySelector('footer, [role="contentinfo"]');
      if (footer) {
        const footerLinks = footer.querySelectorAll('a');
        for (const link of footerLinks) {
          const text = link.textContent?.toLowerCase().trim() ?? '';
          if (keywords.some((kw) => text.includes(kw.toLowerCase()))) {
            return true;
          }
        }
      }

      return false;
    });

    if (!hasAccessibilityLink) {
      violations.push(
        createGIGWViolation(
          'GIGW-001',
          'serious',
          'No accessibility statement link found. GIGW 3.0 and RPwD Act Section 43 require government websites to publish an accessibility statement.',
          assetId,
          url,
          'body',
          '',
          'body',
        ),
      );
    }
  } catch (err) {
    logger.warn({ err, url }, 'GIGW-001 checkAccessibilityStatementLink failed');
  }

  return violations;
}

/**
 * GIGW-002: Check for Grievance Officer contact link.
 * Must have a Grievance Officer contact link (IT Act 2000 + GIGW requirement).
 */
export async function checkGrievanceOfficerLink(
  page: Page,
  url: string,
  assetId: string,
): Promise<RawViolation[]> {
  const violations: RawViolation[] = [];

  try {
    const hasGrievanceLink = await page.evaluate(() => {
      const keywords = [
        'grievance',
        'complaint',
        'nodal officer',
        'grievance officer',
        'grievance redressal',
        'शिकायत',
        'लोक शिकायत',
      ];

      const searchText = (text: string): boolean => {
        const lowerText = text.toLowerCase();
        return keywords.some((kw) => lowerText.includes(kw.toLowerCase()));
      };

      const links = document.querySelectorAll('a');
      for (const link of links) {
        const text = link.textContent?.trim() ?? '';
        const href = link.getAttribute('href') ?? '';
        const ariaLabel = link.getAttribute('aria-label') ?? '';

        if (searchText(text) || searchText(href) || searchText(ariaLabel)) {
          return true;
        }
      }

      const bodyText = document.body.innerText;
      if (searchText(bodyText)) {
        return true;
      }

      return false;
    });

    if (!hasGrievanceLink) {
      violations.push(
        createGIGWViolation(
          'GIGW-002',
          'serious',
          'No Grievance Officer contact found. GIGW 3.0 requires a Grievance Officer link for all government websites.',
          assetId,
          url,
          'body',
          '',
          'body',
        ),
      );
    }
  } catch (err) {
    logger.warn({ err, url }, 'GIGW-002 checkGrievanceOfficerLink failed');
  }

  return violations;
}

/**
 * GIGW-003: Check for sitemap presence.
 * Both HTML sitemap and XML sitemap required.
 */
export async function checkSitemapPresence(
  page: Page,
  url: string,
  assetId: string,
): Promise<RawViolation[]> {
  const violations: RawViolation[] = [];

  try {
    const hasHtmlSitemap = await page.evaluate(() => {
      const keywords = ['sitemap', 'site map', 'site-map'];

      const navLinks = document.querySelectorAll('nav a, footer a, [role="navigation"] a');
      for (const link of navLinks) {
        const text = link.textContent?.toLowerCase().trim() ?? '';
        const href = link.getAttribute('href')?.toLowerCase() ?? '';

        if (keywords.some((kw) => text.includes(kw) || href.includes(kw))) {
          return true;
        }
      }

      const allLinks = document.querySelectorAll('a');
      for (const link of allLinks) {
        const href = link.getAttribute('href')?.toLowerCase() ?? '';
        if (href.includes('sitemap.html') || href.includes('site-map.html')) {
          return true;
        }
      }

      return false;
    });

    if (!hasHtmlSitemap) {
      violations.push(
        createGIGWViolation(
          'GIGW-003',
          'moderate',
          'HTML sitemap not found. GIGW 3.0 requires a human-readable HTML sitemap.',
          assetId,
          url,
          'body',
          '',
          'body',
        ),
      );
    }

    const hasXmlSitemap = await page.evaluate(async () => {
      try {
        const baseUrl = window.location.origin;
        const response = await fetch(`${baseUrl}/sitemap.xml`, { method: 'HEAD' });
        return response.ok;
      } catch {
        return false;
      }
    });

    if (!hasXmlSitemap) {
      violations.push(
        createGIGWViolation(
          'GIGW-003',
          'moderate',
          'XML sitemap not found at /sitemap.xml. GIGW 3.0 requires a machine-readable XML sitemap for search indexing.',
          assetId,
          url,
          'sitemap.xml',
          '',
          'file',
        ),
      );
    }
  } catch (err) {
    logger.warn({ err, url }, 'GIGW-003 checkSitemapPresence failed');
  }

  return violations;
}

/**
 * GIGW-004: Check for last updated date.
 * Page must display when it was last updated (homepage only).
 */
export async function checkLastUpdatedDate(
  page: Page,
  url: string,
  assetId: string,
): Promise<RawViolation[]> {
  const violations: RawViolation[] = [];

  if (!isHomepage(url)) {
    return violations;
  }

  try {
    const hasLastUpdated = await page.evaluate(() => {
      const keywords = [
        'last updated',
        'last modified',
        'updated on',
        'modified on',
        'अंतिम अद्यतन',
        'अंतिम संशोधन',
      ];

      const bodyText = document.body.innerText.toLowerCase();
      if (keywords.some((kw) => bodyText.includes(kw.toLowerCase()))) {
        return true;
      }

      const lastModifiedMeta = document.querySelector('meta[name="last-modified"]');
      if (lastModifiedMeta) {
        return true;
      }

      const timeElements = document.querySelectorAll('time');
      if (timeElements.length > 0) {
        for (const time of timeElements) {
          const dateTime = time.getAttribute('datetime');
          const text = time.textContent?.toLowerCase() ?? '';
          if (dateTime || text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)) {
            return true;
          }
        }
      }

      return false;
    });

    if (!hasLastUpdated) {
      violations.push(
        createGIGWViolation(
          'GIGW-004',
          'minor',
          "No 'last updated' date found. GIGW 3.0 requires government websites to display when content was last updated.",
          assetId,
          url,
          'body',
          '',
          'body',
        ),
      );
    }
  } catch (err) {
    logger.warn({ err, url }, 'GIGW-004 checkLastUpdatedDate failed');
  }

  return violations;
}

/**
 * GIGW-005: Check for Hindi version availability.
 * Government websites must provide a Hindi version.
 */
export async function checkHindiVersionAvailable(
  page: Page,
  url: string,
  assetId: string,
): Promise<RawViolation[]> {
  const violations: RawViolation[] = [];

  if (!isGovernmentDomain(url)) {
    return violations;
  }

  try {
    const hasHindiVersion = await page.evaluate(() => {
      const hindiKeywords = ['hindi', 'हिन्दी', 'हिंदी', 'हिंदी में', 'हिन्दी में'];

      const languageSwitchers = document.querySelectorAll(
        'a[hreflang="hi"], [lang="hi"], .language-switcher a, #language-selector a, [role="navigation"] a',
      );

      for (const el of languageSwitchers) {
        const text = el.textContent?.toLowerCase().trim() ?? '';
        const hreflang = el.getAttribute('hreflang')?.toLowerCase() ?? '';

        if (hreflang === 'hi' || hindiKeywords.some((kw) => text.includes(kw.toLowerCase()))) {
          return true;
        }
      }

      const allLinks = document.querySelectorAll('a, button');
      for (const link of allLinks) {
        const text = link.textContent?.trim() ?? '';
        if (hindiKeywords.some((kw) => text.includes(kw))) {
          return true;
        }
      }

      const hreflangLink = document.querySelector('link[hreflang="hi"]');
      if (hreflangLink) {
        return true;
      }

      return false;
    });

    if (!hasHindiVersion) {
      violations.push(
        createGIGWViolation(
          'GIGW-005',
          'serious',
          'No Hindi version link found. GIGW 3.0 requires all central government websites to provide content in Hindi as per Official Language Act.',
          assetId,
          url,
          'body',
          '',
          'body',
        ),
      );
    }
  } catch (err) {
    logger.warn({ err, url }, 'GIGW-005 checkHindiVersionAvailable failed');
  }

  return violations;
}

/**
 * Run all GIGW 3.0 checks on a page.
 *
 * Only runs when:
 * - config.standards includes 'GIGW3', OR
 * - The URL domain ends with .gov.in or .nic.in
 *
 * @param page - Playwright page instance
 * @param url - Page URL
 * @param assetId - Asset UUID for fingerprinting
 * @param config - Scan job configuration
 * @returns Array of violations found
 */
export async function runGIGWChecks(
  page: Page,
  url: string,
  assetId: string,
  config: ScanJobConfig,
): Promise<RawViolation[]> {
  const shouldRun = config.standards.includes('GIGW3') || isGovernmentDomain(url);

  if (!shouldRun) {
    return [];
  }

  const [
    accessibilityViolations,
    grievanceViolations,
    sitemapViolations,
    lastUpdatedViolations,
    hindiViolations,
  ] = await Promise.all([
    checkAccessibilityStatementLink(page, url, assetId),
    checkGrievanceOfficerLink(page, url, assetId),
    checkSitemapPresence(page, url, assetId),
    checkLastUpdatedDate(page, url, assetId),
    checkHindiVersionAvailable(page, url, assetId),
  ]);

  const allViolations = [
    ...accessibilityViolations,
    ...grievanceViolations,
    ...sitemapViolations,
    ...lastUpdatedViolations,
    ...hindiViolations,
  ];

  logger.debug({ url, count: allViolations.length }, 'GIGW 3.0 checks complete');

  return allViolations;
}
