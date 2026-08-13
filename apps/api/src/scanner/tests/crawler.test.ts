/**
 * Crawler / sitemap discovery unit tests
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchSitemap,
  isNonHtmlResource,
  isSitemapDocumentUrl,
  parseSitemapLocs,
} from '../crawler';

const INDEX_XML = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" generatedBy="WIX">
  <sitemap>
    <loc>https://www.faithautomation.com/pages-sitemap.xml</loc>
  </sitemap>
</sitemapindex>`;

const PAGES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" generatedBy="WIX">
  <url><loc>https://www.faithautomation.com/</loc></url>
  <url><loc>https://www.faithautomation.com/about-us</loc></url>
  <url><loc>https://www.faithautomation.com/contact-us</loc></url>
  <url><loc>https://www.faithautomation.com/careers</loc></url>
</urlset>`;

const ROBOTS = `User-agent: *
Allow: /
Sitemap: https://www.faithautomation.com/sitemap.xml
`;

describe('parseSitemapLocs', () => {
  it('extracts loc URLs from urlset', () => {
    expect(parseSitemapLocs(PAGES_XML)).toEqual([
      'https://www.faithautomation.com/',
      'https://www.faithautomation.com/about-us',
      'https://www.faithautomation.com/contact-us',
      'https://www.faithautomation.com/careers',
    ]);
  });

  it('extracts child sitemap locs from index', () => {
    expect(parseSitemapLocs(INDEX_XML)).toEqual([
      'https://www.faithautomation.com/pages-sitemap.xml',
    ]);
  });
});

describe('isSitemapDocumentUrl / isNonHtmlResource', () => {
  it('treats pages-sitemap.xml as a sitemap document and non-HTML', () => {
    const url = 'https://www.faithautomation.com/pages-sitemap.xml';
    expect(isSitemapDocumentUrl(url)).toBe(true);
    expect(isNonHtmlResource(url)).toBe(true);
  });

  it('does not treat HTML pages as sitemap documents', () => {
    expect(isSitemapDocumentUrl('https://www.faithautomation.com/about-us')).toBe(false);
    expect(isNonHtmlResource('https://www.faithautomation.com/about-us')).toBe(false);
  });
});

describe('fetchSitemap', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('follows Wix sitemap index into pages-sitemap.xml', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/robots.txt')) {
          return new Response(ROBOTS, { status: 200 });
        }
        if (url.endsWith('/sitemap.xml')) {
          return new Response(INDEX_XML, { status: 200 });
        }
        if (url.endsWith('/pages-sitemap.xml')) {
          return new Response(PAGES_XML, { status: 200 });
        }
        return new Response('missing', { status: 404 });
      }),
    );

    const urls = await fetchSitemap('https://www.faithautomation.com/');
    expect(urls).toContain('https://www.faithautomation.com/about-us');
    expect(urls).toContain('https://www.faithautomation.com/contact-us');
    expect(urls).toContain('https://www.faithautomation.com/careers');
    expect(urls.some((u) => u.endsWith('.xml'))).toBe(false);
    expect(urls.length).toBeGreaterThanOrEqual(3);
  });

  it('returns empty when only an index of .xml locs would previously leak through', async () => {
    // Regression: old crawler returned [pages-sitemap.xml] then filtered all → 1 page scan
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/robots.txt')) {
          return new Response('User-agent: *\nAllow: /\n', { status: 200 });
        }
        if (url.endsWith('/sitemap.xml')) {
          return new Response(INDEX_XML, { status: 200 });
        }
        // Child sitemap missing — must not return the .xml loc as a page URL
        return new Response('missing', { status: 404 });
      }),
    );

    const urls = await fetchSitemap('https://www.faithautomation.com/');
    expect(urls).toEqual([]);
  });
});
