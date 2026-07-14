/**
 * IS 17802 Custom Rules
 *
 * India's national ICT accessibility standard (BIS 2021).
 * Extends WCAG 2.1 AA with India-specific requirements.
 * These rules run AFTER axe-core on every scanned page.
 */

import type { Page } from 'playwright';
import { computeFingerprint } from '../axe-runner';
import { logger } from '../../lib/logger';
import type { RawViolation } from '../types';

/** Valid BCP 47 language codes for India's official languages + English */
const VALID_INDIAN_LANG_CODES = new Set([
  'hi', // Hindi
  'bn', // Bengali
  'te', // Telugu
  'mr', // Marathi
  'ta', // Tamil
  'gu', // Gujarati
  'kn', // Kannada
  'ml', // Malayalam
  'pa', // Punjabi
  'or', // Odia
  'as', // Assamese
  'ur', // Urdu
  'sa', // Sanskrit
  'sd', // Sindhi
  'ks', // Kashmiri
  'ne', // Nepali
  'si', // Sinhala
  'mni', // Manipuri
  'doi', // Dogri
  'sat', // Santali
  'mai', // Maithili
  'kok', // Konkani
  'en', // English
  'en-IN', // English (India)
  'en-GB', // English (UK)
]);

/** Devanagari Unicode range regex */
const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

/** Date format patterns to detect */
const MM_DD_YYYY_PATTERN = /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/\d{4}\b|MM\/DD\/YYYY/i;
const YYYY_MM_DD_PATTERN = /\b\d{4}-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])\b|YYYY-MM-DD/i;

/**
 * Create a base RawViolation for IS 17802 rules.
 */
function createIS17802Violation(
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
    standard: 'IS17802',
    severity,
    elementType,
    elementHtml: elementHtml.substring(0, 2000),
    elementSelector,
    description,
    helpUrl: `https://www.accessshield.in/docs/is17802/${ruleId}`,
    fingerprint: computeFingerprint(assetId, ruleId, elementSelector),
    pageUrl,
  };
}

/**
 * IS-001: Check HTML lang attribute.
 * HTML lang attribute must be a valid BCP 47 code for one of India's official languages or English.
 */
export async function checkHtmlLanguage(
  page: Page,
  url: string,
  assetId: string,
): Promise<RawViolation[]> {
  const violations: RawViolation[] = [];

  try {
    const lang = await page.$eval('html', (el) => el.getAttribute('lang'));

    if (lang === null || lang.trim() === '') {
      violations.push(
        createIS17802Violation(
          'IS-001',
          'critical',
          'HTML lang attribute is missing. IS 17802 requires all pages to declare language.',
          assetId,
          url,
          'html',
          '<html>',
          'html',
        ),
      );
    } else if (!VALID_INDIAN_LANG_CODES.has(lang.toLowerCase())) {
      violations.push(
        createIS17802Violation(
          'IS-001',
          'serious',
          `HTML lang attribute '${lang}' is not a recognised Indian language code per IS 17802 Rule IS-001.`,
          assetId,
          url,
          'html',
          `<html lang="${lang}">`,
          'html',
        ),
      );
    }
  } catch (err) {
    logger.warn({ err, url }, 'IS-001 checkHtmlLanguage failed');
  }

  return violations;
}

/**
 * IS-002: Check Devanagari encoding.
 * Hindi content must use Unicode Devanagari (U+0900–U+097F), not ASCII transliteration.
 */
export async function checkDevanagariEncoding(
  page: Page,
  url: string,
  assetId: string,
): Promise<RawViolation[]> {
  const violations: RawViolation[] = [];

  try {
    const lang = await page.$eval('html', (el) => el.getAttribute('lang'));

    if (!lang || !lang.toLowerCase().startsWith('hi')) {
      return violations;
    }

    const bodyText = await page.evaluate(() => document.body.innerText);

    if (!DEVANAGARI_REGEX.test(bodyText)) {
      violations.push(
        createIS17802Violation(
          'IS-002',
          'serious',
          'Page declares Hindi language but content appears to use ASCII transliteration instead of Unicode Devanagari. IS 17802 Rule IS-002 requires proper Unicode encoding.',
          assetId,
          url,
          'body',
          '<body>...</body>',
          'body',
        ),
      );
    }
  } catch (err) {
    logger.warn({ err, url }, 'IS-002 checkDevanagariEncoding failed');
  }

  return violations;
}

/**
 * IS-003: Check form help text language.
 * Form field help text (aria-describedby target) must be in the same language as its label.
 */
export async function checkFormHelpTextLanguage(
  page: Page,
  url: string,
  assetId: string,
): Promise<RawViolation[]> {
  const violations: RawViolation[] = [];

  try {
    const results = await page.evaluate(() => {
      const issues: Array<{
        inputSelector: string;
        inputHtml: string;
        labelText: string;
        helpText: string;
      }> = [];

      const inputs = document.querySelectorAll(
        'input[aria-describedby], select[aria-describedby], textarea[aria-describedby]',
      );

      inputs.forEach((input) => {
        const describedBy = input.getAttribute('aria-describedby');
        if (!describedBy) return;

        const helpElement = document.getElementById(describedBy);
        if (!helpElement) return;

        const helpText = helpElement.textContent?.trim() ?? '';
        if (!helpText) return;

        let labelText = '';

        const labelledBy = input.getAttribute('aria-labelledby');
        if (labelledBy) {
          const labelEl = document.getElementById(labelledBy);
          labelText = labelEl?.textContent?.trim() ?? '';
        }

        if (!labelText) {
          const id = input.id;
          if (id) {
            const labelEl = document.querySelector(`label[for="${id}"]`);
            labelText = labelEl?.textContent?.trim() ?? '';
          }
        }

        if (!labelText) return;

        const getTagPath = (el: Element): string => {
          const tag = el.tagName.toLowerCase();
          const id = el.id ? `#${el.id}` : '';
          const classes =
            el.className && typeof el.className === 'string'
              ? `.${el.className.split(' ').filter(Boolean).join('.')}`
              : '';
          return `${tag}${id}${classes}`;
        };

        issues.push({
          inputSelector: getTagPath(input),
          inputHtml: input.outerHTML.substring(0, 500),
          labelText,
          helpText,
        });
      });

      return issues;
    });

    for (const result of results) {
      const labelHasDevanagari = DEVANAGARI_REGEX.test(result.labelText);
      const helpHasDevanagari = DEVANAGARI_REGEX.test(result.helpText);

      if (labelHasDevanagari !== helpHasDevanagari) {
        violations.push(
          createIS17802Violation(
            'IS-003',
            'moderate',
            'Form field help text language does not match label language. IS 17802 Rule IS-003 requires consistency.',
            assetId,
            url,
            result.inputSelector,
            result.inputHtml,
            'input',
          ),
        );
      }
    }
  } catch (err) {
    logger.warn({ err, url }, 'IS-003 checkFormHelpTextLanguage failed');
  }

  return violations;
}

/**
 * IS-004: Check date input format.
 * Date inputs must support DD/MM/YYYY format (Indian standard).
 */
export async function checkDateInputFormat(
  page: Page,
  url: string,
  assetId: string,
): Promise<RawViolation[]> {
  const violations: RawViolation[] = [];

  try {
    const inputs = await page.evaluate(() => {
      const results: Array<{
        selector: string;
        html: string;
        placeholder: string | null;
        ariaLabel: string | null;
        type: string;
      }> = [];

      const dateHints = ['date', 'dob', 'birth', 'जन्म'];

      document.querySelectorAll('input[type="text"], input:not([type])').forEach((input) => {
        const el = input as HTMLInputElement;
        const placeholder = el.placeholder ?? '';
        const ariaLabel = el.getAttribute('aria-label') ?? '';
        const name = el.name ?? '';
        const id = el.id ?? '';

        const isDateField =
          dateHints.some(
            (hint) =>
              placeholder.toLowerCase().includes(hint) ||
              ariaLabel.toLowerCase().includes(hint) ||
              name.toLowerCase().includes(hint) ||
              id.toLowerCase().includes(hint),
          ) || /date/i.test(placeholder);

        if (isDateField || placeholder.includes('/') || placeholder.includes('-')) {
          const getSelector = (elem: Element): string => {
            const tag = elem.tagName.toLowerCase();
            const elemId = elem.id ? `#${elem.id}` : '';
            const classes =
              elem.className && typeof elem.className === 'string'
                ? `.${elem.className.split(' ').filter(Boolean).slice(0, 2).join('.')}`
                : '';
            return `${tag}${elemId}${classes}`;
          };

          results.push({
            selector: getSelector(el),
            html: el.outerHTML.substring(0, 500),
            placeholder: el.placeholder || null,
            ariaLabel: el.getAttribute('aria-label'),
            type: el.type,
          });
        }
      });

      return results;
    });

    for (const input of inputs) {
      const textToCheck = `${input.placeholder ?? ''} ${input.ariaLabel ?? ''}`;

      if (MM_DD_YYYY_PATTERN.test(textToCheck) || YYYY_MM_DD_PATTERN.test(textToCheck)) {
        violations.push(
          createIS17802Violation(
            'IS-004',
            'moderate',
            'Date input placeholder uses non-Indian date format. IS 17802 Rule IS-004 requires DD/MM/YYYY format for Indian users.',
            assetId,
            url,
            input.selector,
            input.html,
            'input',
          ),
        );
      }
    }
  } catch (err) {
    logger.warn({ err, url }, 'IS-004 checkDateInputFormat failed');
  }

  return violations;
}

/**
 * IS-005: Check CAPTCHA audio alternative.
 * CAPTCHA must provide an audio alternative.
 */
export async function checkCaptchaAudioAlternative(
  page: Page,
  url: string,
  assetId: string,
): Promise<RawViolation[]> {
  const violations: RawViolation[] = [];

  try {
    const captchaResults = await page.evaluate(() => {
      const results: Array<{
        selector: string;
        html: string;
        hasAudioAlternative: boolean;
      }> = [];

      const captchaKeywords = ['captcha', 'recaptcha', 'hcaptcha', 'challenge'];
      const audioKeywords = ['audio', 'listen', 'sound', 'speaker'];

      const findCaptchaElements = (): Element[] => {
        const elements: Element[] = [];

        document
          .querySelectorAll('[class*="captcha"], [id*="captcha"], [aria-label*="captcha"]')
          .forEach((el) => {
            elements.push(el);
          });

        document.querySelectorAll('iframe').forEach((iframe) => {
          const src = iframe.src?.toLowerCase() ?? '';
          if (captchaKeywords.some((kw) => src.includes(kw))) {
            elements.push(iframe);
          }
        });

        document.querySelectorAll('img').forEach((img) => {
          const alt = img.alt?.toLowerCase() ?? '';
          const src = img.src?.toLowerCase() ?? '';
          if (
            captchaKeywords.some((kw) => alt.includes(kw) || src.includes(kw)) ||
            alt.includes('security code') ||
            alt.includes('verification')
          ) {
            elements.push(img);
          }
        });

        return elements;
      };

      const hasAudioNearby = (element: Element): boolean => {
        const form = element.closest('form') ?? element.parentElement?.parentElement?.parentElement;
        if (!form) return false;

        const formHtml = form.innerHTML.toLowerCase();

        if (formHtml.includes('<audio')) return true;

        const links = form.querySelectorAll('a, button');
        for (const link of links) {
          const text = link.textContent?.toLowerCase() ?? '';
          const ariaLabel = link.getAttribute('aria-label')?.toLowerCase() ?? '';
          if (audioKeywords.some((kw) => text.includes(kw) || ariaLabel.includes(kw))) {
            return true;
          }
        }

        return false;
      };

      const getSelector = (el: Element): string => {
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const classes =
          el.className && typeof el.className === 'string'
            ? `.${el.className.split(' ').filter(Boolean).slice(0, 2).join('.')}`
            : '';
        return `${tag}${id}${classes}`;
      };

      const captchaElements = findCaptchaElements();

      for (const el of captchaElements) {
        results.push({
          selector: getSelector(el),
          html: el.outerHTML.substring(0, 500),
          hasAudioAlternative: hasAudioNearby(el),
        });
      }

      return results;
    });

    for (const captcha of captchaResults) {
      if (!captcha.hasAudioAlternative) {
        violations.push(
          createIS17802Violation(
            'IS-005',
            'critical',
            'CAPTCHA detected without audio alternative. IS 17802 Rule IS-005 requires audio CAPTCHAs for visually impaired users.',
            assetId,
            url,
            captcha.selector,
            captcha.html,
            'div',
          ),
        );
      }
    }
  } catch (err) {
    logger.warn({ err, url }, 'IS-005 checkCaptchaAudioAlternative failed');
  }

  return violations;
}

/**
 * IS-006: Check PDF accessible alternative.
 * PDF links must have an accessible HTML alternative linked nearby.
 */
export async function checkPdfAccessibleAlternative(
  page: Page,
  url: string,
  assetId: string,
): Promise<RawViolation[]> {
  const violations: RawViolation[] = [];

  try {
    const pdfResults = await page.evaluate(() => {
      const results: Array<{
        selector: string;
        html: string;
        hasAlternative: boolean;
      }> = [];

      const alternativeKeywords = [
        'html',
        'accessible',
        'web version',
        'screen reader',
        'text version',
      ];

      const getSelector = (el: Element): string => {
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const classes =
          el.className && typeof el.className === 'string'
            ? `.${el.className.split(' ').filter(Boolean).slice(0, 2).join('.')}`
            : '';
        return `${tag}${id}${classes}`;
      };

      const hasAlternativeNearby = (pdfLink: Element): boolean => {
        const parent = pdfLink.parentElement;
        if (!parent) return false;

        const siblings = parent.querySelectorAll('a');
        for (const sibling of siblings) {
          if (sibling === pdfLink) continue;
          const text = sibling.textContent?.toLowerCase() ?? '';
          const href = sibling.getAttribute('href')?.toLowerCase() ?? '';
          if (
            alternativeKeywords.some((kw) => text.includes(kw)) ||
            href.endsWith('.html') ||
            href.endsWith('.htm')
          ) {
            return true;
          }
        }

        const grandparent = parent.parentElement;
        if (grandparent) {
          const nearbyLinks = grandparent.querySelectorAll('a');
          for (const link of nearbyLinks) {
            if (link === pdfLink) continue;
            const text = link.textContent?.toLowerCase() ?? '';
            if (alternativeKeywords.some((kw) => text.includes(kw))) {
              return true;
            }
          }
        }

        return false;
      };

      document.querySelectorAll('a').forEach((link) => {
        const href = link.getAttribute('href') ?? '';
        const text = link.textContent?.toLowerCase() ?? '';

        const isPdfLink =
          href.toLowerCase().endsWith('.pdf') || text.includes('.pdf') || text.includes('pdf');

        if (isPdfLink) {
          results.push({
            selector: getSelector(link),
            html: link.outerHTML.substring(0, 500),
            hasAlternative: hasAlternativeNearby(link),
          });
        }
      });

      return results;
    });

    for (const pdf of pdfResults) {
      if (!pdf.hasAlternative) {
        violations.push(
          createIS17802Violation(
            'IS-006',
            'moderate',
            'PDF link found without accessible alternative. IS 17802 Rule IS-006 requires an HTML/accessible version alongside PDF downloads.',
            assetId,
            url,
            pdf.selector,
            pdf.html,
            'a',
          ),
        );
      }
    }
  } catch (err) {
    logger.warn({ err, url }, 'IS-006 checkPdfAccessibleAlternative failed');
  }

  return violations;
}

/**
 * Run all IS 17802 rules on a page.
 *
 * @param page - Playwright page instance
 * @param url - Page URL
 * @param assetId - Asset UUID for fingerprinting
 * @returns Array of violations found
 */
export async function runIS17802Rules(
  page: Page,
  url: string,
  assetId: string,
): Promise<RawViolation[]> {
  const [
    langViolations,
    devanagariViolations,
    formHelpViolations,
    dateFormatViolations,
    captchaViolations,
    pdfViolations,
  ] = await Promise.all([
    checkHtmlLanguage(page, url, assetId),
    checkDevanagariEncoding(page, url, assetId),
    checkFormHelpTextLanguage(page, url, assetId),
    checkDateInputFormat(page, url, assetId),
    checkCaptchaAudioAlternative(page, url, assetId),
    checkPdfAccessibleAlternative(page, url, assetId),
  ]);

  const allViolations = [
    ...langViolations,
    ...devanagariViolations,
    ...formHelpViolations,
    ...dateFormatViolations,
    ...captchaViolations,
    ...pdfViolations,
  ];

  logger.debug({ url, count: allViolations.length }, 'IS 17802 rules complete');

  return allViolations;
}
