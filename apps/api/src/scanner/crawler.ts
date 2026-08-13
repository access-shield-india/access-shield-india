/**
 * URL Discovery / Crawler
 *
 * Discovers URLs for scanning via sitemap.xml parsing or page link crawling.
 * Filters URLs based on domain, exclusion patterns, and page limits.
 *
 * Handles sitemap indexes (common on Wix / WordPress / Shopify) by recursively
 * fetching child sitemaps. Falls back to homepage link crawl when no HTML page
 * URLs are found.
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

/** Cap nested sitemap fetches (indexes → child sitemaps). */
const MAX_SITEMAP_DEPTH = 3;
/** Cap total child sitemap documents fetched per discovery run. */
const MAX_SITEMAP_DOCS = 25;

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
export function isNonHtmlResource(url: string): boolean {
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
 * True when a <loc> points at another sitemap document (index children, Wix pages-sitemap.xml).
 */
export function isSitemapDocumentUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith('.xml')) return true;
    if (pathname.includes('sitemap') && !pathname.endsWith('/')) return true;
    return false;
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

/** Extract <loc> values from sitemap / sitemapindex XML. */
export function parseSitemapLocs(xml: string): string[] {
  const locMatches = xml.match(/<loc>([^<]+)<\/loc>/gi);
  if (!locMatches || locMatches.length === 0) {
    return [];
  }

  return locMatches
    .map((match) => {
      const urlMatch = match.match(/<loc>([^<]+)<\/loc>/i);
      return urlMatch?.[1]?.trim() ?? null;
    })
    .filter((url): url is string => url !== null && url.length > 0);
}

function isSitemapIndexXml(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml);
}

async function fetchText(url: string, accept: string, timeoutMs: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AccessShield-Scanner/1.0',
        Accept: accept,
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch (err) {
    logger.debug({ url, err }, 'Failed to fetch URL for discovery');
    return null;
  }
}

/**
 * Read robots.txt Sitemap: directives (Wix and many CMS hosts list the real index here).
 */
export async function discoverSitemapsFromRobots(baseUrl: string): Promise<string[]> {
  const robotsUrl = new URL('/robots.txt', baseUrl).href;
  const text = await fetchText(robotsUrl, 'text/plain, */*', 8000);
  if (!text) return [];

  const sitemaps: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*Sitemap:\s*(\S+)/i);
    if (match?.[1]) {
      sitemaps.push(match[1].trim());
    }
  }
  return sitemaps;
}

/**
 * Fetch one sitemap document and recurse into child sitemaps when this is an index.
 * Returns page (non-sitemap) URLs only.
 */
async function collectUrlsFromSitemapDoc(
  sitemapUrl: string,
  baseUrl: string,
  visited: Set<string>,
  depth: number,
  counters: { docs: number },
): Promise<string[]> {
  const normalized = normalizeUrl(sitemapUrl);
  if (visited.has(normalized)) {
    return [];
  }
  if (depth > MAX_SITEMAP_DEPTH || counters.docs >= MAX_SITEMAP_DOCS) {
    logger.warn(
      { sitemapUrl, depth, docs: counters.docs },
      'Sitemap recursion limit reached',
    );
    return [];
  }

  visited.add(normalized);
  counters.docs += 1;

  const text = await fetchText(sitemapUrl, 'application/xml, text/xml, */*', 15000);
  if (!text) {
    return [];
  }

  const locs = parseSitemapLocs(text);
  if (locs.length === 0) {
    return [];
  }

  const pageUrls: string[] = [];
  const childSitemaps: string[] = [];

  for (const loc of locs) {
    if (!isSameDomain(baseUrl, loc)) {
      continue;
    }
    if (isSitemapDocumentUrl(loc)) {
      childSitemaps.push(loc);
    } else {
      pageUrls.push(loc);
    }
  }

  // Sitemap index (Wix/WP) or mixed: follow child .xml docs
  if (childSitemaps.length > 0 && (isSitemapIndexXml(text) || pageUrls.length === 0)) {
    logger.info(
      { sitemapUrl, childCount: childSitemaps.length, depth },
      'Following sitemap index children',
    );
    for (const child of childSitemaps) {
      const nested = await collectUrlsFromSitemapDoc(
        child,
        baseUrl,
        visited,
        depth + 1,
        counters,
      );
      pageUrls.push(...nested);
    }
  } else if (childSitemaps.length > 0) {
    // Mixed urlset: keep pages and also expand nested sitemap refs
    for (const child of childSitemaps) {
      const nested = await collectUrlsFromSitemapDoc(
        child,
        baseUrl,
        visited,
        depth + 1,
        counters,
      );
      pageUrls.push(...nested);
    }
  }

  logger.info(
    { sitemapUrl, urlCount: pageUrls.length, depth },
    'Parsed sitemap document successfully',
  );
  return pageUrls;
}

/**
 * Fetch and parse sitemap(s) to extract HTML page URLs.
 * Follows sitemap indexes (Wix `pages-sitemap.xml`, WP nested indexes, etc.).
 *
 * @param baseUrl - The website's base URL
 * @returns Array of page URLs from sitemaps, empty if none found
 */
export async function fetchSitemap(baseUrl: string): Promise<string[]> {
  const candidates: string[] = [];
  const seenCandidate = new Set<string>();

  const addCandidate = (url: string) => {
    const key = normalizeUrl(url);
    if (seenCandidate.has(key)) return;
    seenCandidate.add(key);
    candidates.push(url);
  };

  for (const fromRobots of await discoverSitemapsFromRobots(baseUrl)) {
    addCandidate(fromRobots);
  }

  for (const path of ['/sitemap.xml', '/sitemap_index.xml', '/sitemap/sitemap.xml']) {
    addCandidate(new URL(path, baseUrl).href);
  }

  const visited = new Set<string>();
  const counters = { docs: 0 };
  const allPageUrls: string[] = [];
  const seenPage = new Set<string>();

  for (const sitemapUrl of candidates) {
    const urls = await collectUrlsFromSitemapDoc(
      sitemapUrl,
      baseUrl,
      visited,
      0,
      counters,
    );
    for (const url of urls) {
      const key = normalizeUrl(url);
      if (seenPage.has(key)) continue;
      seenPage.add(key);
      allPageUrls.push(url);
    }
    // Prefer first seed that yields pages (robots Sitemap or /sitemap.xml)
    if (allPageUrls.length > 0) {
      break;
    }
  }

  if (allPageUrls.length > 0) {
    logger.info(
      { baseUrl, urlCount: allPageUrls.length, sitemapDocs: counters.docs },
      'Sitemap discovery complete',
    );
  }

  return allPageUrls;
}

/**
 * Crawl homepage to discover linked pages.
 * Uses Playwright to render JavaScript-heavy pages (Wix, SPAs).
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

    // Wix / SPA nav often hydrates after first paint — give it time, then try networkidle.
    await page.waitForTimeout(2500);
    try {
      await page.waitForLoadState('networkidle', { timeout: 8000 });
    } catch {
      // Heavy sites never go idle; continue with whatever DOM we have.
    }

    // Expand common disclosure menus so hidden nav links enter the DOM.
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = (globalThis as any).document as Document;
      const toggles = doc.querySelectorAll(
        'button[aria-expanded="false"], [aria-haspopup="true"], [data-testid*="menu"], .menu-button',
      );
      toggles.forEach((el) => {
        try {
          (el as HTMLElement).click();
        } catch {
          // ignore
        }
      });
    });
    await page.waitForTimeout(500);

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
 * Resolve and filter a discovered href. Does not mutate seen set.
 */
function filterDiscoveredHref(
  baseUrl: string,
  href: string,
  config: ScanJobConfig,
): string | null {
  const absoluteUrl = buildAbsoluteUrl(baseUrl, href);
  if (!absoluteUrl) return null;
  if (!isSameDomain(baseUrl, absoluteUrl)) return null;
  if (isNonHtmlResource(absoluteUrl)) return null;
  if (hasPaginationParams(absoluteUrl)) return null;
  if (isExcluded(absoluteUrl, config.excludePaths)) return null;
  return absoluteUrl;
}

/**
 * After sitemap parse, count candidate page URLs that would pass filters.
 * Used to decide whether homepage crawl fallback is needed.
 */
function countAcceptablePages(
  baseUrl: string,
  discoveredUrls: string[],
  config: ScanJobConfig,
): number {
  const seen = new Set<string>([normalizeUrl(baseUrl)]);
  let count = 0;
  for (const href of discoveredUrls) {
    const absoluteUrl = filterDiscoveredHref(baseUrl, href, config);
    if (!absoluteUrl) continue;
    const normalized = normalizeUrl(absoluteUrl);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    count += 1;
  }
  return count;
}

/**
 * Discover URLs for scanning.
 *
 * Strategy:
 * 1. Try sitemap(s) — follow indexes / child sitemaps
 * 2. If no usable page URLs, crawl homepage for links
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
    return await discoverUrlsWithBrowser(browser, baseUrl, config);
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

  if (countAcceptablePages(baseUrl, discoveredUrls, config) === 0) {
    logger.info({ baseUrl }, 'No usable sitemap page URLs, crawling homepage');
    discoveredUrls = await crawlHomepage(browser, baseUrl);
  }

  for (const href of discoveredUrls) {
    const absoluteUrl = filterDiscoveredHref(baseUrl, href, config);
    if (!absoluteUrl) continue;

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

  if (countAcceptablePages(baseUrl, discoveredUrls, config) === 0) {
    logger.info({ baseUrl }, 'No usable sitemap page URLs, crawling homepage (streaming)');
    discoveredUrls = await crawlHomepage(browser, baseUrl);
  } else {
    logger.info({ baseUrl, sitemapCount: discoveredUrls.length }, 'Streaming from sitemap');
  }

  for (const href of discoveredUrls) {
    if (count >= config.maxPages) {
      break;
    }

    const absoluteUrl = filterDiscoveredHref(baseUrl, href, config);
    if (!absoluteUrl) continue;

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
