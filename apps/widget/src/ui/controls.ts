import { t, type TranslationKey } from '../i18n';
import type { Language, WidgetPreferences } from '../types/preferences';
import type { PreferencesManager } from '../utils/preferences';

export function switchRow(id: string, key: TranslationKey, lang: Language): string {
  return `<div class="as-control-row">
    <span class="as-label" id="as-label-${id}">${t(key, lang)}</span>
    <button type="button" class="as-switch" role="switch" aria-checked="false"
      aria-labelledby="as-label-${id}" data-toggle="${id}" id="as-toggle-${id}">
      <span class="as-switch-track"><span class="as-switch-thumb"></span></span>
      <span class="as-switch-text">${t('off', lang)}</span>
    </button>
  </div>`;
}

export function bindBooleanToggles(
  container: HTMLElement,
  prefs: PreferencesManager,
  map: Record<string, keyof WidgetPreferences>,
): void {
  container.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = (btn as HTMLElement).dataset.toggle;
      if (!key) return;
      const prefKey = map[key];
      if (!prefKey) return;
      const current = prefs.get();
      prefs.update({ [prefKey]: !current[prefKey] });
    });
  });
}

export function syncBooleanToggles(
  container: HTMLElement,
  values: Array<[string, boolean]>,
  lang: Language,
): void {
  for (const [id, checked] of values) {
    const btn = container.querySelector(`#as-toggle-${id}`);
    if (!btn) continue;
    btn.setAttribute('aria-checked', String(checked));
    btn.classList.toggle('as-checked', checked);
    const text = btn.querySelector('.as-switch-text');
    if (text) text.textContent = t(checked ? 'on' : 'off', lang);
  }
}

export function updateLabelText(
  container: HTMLElement,
  lang: Language,
  keys: Array<[string, TranslationKey]>,
): void {
  for (const [id, key] of keys) {
    const el = container.querySelector(`#${id}`);
    if (!el) continue;
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
      el.setAttribute('aria-label', t(key, lang));
    } else {
      el.textContent = t(key, lang);
    }
  }
}
