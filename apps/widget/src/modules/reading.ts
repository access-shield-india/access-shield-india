import { t, type TranslationKey } from '../i18n';
import type { Language, WidgetPreferences } from '../types/preferences';
import type { PreferencesManager } from '../utils/preferences';
import { injectElement, injectStyle, removeElement, removeStyle } from '../utils/inject-css';

const GUIDE_HEIGHT = 3;
const MASK_OPACITY = 0.6;

/** Reading assistance module — guide line, mask, link/focus highlights */
export class ReadingModule {
  private container: HTMLElement | null = null;
  private lang: Language = 'en';
  private guideMouseHandler: ((e: MouseEvent) => void) | null = null;
  private maskMouseHandler: ((e: MouseEvent) => void) | null = null;
  private guideEl: HTMLElement | null = null;
  private maskTop: HTMLElement | null = null;
  private maskBottom: HTMLElement | null = null;

  constructor(private readonly prefs: PreferencesManager) {}

  render(parent: HTMLElement, lang: Language): void {
    this.lang = lang;
    this.container = document.createElement('section');
    this.container.className = 'as-section';
    this.container.setAttribute('aria-labelledby', 'as-section-reading');
    this.container.innerHTML = this.buildHTML();
    parent.appendChild(this.container);
    this.bindEvents();
    this.syncUI(this.prefs.get());
  }

  apply(prefs: WidgetPreferences): void {
    this.applyReadingGuide(prefs.readingGuide);
    this.applyReadingMask(prefs.readingMask);
    this.applyLinkHighlight(prefs.linkHighlight);
    this.applyFocusIndicator(prefs.focusIndicator);
  }

  reset(): void {
    this.stopReadingGuide();
    this.stopReadingMask();
    removeStyle('link-highlight');
    removeStyle('focus-indicator');
  }

  updateLabels(lang: Language): void {
    this.lang = lang;
    if (!this.container) return;
    this.container.querySelector('h2')!.textContent = t('sectionReading', lang);
    this.updateText(this.container, lang);
  }

  private buildHTML(): string {
    const l = this.lang;
    return `
      <h2 id="as-section-reading" class="as-section-title">${t('sectionReading', l)}</h2>
      ${this.switchRow('readingGuide', 'readingGuide')}
      ${this.switchRow('readingMask', 'readingMask')}
      ${this.switchRow('linkHighlight', 'linkHighlight')}
      ${this.switchRow('focusIndicator', 'focusIndicator')}`;
  }

  private switchRow(id: string, key: TranslationKey): string {
    const l = this.lang;
    return `
      <div class="as-control-row">
        <span class="as-label" id="as-label-${id}">${t(key, l)}</span>
        <button type="button" class="as-switch" role="switch" aria-checked="false"
          aria-labelledby="as-label-${id}" data-toggle="${id}" id="as-toggle-${id}">
          <span class="as-switch-track"><span class="as-switch-thumb"></span></span>
          <span class="as-switch-text">${t('off', l)}</span>
        </button>
      </div>`;
  }

  private bindEvents(): void {
    if (!this.container) return;

    const toggleMap: Record<string, keyof WidgetPreferences> = {
      readingGuide: 'readingGuide',
      readingMask: 'readingMask',
      linkHighlight: 'linkHighlight',
      focusIndicator: 'focusIndicator',
    };

    this.container.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.toggle!;
        const prefKey = toggleMap[key];
        if (prefKey) {
          const current = this.prefs.get();
          this.prefs.update({ [prefKey]: !current[prefKey] });
        }
      });
    });
  }

  syncUI(prefs: WidgetPreferences): void {
    if (!this.container) return;

    const toggles: Array<[string, boolean]> = [
      ['readingGuide', prefs.readingGuide],
      ['readingMask', prefs.readingMask],
      ['linkHighlight', prefs.linkHighlight],
      ['focusIndicator', prefs.focusIndicator],
    ];

    for (const [id, checked] of toggles) {
      const btn = this.container.querySelector(`#as-toggle-${id}`);
      if (btn) {
        btn.setAttribute('aria-checked', String(checked));
        btn.classList.toggle('as-checked', checked);
        const text = btn.querySelector('.as-switch-text');
        if (text) text.textContent = t(checked ? 'on' : 'off', this.lang);
      }
    }
  }

  private updateText(container: HTMLElement, lang: Language): void {
    const keys: Array<[string, TranslationKey]> = [
      ['as-label-readingGuide', 'readingGuide'],
      ['as-label-readingMask', 'readingMask'],
      ['as-label-linkHighlight', 'linkHighlight'],
      ['as-label-focusIndicator', 'focusIndicator'],
    ];
    for (const [id, key] of keys) {
      const el = container.querySelector(`#${id}`);
      if (el) el.textContent = t(key, lang);
    }
    this.syncUI(this.prefs.get());
  }

  private applyReadingGuide(enabled: boolean): void {
    if (enabled) {
      this.guideEl = injectElement('reading-guide', 'div') as HTMLElement;
      Object.assign(this.guideEl.style, {
        position: 'fixed',
        left: '0',
        width: '100%',
        height: `${GUIDE_HEIGHT}px`,
        backgroundColor: '#1A56A0',
        pointerEvents: 'none',
        zIndex: '99990',
        top: '0',
        transition: 'top 0.05s ease-out',
      });
      this.guideEl.setAttribute('aria-hidden', 'true');

      this.guideMouseHandler = (e: MouseEvent) => {
        if (this.guideEl) {
          this.guideEl.style.top = `${e.clientY - GUIDE_HEIGHT / 2}px`;
        }
      };
      document.addEventListener('mousemove', this.guideMouseHandler, { passive: true });
    } else {
      this.stopReadingGuide();
    }
  }

  private stopReadingGuide(): void {
    if (this.guideMouseHandler) {
      document.removeEventListener('mousemove', this.guideMouseHandler);
      this.guideMouseHandler = null;
    }
    removeElement('reading-guide');
    this.guideEl = null;
  }

  private applyReadingMask(enabled: boolean): void {
    if (enabled) {
      const sharedStyle: Partial<CSSStyleDeclaration> = {
        position: 'fixed',
        left: '0',
        width: '100%',
        backgroundColor: `rgba(0, 0, 0, ${MASK_OPACITY})`,
        pointerEvents: 'none',
        zIndex: '99989',
      };

      this.maskTop = injectElement('reading-mask-top', 'div') as HTMLElement;
      Object.assign(this.maskTop.style, { ...sharedStyle, top: '0', height: '0' });
      this.maskTop.setAttribute('aria-hidden', 'true');

      this.maskBottom = injectElement('reading-mask-bottom', 'div') as HTMLElement;
      Object.assign(this.maskBottom.style, { ...sharedStyle, bottom: '0', height: '0' });
      this.maskBottom.setAttribute('aria-hidden', 'true');

      const maskHandler = (e: MouseEvent) => {
        const y = e.clientY;
        const gap = 40;
        if (this.maskTop) {
          this.maskTop.style.height = `${Math.max(0, y - gap / 2)}px`;
        }
        if (this.maskBottom) {
          this.maskBottom.style.height = `${Math.max(0, window.innerHeight - y - gap / 2)}px`;
        }
      };

      this.maskMouseHandler = maskHandler;
      document.addEventListener('mousemove', maskHandler, { passive: true });
    } else {
      this.stopReadingMask();
    }
  }

  private stopReadingMask(): void {
    if (this.maskMouseHandler) {
      document.removeEventListener('mousemove', this.maskMouseHandler);
      this.maskMouseHandler = null;
    }
    removeElement('reading-mask-top');
    removeElement('reading-mask-bottom');
    this.maskTop = null;
    this.maskBottom = null;
  }

  private applyLinkHighlight(enabled: boolean): void {
    if (enabled) {
      injectStyle(
        'link-highlight',
        `
        a, a:visited {
          outline: 3px solid #E07B00 !important;
          outline-offset: 2px !important;
          background-color: rgba(254, 243, 226, 0.5) !important;
        }`,
      );
    } else {
      removeStyle('link-highlight');
    }
  }

  private applyFocusIndicator(enabled: boolean): void {
    if (enabled) {
      injectStyle(
        'focus-indicator',
        `
        *:focus-visible {
          outline: 3px solid #1A56A0 !important;
          outline-offset: 3px !important;
          box-shadow: 0 0 0 6px rgba(26, 86, 160, 0.3) !important;
        }`,
      );
    } else {
      removeStyle('focus-indicator');
    }
  }
}
