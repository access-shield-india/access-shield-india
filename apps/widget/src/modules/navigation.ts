import { t, type TranslationKey } from '../i18n';
import type { Language, WidgetPreferences } from '../types/preferences';
import type { PreferencesManager } from '../utils/preferences';
import { injectElement, injectStyle, removeElement, removeStyle } from '../utils/inject-css';

/** Navigation assistance module — keyboard mode, skip link, focus tracker */
export class NavigationModule {
  private container: HTMLElement | null = null;
  private lang: Language = 'en';
  private focusHandler: (() => void) | null = null;
  private trackerEl: HTMLElement | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(private readonly prefs: PreferencesManager) {}

  render(parent: HTMLElement, lang: Language): void {
    this.lang = lang;
    this.container = document.createElement('section');
    this.container.className = 'as-section';
    this.container.setAttribute('aria-labelledby', 'as-section-navigation');
    this.container.innerHTML = this.buildHTML();
    parent.appendChild(this.container);
    this.bindEvents();
    this.syncUI(this.prefs.get());
  }

  apply(prefs: WidgetPreferences): void {
    this.applyKeyboardNavMode(prefs.keyboardNavMode);
    this.applySkipNavigation(prefs.skipNavigation);
    this.applyFocusTracker(prefs.focusTracker);
  }

  reset(): void {
    this.stopKeyboardNavMode();
    this.removeSkipLink();
    this.stopFocusTracker();
  }

  updateLabels(lang: Language): void {
    this.lang = lang;
    if (!this.container) return;
    this.container.querySelector('h2')!.textContent = t('sectionNavigation', lang);
    this.updateText(this.container, lang);
  }

  private buildHTML(): string {
    const l = this.lang;
    return `
      <h2 id="as-section-navigation" class="as-section-title">${t('sectionNavigation', l)}</h2>
      ${this.switchRow('keyboardNavMode', 'keyboardNavMode')}
      <div class="as-control-row">
        <button type="button" class="as-btn as-btn-action" id="as-skip-nav-btn">${t('skipNavigation', l)}</button>
      </div>
      ${this.switchRow('focusTracker', 'focusTracker')}`;
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

    this.container.querySelector('#as-skip-nav-btn')?.addEventListener('click', () => {
      this.activateSkipLink();
    });

    this.container.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.toggle!;
        const map: Record<string, keyof WidgetPreferences> = {
          keyboardNavMode: 'keyboardNavMode',
          focusTracker: 'focusTracker',
        };
        const prefKey = map[key];
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
      ['keyboardNavMode', prefs.keyboardNavMode],
      ['focusTracker', prefs.focusTracker],
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
      ['as-label-keyboardNavMode', 'keyboardNavMode'],
      ['as-label-focusTracker', 'focusTracker'],
    ];
    for (const [id, key] of keys) {
      const el = container.querySelector(`#${id}`);
      if (el) el.textContent = t(key, lang);
    }
    const skipBtn = container.querySelector('#as-skip-nav-btn');
    if (skipBtn) skipBtn.textContent = t('skipNavigation', lang);
    this.syncUI(this.prefs.get());
  }

  private applyKeyboardNavMode(enabled: boolean): void {
    if (enabled) {
      injectStyle(
        'keyboard-nav',
        `
        *:focus, *:focus-visible {
          outline: 3px solid #1A56A0 !important;
          outline-offset: 2px !important;
        }
        [accesskey]::after {
          content: ' [' attr(accesskey) ']';
          font-size: 0.75rem;
          color: #1A56A0;
          font-weight: bold;
        }`,
      );

      this.keyHandler = (e: KeyboardEvent) => {
        if (e.altKey && e.key === '1') this.activateSkipLink();
      };
      document.addEventListener('keydown', this.keyHandler);
    } else {
      this.stopKeyboardNavMode();
    }
  }

  private stopKeyboardNavMode(): void {
    removeStyle('keyboard-nav');
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }

  private applySkipNavigation(enabled: boolean): void {
    if (enabled) {
      this.ensureSkipLink();
    } else {
      this.removeSkipLink();
    }
  }

  private ensureSkipLink(): void {
    let skip = document.getElementById('skip-to-content') as HTMLAnchorElement | null;
    if (!skip) {
      skip = document.createElement('a');
      skip.id = 'skip-to-content';
      skip.href = '#main-content';
      skip.setAttribute('data-accessshield', 'true');
      skip.textContent = t('skipNavigation', this.lang);
      Object.assign(skip.style, {
        position: 'absolute',
        left: '-9999px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      });
      skip.addEventListener('focus', () => {
        Object.assign(skip!.style, {
          position: 'fixed',
          top: '8px',
          left: '8px',
          width: 'auto',
          height: 'auto',
          overflow: 'visible',
          zIndex: '100000',
          padding: '12px 16px',
          background: '#1A56A0',
          color: '#fff',
          borderRadius: '6px',
          fontWeight: '600',
          textDecoration: 'none',
        });
      });
      skip.addEventListener('blur', () => {
        Object.assign(skip!.style, {
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        });
      });
      document.body.prepend(skip);
    }

    let main = document.getElementById('main-content');
    if (!main) {
      main = document.querySelector('main') ?? document.querySelector('[role="main"]');
      if (main && !main.id) main.id = 'main-content';
    }
  }

  private activateSkipLink(): void {
    this.prefs.update({ skipNavigation: true });
    this.ensureSkipLink();
    const skip = document.getElementById('skip-to-content');
    skip?.focus();
    const target = document.getElementById('main-content');
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
    }
  }

  private removeSkipLink(): void {
    document.getElementById('skip-to-content')?.remove();
  }

  private applyFocusTracker(enabled: boolean): void {
    if (enabled) {
      this.trackerEl = injectElement('focus-tracker', 'div') as HTMLElement;
      Object.assign(this.trackerEl.style, {
        position: 'fixed',
        width: '4px',
        height: '4px',
        backgroundColor: '#E07B00',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: '99991',
        transition: 'top 0.1s, left 0.1s',
        boxShadow: '0 0 8px 2px rgba(224, 123, 0, 0.6)',
        display: 'none',
      });
      this.trackerEl.setAttribute('aria-hidden', 'true');

      this.focusHandler = () => {
        const el = document.activeElement;
        if (!el || !this.trackerEl || el === document.body) {
          if (this.trackerEl) this.trackerEl.style.display = 'none';
          return;
        }
        const rect = el.getBoundingClientRect();
        this.trackerEl.style.display = 'block';
        this.trackerEl.style.top = `${rect.top + rect.height / 2 - 2}px`;
        this.trackerEl.style.left = `${rect.left + rect.width / 2 - 2}px`;
      };

      document.addEventListener('focusin', this.focusHandler);
      this.focusHandler();
    } else {
      this.stopFocusTracker();
    }
  }

  private stopFocusTracker(): void {
    if (this.focusHandler) {
      document.removeEventListener('focusin', this.focusHandler);
      this.focusHandler = null;
    }
    removeElement('focus-tracker');
    this.trackerEl = null;
  }
}
