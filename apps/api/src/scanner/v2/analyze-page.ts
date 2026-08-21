/**
 * Analyze a single page URL with Playwright + axe + India rules.
 * Shared by monolith worker and v2 page.scan consumer.
 */

import type { Browser } from 'playwright';
import { runAxeWithRetry } from '../axe-runner';
import { scanPage, closeScanContext } from '../playwright-runner';
import { runGIGWChecks } from '../rules/gigw';
import { runIS17802Rules } from '../rules/is17802';
import { runSebiChecks } from '../rules/sebi';
import type { RawViolation, ScanJobConfig } from '../types';

export interface AnalyzePageResult {
  violations: RawViolation[];
  desktopScreenshot: Buffer | null;
  mobileScreenshot: Buffer | null;
}

export async function analyzePageUrl(
  browser: Browser,
  url: string,
  config: ScanJobConfig,
  assetId: string,
): Promise<AnalyzePageResult> {
  const { page, context, desktopScreenshot, mobileScreenshot } = await scanPage(
    browser,
    url,
    config,
  );

  try {
    const pageViolations = await runAxeWithRetry(page, config, assetId, url);

    if (config.standards.includes('IS17802')) {
      const isViolations = await runIS17802Rules(page, url, assetId);
      pageViolations.push(...isViolations);
    }

    if (config.standards.includes('GIGW3')) {
      const gigwViolations = await runGIGWChecks(page, url, assetId, config);
      pageViolations.push(...gigwViolations);
    }

    if (config.standards.includes('SEBI')) {
      const sebiViolations = await runSebiChecks(page, url, assetId);
      pageViolations.push(...sebiViolations);
    }

    return {
      violations: pageViolations,
      desktopScreenshot,
      mobileScreenshot,
    };
  } finally {
    await closeScanContext(context);
  }
}
