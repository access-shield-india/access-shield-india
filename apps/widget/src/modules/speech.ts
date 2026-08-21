import { t, type TranslationKey } from '../i18n';
import type { Language, WidgetPreferences } from '../types/preferences';
import {
  extractPageText,
  extractSelectionText,
  isSpeechSupported,
  primeSpeechUnlock,
  READABLE_NON_INTERACTIVE_SELECTOR,
  readableBlockFromTarget,
  speakText,
  stopSpeaking,
  warmUpSpeechVoices,
} from '../utils/speech';
import type { PreferencesManager } from '../utils/preferences';
import { injectStyle, removeStyle } from '../utils/inject-css';

const SPEECH_RATES = {
  slow: 0.75,
  normal: 1,
  fast: 1.25,
} as const;

type SpeechRateKey = keyof typeof SPEECH_RATES;

const HOVER_DEBOUNCE_MS = 300;

/** Text-to-speech module — read aloud for visual / reading disabilities */
export class SpeechModule {
  private container: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private lang: Language = 'en';
  private hoverHandler: ((e: MouseEvent) => void) | null = null;
  private leaveHandler: ((e: MouseEvent) => void) | null = null;
  private focusHandler: ((e: FocusEvent) => void) | null = null;
  private tapHandler: ((e: MouseEvent) => void) | null = null;
  private hoverDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private highlightEl: HTMLElement | null = null;
  private lastReadBlock: HTMLElement | null = null;

  constructor(private readonly prefs: PreferencesManager) {
    warmUpSpeechVoices();
  }

  render(parent: HTMLElement, lang: Language): void {
    this.lang = lang;
    this.container = document.createElement('section');
    this.container.className = 'as-section';
    this.container.setAttribute('aria-labelledby', 'as-section-speech');
    this.container.innerHTML = this.buildHTML();
    parent.appendChild(this.container);
    this.statusEl = this.container.querySelector('#as-speech-status');
    this.bindEvents();
    this.syncUI(this.prefs.get());
  }

  apply(prefs: WidgetPreferences): void {
    this.applyHoverToRead(prefs.textToSpeech);
  }

  reset(): void {
    stopSpeaking();
    this.clearHighlight();
    this.stopHoverToRead();
    this.setStatus('');
  }

  updateLabels(lang: Language): void {
    this.lang = lang;
    if (!this.container) return;
    this.container.querySelector('h3')!.textContent = t('sectionSpeech', lang);
    this.updateText(this.container, lang);
  }

  syncUI(prefs: WidgetPreferences): void {
    if (!this.container) return;

    const toggle = this.container.querySelector('#as-toggle-textToSpeech');
    if (toggle) {
      toggle.setAttribute('aria-checked', String(prefs.textToSpeech));
      toggle.classList.toggle('as-checked', prefs.textToSpeech);
      const text = toggle.querySelector('.as-switch-text');
      if (text) text.textContent = t(prefs.textToSpeech ? 'on' : 'off', this.lang);
    }

    const rateKeys: SpeechRateKey[] = ['slow', 'normal', 'fast'];
    for (const key of rateKeys) {
      const btn = this.container.querySelector(`#as-rate-${key}`);
      const active = prefs.speechRate === SPEECH_RATES[key];
      btn?.classList.toggle('as-active', active);
      btn?.setAttribute('aria-pressed', String(active));
    }

    const unsupported = this.container.querySelector(
      '#as-speech-unsupported',
    ) as HTMLElement | null;
    if (unsupported) {
      unsupported.hidden = isSpeechSupported();
    }
  }

  private buildHTML(): string {
    const l = this.lang;
    const supported = isSpeechSupported();

    return `
      <h3 id="as-section-speech" class="as-section-title">${t('sectionSpeech', l)}</h3>
      <p id="as-speech-unsupported" class="as-hint" ${supported ? 'hidden' : ''} role="alert">
        ${t('speechUnsupported', l)}
      </p>
      ${this.switchRow('textToSpeech', 'readOnHover')}
      <p id="as-read-on-hover-hint" class="as-hint">${t('readOnHoverHint', l)}</p>
      <div class="as-control-group" role="group" aria-labelledby="as-label-speechRate">
        <span class="as-label" id="as-label-speechRate">${t('speechRate', l)}</span>
        <div class="as-btn-group as-btn-group-wrap">
          ${this.rateBtn('slow', 'speechSlow')}
          ${this.rateBtn('normal', 'speechNormal')}
          ${this.rateBtn('fast', 'speechFast')}
        </div>
      </div>
      <div class="as-speech-actions" role="group" aria-label="${t('speechActions', l)}">
        <button type="button" class="as-btn as-btn-action" id="as-read-selection">${t('readSelection', l)}</button>
        <button type="button" class="as-btn as-btn-action" id="as-read-page">${t('readPage', l)}</button>
        <button type="button" class="as-btn as-btn-action as-btn-stop" id="as-stop-speech">${t('stopSpeech', l)}</button>
      </div>
      <p id="as-speech-status" class="as-speech-status" role="status" aria-live="polite" aria-atomic="true"></p>`;
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

  private rateBtn(key: SpeechRateKey, labelKey: TranslationKey): string {
    return `<button type="button" class="as-btn as-btn-segment" id="as-rate-${key}"
      aria-pressed="false" data-rate="${key}">${t(labelKey, this.lang)}</button>`;
  }

  private bindEvents(): void {
    if (!this.container) return;

    this.container.querySelector('#as-toggle-textToSpeech')?.addEventListener('click', () => {
      const current = this.prefs.get();
      const next = !current.textToSpeech;
      if (next) {
        primeSpeechUnlock(current.language);
      }
      this.prefs.update({ textToSpeech: next });
    });

    this.container.querySelectorAll('[data-rate]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.rate as SpeechRateKey;
        if (key in SPEECH_RATES) {
          this.prefs.update({ speechRate: SPEECH_RATES[key] });
        }
      });
    });

    this.container.querySelector('#as-read-selection')?.addEventListener('click', () => {
      this.readSelection();
    });

    this.container.querySelector('#as-read-page')?.addEventListener('click', () => {
      this.readPage();
    });

    this.container.querySelector('#as-stop-speech')?.addEventListener('click', () => {
      this.stop();
    });
  }

  private readSelection(): void {
    primeSpeechUnlock(this.prefs.get().language);
    const text = extractSelectionText();
    if (!text) {
      this.setStatus(t('speechNoSelection', this.lang));
      return;
    }
    this.speak(text);
  }

  private readPage(): void {
    primeSpeechUnlock(this.prefs.get().language);
    const text = extractPageText();
    if (!text) {
      this.setStatus(t('speechNoContent', this.lang));
      return;
    }
    this.speak(text.slice(0, 8000));
  }

  private speak(text: string, highlightTarget?: HTMLElement, fromHover = false): void {
    const prefs = this.prefs.get();
    this.clearHighlight();

    if (highlightTarget) {
      this.highlightEl = highlightTarget;
      this.lastReadBlock = highlightTarget;
      highlightTarget.classList.add('as-tts-reading');
    }

    let speechStarted = false;
    const startTimeout = window.setTimeout(() => {
      if (!speechStarted) {
        this.clearHighlight();
        this.lastReadBlock = null;
        this.setStatus(t('speechUnlockHint', this.lang));
      }
    }, 600);

    const started = speakText(
      text,
      { lang: prefs.language, rate: prefs.speechRate, needsUnlock: fromHover },
      () => {
        window.clearTimeout(startTimeout);
        this.clearHighlight();
        this.lastReadBlock = null;
        this.setStatus(t('speechFinished', this.lang));
      },
      () => {
        window.clearTimeout(startTimeout);
        this.clearHighlight();
        this.lastReadBlock = null;
        this.setStatus(t('speechUnlockHint', this.lang));
      },
      () => {
        speechStarted = true;
        window.clearTimeout(startTimeout);
        this.setStatus(t('speechSpeaking', this.lang));
      },
    );

    if (!started) {
      window.clearTimeout(startTimeout);
      if (fromHover) {
        this.setStatus(t('speechUnlockHint', this.lang));
      } else {
        this.setStatus(t('speechUnsupported', this.lang));
      }
    }
  }

  private stop(): void {
    stopSpeaking();
    this.clearHighlight();
    this.lastReadBlock = null;
    this.setStatus(t('speechStopped', this.lang));
  }

  private setStatus(message: string): void {
    if (this.statusEl) this.statusEl.textContent = message;
  }

  private clearHoverDebounce(): void {
    if (this.hoverDebounceTimer) {
      clearTimeout(this.hoverDebounceTimer);
      this.hoverDebounceTimer = null;
    }
  }

  private queueRead(block: HTMLElement, fromHover = true): void {
    if (this.lastReadBlock === block) return;

    const text = block.innerText.replace(/\s+/g, ' ').trim();
    if (!text) return;

    this.speak(text, block, fromHover);
  }

  private applyHoverToRead(enabled: boolean): void {
    this.stopHoverToRead();

    if (!enabled) return;

    injectStyle(
      'tts-hover',
      `
        ${READABLE_NON_INTERACTIVE_SELECTOR} {
          cursor: help !important;
        }
        .as-tts-reading {
          outline: 3px solid #6D28D9 !important;
          outline-offset: 4px !important;
          background-color: rgba(235, 243, 251, 0.85) !important;
        }`,
    );

    this.hoverHandler = (e: MouseEvent) => {
      const block = readableBlockFromTarget(e.target);
      if (!block) return;

      this.clearHoverDebounce();
      this.hoverDebounceTimer = setTimeout(() => {
        this.queueRead(block);
      }, HOVER_DEBOUNCE_MS);
    };

    this.leaveHandler = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;

      const from = readableBlockFromTarget(e.target);
      if (!from) return;

      const related = e.relatedTarget instanceof Element ? e.relatedTarget : null;
      if (related && from.contains(related)) return;

      this.clearHoverDebounce();
    };

    this.focusHandler = (e: FocusEvent) => {
      const block = readableBlockFromTarget(e.target);
      if (!block) return;

      this.clearHoverDebounce();
      this.hoverDebounceTimer = setTimeout(() => {
        this.queueRead(block);
      }, HOVER_DEBOUNCE_MS);
    };

    // Touch devices: tap paragraph text to read; links/buttons are untouched
    this.tapHandler = (e: MouseEvent) => {
      if (window.matchMedia('(hover: hover)').matches) return;

      const block = readableBlockFromTarget(e.target);
      if (!block) return;

      this.clearHoverDebounce();
      primeSpeechUnlock(this.prefs.get().language);
      this.queueRead(block, false);
    };

    document.addEventListener('mouseover', this.hoverHandler);
    document.addEventListener('mouseout', this.leaveHandler);
    document.addEventListener('focusin', this.focusHandler);
    document.addEventListener('click', this.tapHandler);
  }

  private stopHoverToRead(): void {
    removeStyle('tts-hover');
    removeStyle('tts-click');

    this.clearHoverDebounce();

    if (this.hoverHandler) {
      document.removeEventListener('mouseover', this.hoverHandler);
      this.hoverHandler = null;
    }
    if (this.leaveHandler) {
      document.removeEventListener('mouseout', this.leaveHandler);
      this.leaveHandler = null;
    }
    if (this.focusHandler) {
      document.removeEventListener('focusin', this.focusHandler);
      this.focusHandler = null;
    }
    if (this.tapHandler) {
      document.removeEventListener('click', this.tapHandler);
      this.tapHandler = null;
    }

    this.lastReadBlock = null;
    this.clearHighlight();
  }

  private clearHighlight(): void {
    if (this.highlightEl) {
      this.highlightEl.classList.remove('as-tts-reading');
      this.highlightEl = null;
    }
    document.querySelectorAll('.as-tts-reading').forEach((el) => {
      el.classList.remove('as-tts-reading');
    });
  }

  private updateText(container: HTMLElement, lang: Language): void {
    const keys: Array<[string, TranslationKey]> = [
      ['as-label-textToSpeech', 'readOnHover'],
      ['as-label-speechRate', 'speechRate'],
    ];
    for (const [id, key] of keys) {
      const el = container.querySelector(`#${id}`);
      if (el) el.textContent = t(key, lang);
    }

    const hint = container.querySelector('#as-read-on-hover-hint');
    if (hint) hint.textContent = t('readOnHoverHint', lang);

    const actionLabels: Array<[string, TranslationKey]> = [
      ['as-read-selection', 'readSelection'],
      ['as-read-page', 'readPage'],
      ['as-stop-speech', 'stopSpeech'],
    ];
    for (const [id, key] of actionLabels) {
      const el = container.querySelector(`#${id}`);
      if (el) el.textContent = t(key, lang);
    }

    const rateLabels: Array<[SpeechRateKey, TranslationKey]> = [
      ['slow', 'speechSlow'],
      ['normal', 'speechNormal'],
      ['fast', 'speechFast'],
    ];
    for (const [key, labelKey] of rateLabels) {
      const el = container.querySelector(`#as-rate-${key}`);
      if (el) el.textContent = t(labelKey, lang);
    }

    const unsupported = container.querySelector('#as-speech-unsupported');
    if (unsupported) unsupported.textContent = t('speechUnsupported', lang);

    this.syncUI(this.prefs.get());
  }
}
