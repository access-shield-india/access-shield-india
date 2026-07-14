/**
 * URL Discovery / Crawler
 *
 * Discovers URLs for scanning via sitemap.xml parsing or page link crawling.
 * Filters URLs based on domain, exclusion patterns, and page limits.
 */

import { logger } from '../lib/logger';
import type { ScanJobConfig } from './types';

/** Playwright types */
type Browser = import('playwright').Browser;
type Page = import('playwright').Page;

/** Dynamic import for chromium */
async function getChromium() {
  const { chromium } = await import('playwright');
  return chromium;
}

/**
 * Check if a URL belongs to the same domain as the base URL.
 * Handles both http and https variations.
 *
 * @param baseUrl - The original base URL to compare against
 * @param url - The URL to check
 * @returns true if same domain
 */
export function isSameDomain(baseUrl: string, url: string): boolean {
  try {
    const base = new URL(baseUrl);
    const target = new URL(url);

    const baseHost = base.hostname.toLowerCase().replace(/^www\./, '');
    const targetHost = target.hostname.toLowerCase().replace(/^www\./, '');

    return baseHost === targetHost;
  } catch {
    return false;
  }
}

/**
 * Check if a URL should be excluded based on path patterns.
 *
 * @param url - The URL to check
 * @param excludePaths - Array of path prefixes to exclude
 * @returns true if URL should be excluded
 */
export function isExcluded(url: string, excludePaths: string[]): boolean {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname.toLowerCase();

    return excludePaths.some((pattern) => {
      const normalizedPattern = pattern.toLowerCase();
      return pathname.startsWith(normalizedPattern) || pathname.includes(normalizedPattern);
    });
  } catch {
    return true;
  }
}

/**
 * Build an absolute URL from a base URL and href value.
 * Handles relative paths, protocol-relative URLs, and edge cases.
 *
 * @param base - The base URL for resolution
 * @param href - The href value (relative or absolute)
 * @returns Absolute URL string or null if invalid
 */
export function buildAbsoluteUrl(base: string, href: string): string | null {
  if (
    !href ||
    href.startsWith('#') ||
    href.startsWith('javascript:') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  ) {
    return null;
  }

  try {
    const resolved = new URL(href, base);

    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return null;
    }

    resolved.hash = '';

    return resolved.href;
  } catch {
    return null;
  }
}

/**
 * Normalize URL for deduplication.
 * Removes trailing slashes and normalizes case for comparison.
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    let pathname = parsed.pathname;

    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    return `${parsed.protocol}//${parsed.host}${pathname}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Check if URL is a PDF or other non-HTML resource.
 */
function isNonHtmlResource(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    const nonHtmlExtensions = [
      '.pdf',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.ppt',
      '.pptx',
      '.zip',
      '.rar',
      '.tar',
      '.gz',
      '.7z',
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.svg',
      '.webp',
      '.ico',
      '.mp3',
      '.mp4',
      '.wav',
      '.avi',
      '.mov',
      '.webm',
      '.css',
      '.js',
      '.json',
      '.xml',
      '.rss',
      '.atom',
    ];
    return nonHtmlExtensions.some((ext) => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

/**
 * Check if URL has pagination query params we should skip.
 */
function hasPaginationParams(url: string): boolean {
  try {
    const parsed = new URL(url);
    const paginationParams = ['page', 'p', 'offset', 'start', 'cursor', 'after', 'before'];
    return paginationParams.some((param) => parsed.searchParams.has(param));
  } catch {
    return false;
  }
}

/**
 * Fetch and parse sitemap.xml to extract URLs.
 *
 * @param baseUrl - The website's base URL
 * @returns Array of URLs from sitemap, empty if sitemap not found
 */
async function fetchSitemap(baseUrl: string): Promise<string[]> {
  const sitemapUrls = [
    new URL('/sitemap.xml', baseUrl).href,
    new URL('/sitemap_index.xml', baseUrl).href,
    new URL('/sitemap/sitemap.xml', baseUrl).href,
  ];

  for (const sitemapUrl of sitemapUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(sitemapUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'AccessShield-Scanner/1.0',
          Accept: 'application/xml, text/xml, */*',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        continue;
      }

      const text = await response.text();

      const locMatches = text.match(/<loc>([^<]+)<\/loc>/gi);
      if (!locMatches || locMatches.length === 0) {
        continue;
      }

      const urls = locMatches
        .map((match) => {
          const urlMatch = match.match(/<loc>([^<]+)<\/loc>/i);
          return urlMatch?.[1]?.trim() ?? null;
        })
        .filter((url): url is string => url !== null);

      if (urls.length > 0) {
        logger.info({ sitemapUrl, urlCount: urls.length }, 'Parsed sitemap successfully');
        return urls;
      }
    } catch (err) {
      logger.debug({ sitemapUrl, err }, 'Failed to fetch sitemap');
    }
  }

  return [];
}

/**
 * Crawl homepage to discover linked pages.
 * Uses Playwright to render JavaScript-heavy pages.
 *
 * @param browser - Playwright browser instance
 * @param baseUrl - The website's base URL
 * @returns Array of discovered URLs
 */
async function crawlHomepage(browser: Browser, baseUrl: string): Promise<string[]> {
  let page: Page | null = null;

  try {
    const context = await browser.newContext({
      userAgent: 'AccessShield-Scanner/1.0',
      viewport: { width: 1280, height: 800 },
      bypassCSP: true,
    });

    page = await context.newPage();

    await page.goto(baseUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await page.waitForTimeout(2000);

    const hrefs = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = (globalThis as any).document;
      const anchors = doc.querySelectorAll('a[href]');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return Array.from(anchors as ArrayLike<any>).map((a) => a.href as string);
    });

    await context.close();

    logger.info({ baseUrl, linkCount: hrefs.length }, 'Crawled homepage for links');
    return hrefs;
  } catch (err) {
    logger.warn({ err, baseUrl }, 'Failed to crawl homepage');
    if (page) {
      try {
        await page.context().close();
      } catch {
        // Ignore cleanup errors
      }
    }
    return [];
  }
}

/**
 * Discover URLs for scanning.
 *
 * Strategy:
 * 1. Try to fetch sitemap.xml
 * 2. If no sitemap, crawl homepage for links
 * 3. Filter to same domain only
 * 4. Apply exclusion patterns
 * 5. Remove duplicates
 * 6. Limit to maxPages
 * 7. Always include baseUrl as first URL
 *
 * @param baseUrl - The website's base URL to scan
 * @param config - Scan configuration with limits and exclusions
 * @returns Array of absolute URLs to scan
 */
export async function discoverUrls(baseUrl: string, config: ScanJobConfig): Promise<string[]> {
  const chromium = await getChromium();
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const seenNormalized = new Set<string>();
    const urls: string[] = [];

    const normalizedBase = normalizeUrl(baseUrl);
    seenNormalized.add(normalizedBase);
    urls.push(baseUrl);

    let discoveredUrls = await fetchSitemap(baseUrl);

    if (discoveredUrls.length === 0) {
      logger.info({ baseUrl }, 'No sitemap found, crawling homepage');
      discoveredUrls = await crawlHomepage(browser, baseUrl);
    }

    for (const href of discoveredUrls) {
      const absoluteUrl = buildAbsoluteUrl(baseUrl, href);
      if (!absoluteUrl) continue;

      if (!isSameDomain(baseUrl, absoluteUrl)) continue;

      if (isNonHtmlResource(absoluteUrl)) continue;

      if (hasPaginationParams(absoluteUrl)) continue;

      if (isExcluded(absoluteUrl, config.excludePaths)) continue;

      const normalized = normalizeUrl(absoluteUrl);
      if (seenNormalized.has(normalized)) continue;

      seenNormalized.add(normalized);
      urls.push(absoluteUrl);

      if (urls.length >= config.maxPages) {
        break;
      }
    }

    logger.info(
      { baseUrl, totalUrls: urls.length, maxPages: config.maxPages },
      'URL discovery complete',
    );

    return urls.slice(0, config.maxPages);
  } finally {
    await browser.close();
  }
}

/**
 * Discover URLs using an existing browser instance.
 * Used by the worker to avoid creating multiple browser instances.
 *
 * @param browser - Existing Playwright browser instance
 * @param baseUrl - The website's base URL to scan
 * @param config - Scan configuration with limits and exclusions
 * @returns Array of absolute URLs to scan
 */
export async function discoverUrlsWithBrowser(
  browser: Browser,
  baseUrl: string,
  config: ScanJobConfig,
): Promise<string[]> {
  const seenNormalized = new Set<string>();
  const urls: string[] = [];

  const normalizedBase = normalizeUrl(baseUrl);
  seenNormalized.add(normalizedBase);
  urls.push(baseUrl);

  let discoveredUrls = await fetchSitemap(baseUrl);

  if (discoveredUrls.length === 0) {
    logger.info({ baseUrl }, 'No sitemap found, crawling homepage');
    discoveredUrls = await crawlHomepage(browser, baseUrl);
  }

  for (const href of discoveredUrls) {
    const absoluteUrl = buildAbsoluteUrl(baseUrl, href);
    if (!absoluteUrl) continue;

    if (!isSameDomain(baseUrl, absoluteUrl)) continue;

    if (isNonHtmlResource(absoluteUrl)) continue;

    if (hasPaginationParams(absoluteUrl)) continue;

    if (isExcluded(absoluteUrl, config.excludePaths)) continue;

    const normalized = normalizeUrl(absoluteUrl);
    if (seenNormalized.has(normalized)) continue;

    seenNormalized.add(normalized);
    urls.push(absoluteUrl);

    if (urls.length >= config.maxPages) {
      break;
    }
  }

  logger.info(
    { baseUrl, totalUrls: urls.length, maxPages: config.maxPages },
    'URL discovery complete',
  );

  return urls.slice(0, config.maxPages);
}

export type DiscoveredUrlHandler = (url: string, meta: { index: number }) => Promise<void>;

/**
 * Discover URLs and invoke `onDiscovered` as each URL is accepted (streaming).
 * Always emits baseUrl first, then sitemap or homepage links up to maxPages.
 * Returns total URLs emitted.
 */
export async function discoverUrlsStreaming(
  browser: Browser,
  baseUrl: string,
  config: ScanJobConfig,
  onDiscovered: DiscoveredUrlHandler,
): Promise<number> {
  const seenNormalized = new Set<string>();
  let count = 0;

  const emit = async (url: string): Promise<boolean> => {
    const normalized = normalizeUrl(url);
    if (seenNormalized.has(normalized)) {
      return count < config.maxPages;
    }
    if (count >= config.maxPages) {
      return false;
    }
    seenNormalized.add(normalized);
    count += 1;
    await onDiscovered(url, { index: count });
    return count < config.maxPages;
  };

  await emit(baseUrl);

  let discoveredUrls = await fetchSitemap(baseUrl);

  if (discoveredUrls.length === 0) {
    logger.info({ baseUrl }, 'No sitemap found, crawling homepage (streaming)');
    discoveredUrls = await crawlHomepage(browser, baseUrl);
  } else {
    logger.info({ baseUrl, sitemapCount: discoveredUrls.length }, 'Streaming from sitemap');
  }

  for (const href of discoveredUrls) {
    if (count >= config.maxPages) {
      break;
    }

    const absoluteUrl = buildAbsoluteUrl(baseUrl, href);
    if (!absoluteUrl) continue;
    if (!isSameDomain(baseUrl, absoluteUrl)) continue;
    if (isNonHtmlResource(absoluteUrl)) continue;
    if (hasPaginationParams(absoluteUrl)) continue;
    if (isExcluded(absoluteUrl, config.excludePaths)) continue;

    const keepGoing = await emit(absoluteUrl);
    if (!keepGoing) {
      break;
    }
  }

  logger.info(
    { baseUrl, totalUrls: count, maxPages: config.maxPages },
    'Streaming URL discovery complete',
  );

  return count;
}
