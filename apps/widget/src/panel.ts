import { SHIPPED_LANGUAGES, t, type TranslationKey } from './i18n';
import { getProfile, isProfileCustomized, PROFILES } from './profiles';
import type { Language, WidgetPosition, WidgetPreferences } from './types/preferences';
import type { PreferencesManager } from './utils/preferences';

const POS_CLASS: Record<WidgetPosition, string> = {
  'bottom-right': 'as-pos-bottom-right',
  'bottom-left': 'as-pos-bottom-left',
  'middle-right': 'as-pos-middle-right',
  'top-right': 'as-pos-top-right',
  'top-left': 'as-pos-top-left',
};

export interface PanelCallbacks {
  onClose: () => void;
  onReset: () => void;
  onLanguage: (lang: Language) => void;
  onProfileToggle: (id: string) => void;
}

/** Shadow-DOM panel: profiles first, individual settings behind a disclosure */
export class Panel {
  readonly el: HTMLElement;
  private lang: Language;
  private allSettingsOpen = false;

  constructor(
    private readonly prefs: PreferencesManager,
    position: WidgetPosition,
    lang: Language,
    private readonly callbacks: PanelCallbacks,
  ) {
    this.lang = lang;
    this.el = document.createElement('div');
    this.el.id = 'as-panel';
    this.el.className = `as-panel ${POS_CLASS[position]}`;
    this.el.tabIndex = -1;
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'false');
    this.el.setAttribute('lang', lang);
    this.el.setAttribute('aria-label', t('panelTitle', lang));
    this.el.setAttribute('aria-labelledby', 'as-panel-title');
    this.el.setAttribute('aria-hidden', 'true');
    this.el.hidden = true;
    this.el.innerHTML = this.buildHTML();
    this.bind();
    this.sync(prefs.get());
  }

  getAllSettingsContainer(): HTMLElement {
    return this.el.querySelector('#as-all-settings') as HTMLElement;
  }

  setOpen(open: boolean): void {
    this.el.hidden = !open;
    this.el.setAttribute('aria-hidden', String(!open));
    this.el.classList.toggle('as-open', open);
    if (open) {
      const first = this.el.querySelector<HTMLElement>('[data-profile]');
      (first ?? this.el).focus();
    }
  }

  setHighContrast(on: boolean): void {
    this.el.classList.toggle('as-panel-hc', on);
  }

  announce(message: string): void {
    const live = this.el.querySelector('#as-live');
    if (live) live.textContent = message;
  }

  sync(prefs: WidgetPreferences): void {
    this.setHighContrast(prefs.highContrast);
    const { activeProfile } = this.prefs.getProfileState();
    const snapshot = this.prefs.getProfileState().preProfileSnapshot;
    const custom = isProfileCustomized(prefs, activeProfile, snapshot);

    this.el.querySelectorAll<HTMLButtonElement>('[data-profile]').forEach((btn) => {
      const on = btn.dataset.profile === activeProfile;
      btn.setAttribute('aria-checked', String(on));
      btn.classList.toggle('as-checked', on);
    });

    const status = this.el.querySelector('#as-profile-status');
    if (status) {
      if (activeProfile && custom) {
        const name = t((getProfile(activeProfile)?.labelKey ?? '') as TranslationKey, this.lang);
        status.textContent = t('customBasedOn', this.lang, { name });
      } else {
        status.textContent = '';
      }
    }

    const langSel = this.el.querySelector('#as-lang-select') as HTMLSelectElement | null;
    if (langSel) langSel.value = prefs.language;
  }

  updateLabels(lang: Language): void {
    this.lang = lang;
    this.el.setAttribute('lang', lang);
    this.el.setAttribute('aria-label', t('panelTitle', lang));
    const title = this.el.querySelector('#as-panel-title');
    if (title) title.textContent = t('panelTitle', lang);
    this.el.querySelector('.as-close-btn')?.setAttribute('aria-label', t('closePanel', lang));
    const reset = this.el.querySelector('#as-reset-btn');
    if (reset) reset.textContent = t('resetAll', lang);
    const heading = this.el.querySelector('#as-profiles-heading');
    if (heading) heading.textContent = t('profilesHeading', lang);
    const disc = this.el.querySelector('#as-all-settings-btn .as-disclosure-label');
    if (disc) disc.textContent = t('allSettings', lang);
    const statement = this.el.querySelector('#as-statement-link');
    if (statement) statement.textContent = t('statementLink', lang);
    const powered = this.el.querySelector('#as-powered-link');
    if (powered) powered.textContent = t('poweredBy', lang);
    const langSel = this.el.querySelector('#as-lang-select');
    langSel?.setAttribute('aria-label', t('langSelect', lang));
    const langLabel = this.el.querySelector('#as-lang-select-label');
    if (langLabel) langLabel.textContent = t('langSelect', lang);

    this.el.querySelectorAll<HTMLButtonElement>('[data-profile]').forEach((btn) => {
      const profile = getProfile(btn.dataset.profile ?? '');
      if (!profile) return;
      const label = t(profile.labelKey as TranslationKey, lang);
      const desc = t(profile.descriptionKey as TranslationKey, lang);
      const labelEl = btn.querySelector('.as-profile-label');
      if (labelEl) labelEl.textContent = label;
      btn.setAttribute('aria-label', `${label}. ${desc}`);
    });

    this.sync(this.prefs.get());
  }

  private buildHTML(): string {
    const l = this.lang;
    const cards = PROFILES.map((p) => {
      const label = t(p.labelKey as TranslationKey, l);
      const desc = t(p.descriptionKey as TranslationKey, l);
      return `<button type="button" class="as-profile-card" role="switch" aria-checked="false"
        data-profile="${p.id}" aria-label="${label}. ${desc}">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="24" height="24">
          <path d="${p.icon}" fill="currentColor"/>
        </svg>
        <span class="as-profile-label">${label}</span>
      </button>`;
    }).join('');

    return `
      <header class="as-panel-header">
        <h1 id="as-panel-title" class="as-panel-title">${t('panelTitle', l)}</h1>
        <div class="as-header-actions">
          <label id="as-lang-select-label" class="as-sr-only" for="as-lang-select">${t('langSelect', l)}</label>
          <select id="as-lang-select" class="as-lang-select" aria-label="${t('langSelect', l)}">
            ${SHIPPED_LANGUAGES.map(
              (opt) =>
                `<option value="${opt.code}"${opt.code === l ? ' selected' : ''}>${opt.nativeLabel}</option>`,
            ).join('')}
          </select>
          <button type="button" class="as-header-btn" id="as-reset-btn">${t('resetAll', l)}</button>
          <button type="button" class="as-close-btn" aria-label="${t('closePanel', l)}">&times;</button>
        </div>
      </header>
      <div class="as-panel-content" id="as-panel-content">
        <div id="as-live" class="as-sr-only" aria-live="polite" aria-atomic="true"></div>
        <section class="as-section" aria-labelledby="as-profiles-heading">
          <h2 id="as-profiles-heading" class="as-section-title">${t('profilesHeading', l)}</h2>
          <div class="as-profile-grid">${cards}</div>
          <p id="as-profile-status" class="as-profile-status"></p>
        </section>
        <button type="button" class="as-disclosure" id="as-all-settings-btn"
          aria-expanded="false" aria-controls="as-all-settings">
          <span class="as-disclosure-icon" aria-hidden="true">▸</span>
          <span class="as-disclosure-label">${t('allSettings', l)}</span>
        </button>
        <div id="as-all-settings" class="as-all-settings" hidden></div>
      </div>
      <footer class="as-panel-footer">
        <a id="as-statement-link" class="as-footer-link" href="https://accessshield.in/accessibility-statement"
          target="_blank" rel="noopener noreferrer">${t('statementLink', l)}</a>
        <span aria-hidden="true"> · </span>
        <a id="as-powered-link" class="as-footer-link" href="https://accessshield.in"
          target="_blank" rel="noopener noreferrer">${t('poweredBy', l)}</a>
      </footer>`;
  }

  private bind(): void {
    this.el
      .querySelector('.as-close-btn')
      ?.addEventListener('click', () => this.callbacks.onClose());
    this.el
      .querySelector('#as-reset-btn')
      ?.addEventListener('click', () => this.callbacks.onReset());

    this.el.querySelector('#as-lang-select')?.addEventListener('change', (e) => {
      const lang = (e.target as HTMLSelectElement).value as Language;
      this.callbacks.onLanguage(lang);
    });

    this.el.querySelectorAll<HTMLButtonElement>('[data-profile]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.profile;
        if (id) this.callbacks.onProfileToggle(id);
      });
    });

    this.el.querySelector('#as-all-settings-btn')?.addEventListener('click', () => {
      this.allSettingsOpen = !this.allSettingsOpen;
      const btn = this.el.querySelector('#as-all-settings-btn') as HTMLButtonElement;
      const panel = this.el.querySelector('#as-all-settings') as HTMLElement;
      btn.setAttribute('aria-expanded', String(this.allSettingsOpen));
      panel.hidden = !this.allSettingsOpen;
      btn.classList.toggle('as-open', this.allSettingsOpen);
    });
  }
}

export { POS_CLASS };
