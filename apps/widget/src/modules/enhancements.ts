import { t, type TranslationKey } from '../i18n';
import type { ColourBlindMode, Language, WidgetPreferences } from '../types/preferences';
import { bindBooleanToggles, switchRow, syncBooleanToggles, updateLabelText } from '../ui/controls';
import { injectStyle, removeStyle } from '../utils/inject-css';
import type { PreferencesManager } from '../utils/preferences';

type ExtraGroup = 'visual' | 'reading' | 'navigation' | 'media';

const CURSOR_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='%23000' stroke='%23fff' stroke-width='2' d='M4 2v22l6-6 4 10 4-1-4-10h8z'/%3E%3C/svg%3E\") 2 2";

const TOGGLE_MAP: Record<string, keyof WidgetPreferences> = {
  largeCursor: 'largeCursor',
  patternFills: 'patternFills',
  iconIndicators: 'iconIndicators',
  largeTargets: 'largeTargets',
  disableHoverOnly: 'disableHoverOnly',
  keyboardHighlights: 'keyboardHighlights',
  skipLinks: 'skipLinks',
  screenReaderOptimisation: 'screenReaderOptimisation',
  ariaEnhancement: 'ariaEnhancement',
  stopAnimations: 'stopAnimations',
  pauseAnimations: 'pauseAnimations',
  reduceMotion: 'reduceMotion',
  muteAutoplay: 'muteAutoplay',
};

/** CSS-class-driven settings that did not exist yet (cursor, targets, motion, colour-blind). */
export class EnhancementsModule {
  private lang: Language = 'en';
  private roots: Partial<Record<ExtraGroup, HTMLElement>> = {};
  private mediaObs: MutationObserver | null = null;
  private ariaApplied = false;

  constructor(private readonly prefs: PreferencesManager) {}

  renderInto(section: HTMLElement, group: ExtraGroup, lang: Language): void {
    this.lang = lang;
    const wrap = document.createElement('div');
    wrap.dataset.asExtras = group;
    wrap.innerHTML = this.groupHTML(group);
    section.appendChild(wrap);
    this.roots[group] = wrap;
    this.bindGroup(wrap, group);
    this.syncGroup(wrap, group, this.prefs.get());
  }

  apply(prefs: WidgetPreferences): void {
    this.applyLargeCursor(prefs.largeCursor);
    this.applyLargeTargets(prefs.largeTargets);
    this.applyDisableHover(prefs.disableHoverOnly);
    this.applyColourBlind(prefs.colourBlindMode);
    this.applyPatternIcons(prefs.patternFills, prefs.iconIndicators);
    this.applyTextSpacing(prefs.textSpacing);
    this.applyStopAnimations(prefs.stopAnimations);
    this.applyPauseAnimations(prefs.pauseAnimations);
    this.applyReduceMotion(prefs.reduceMotion);
    this.applyMuteAutoplay(prefs.muteAutoplay);
    this.applyScreenReader(prefs.screenReaderOptimisation);
    this.applyAriaEnhancement(prefs.ariaEnhancement);
  }

  reset(): void {
    removeStyle('large-cursor');
    removeStyle('large-targets');
    removeStyle('disable-hover');
    removeStyle('colour-blind');
    removeStyle('pattern-icons');
    removeStyle('text-spacing');
    removeStyle('stop-anim');
    removeStyle('pause-anim');
    removeStyle('reduce-motion');
    this.stopMediaObserver();
    this.restoreMedia();
    document.documentElement.classList.remove(
      'as-cb-deuteranopia',
      'as-cb-protanopia',
      'as-cb-tritanopia',
      'as-pattern-fills',
      'as-icon-indicators',
    );
    this.ariaApplied = false;
  }

  updateLabels(lang: Language): void {
    this.lang = lang;
    const prefs = this.prefs.get();
    (Object.keys(this.roots) as ExtraGroup[]).forEach((group) => {
      const root = this.roots[group];
      if (!root) return;
      this.relabel(root, group, lang);
      this.syncGroup(root, group, prefs);
    });
  }

  syncUI(prefs: WidgetPreferences): void {
    (Object.keys(this.roots) as ExtraGroup[]).forEach((group) => {
      const root = this.roots[group];
      if (root) this.syncGroup(root, group, prefs);
    });
  }

  private groupHTML(group: ExtraGroup): string {
    const l = this.lang;
    if (group === 'visual') {
      return (
        switchRow('largeCursor', 'largeCursor', l) +
        `<div class="as-control-group">
          <label class="as-label" for="as-cb-mode">${t('colourBlindMode', l)}</label>
          <select id="as-cb-mode" class="as-select" aria-label="${t('colourBlindMode', l)}">
            <option value="none">${t('colourBlindNone', l)}</option>
            <option value="deuteranopia">${t('colourBlindDeuteranopia', l)}</option>
            <option value="protanopia">${t('colourBlindProtanopia', l)}</option>
            <option value="tritanopia">${t('colourBlindTritanopia', l)}</option>
          </select>
        </div>` +
        switchRow('patternFills', 'patternFills', l) +
        switchRow('iconIndicators', 'iconIndicators', l)
      );
    }
    if (group === 'reading') {
      return `<div class="as-control-group">
        <span class="as-label" id="as-label-textSpacing">${t('textSpacing', l)}</span>
        <div class="as-btn-group" role="group" aria-labelledby="as-label-textSpacing">
          <button type="button" class="as-btn as-btn-segment" data-spacing="default">${t('textSpacingDefault', l)}</button>
          <button type="button" class="as-btn as-btn-segment" data-spacing="comfortable">${t('textSpacingComfortable', l)}</button>
        </div>
      </div>`;
    }
    if (group === 'navigation') {
      return (
        switchRow('largeTargets', 'largeTargets', l) +
        switchRow('disableHoverOnly', 'disableHoverOnly', l) +
        switchRow('keyboardHighlights', 'keyboardHighlights', l) +
        switchRow('skipLinks', 'skipLinks', l) +
        switchRow('screenReaderOptimisation', 'screenReaderOptimisation', l) +
        switchRow('ariaEnhancement', 'ariaEnhancement', l)
      );
    }
    return (
      `<h3 id="as-section-media" class="as-section-title">${t('sectionMedia', l)}</h3>` +
      switchRow('stopAnimations', 'stopAnimations', l) +
      switchRow('pauseAnimations', 'pauseAnimations', l) +
      switchRow('reduceMotion', 'reduceMotion', l) +
      switchRow('muteAutoplay', 'muteAutoplay', l)
    );
  }

  private bindGroup(root: HTMLElement, group: ExtraGroup): void {
    bindBooleanToggles(root, this.prefs, TOGGLE_MAP);

    if (group === 'visual') {
      root.querySelector('#as-cb-mode')?.addEventListener('change', (e) => {
        const value = (e.target as HTMLSelectElement).value as ColourBlindMode;
        this.prefs.update({ colourBlindMode: value });
      });
    }

    if (group === 'reading') {
      root.querySelectorAll('[data-spacing]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const spacing = (btn as HTMLElement).dataset.spacing as WidgetPreferences['textSpacing'];
          this.prefs.update({ textSpacing: spacing });
        });
      });
    }
  }

  private syncGroup(root: HTMLElement, group: ExtraGroup, prefs: WidgetPreferences): void {
    if (group === 'visual') {
      syncBooleanToggles(
        root,
        [
          ['largeCursor', prefs.largeCursor],
          ['patternFills', prefs.patternFills],
          ['iconIndicators', prefs.iconIndicators],
        ],
        this.lang,
      );
      const sel = root.querySelector('#as-cb-mode') as HTMLSelectElement | null;
      if (sel) sel.value = prefs.colourBlindMode;
    }
    if (group === 'reading') {
      root.querySelectorAll('[data-spacing]').forEach((btn) => {
        const on = (btn as HTMLElement).dataset.spacing === prefs.textSpacing;
        btn.classList.toggle('as-active', on);
        btn.setAttribute('aria-pressed', String(on));
      });
    }
    if (group === 'navigation') {
      syncBooleanToggles(
        root,
        [
          ['largeTargets', prefs.largeTargets],
          ['disableHoverOnly', prefs.disableHoverOnly],
          ['keyboardHighlights', prefs.keyboardHighlights],
          ['skipLinks', prefs.skipLinks],
          ['screenReaderOptimisation', prefs.screenReaderOptimisation],
          ['ariaEnhancement', prefs.ariaEnhancement],
        ],
        this.lang,
      );
    }
    if (group === 'media') {
      syncBooleanToggles(
        root,
        [
          ['stopAnimations', prefs.stopAnimations],
          ['pauseAnimations', prefs.pauseAnimations],
          ['reduceMotion', prefs.reduceMotion],
          ['muteAutoplay', prefs.muteAutoplay],
        ],
        this.lang,
      );
    }
  }

  private relabel(root: HTMLElement, group: ExtraGroup, lang: Language): void {
    const visual: Array<[string, TranslationKey]> = [
      ['as-label-largeCursor', 'largeCursor'],
      ['as-cb-mode', 'colourBlindMode'],
      ['as-label-patternFills', 'patternFills'],
      ['as-label-iconIndicators', 'iconIndicators'],
    ];
    const reading: Array<[string, TranslationKey]> = [['as-label-textSpacing', 'textSpacing']];
    const nav: Array<[string, TranslationKey]> = [
      ['as-label-largeTargets', 'largeTargets'],
      ['as-label-disableHoverOnly', 'disableHoverOnly'],
      ['as-label-keyboardHighlights', 'keyboardHighlights'],
      ['as-label-skipLinks', 'skipLinks'],
      ['as-label-screenReaderOptimisation', 'screenReaderOptimisation'],
      ['as-label-ariaEnhancement', 'ariaEnhancement'],
    ];
    const media: Array<[string, TranslationKey]> = [
      ['as-section-media', 'sectionMedia'],
      ['as-label-stopAnimations', 'stopAnimations'],
      ['as-label-pauseAnimations', 'pauseAnimations'],
      ['as-label-reduceMotion', 'reduceMotion'],
      ['as-label-muteAutoplay', 'muteAutoplay'],
    ];
    const map = { visual, reading, navigation: nav, media };
    updateLabelText(root, lang, map[group]);

    if (group === 'visual') {
      const sel = root.querySelector('#as-cb-mode');
      if (sel) {
        const keys: TranslationKey[] = [
          'colourBlindNone',
          'colourBlindDeuteranopia',
          'colourBlindProtanopia',
          'colourBlindTritanopia',
        ];
        sel.querySelectorAll('option').forEach((opt, i) => {
          const k = keys[i];
          if (k) opt.textContent = t(k, lang);
        });
      }
    }
    if (group === 'reading') {
      root.querySelectorAll('[data-spacing]').forEach((btn) => {
        const k =
          (btn as HTMLElement).dataset.spacing === 'comfortable'
            ? 'textSpacingComfortable'
            : 'textSpacingDefault';
        btn.textContent = t(k, lang);
      });
    }
  }

  private applyLargeCursor(on: boolean): void {
    if (on) {
      injectStyle('large-cursor', `html, html * { cursor: ${CURSOR_SVG}, auto !important; }`);
    } else {
      removeStyle('large-cursor');
    }
  }

  private applyLargeTargets(on: boolean): void {
    if (on) {
      injectStyle(
        'large-targets',
        `html.as-large-targets a, html.as-large-targets button, html.as-large-targets [role="button"], html.as-large-targets input, html.as-large-targets select, html.as-large-targets textarea { min-width: 44px !important; min-height: 44px !important; }`,
      );
      document.documentElement.classList.add('as-large-targets');
    } else {
      document.documentElement.classList.remove('as-large-targets');
      removeStyle('large-targets');
    }
  }

  private applyDisableHover(on: boolean): void {
    if (on) {
      injectStyle(
        'disable-hover',
        `html.as-disable-hover li:focus-within > ul,
         html.as-disable-hover [class*="menu"]:focus-within,
         html.as-disable-hover [class*="dropdown"]:focus-within,
         html.as-disable-hover [class*="Dropdown"]:focus-within {
           display: block !important; visibility: visible !important;
           opacity: 1 !important; pointer-events: auto !important;
         }`,
      );
      document.documentElement.classList.add('as-disable-hover');
    } else {
      document.documentElement.classList.remove('as-disable-hover');
      removeStyle('disable-hover');
    }
  }

  private applyColourBlind(mode: ColourBlindMode): void {
    document.documentElement.classList.remove(
      'as-cb-deuteranopia',
      'as-cb-protanopia',
      'as-cb-tritanopia',
    );
    if (mode === 'none') {
      removeStyle('colour-blind');
      return;
    }
    // Daltonize-ish: boost contrast/saturation and hue-shift reds vs greens.
    // Not a clinical simulation — it makes remaining cues easier to tell apart.
    const filters: Record<Exclude<ColourBlindMode, 'none'>, string> = {
      deuteranopia: 'contrast(1.2) saturate(1.4) hue-rotate(14deg)',
      protanopia: 'contrast(1.2) saturate(1.4) hue-rotate(-14deg)',
      tritanopia: 'contrast(1.25) saturate(1.35) hue-rotate(200deg)',
    };
    const cls = `as-cb-${mode}`;
    document.documentElement.classList.add(cls);
    injectStyle('colour-blind', `html.${cls} { filter: ${filters[mode]} !important; }`);
  }

  private applyPatternIcons(patterns: boolean, icons: boolean): void {
    document.documentElement.classList.toggle('as-pattern-fills', patterns);
    document.documentElement.classList.toggle('as-icon-indicators', icons);
    if (!patterns && !icons) {
      removeStyle('pattern-icons');
      return;
    }
    // Heuristic only: many Indian BFSI/e-commerce pages mark P&L with these class names.
    // Not a semantic guarantee — best-effort visual cue for colour-blind users.
    const gain = '.positive,.up,.gain,.profit,.success';
    const loss = '.negative,.down,.loss,.danger,.error';
    const parts: string[] = [];
    if (patterns) {
      parts.push(
        `html.as-pattern-fills ${gain} { background-image: repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(0,0,0,.15) 2px,rgba(0,0,0,.15) 4px) !important; }`,
        `html.as-pattern-fills ${loss} { background-image: repeating-linear-gradient(-45deg,transparent,transparent 2px,rgba(0,0,0,.15) 2px,rgba(0,0,0,.15) 4px) !important; }`,
      );
    }
    if (icons) {
      parts.push(
        `html.as-icon-indicators ${gain}::after { content: ' ▲'; font-size: .75em; }`,
        `html.as-icon-indicators ${loss}::after { content: ' ▼'; font-size: .75em; }`,
      );
    }
    injectStyle('pattern-icons', parts.join(''));
  }

  private applyTextSpacing(spacing: WidgetPreferences['textSpacing']): void {
    if (spacing === 'comfortable') {
      injectStyle(
        'text-spacing',
        `html.as-text-spacing, html.as-text-spacing * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }`,
      );
      document.documentElement.classList.add('as-text-spacing');
    } else {
      document.documentElement.classList.remove('as-text-spacing');
      removeStyle('text-spacing');
    }
  }

  private applyStopAnimations(on: boolean): void {
    if (on) {
      injectStyle(
        'stop-anim',
        `html.as-stop-anim *, html.as-stop-anim *::before, html.as-stop-anim *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }`,
      );
      document.documentElement.classList.add('as-stop-anim');
      this.pauseAutoplayMedia(true);
    } else {
      document.documentElement.classList.remove('as-stop-anim');
      removeStyle('stop-anim');
    }
  }

  private applyPauseAnimations(on: boolean): void {
    if (on) {
      injectStyle(
        'pause-anim',
        `html.as-pause-anim *, html.as-pause-anim *::before, html.as-pause-anim *::after { animation-play-state: paused !important; }`,
      );
      document.documentElement.classList.add('as-pause-anim');
    } else {
      document.documentElement.classList.remove('as-pause-anim');
      removeStyle('pause-anim');
    }
  }

  private applyReduceMotion(on: boolean): void {
    if (on) {
      injectStyle(
        'reduce-motion',
        `html.as-reduce-motion *, html.as-reduce-motion *::before, html.as-reduce-motion *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }`,
      );
      document.documentElement.classList.add('as-reduce-motion');
    } else {
      document.documentElement.classList.remove('as-reduce-motion');
      removeStyle('reduce-motion');
    }
  }

  private applyMuteAutoplay(on: boolean): void {
    this.stopMediaObserver();
    if (!on) return;
    this.muteAutoplayNow();
    this.mediaObs = new MutationObserver(() => this.muteAutoplayNow());
    this.mediaObs.observe(document.documentElement, { childList: true, subtree: true });
  }

  private muteAutoplayNow(): void {
    document.querySelectorAll('video[autoplay], audio[autoplay]').forEach((el) => {
      const media = el as HTMLMediaElement;
      media.muted = true;
      media.defaultMuted = true;
    });
  }

  private pauseAutoplayMedia(pause: boolean): void {
    document.querySelectorAll('video[autoplay]').forEach((el) => {
      const media = el as HTMLMediaElement;
      if (pause) void media.pause();
    });
    document.querySelectorAll('marquee').forEach((el) => {
      const m = el as HTMLElement & { stop?: () => void };
      if (pause && typeof m.stop === 'function') m.stop();
    });
  }

  private stopMediaObserver(): void {
    this.mediaObs?.disconnect();
    this.mediaObs = null;
  }

  private restoreMedia(): void {
    this.pauseAutoplayMedia(false);
  }

  private applyScreenReader(on: boolean): void {
    if (!on) return;
    const html = document.documentElement;
    if (!html.lang) html.lang = 'en';
    let main = document.getElementById('main-content');
    if (!main) {
      main = document.querySelector('main') ?? document.querySelector('[role="main"]');
      if (main && !main.id) main.id = 'main-content';
    }
  }

  private applyAriaEnhancement(on: boolean): void {
    if (!on || this.ariaApplied) return;
    this.ariaApplied = true;
    document.querySelectorAll('button, a, [role="button"]').forEach((el) => {
      if (el.getAttribute('aria-label') || (el.textContent ?? '').trim()) return;
      const title = el.getAttribute('title');
      const alt = el.querySelector('img[alt]')?.getAttribute('alt');
      const label = title || alt;
      if (label) el.setAttribute('aria-label', label);
    });
  }
}

/** Apply CSS-only extras before widget paint (avoids flash) */
export function applyEarlyEnhancements(prefs: Partial<WidgetPreferences>): void {
  if (prefs.largeCursor) {
    injectStyle('large-cursor', `html, html * { cursor: ${CURSOR_SVG}, auto !important; }`);
  }
  if (prefs.largeTargets) {
    document.documentElement.classList.add('as-large-targets');
    injectStyle(
      'large-targets',
      `html.as-large-targets a, html.as-large-targets button, html.as-large-targets [role="button"] { min-width:44px !important; min-height:44px !important; }`,
    );
  }
  if (prefs.stopAnimations) {
    document.documentElement.classList.add('as-stop-anim');
    injectStyle(
      'stop-anim',
      `html.as-stop-anim *, html.as-stop-anim *::before, html.as-stop-anim *::after { animation: none !important; transition: none !important; }`,
    );
  }
}
