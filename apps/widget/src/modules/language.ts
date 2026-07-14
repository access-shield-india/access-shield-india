import { t } from '../i18n';
import type { Language, WidgetPreferences } from '../types/preferences';
import type { PreferencesManager } from '../utils/preferences';

export type LanguageChangeCallback = (lang: Language) => void;

/** Language selection module — EN / HI toggle */
export class LanguageModule {
  private container: HTMLElement | null = null;
  private lang: Language = 'en';
  private onLangChange: LanguageChangeCallback | null = null;

  constructor(private readonly prefs: PreferencesManager) {}

  render(parent: HTMLElement, lang: Language, onChange?: LanguageChangeCallback): void {
    this.lang = lang;
    this.onLangChange = onChange ?? null;
    this.container = document.createElement('section');
    this.container.className = 'as-section';
    this.container.setAttribute('aria-labelledby', 'as-section-language');
    this.container.innerHTML = this.buildHTML();
    parent.appendChild(this.container);
    this.bindEvents();
    this.syncUI(this.prefs.get());
  }

  updateLabels(lang: Language): void {
    this.lang = lang;
    if (!this.container) return;
    this.container.querySelector('h2')!.textContent = t('sectionLanguage', lang);
    const label = this.container.querySelector('#as-lang-label');
    if (label) label.textContent = t('language', lang);
    this.container.querySelectorAll('[data-lang]').forEach((btn) => {
      const code = (btn as HTMLElement).dataset.lang as Language;
      btn.textContent = t(code === 'en' ? 'langEn' : 'langHi', lang);
    });
    this.syncUI(this.prefs.get());
  }

  private buildHTML(): string {
    const l = this.lang;
    return `
      <h2 id="as-section-language" class="as-section-title">${t('sectionLanguage', l)}</h2>
      <div class="as-control-group">
        <span class="as-label" id="as-lang-label">${t('language', l)}</span>
        <div class="as-btn-group" role="group" aria-labelledby="as-lang-label">
          <button type="button" class="as-btn as-btn-segment" data-lang="en" aria-pressed="true">${t('langEn', l)}</button>
          <button type="button" class="as-btn as-btn-segment" data-lang="hi" aria-pressed="false">${t('langHi', l)}</button>
        </div>
      </div>`;
  }

  private bindEvents(): void {
    if (!this.container) return;

    this.container.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const code = (btn as HTMLElement).dataset.lang as Language;
        this.prefs.update({ language: code });
        this.onLangChange?.(code);
      });
    });
  }

  syncUI(prefs: WidgetPreferences): void {
    if (!this.container) return;

    this.container.querySelectorAll('[data-lang]').forEach((btn) => {
      const code = (btn as HTMLElement).dataset.lang;
      const pressed = code === prefs.language;
      btn.setAttribute('aria-pressed', String(pressed));
      btn.classList.toggle('as-active', pressed);
    });
  }
}
