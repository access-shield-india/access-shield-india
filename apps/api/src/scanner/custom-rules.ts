/**
 * Custom axe-adjacent rules from AccessibleNow accessibility knowledge base.
 *
 * RULE-004 filename alt text (axe passes non-empty filename alts)
 * RULE-005 duplicate link text (axe link-name only fires on empty names)
 * RULE-006 auto-playing / moving content (axe has no 2.2.2 rule)
 * RULE-007 countdown timers in aria-live regions (OTP / TalkBack storm)
 *
 * RULE-001 (iframe scan) and RULE-002 (scroll-before-axe) live in axe-runner.ts.
 */

import { createHash } from 'crypto';
import type { Page } from 'playwright';
import { logger } from '../lib/logger';
import type { RawViolation } from './types';

function fingerprint(assetId: string, ruleId: string, selector: string): string {
  return createHash('sha256').update(`${assetId}:${ruleId}:${selector}`).digest('hex').substring(0, 16);
}

const HELP_NON_TEXT = 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html';
const HELP_LINK_PURPOSE = 'https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html';
const HELP_PAUSE_STOP = 'https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html';
const HELP_STATUS = 'https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html';

const FILENAME_EXT = /\.(png|jpg|jpeg|gif|webp|svg)$/i;
const HASHY_FILENAME = /^[a-z0-9_-]{25,}$/i;
const COUNTDOWN_TEXT =
  /\b(\d{1,3})\s*(s|sec|secs|second|seconds)\b|\b(otp|resend|expire|expires|remaining|left)\b/i;

interface DomFinding {
  selector: string;
  html: string;
  elementType: string;
  description: string;
}

function createViolation(
  ruleId: string,
  wcagCriterion: string,
  severity: RawViolation['severity'],
  finding: DomFinding,
  assetId: string,
  pageUrl: string,
  helpUrl: string,
): RawViolation {
  return {
    ruleId,
    wcagCriterion,
    wcagLevel: 'AA',
    standard: 'WCAG22',
    severity,
    elementType: finding.elementType,
    elementHtml: finding.html.substring(0, 2000),
    elementSelector: finding.selector,
    description: finding.description,
    helpUrl,
    fingerprint: fingerprint(assetId, ruleId, finding.selector),
    pageUrl,
  };
}

function cssPath(index: number, tag: string, extra: string): string {
  return `${tag}${extra}:nth-finding-${index}`;
}

/**
 * RULE-004: alt text that is just a filename or a long hash/slug.
 * axe-core passes any non-empty alt.
 */
export function isFilenameAltText(alt: string): boolean {
  const trimmed = alt.trim();
  if (!trimmed) return false;
  const lastSegment = trimmed.split(/[/\\]/).pop() ?? trimmed;
  return FILENAME_EXT.test(lastSegment) || HASHY_FILENAME.test(trimmed);
}

export async function checkFilenameAltText(
  page: Page,
  pageUrl: string,
  assetId: string,
): Promise<RawViolation[]> {
  const findings = await page.evaluate(() => {
    const ext = /\.(png|jpg|jpeg|gif|webp|svg)$/i;
    const hashy = /^[a-z0-9_-]{25,}$/i;
    const imgs = Array.from(document.querySelectorAll('img[alt]'));
    const out: DomFinding[] = [];

    imgs.forEach((el, index) => {
      const img = el as HTMLImageElement;
      const alt = (img.getAttribute('alt') ?? '').trim();
      if (!alt) return;
      const last = alt.split(/[/\\]/).pop() ?? alt;
      if (!ext.test(last) && !hashy.test(alt)) return;

      const id = img.id ? `#${img.id}` : '';
      out.push({
        selector: `img${id}[alt]:nth-of-type(${index + 1})`,
        html: img.outerHTML.slice(0, 500),
        elementType: 'img',
        description: `Image alt text looks like a filename ("${alt}"). Provide a human description of the image, including product/dosage names where relevant (WCAG 1.1.1 / IS-001).`,
      });
    });

    return out;
  });

  return findings.map((finding, i) =>
    createViolation(
      'RULE-004',
      '1.1.1',
      'serious',
      { ...finding, selector: finding.selector || cssPath(i, 'img', '[alt]') },
      assetId,
      pageUrl,
      HELP_NON_TEXT,
    ),
  );
}

/**
 * RULE-005: 3+ links sharing identical visible text.
 * axe link-name only fires when the accessible name is empty.
 */
export async function checkDuplicateLinkText(
  page: Page,
  pageUrl: string,
  assetId: string,
): Promise<RawViolation[]> {
  const groups = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    const byText = new Map<
      string,
      Array<{ href: string; html: string; selector: string }>
    >();

    anchors.forEach((el, index) => {
      const a = el as HTMLAnchorElement;
      const text = (a.innerText || a.textContent || '').trim().toLowerCase();
      if (!text || text.length > 80) return;
      const href = a.href;
      const list = byText.get(text) ?? [];
      list.push({
        href,
        html: a.outerHTML.slice(0, 500),
        selector: a.id ? `a#${a.id}` : `a[href]:nth-of-type(${index + 1})`,
      });
      byText.set(text, list);
    });

    const result: Array<{ text: string; count: number; destinations: number; sample: DomFinding }> =
      [];

    byText.forEach((items, text) => {
      if (items.length < 3) return;
      const destinations = new Set(items.map((i) => i.href)).size;
      if (destinations < 2) return;
      const first = items[0]!;
      result.push({
        text,
        count: items.length,
        destinations,
        sample: {
          selector: first.selector,
          html: first.html,
          elementType: 'a',
          description: `${items.length} links share the identical text "${text}" but point to ${destinations} different destinations. Make each link purpose clear in its text (WCAG 2.4.4 / IS-009).`,
        },
      });
    });

    return result;
  });

  return groups.map((group) =>
    createViolation(
      'RULE-005',
      '2.4.4',
      'moderate',
      group.sample,
      assetId,
      pageUrl,
      HELP_LINK_PURPOSE,
    ),
  );
}

/**
 * RULE-006: auto-playing carousels/sliders/marquees without a pause control,
 * running CSS animations, or Wix-style duplicated image sets.
 */
export async function checkAutoPlayingContent(
  page: Page,
  pageUrl: string,
  assetId: string,
): Promise<RawViolation[]> {
  const findings = await page.evaluate(() => {
    const out: DomFinding[] = [];
    const pauseRe = /pause|stop|halt|freeze/i;

    const hasPauseControl = (root: Element): boolean => {
      const controls = root.querySelectorAll('button, [role="button"], a');
      for (const el of Array.from(controls)) {
        const label = `${el.getAttribute('aria-label') ?? ''} ${el.textContent ?? ''}`;
        if (pauseRe.test(label)) return true;
      }
      return false;
    };

    const movers = document.querySelectorAll(
      '[class*="carousel" i], [class*="slider" i], [class*="marquee" i], [class*="swiper" i], [data-testid*="carousel" i]',
    );

    movers.forEach((el, index) => {
      const style = window.getComputedStyle(el);
      const animating =
        style.animationPlayState === 'running' &&
        style.animationName !== 'none' &&
        style.animationName !== '';
      const autoplayAttr =
        el.getAttribute('data-autoplay') === 'true' ||
        el.hasAttribute('data-autoplay') ||
        Boolean(el.querySelector('video[autoplay], [data-autoplay="true"]'));

      if (!animating && !autoplayAttr) return;
      if (hasPauseControl(el)) return;

      const tag = el.tagName.toLowerCase();
      out.push({
        selector: el.id ? `#${el.id}` : `${tag}[class*="carousel"]:nth-of-type(${index + 1})`,
        html: el.outerHTML.slice(0, 500),
        elementType: tag,
        description:
          'Moving or auto-playing content (carousel/slider/marquee) has no pause, stop, or hide control. Users with vestibular or cognitive disabilities cannot stop the motion (WCAG 2.2.2 / IS-013).',
      });
    });

    const runningAnimated = Array.from(document.querySelectorAll('body *')).filter((el) => {
      const style = window.getComputedStyle(el);
      return (
        style.animationPlayState === 'running' &&
        style.animationName !== 'none' &&
        style.animationName !== '' &&
        Number.parseFloat(style.animationDuration || '0') > 0
      );
    });

    for (const el of runningAnimated.slice(0, 8)) {
      if (hasPauseControl(el) || hasPauseControl(document.body)) continue;
      const already = out.some((f) => f.html === el.outerHTML.slice(0, 500));
      if (already) continue;
      const tag = el.tagName.toLowerCase();
      out.push({
        selector: el.id ? `#${el.id}` : `${tag}[style*="animation"]`,
        html: el.outerHTML.slice(0, 500),
        elementType: tag,
        description:
          'An element has CSS animation-play-state:running with no pause control (WCAG 2.2.2 / IS-013).',
      });
    }

    const srcs = Array.from(document.querySelectorAll('img[src]'))
      .map((img) => (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src)
      .filter(Boolean);
    const counts = new Map<string, number>();
    for (const src of srcs) {
      counts.set(src, (counts.get(src) ?? 0) + 1);
    }
    const duplicated = [...counts.values()].filter((n) => n >= 2).length;
    if (duplicated >= 3 && movers.length > 0 && !hasPauseControl(document.body)) {
      out.push({
        selector: '[class*="carousel"], [class*="slider"]',
        html: '<div class="carousel">…</div>',
        elementType: 'div',
        description:
          'Duplicate image sets in the DOM (typical of infinite/autoplay carousels) with no pause control (WCAG 2.2.2 / IS-013).',
      });
    }

    const autoplayVideos = document.querySelectorAll('video[autoplay]:not([muted])');
    autoplayVideos.forEach((el, index) => {
      const video = el as HTMLVideoElement;
      if (video.hasAttribute('controls')) return;
      out.push({
        selector: video.id ? `video#${video.id}` : `video[autoplay]:nth-of-type(${index + 1})`,
        html: video.outerHTML.slice(0, 500),
        elementType: 'video',
        description:
          'Auto-playing video has no pause/stop control and is not muted (WCAG 2.2.2 / IS-013).',
      });
    });

    return out;
  });

  const seen = new Set<string>();
  const unique: DomFinding[] = [];
  for (const finding of findings) {
    const key = `${finding.selector}:${finding.description.slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(finding);
  }

  return unique.map((finding) =>
    createViolation('RULE-006', '2.2.2', 'serious', finding, assetId, pageUrl, HELP_PAUSE_STOP),
  );
}

interface LiveSnapshot {
  selector: string;
  html: string;
  text: string;
  live: string;
  role: string;
}

function looksLikeCountdown(text: string): boolean {
  return COUNTDOWN_TEXT.test(text) || /^\s*\d{1,3}\s*$/.test(text.trim());
}

/**
 * RULE-007: OTP / session countdown inside aria-live (re-announced every second).
 * Samples live regions twice ~1.2s apart to detect ticking numbers.
 */
export async function checkCountdownTimers(
  page: Page,
  pageUrl: string,
  assetId: string,
): Promise<RawViolation[]> {
  const collect = () =>
    page.evaluate(() => {
      const nodes = document.querySelectorAll(
        '[aria-live], [role="status"], [role="alert"], [role="timer"]',
      );
      return Array.from(nodes).map((el, index) => {
        const live = (el.getAttribute('aria-live') ?? '').toLowerCase();
        const role = (el.getAttribute('role') ?? '').toLowerCase();
        return {
          selector: el.id ? `#${el.id}` : `[aria-live]:nth-of-type(${index + 1})`,
          html: el.outerHTML.slice(0, 500),
          text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
          live,
          role,
        };
      });
    }) as Promise<LiveSnapshot[]>;

  const first = await collect();
  await page.waitForTimeout(1200);
  const second = await collect();

  const secondBySelector = new Map(second.map((s) => [s.selector, s]));
  const findings: DomFinding[] = [];

  for (const snap of first) {
    if (snap.live === 'off') continue;

    const later = secondBySelector.get(snap.selector);
    const textChanged = Boolean(later && later.text !== snap.text);
    const countdownShaped = looksLikeCountdown(snap.text) || (later ? looksLikeCountdown(later.text) : false);

    const firstNum = Number.parseInt(snap.text.replace(/[^\d]/g, ''), 10);
    const secondNum = later ? Number.parseInt(later.text.replace(/[^\d]/g, ''), 10) : NaN;
    const ticking =
      Number.isFinite(firstNum) &&
      Number.isFinite(secondNum) &&
      firstNum !== secondNum &&
      Math.abs(firstNum - secondNum) <= 5;

    if (!countdownShaped && !ticking) continue;
    if (!textChanged && !countdownShaped) continue;

    findings.push({
      selector: snap.selector,
      html: snap.html,
      elementType: 'div',
      description:
        'A countdown or OTP timer is inside an aria-live (or status/alert) region, so screen readers re-announce every tick and users cannot complete the form (WCAG 4.1.3 / IS-011). Move the ticking number out of the live region; announce only key milestones.',
    });
  }

  return findings.map((finding) =>
    createViolation('RULE-007', '4.1.3', 'critical', finding, assetId, pageUrl, HELP_STATUS),
  );
}

/**
 * Run knowledge-base custom rules (004–007) on the current page.
 */
export async function runCustomAxeRules(
  page: Page,
  pageUrl: string,
  assetId: string,
): Promise<RawViolation[]> {
  const buckets = await Promise.allSettled([
    checkFilenameAltText(page, pageUrl, assetId),
    checkDuplicateLinkText(page, pageUrl, assetId),
    checkAutoPlayingContent(page, pageUrl, assetId),
    checkCountdownTimers(page, pageUrl, assetId),
  ]);

  const violations: RawViolation[] = [];
  for (const result of buckets) {
    if (result.status === 'fulfilled') {
      violations.push(...result.value);
    } else {
      logger.warn({ err: result.reason, pageUrl }, 'Custom accessibility rule failed');
    }
  }

  logger.info({ pageUrl, customCount: violations.length }, 'Custom axe rules complete');
  return violations;
}
