/**
 * SEBI circular (2024) website checks for listed / regulated entities.
 * Runs only when the scan's standards include SEBI.
 */

import type { Page } from 'playwright';
import { computeFingerprint } from '../axe-runner';
import { logger } from '../../lib/logger';
import type { RawViolation } from '../types';

function createSebiViolation(
  ruleId: string,
  wcagCriterion: string,
  severity: RawViolation['severity'],
  description: string,
  assetId: string,
  pageUrl: string,
  elementSelector: string,
  elementHtml = '',
  elementType = 'html',
): RawViolation {
  return {
    ruleId,
    wcagCriterion,
    wcagLevel: 'AA',
    standard: 'SEBI',
    severity,
    elementType,
    elementHtml: elementHtml.substring(0, 2000),
    elementSelector,
    description,
    helpUrl: `https://www.accessshield.in/docs/sebi/${ruleId}`,
    fingerprint: computeFingerprint(assetId, ruleId, elementSelector),
    pageUrl,
  };
}

interface DomFinding {
  selector: string;
  html: string;
  elementType: string;
}

/**
 * SEBI-001: Gain/loss or buy/sell status conveyed by colour alone
 * (green/red ticks) with no text or accessible name.
 */
export async function checkColorOnlyMarketIndicators(
  page: Page,
  url: string,
  assetId: string,
): Promise<RawViolation[]> {
  try {
    const findings = await page.evaluate((): DomFinding[] => {
      const results: DomFinding[] = [];
      const selector = [
        '[class*="gain"]',
        '[class*="loss"]',
        '[class*="positive"]',
        '[class*="negative"]',
        '[class*="up-tick"]',
        '[class*="down-tick"]',
        '[class*="price-change"]',
        '[class*="change-pct"]',
        '[data-change]',
        '[data-trend]',
      ].join(',');

      const nodes = document.querySelectorAll(selector);
      nodes.forEach((el, index) => {
        const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
        const hasNumericSign = /[+-]\s?\d/.test(text) || /\d+\s?%/.test(text);
        const accessible =
          Boolean(el.getAttribute('aria-label')) ||
          Boolean(el.getAttribute('aria-labelledby')) ||
          Boolean(el.getAttribute('title')) ||
          hasNumericSign;
        if (accessible) return;
        if (text.length > 24) return;

        results.push({
          selector: `${el.tagName.toLowerCase()}[sebi-001="${index}"]`,
          html: el.outerHTML.slice(0, 500),
          elementType: el.tagName.toLowerCase(),
        });
      });

      return results.slice(0, 8);
    });

    return findings.map((finding) =>
      createSebiViolation(
        'SEBI-001',
        '1.4.1',
        'serious',
        'Market or status indicator uses colour (gain/loss, up/down) without a text or accessible name. SEBI-regulated sites must not convey price movement by colour alone.',
        assetId,
        url,
        finding.selector,
        finding.html,
        finding.elementType,
      ),
    );
  } catch (err) {
    logger.warn({ err, url }, 'SEBI-001 checkColorOnlyMarketIndicators failed');
    return [];
  }
}

/**
 * SEBI-002: Charts / trading widgets without a text alternative.
 */
export async function checkChartsWithoutTextAlternative(
  page: Page,
  url: string,
  assetId: string,
): Promise<RawViolation[]> {
  try {
    const findings = await page.evaluate((): DomFinding[] => {
      const results: DomFinding[] = [];
      const nodes = document.querySelectorAll(
        'canvas, svg[class*="chart"], [class*="highcharts"], [class*="tradingview"], [class*="amchart"], [id*="chart"] canvas, [id*="chart"] svg',
      );

      nodes.forEach((el, index) => {
        const labelled =
          Boolean(el.getAttribute('aria-label')) ||
          Boolean(el.getAttribute('aria-labelledby')) ||
          Boolean(el.getAttribute('role') === 'img' && el.getAttribute('aria-label')) ||
          Boolean(el.querySelector('title, desc, figcaption, table'));
        const parent = el.closest('figure, [role="img"], [aria-label]');
        const parentLabelled =
          Boolean(parent?.getAttribute('aria-label')) ||
          Boolean(parent?.querySelector('figcaption, table, title'));
        if (labelled || parentLabelled) return;

        results.push({
          selector: `${el.tagName.toLowerCase()}[sebi-002="${index}"]`,
          html: el.outerHTML.slice(0, 500),
          elementType: el.tagName.toLowerCase(),
        });
      });

      return results.slice(0, 8);
    });

    return findings.map((finding) =>
      createSebiViolation(
        'SEBI-002',
        '1.1.1',
        'serious',
        'Chart or market graph has no text alternative (aria-label, title, or data table). Screen-reader users cannot access price or performance data required for SEBI disclosures.',
        assetId,
        url,
        finding.selector,
        finding.html,
        finding.elementType,
      ),
    );
  } catch (err) {
    logger.warn({ err, url }, 'SEBI-002 checkChartsWithoutTextAlternative failed');
    return [];
  }
}

/**
 * SEBI-003: Live ticker / marquee / auto-updating prices with no pause control.
 */
export async function checkLiveTickerPauseControl(
  page: Page,
  url: string,
  assetId: string,
): Promise<RawViolation[]> {
  try {
    const findings = await page.evaluate((): DomFinding[] => {
      const pauseRe = /pause|stop|halt|freeze|रोकें/i;
      const tickerSelector =
        '[class*="ticker"], [class*="marquee"], [class*="live-price"], [class*="scrolling-news"], [data-ticker]';
      const tickers = document.querySelectorAll(tickerSelector);
      const results: DomFinding[] = [];

      const hasPauseControl = (root: Element): boolean => {
        const controls = root.querySelectorAll('button, a, [role="button"]');
        for (const control of controls) {
          const label = `${control.textContent ?? ''} ${control.getAttribute('aria-label') ?? ''}`;
          if (pauseRe.test(label)) return true;
        }
        const nearby = root.parentElement;
        if (nearby) {
          const nearbyControls = nearby.querySelectorAll('button, a, [role="button"]');
          for (const control of nearbyControls) {
            const label = `${control.textContent ?? ''} ${control.getAttribute('aria-label') ?? ''}`;
            if (pauseRe.test(label)) return true;
          }
        }
        return false;
      };

      tickers.forEach((el, index) => {
        if (hasPauseControl(el)) return;
        results.push({
          selector: `${el.tagName.toLowerCase()}[sebi-003="${index}"]`,
          html: el.outerHTML.slice(0, 500),
          elementType: el.tagName.toLowerCase(),
        });
      });

      return results.slice(0, 5);
    });

    return findings.map((finding) =>
      createSebiViolation(
        'SEBI-003',
        '2.2.2',
        'serious',
        'Live market ticker or auto-updating prices have no pause/stop control. SEBI-regulated sites must let users stop moving content (WCAG 2.2.2).',
        assetId,
        url,
        finding.selector,
        finding.html,
        finding.elementType,
      ),
    );
  } catch (err) {
    logger.warn({ err, url }, 'SEBI-003 checkLiveTickerPauseControl failed');
    return [];
  }
}

/**
 * SEBI-004: Investor / disclosure PDFs without an accessible HTML alternative nearby.
 */
export async function checkInvestorPdfHtmlAlternative(
  page: Page,
  url: string,
  assetId: string,
): Promise<RawViolation[]> {
  try {
    const findings = await page.evaluate((): DomFinding[] => {
      const investorRe =
        /annual.?report|financial.?result|investor|disclosure|prospectus|quarterly|shareholding|notice/i;
      const htmlAltRe = /html|accessible|web version|readable/i;
      const results: DomFinding[] = [];
      const links = document.querySelectorAll('a[href]');

      links.forEach((link, index) => {
        const href = link.getAttribute('href') ?? '';
        const text = `${link.textContent ?? ''} ${href}`;
        const isPdf = href.toLowerCase().includes('.pdf') || /pdf/i.test(link.textContent ?? '');
        if (!isPdf || !investorRe.test(text)) return;

        const container = link.closest('li, p, div, td, article') ?? link.parentElement;
        const nearby = `${container?.textContent ?? ''} ${container?.innerHTML ?? ''}`;
        if (htmlAltRe.test(nearby) && /html|accessible/i.test(nearby)) return;

        results.push({
          selector: `a[sebi-004="${index}"]`,
          html: link.outerHTML.slice(0, 500),
          elementType: 'a',
        });
      });

      return results.slice(0, 8);
    });

    return findings.map((finding) =>
      createSebiViolation(
        'SEBI-004',
        '1.1.1',
        'moderate',
        'Investor or disclosure PDF has no accessible HTML alternative next to it. SEBI filings linked from the site must offer a readable HTML version.',
        assetId,
        url,
        finding.selector,
        finding.html,
        finding.elementType,
      ),
    );
  } catch (err) {
    logger.warn({ err, url }, 'SEBI-004 checkInvestorPdfHtmlAlternative failed');
    return [];
  }
}

/**
 * SEBI-005: No public accessibility statement (required for listed entities).
 */
export async function checkSebiAccessibilityStatement(
  page: Page,
  url: string,
  assetId: string,
): Promise<RawViolation[]> {
  try {
    const hasStatement = await page.evaluate((): boolean => {
      const keywords = [
        'accessibility statement',
        'accessibility',
        'accessible website',
        'सुगम्यता',
        'अभिगम्यता',
      ];
      const links = document.querySelectorAll('a');
      for (const link of links) {
        const haystack =
          `${link.textContent ?? ''} ${link.getAttribute('href') ?? ''} ${link.getAttribute('aria-label') ?? ''}`.toLowerCase();
        if (keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
          return true;
        }
      }
      return false;
    });

    if (hasStatement) return [];

    return [
      createSebiViolation(
        'SEBI-005',
        'N/A',
        'serious',
        'No accessibility statement link found. SEBI-regulated entities must publish a public accessibility statement on the website.',
        assetId,
        url,
        'body',
        '',
        'body',
      ),
    ];
  } catch (err) {
    logger.warn({ err, url }, 'SEBI-005 checkSebiAccessibilityStatement failed');
    return [];
  }
}

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
 * Run all SEBI checks on a page. Caller must gate on standards.includes('SEBI').
 */
export async function runSebiChecks(
  page: Page,
  url: string,
  assetId: string,
): Promise<RawViolation[]> {
  const checks: Array<Promise<RawViolation[]>> = [
    checkColorOnlyMarketIndicators(page, url, assetId),
    checkChartsWithoutTextAlternative(page, url, assetId),
    checkLiveTickerPauseControl(page, url, assetId),
    checkInvestorPdfHtmlAlternative(page, url, assetId),
  ];
  if (isHomepage(url)) {
    checks.push(checkSebiAccessibilityStatement(page, url, assetId));
  }

  const groups = await Promise.all(checks);
  const allViolations = groups.flat();
  logger.info({ url, count: allViolations.length }, 'SEBI checks complete');
  return allViolations;
}
