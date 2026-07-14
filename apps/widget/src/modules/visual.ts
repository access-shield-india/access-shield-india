import { t, type TranslationKey } from '../i18n';
import type { FontSize, Language, WidgetPreferences } from '../types/preferences';
import type { PreferencesManager } from '../utils/preferences';
import { injectStyle, removeStyle } from '../utils/inject-css';

const DYSLEXIA_FONT_FACE = `
@font-face {
  font-family: 'OpenDyslexic';
  src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/open-dyslexic-regular.woff') format('woff');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}`;

const FONT_SIZE_MAP: Record<FontSize, string> = {
  sm: '87.5%',
  default: '100%',
  lg: '125%',
};

const DARK_MODE_CSS = `
.as-dark-mode {
  color-scheme: dark !important;
}
@media (prefers-color-scheme: light), (prefers-color-scheme: no-preference) {
  .as-dark-mode, .as-dark-mode body {
    background-color: #1a1a2e !important;
    color: #f9fafb !important;
  }
  .as-dark-mode a { color: #93c5fd !important; }
  .as-dark-mode *:not([data-accessshield]) {
    border-color: #6b7280 !important;
  }
}`;

const LIGHT_MODE_CSS = `
.as-light-mode, .as-light-mode body {
  background-color: #ffffff !important;
  color: #1a1a2e !important;
  color-scheme: light !important;
}`;

const HIGH_CONTRAST_CSS = `
html {
  --as-hc-bg: #000000;
  --as-hc-fg: #ffffff;
  --as-hc-link: #ffff00;
}
html, html body {
  background-color: var(--as-hc-bg) !important;
  color: var(--as-hc-fg) !important;
}
html a { color: var(--as-hc-link) !important; text-decoration: underline !important; }
html button, html input, html select, html textarea {
  border: 2px solid var(--as-hc-fg) !important;
}`;

/** Apply saved visual prefs before widget render to prevent flash of unstyled content */
export function applyEarlyVisualPreferences(prefs: Partial<WidgetPreferences>): void {
  if (prefs.fontSize) {
    injectStyle('font-size', `html { font-size: ${FONT_SIZE_MAP[prefs.fontSize]} !important; }`);
  }
  if (prefs.dyslexiaFont) {
    injectStyle(
      'dyslexia',
      `${DYSLEXIA_FONT_FACE} html, html * { font-family: 'OpenDyslexic', sans-serif !important; }`,
    );
  }
  if (prefs.darkMode) {
    document.documentElement.classList.add('as-dark-mode');
    injectStyle('dark-mode', DARK_MODE_CSS);
  }
  if (prefs.lightMode) {
    document.documentElement.classList.add('as-light-mode');
    injectStyle('light-mode', LIGHT_MODE_CSS);
  }
  if (prefs.highContrast) {
    injectStyle('high-contrast', HIGH_CONTRAST_CSS);
  }
  const parts: string[] = [];
  if (prefs.negativeContrast) parts.push('invert(1)', 'hue-rotate(180deg)');
  if (prefs.grayscale) parts.push('grayscale(100%)');
  if (prefs.saturation !== undefined && prefs.saturation !== 100) {
    parts.push(`saturate(${prefs.saturation}%)`);
  }
  if (parts.length > 0) {
    injectStyle('filters', `html { filter: ${parts.join(' ')} !important; }`);
  }
}

/** Visual adjustment module — font, contrast, colour filters */
export class VisualModule {
  private container: HTMLElement | null = null;
  private lang: Language = 'en';

  constructor(private readonly prefs: PreferencesManager) {}

  render(parent: HTMLElement, lang: Language): void {
    this.lang = lang;
    this.container = document.createElement('section');
    this.container.className = 'as-section';
    this.container.setAttribute('aria-labelledby', 'as-section-visual');
    this.container.innerHTML = this.buildHTML();
    parent.appendChild(this.container);
    this.bindEvents();
    this.syncUI(this.prefs.get());
  }

  apply(prefs: WidgetPreferences): void {
    this.applyFontSize(prefs.fontSize);
    this.applyDyslexiaFont(prefs.dyslexiaFont);
    this.applyDarkMode(prefs.darkMode);
    this.applyLightMode(prefs.lightMode);
    this.applyHighContrast(prefs.highContrast);
    this.applyCombinedFilters(prefs);
  }

  reset(): void {
    removeStyle('font-size');
    removeStyle('dyslexia');
    removeStyle('dark-mode');
    removeStyle('light-mode');
    removeStyle('high-contrast');
    removeStyle('filters');
    document.documentElement.classList.remove('as-dark-mode', 'as-light-mode');
  }

  updateLabels(lang: Language): void {
    this.lang = lang;
    if (!this.container) return;
    this.container.querySelector('h2')!.textContent = t('sectionVisual', lang);
    this.updateText(this.container, lang);
  }

  private buildHTML(): string {
    const l = this.lang;
    return `
      <h2 id="as-section-visual" class="as-section-title">${t('sectionVisual', l)}</h2>
      <div class="as-control-group">
        <span class="as-label" id="as-font-size-label">${t('fontSize', l)}</span>
        <div class="as-btn-group" role="group" aria-labelledby="as-font-size-label">
          <button type="button" class="as-btn as-btn-segment" data-font="sm" aria-pressed="false">${t('fontSizeSm', l)}</button>
          <button type="button" class="as-btn as-btn-segment" data-font="default" aria-pressed="true">${t('fontSizeDefault', l)}</button>
          <button type="button" class="as-btn as-btn-segment" data-font="lg" aria-pressed="false">${t('fontSizeLg', l)}</button>
        </div>
      </div>
      ${this.switchRow('dyslexiaFont', 'dyslexiaFont')}
      ${this.switchRow('darkMode', 'darkMode')}
      ${this.switchRow('lightMode', 'lightMode')}
      ${this.switchRow('highContrast', 'highContrast')}
      ${this.switchRow('negativeContrast', 'negativeContrast')}
      ${this.switchRow('grayscale', 'grayscale')}
      <div class="as-control-group">
        <label class="as-label" for="as-saturation">${t('saturation', l)}</label>
        <input type="range" id="as-saturation" class="as-slider" min="0" max="200" value="100"
          aria-valuemin="0" aria-valuemax="200" aria-valuenow="100"
          aria-label="${t('saturation', l)}" />
        <span class="as-slider-value" id="as-saturation-value" aria-live="polite">${t('saturationValue', l, { value: '100' })}</span>
      </div>`;
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

    this.container.querySelectorAll('[data-font]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const size = (btn as HTMLElement).dataset.font as FontSize;
        this.prefs.update({ fontSize: size });
      });
    });

    this.container.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.toggle!;
        const current = this.prefs.get();
        const map: Record<string, keyof WidgetPreferences> = {
          dyslexiaFont: 'dyslexiaFont',
          darkMode: 'darkMode',
          lightMode: 'lightMode',
          highContrast: 'highContrast',
          negativeContrast: 'negativeContrast',
          grayscale: 'grayscale',
        };
        const prefKey = map[key];
        if (prefKey) {
          this.prefs.update({ [prefKey]: !current[prefKey] });
        }
      });
    });

    const slider = this.container.querySelector('#as-saturation') as HTMLInputElement;
    slider?.addEventListener('input', () => {
      const val = parseInt(slider.value, 10);
      slider.setAttribute('aria-valuenow', String(val));
      this.prefs.update({ saturation: val });
    });
  }

  syncUI(prefs: WidgetPreferences): void {
    if (!this.container) return;

    this.container.querySelectorAll('[data-font]').forEach((btn) => {
      const size = (btn as HTMLElement).dataset.font;
      const pressed = size === prefs.fontSize;
      btn.setAttribute('aria-pressed', String(pressed));
      btn.classList.toggle('as-active', pressed);
    });

    const toggles: Array<[string, boolean]> = [
      ['dyslexiaFont', prefs.dyslexiaFont],
      ['darkMode', prefs.darkMode],
      ['lightMode', prefs.lightMode],
      ['highContrast', prefs.highContrast],
      ['negativeContrast', prefs.negativeContrast],
      ['grayscale', prefs.grayscale],
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

    const slider = this.container.querySelector('#as-saturation') as HTMLInputElement;
    const valueEl = this.container.querySelector('#as-saturation-value');
    if (slider) {
      slider.value = String(prefs.saturation);
      slider.setAttribute('aria-valuenow', String(prefs.saturation));
    }
    if (valueEl) {
      valueEl.textContent = t('saturationValue', this.lang, { value: String(prefs.saturation) });
    }
  }

  private updateText(container: HTMLElement, lang: Language): void {
    const keys: Array<[string, TranslationKey]> = [
      ['as-font-size-label', 'fontSize'],
      ['as-label-dyslexiaFont', 'dyslexiaFont'],
      ['as-label-darkMode', 'darkMode'],
      ['as-label-lightMode', 'lightMode'],
      ['as-label-highContrast', 'highContrast'],
      ['as-label-negativeContrast', 'negativeContrast'],
      ['as-label-grayscale', 'grayscale'],
      ['as-saturation', 'saturation'],
    ];
    for (const [id, key] of keys) {
      const el = container.querySelector(`#${id}`);
      if (el) {
        if (el.tagName === 'INPUT') el.setAttribute('aria-label', t(key, lang));
        else el.textContent = t(key, lang);
      }
    }
    container.querySelectorAll('[data-font]').forEach((btn, i) => {
      const keys2: TranslationKey[] = ['fontSizeSm', 'fontSizeDefault', 'fontSizeLg'];
      btn.textContent = t(keys2[i]!, lang);
    });
    this.syncUI(this.prefs.get());
  }

  private applyFontSize(size: FontSize): void {
    injectStyle('font-size', `html { font-size: ${FONT_SIZE_MAP[size]} !important; }`);
  }

  private applyDyslexiaFont(enabled: boolean): void {
    if (enabled) {
      injectStyle(
        'dyslexia',
        `${DYSLEXIA_FONT_FACE} html, html * { font-family: 'OpenDyslexic', sans-serif !important; }`,
      );
    } else {
      removeStyle('dyslexia');
    }
  }

  private applyDarkMode(enabled: boolean): void {
    if (enabled) {
      document.documentElement.classList.add('as-dark-mode');
      injectStyle('dark-mode', DARK_MODE_CSS);
    } else {
      document.documentElement.classList.remove('as-dark-mode');
      removeStyle('dark-mode');
    }
  }

  private applyLightMode(enabled: boolean): void {
    if (enabled) {
      document.documentElement.classList.add('as-light-mode');
      injectStyle('light-mode', LIGHT_MODE_CSS);
    } else {
      document.documentElement.classList.remove('as-light-mode');
      removeStyle('light-mode');
    }
  }

  private applyHighContrast(enabled: boolean): void {
    if (enabled) {
      injectStyle('high-contrast', HIGH_CONTRAST_CSS);
    } else {
      removeStyle('high-contrast');
    }
  }

  /** Combine grayscale, saturation, and negative contrast into one filter rule */
  private applyCombinedFilters(prefs: WidgetPreferences): void {
    const parts: string[] = [];
    if (prefs.negativeContrast) parts.push('invert(1)', 'hue-rotate(180deg)');
    if (prefs.grayscale) parts.push('grayscale(100%)');
    if (prefs.saturation !== 100) parts.push(`saturate(${prefs.saturation}%)`);

    if (parts.length > 0) {
      const filter = parts.join(' ');
      const imgRevert = prefs.negativeContrast
        ? 'html img, html video, html picture { filter: invert(1) hue-rotate(180deg) !important; }'
        : '';
      injectStyle('filters', `html { filter: ${filter} !important; } ${imgRevert}`);
    } else {
      removeStyle('filters');
    }
  }
}
