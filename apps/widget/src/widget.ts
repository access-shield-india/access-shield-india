import { t } from './i18n';
import { LanguageModule } from './modules/language';
import { NavigationModule } from './modules/navigation';
import { ReadingModule } from './modules/reading';
import { SpeechModule } from './modules/speech';
import { VisualModule } from './modules/visual';
import widgetStyles from './styles/widget.css';
import type {
  Language,
  WidgetInitOptions,
  WidgetPosition,
  WidgetPreferences,
} from './types/preferences';
import { removeAllInjected } from './utils/inject-css';
import { PreferencesManager } from './utils/preferences';

const ACCESSIBILITY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <circle cx="12" cy="4" r="2" fill="currentColor"/>
  <path d="M12 7c-2.5 0-4.5 1.5-5.5 3.5L4 14h2.5l1-3h9l1 3H20l-2.5-3.5C16.5 8.5 14.5 7 12 7z" fill="currentColor"/>
  <path d="M8 16h8v5h-2v-3h-4v3H8v-5z" fill="currentColor"/>
</svg>`;

const POS_CLASS: Record<WidgetPosition, string> = {
  'bottom-right': 'as-pos-bottom-right',
  'bottom-left': 'as-pos-bottom-left',
  'top-right': 'as-pos-top-right',
  'top-left': 'as-pos-top-left',
};

/** Main AccessShield accessibility widget */
export class Widget {
  private readonly host: HTMLElement;
  private readonly shadow: ShadowRoot;
  private readonly prefs: PreferencesManager;
  private readonly options: WidgetInitOptions;
  private launcher: HTMLButtonElement | null = null;
  private panel: HTMLElement | null = null;
  private isOpen = false;
  private lang: Language;

  private visual: VisualModule;
  private reading: ReadingModule;
  private speech: SpeechModule;
  private navigation: NavigationModule;
  private language: LanguageModule;

  private escapeHandler: ((e: Event) => void) | null = null;
  private focusTrapHandler: ((e: Event) => void) | null = null;

  constructor(options: WidgetInitOptions, savedPrefs?: Partial<WidgetPreferences>) {
    this.options = options;
    this.lang = savedPrefs?.language ?? options.lang;
    this.prefs = new PreferencesManager(options.token, options.apiUrl, {
      ...savedPrefs,
      language: this.lang,
    });

    this.host = document.createElement('div');
    this.host.id = 'accessshield-widget';
    this.shadow = this.host.attachShadow({ mode: 'closed' });

    this.visual = new VisualModule(this.prefs);
    this.reading = new ReadingModule(this.prefs);
    this.speech = new SpeechModule(this.prefs);
    this.navigation = new NavigationModule(this.prefs);
    this.language = new LanguageModule(this.prefs);

    this.applyAllPreferences(this.prefs.get());
    this.prefs.onChange((prefs) => this.onPreferencesChange(prefs));

    this.render();
    document.body.appendChild(this.host);
  }

  private render(): void {
    const style = document.createElement('style');
    style.textContent = widgetStyles;
    this.shadow.appendChild(style);

    this.createLauncher();
    this.createPanel();
    this.bindGlobalKeys();
  }

  private createLauncher(): void {
    const btn = document.createElement('button');
    btn.className = `as-launcher ${POS_CLASS[this.options.position]}`;
    btn.type = 'button';
    btn.setAttribute('aria-label', t('launcherLabel', this.lang));
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'as-panel');
    btn.innerHTML = ACCESSIBILITY_ICON;

    btn.addEventListener('click', () => this.togglePanel());
    this.shadow.appendChild(btn);
    this.launcher = btn;
  }

  private createPanel(): void {
    const panel = document.createElement('div');
    panel.id = 'as-panel';
    panel.className = `as-panel ${POS_CLASS[this.options.position]}`;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'as-panel-title');
    panel.setAttribute('aria-hidden', 'true');
    panel.hidden = true;

    panel.innerHTML = `
      <header class="as-panel-header">
        <h1 id="as-panel-title" class="as-panel-title">${t('panelTitle', this.lang)}</h1>
        <button type="button" class="as-close-btn" aria-label="${t('closePanel', this.lang)}">&times;</button>
      </header>
      <div class="as-panel-content" id="as-panel-content"></div>
      <footer class="as-panel-footer">
        <button type="button" class="as-reset-btn" id="as-reset-btn">${t('resetAll', this.lang)}</button>
      </footer>`;

    const content = panel.querySelector('#as-panel-content') as HTMLElement;

    this.visual.render(content, this.lang);
    this.reading.render(content, this.lang);
    this.speech.render(content, this.lang);
    this.navigation.render(content, this.lang);
    this.language.render(content, this.lang, (lang) => this.onLanguageChange(lang));

    panel.querySelector('.as-close-btn')?.addEventListener('click', () => this.closePanel());
    panel.querySelector('#as-reset-btn')?.addEventListener('click', () => this.resetAll());

    this.shadow.appendChild(panel);
    this.panel = panel;
  }

  private togglePanel(): void {
    if (this.isOpen) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  private openPanel(): void {
    if (!this.panel || !this.launcher) return;
    this.isOpen = true;
    this.panel.hidden = false;
    this.panel.setAttribute('aria-hidden', 'false');
    this.panel.classList.add('as-open');
    this.launcher.setAttribute('aria-expanded', 'true');

    requestAnimationFrame(() => {
      const firstFocusable = this.getFocusableElements()[0];
      firstFocusable?.focus();
    });

    this.enableFocusTrap();
  }

  private closePanel(): void {
    if (!this.panel || !this.launcher) return;
    this.isOpen = false;
    this.panel.classList.remove('as-open');
    this.panel.setAttribute('aria-hidden', 'true');
    this.panel.hidden = true;
    this.launcher.setAttribute('aria-expanded', 'false');
    this.disableFocusTrap();
    this.launcher.focus();
  }

  private getFocusableElements(): HTMLElement[] {
    if (!this.panel) return [];
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(this.panel.querySelectorAll<HTMLElement>(selector)).filter(
      (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
    );
  }

  private enableFocusTrap(): void {
    this.focusTrapHandler = (e: Event) => {
      if (!(e instanceof KeyboardEvent) || e.key !== 'Tab' || !this.panel) return;
      const focusable = this.getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      // A11Y: use shadow activeElement — document.activeElement is the host when focus is inside closed shadow
      const active = this.shadow.activeElement as HTMLElement | null;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    this.shadow.addEventListener('keydown', this.focusTrapHandler);
  }

  private disableFocusTrap(): void {
    if (this.focusTrapHandler) {
      this.shadow.removeEventListener('keydown', this.focusTrapHandler);
      this.focusTrapHandler = null;
    }
  }

  private bindGlobalKeys(): void {
    this.escapeHandler = (e: Event) => {
      if (!(e instanceof KeyboardEvent) || e.key !== 'Escape' || !this.isOpen) return;
      e.stopPropagation();
      this.closePanel();
    };
    document.addEventListener('keydown', this.escapeHandler);
  }

  private onPreferencesChange(prefs: WidgetPreferences): void {
    this.applyAllPreferences(prefs);
    this.visual.syncUI(prefs);
    this.reading.syncUI(prefs);
    this.speech.syncUI(prefs);
    this.navigation.syncUI(prefs);
    this.language.syncUI(prefs);
  }

  private applyAllPreferences(prefs: WidgetPreferences): void {
    this.visual.apply(prefs);
    this.reading.apply(prefs);
    this.speech.apply(prefs);
    this.navigation.apply(prefs);
  }

  private onLanguageChange(lang: Language): void {
    this.lang = lang;
    this.updateAllLabels(lang);
    if (this.launcher) {
      this.launcher.setAttribute('aria-label', t('launcherLabel', lang));
    }
    if (this.panel) {
      const title = this.panel.querySelector('#as-panel-title');
      if (title) title.textContent = t('panelTitle', lang);
      const closeBtn = this.panel.querySelector('.as-close-btn');
      if (closeBtn) closeBtn.setAttribute('aria-label', t('closePanel', lang));
      const resetBtn = this.panel.querySelector('#as-reset-btn');
      if (resetBtn) resetBtn.textContent = t('resetAll', lang);
    }
  }

  private updateAllLabels(lang: Language): void {
    this.visual.updateLabels(lang);
    this.reading.updateLabels(lang);
    this.speech.updateLabels(lang);
    this.navigation.updateLabels(lang);
    this.language.updateLabels(lang);
  }

  private resetAll(): void {
    this.prefs.resetAll();
    this.visual.reset();
    this.reading.reset();
    this.speech.reset();
    this.navigation.reset();
    removeAllInjected();
    this.applyAllPreferences(this.prefs.get());
    this.visual.syncUI(this.prefs.get());
    this.reading.syncUI(this.prefs.get());
    this.speech.syncUI(this.prefs.get());
    this.navigation.syncUI(this.prefs.get());
    this.language.syncUI(this.prefs.get());
  }

  destroy(): void {
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
    }
    this.disableFocusTrap();
    this.visual.reset();
    this.reading.reset();
    this.speech.reset();
    this.navigation.reset();
    removeAllInjected();
    this.host.remove();
    this.launcher = null;
    this.panel = null;
  }
}
