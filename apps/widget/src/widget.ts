import { loadLocale, t, type TranslationKey } from './i18n';
import { EnhancementsModule } from './modules/enhancements';
import { NavigationModule } from './modules/navigation';
import { ReadingModule } from './modules/reading';
import { SpeechModule } from './modules/speech';
import { VisualModule } from './modules/visual';
import { Panel, POS_CLASS } from './panel';
import widgetStyles from './styles/widget.css';
import type {
  Language,
  ProfilePersistState,
  WidgetInitOptions,
  WidgetPreferences,
} from './types/preferences';
import { getAssetUrl } from './utils/asset-url';
import { removeAllInjected } from './utils/inject-css';
import { PreferencesManager } from './utils/preferences';

type AnalyticsEventType =
  'panel_open' | 'profile_on' | 'profile_off' | 'setting_on' | 'language_switch';

interface WidgetAnalyticsHandle {
  track: (type: AnalyticsEventType, feature?: string) => void;
  destroy: () => void;
}

interface AnalyticsGlobal {
  init: (token: string, apiUrl: string) => WidgetAnalyticsHandle;
}

const ACCESSIBILITY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <circle cx="12" cy="4" r="2" fill="currentColor"/>
  <path d="M12 7c-2.5 0-4.5 1.5-5.5 3.5L4 14h2.5l1-3h9l1 3H20l-2.5-3.5C16.5 8.5 14.5 7 12 7z" fill="currentColor"/>
  <path d="M8 16h8v5h-2v-3h-4v3H8v-5z" fill="currentColor"/>
</svg>`;

/** Main AccessShield accessibility widget */
export class Widget {
  private readonly host: HTMLElement;
  private readonly shadow: ShadowRoot;
  private readonly prefs: PreferencesManager;
  private readonly options: WidgetInitOptions;
  private launcher: HTMLButtonElement | null = null;
  private panel: Panel | null = null;
  private isOpen = false;
  private lang: Language;
  private analytics: WidgetAnalyticsHandle | null = null;
  private analyticsLoading = false;
  private pendingTracks: Array<{ type: AnalyticsEventType; feature?: string }> = [];

  private visual: VisualModule;
  private reading: ReadingModule;
  private speech: SpeechModule;
  private navigation: NavigationModule;
  private enhancements: EnhancementsModule;

  private escapeHandler: ((e: Event) => void) | null = null;

  constructor(
    options: WidgetInitOptions,
    savedPrefs?: Partial<WidgetPreferences>,
    profileState?: ProfilePersistState,
  ) {
    this.options = options;
    this.lang = savedPrefs?.language ?? options.lang;
    this.prefs = new PreferencesManager(options.token, options.apiUrl, {
      ...savedPrefs,
      language: this.lang,
    });
    if (profileState) this.prefs.restoreProfileMeta(profileState);

    this.host = document.createElement('div');
    this.host.id = 'accessshield-widget';
    this.shadow = this.host.attachShadow({ mode: 'closed' });

    this.visual = new VisualModule(this.prefs);
    this.reading = new ReadingModule(this.prefs);
    this.speech = new SpeechModule(this.prefs);
    this.navigation = new NavigationModule(this.prefs);
    this.enhancements = new EnhancementsModule(this.prefs);

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
    const panel = new Panel(this.prefs, this.options.position, this.lang, {
      onClose: () => this.closePanel(),
      onReset: () => this.resetAll(),
      onLanguage: (lang) => void this.onLanguageChange(lang),
      onProfileToggle: (id) => this.onProfileToggle(id),
    });

    const extras = panel.getAllSettingsContainer();
    const visualEl = this.visual.render(extras, this.lang);
    this.enhancements.renderInto(visualEl, 'visual', this.lang);
    const readingEl = this.reading.render(extras, this.lang);
    this.enhancements.renderInto(readingEl, 'reading', this.lang);
    const navEl = this.navigation.render(extras, this.lang);
    this.enhancements.renderInto(navEl, 'navigation', this.lang);

    const mediaSec = document.createElement('section');
    mediaSec.className = 'as-section';
    mediaSec.setAttribute('aria-labelledby', 'as-section-media');
    extras.appendChild(mediaSec);
    this.enhancements.renderInto(mediaSec, 'media', this.lang);
    this.speech.render(extras, this.lang);

    this.shadow.appendChild(panel.el);
    this.panel = panel;
  }

  private togglePanel(): void {
    if (this.isOpen) this.closePanel();
    else this.openPanel();
  }

  private openPanel(): void {
    if (!this.panel || !this.launcher) return;
    this.isOpen = true;
    this.panel.setOpen(true);
    this.launcher.setAttribute('aria-expanded', 'true');
    void this.ensureAnalytics();
    this.track('panel_open');
  }

  private closePanel(): void {
    if (!this.panel || !this.launcher) return;
    this.isOpen = false;
    this.panel.setOpen(false);
    this.launcher.setAttribute('aria-expanded', 'false');
    this.launcher.focus();
  }

  private bindGlobalKeys(): void {
    this.escapeHandler = (e: Event) => {
      if (!(e instanceof KeyboardEvent) || e.key !== 'Escape' || !this.isOpen) return;
      e.stopPropagation();
      this.closePanel();
    };
    document.addEventListener('keydown', this.escapeHandler);
  }

  private onProfileToggle(id: string): void {
    const result = this.prefs.toggleProfile(id);
    if (!result.profile || !this.panel) return;
    const name = t(result.profile.labelKey as TranslationKey, this.lang);
    const msg = result.turnedOn
      ? t('profileOn', this.lang, { name, count: String(result.count) })
      : t('profileOff', this.lang, { name });
    this.panel.announce(msg);
    this.track(result.turnedOn ? 'profile_on' : 'profile_off', id);
  }

  private onPreferencesChange(prefs: WidgetPreferences): void {
    this.applyAllPreferences(prefs);
    this.visual.syncUI(prefs);
    this.reading.syncUI(prefs);
    this.speech.syncUI(prefs);
    this.navigation.syncUI(prefs);
    this.enhancements.syncUI(prefs);
    this.panel?.sync(prefs);
  }

  private applyAllPreferences(prefs: WidgetPreferences): void {
    this.visual.apply(prefs);
    this.reading.apply(prefs);
    this.speech.apply(prefs);
    this.navigation.apply(prefs);
    this.enhancements.apply(prefs);
  }

  private async onLanguageChange(lang: Language): Promise<void> {
    await loadLocale(lang);
    this.lang = lang;
    this.prefs.update({ language: lang });
    this.updateAllLabels(lang);
    if (this.launcher) {
      this.launcher.setAttribute('aria-label', t('launcherLabel', lang));
    }
    this.panel?.updateLabels(lang);
    this.track('language_switch', lang);
  }

  private updateAllLabels(lang: Language): void {
    this.visual.updateLabels(lang);
    this.reading.updateLabels(lang);
    this.speech.updateLabels(lang);
    this.navigation.updateLabels(lang);
    this.enhancements.updateLabels(lang);
  }

  private resetAll(): void {
    this.visual.reset();
    this.reading.reset();
    this.speech.reset();
    this.navigation.reset();
    this.enhancements.reset();
    removeAllInjected();
    this.prefs.resetAll();
    this.lang = this.prefs.get().language;
    this.updateAllLabels(this.lang);
    this.panel?.updateLabels(this.lang);
    if (this.launcher) {
      this.launcher.setAttribute('aria-label', t('launcherLabel', this.lang));
    }
  }

  destroy(): void {
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
    }
    this.visual.reset();
    this.reading.reset();
    this.speech.reset();
    this.navigation.reset();
    this.enhancements.reset();
    removeAllInjected();
    this.host.remove();
    this.launcher = null;
    this.panel = null;
    this.analytics?.destroy();
    this.analytics = null;
  }

  private track(type: AnalyticsEventType, feature?: string): void {
    try {
      if (this.analytics) {
        this.analytics.track(type, feature);
        return;
      }
      this.pendingTracks.push({ type, feature });
    } catch {
      // fail-silent
    }
  }

  private async ensureAnalytics(): Promise<void> {
    if (this.analytics || this.analyticsLoading) return;
    this.analyticsLoading = true;
    try {
      await loadScript(getAssetUrl('analytics.min.js'));
      const api = (window as unknown as { AccessShieldAnalytics?: AnalyticsGlobal })
        .AccessShieldAnalytics;
      if (!api?.init) return;
      this.analytics = api.init(this.options.token, this.options.apiUrl);
      this.prefs.setSettingOnTracker((id) => this.track('setting_on', id));
      for (const event of this.pendingTracks) {
        this.analytics.track(event.type, event.feature);
      }
      this.pendingTracks = [];
    } catch {
      // fail-silent — widget keeps working
    } finally {
      this.analyticsLoading = false;
    }
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load analytics'));
    document.head.appendChild(script);
  });
}
