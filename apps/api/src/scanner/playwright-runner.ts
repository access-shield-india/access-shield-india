/**
 * Playwright Runner
 *
 * Browser automation for accessibility scanning using Playwright.
 * Handles page navigation, metadata extraction, authentication,
 * and screenshot capture.
 */

import { logger } from '../lib/logger';
import type { HeadingInfo, LoginConfig, PageScanResult, ScanJobConfig } from './types';

/** Playwright types */
type Browser = import('playwright').Browser;
type BrowserContext = import('playwright').BrowserContext;
type Page = import('playwright').Page;

/** Dynamic import for chromium */
async function getChromium() {
  const { chromium } = await import('playwright');
  return chromium;
}

/** Desktop viewport for standard scanning */
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

/** Mobile viewport for responsive testing */
const MOBILE_VIEWPORT = { width: 375, height: 667 };

/** Navigation timeout in milliseconds */
const NAVIGATION_TIMEOUT = 30000;

/** Page load wait time after navigation */
const PAGE_SETTLE_TIME = 1000;

const SCREENSHOTS_ENABLED = process.env.SCAN_SCREENSHOTS === 'true';

/**
 * Create a new Playwright browser instance.
 * Configured for headless operation in containerized environments.
 *
 * @returns Promise resolving to Browser instance
 */
export async function createBrowser(): Promise<Browser> {
  const chromium = await getChromium();
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--no-first-run',
      '--disable-extensions',
    ],
  });

  logger.info('Playwright browser launched');
  return browser;
}

/**
 * Extract heading structure from the page.
 * Returns all h1-h6 elements with their levels and text content.
 */
async function extractHeadingStructure(page: Page): Promise<HeadingInfo[]> {
  try {
    return await page.evaluate(() => {
      const headings: { level: number; text: string }[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = (globalThis as any).document;
      const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      headingElements.forEach((el: any) => {
        const level = parseInt(el.tagName.charAt(1), 10);
        const text = (el.textContent ?? '').trim().substring(0, 200);
        if (text) {
          headings.push({ level, text });
        }
      });

      return headings;
    });
  } catch (err) {
    logger.warn({ err }, 'Failed to extract heading structure');
    return [];
  }
}

/**
 * Extract landmark regions from the page.
 * Identifies main, nav, banner, contentinfo, search, and other landmarks.
 */
async function extractLandmarkRegions(page: Page): Promise<string[]> {
  try {
    return await page.evaluate(() => {
      const landmarks: string[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = (globalThis as any).document;

      const roleSelectors = [
        '[role="main"]',
        '[role="navigation"]',
        '[role="banner"]',
        '[role="contentinfo"]',
        '[role="search"]',
        '[role="complementary"]',
        '[role="region"][aria-label]',
        '[role="form"]',
      ];

      const htmlLandmarks = ['main', 'nav', 'header', 'footer', 'aside', 'section[aria-label]'];

      [...roleSelectors, ...htmlLandmarks].forEach((selector) => {
        try {
          const elements = doc.querySelectorAll(selector);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          elements.forEach((el: any) => {
            const role = el.getAttribute('role') ?? el.tagName.toLowerCase();
            const label = el.getAttribute('aria-label') ?? '';
            landmarks.push(label ? `${role}: ${label}` : role);
          });
        } catch {
          // Skip invalid selectors
        }
      });

      return [...new Set(landmarks)];
    });
  } catch (err) {
    logger.warn({ err }, 'Failed to extract landmark regions');
    return [];
  }
}

/**
 * Handle authentication for protected pages.
 * Navigates to login URL and fills credentials.
 *
 * @param page - Playwright page instance
 * @param loginConfig - Login configuration with field selectors and credentials
 */
export async function injectAuth(page: Page, loginConfig: LoginConfig): Promise<void> {
  logger.info({ loginUrl: loginConfig.url }, 'Attempting authentication');

  try {
    await page.goto(loginConfig.url, {
      waitUntil: 'networkidle',
      timeout: NAVIGATION_TIMEOUT,
    });

    const username =
      process.env[`SECRET_${loginConfig.usernameSecretArn}`] ?? process.env.SCAN_AUTH_USERNAME;
    const password =
      process.env[`SECRET_${loginConfig.passwordSecretArn}`] ?? process.env.SCAN_AUTH_PASSWORD;

    if (!username || !password) {
      throw new Error('Authentication credentials not found in environment');
    }

    await page.waitForSelector(loginConfig.usernameField, { timeout: 10000 });
    await page.fill(loginConfig.usernameField, username);

    await page.waitForSelector(loginConfig.passwordField, { timeout: 10000 });
    await page.fill(loginConfig.passwordField, password);

    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Sign in")',
      'button:has-text("Log in")',
      '[type="submit"]',
    ];

    let submitted = false;
    for (const selector of submitSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          submitted = true;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!submitted) {
      await page.keyboard.press('Enter');
    }

    await page.waitForLoadState('networkidle', { timeout: NAVIGATION_TIMEOUT });

    logger.info('Authentication completed successfully');
  } catch (err) {
    logger.error({ err, loginUrl: loginConfig.url }, 'Authentication failed');
    throw new Error(
      `Authentication failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
  }
}

/**
 * Take a screenshot of the current page.
 *
 * @param page - Playwright page instance
 * @param fullPage - Whether to capture the full page or just viewport
 * @returns Screenshot buffer or null on failure
 */
async function takeScreenshot(page: Page, fullPage = false): Promise<Buffer | null> {
  try {
    const buffer = await page.screenshot({
      type: 'png',
      fullPage,
    });
    return buffer;
  } catch (err) {
    logger.warn({ err }, 'Failed to take screenshot');
    return null;
  }
}

/**
 * Scan a single page for accessibility data.
 *
 * Workflow:
 * 1. Create isolated browser context
 * 2. Navigate to URL with retry on timeout
 * 3. Handle authentication if configured
 * 4. Extract page metadata (title, lang, headings, landmarks)
 * 5. Take desktop and mobile screenshots
 * 6. Return PageScanResult (violations populated by axe-runner separately)
 *
 * @param browser - Playwright browser instance
 * @param url - URL to scan
 * @param config - Scan configuration
 * @returns Page scan result with metadata and screenshot buffers
 */
export async function scanPage(
  browser: Browser,
  url: string,
  config: ScanJobConfig,
): Promise<{
  result: Omit<PageScanResult, 'violations' | 'screenshotUrl' | 'mobileScreenshotUrl'>;
  page: Page;
  context: BrowserContext;
  desktopScreenshot: Buffer | null;
  mobileScreenshot: Buffer | null;
}> {
  const startTime = Date.now();

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AccessShield-Scanner/1.0',
    viewport: DESKTOP_VIEWPORT,
    ignoreHTTPSErrors: true,
    javaScriptEnabled: true,
    // A11Y: scanners must inject axe-core; strict CSP blocks script tags without this.
    bypassCSP: true,
  });

  const page = await context.newPage();

  try {
    if (config.loginConfig) {
      await injectAuth(page, config.loginConfig);
    }

    try {
      await page.goto(url, {
        waitUntil: 'load',
        timeout: NAVIGATION_TIMEOUT,
      });
    } catch (navError) {
      logger.warn(
        { url, err: navError },
        'Initial navigation failed, retrying with domcontentloaded',
      );

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: NAVIGATION_TIMEOUT,
      });
    }

    await page.waitForSelector('body', { timeout: 10000 }).catch(() => {});

    await page.waitForTimeout(PAGE_SETTLE_TIME);

    const [title, langAttribute, headingStructure, landmarkRegions] = await Promise.all([
      page.title().catch(() => ''),
      page
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .evaluate(() => (globalThis as any).document.documentElement.getAttribute('lang'))
        .catch(() => null),
      extractHeadingStructure(page),
      extractLandmarkRegions(page),
    ]);

    const desktopScreenshot = SCREENSHOTS_ENABLED ? await takeScreenshot(page) : null;

    let mobileScreenshot: Buffer | null = null;
    if (SCREENSHOTS_ENABLED) {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await page.waitForTimeout(500);
      mobileScreenshot = await takeScreenshot(page);
      await page.setViewportSize(DESKTOP_VIEWPORT);
    }

    const scanDurationMs = Date.now() - startTime;

    logger.info(
      {
        url,
        title: title.substring(0, 50),
        langAttribute,
        headingCount: headingStructure.length,
        landmarkCount: landmarkRegions.length,
        durationMs: scanDurationMs,
      },
      'Page scan metadata extracted',
    );

    return {
      result: {
        url,
        title,
        langAttribute,
        headingStructure,
        landmarkRegions,
        scanDurationMs,
      },
      page,
      context,
      desktopScreenshot,
      mobileScreenshot,
    };
  } catch (err) {
    await context.close().catch(() => {});

    logger.error({ err, url }, 'Failed to scan page');
    throw err;
  }
}

/**
 * Close a page and its context after scanning.
 *
 * @param context - Browser context to close
 */
export async function closeScanContext(context: BrowserContext): Promise<void> {
  try {
    await context.close();
  } catch (err) {
    logger.warn({ err }, 'Error closing browser context');
  }
}

/**
 * Gracefully close the browser.
 *
 * @param browser - Browser instance to close
 */
export async function closeBrowser(browser: Browser): Promise<void> {
  try {
    await browser.close();
    logger.info('Playwright browser closed');
  } catch (err) {
    logger.warn({ err }, 'Error closing browser');
  }
}

/**
 * Utility to check if page is still navigable.
 */
export async function isPageNavigable(page: Page): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.evaluate(() => (globalThis as any).document.readyState);
    return true;
  } catch {
    return false;
  }
}
