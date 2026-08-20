import { toggleProfile } from '../profiles';
import {
  DEFAULT_PREFERENCES,
  SETTING_KEYS,
  type PreferenceUpdate,
  type ProfilePersistState,
  type WidgetPreferences,
} from '../types/preferences';

const STORAGE_PREFIX = 'as_widget_';
const LEGACY_PREFIX = 'accessshield_prefs_';
const API_TIMEOUT_MS = 2000;

type PreferenceListener = (prefs: WidgetPreferences) => void;

export interface LoadedWidgetState {
  prefs: Partial<WidgetPreferences>;
  activeProfile: string | null;
  preProfileSnapshot: Partial<WidgetPreferences> | null;
}

function pickSettings(raw: Record<string, unknown>): Partial<WidgetPreferences> {
  const out: Partial<WidgetPreferences> = {};
  for (const key of SETTING_KEYS) {
    if (key in raw && raw[key] !== undefined) {
      (out as Record<string, unknown>)[key] = raw[key];
    }
  }
  return out;
}

function parseStored(raw: string): LoadedWidgetState | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const active = parsed.activeProfile;
    const snap = parsed.preProfileSnapshot;
    return {
      prefs: pickSettings(parsed),
      activeProfile: typeof active === 'string' && active ? active : null,
      preProfileSnapshot:
        snap && typeof snap === 'object' ? pickSettings(snap as Record<string, unknown>) : null,
    };
  } catch {
    return null;
  }
}

/** Manages preference load, save, sync, and change notifications */
export class PreferencesManager {
  private prefs: WidgetPreferences;
  private activeProfile: string | null = null;
  private preProfileSnapshot: Partial<WidgetPreferences> | null = null;
  private readonly token: string;
  private readonly apiUrl: string;
  private listeners: PreferenceListener[] = [];

  constructor(token: string, apiUrl: string, initial?: Partial<WidgetPreferences>) {
    this.token = token;
    this.apiUrl = apiUrl;
    this.prefs = { ...DEFAULT_PREFERENCES, ...initial };
  }

  restoreProfileMeta(state: ProfilePersistState): void {
    this.activeProfile = state.activeProfile;
    this.preProfileSnapshot = state.preProfileSnapshot;
  }

  /** Load preferences from localStorage before first render. Migrates legacy keys. */
  static loadFromStorage(token: string): LoadedWidgetState | null {
    try {
      const canonical = localStorage.getItem(`${STORAGE_PREFIX}${token}`);
      if (canonical) return parseStored(canonical);

      const legacy = localStorage.getItem(`${LEGACY_PREFIX}${token}`);
      if (!legacy) return null;

      const parsed = parseStored(legacy);
      if (parsed) {
        try {
          localStorage.setItem(`${STORAGE_PREFIX}${token}`, legacy);
        } catch {
          // ignore quota
        }
      }
      return parsed;
    } catch {
      return null;
    }
  }

  get(): WidgetPreferences {
    return { ...this.prefs };
  }

  getProfileState(): ProfilePersistState {
    return {
      activeProfile: this.activeProfile,
      preProfileSnapshot: this.preProfileSnapshot ? { ...this.preProfileSnapshot } : null,
    };
  }

  private onSettingOn: ((id: string) => void) | null = null;

  /** Fired when an individual setting turns on (not via profile apply). */
  setSettingOnTracker(fn: ((id: string) => void) | null): void {
    this.onSettingOn = fn;
  }

  /** Apply partial update, persist, and notify listeners */
  update(partial: PreferenceUpdate): void {
    const prev = this.prefs;
    this.prefs = { ...this.prefs, ...partial };
    this.emitSettingOn(prev, partial);
    this.saveToStorage();
    this.notify();
    this.postToApi();
  }

  private emitSettingOn(prev: WidgetPreferences, partial: PreferenceUpdate): void {
    if (!this.onSettingOn) return;
    for (const [rawKey, value] of Object.entries(partial)) {
      const key = rawKey as keyof WidgetPreferences;
      if (key === 'language') continue;
      if (value === true && prev[key] !== true) {
        this.onSettingOn(rawKey);
      }
      if (key === 'colourBlindMode' && value !== 'none' && prev.colourBlindMode === 'none') {
        this.onSettingOn('colourBlindMode');
      }
      if (key === 'textSpacing' && value === 'comfortable' && prev.textSpacing !== 'comfortable') {
        this.onSettingOn('textSpacing');
      }
    }
  }

  toggleProfile(profileId: string): ReturnType<typeof toggleProfile> {
    const result = toggleProfile(
      this.prefs,
      this.activeProfile,
      this.preProfileSnapshot,
      profileId,
    );
    this.prefs = result.settings;
    this.activeProfile = result.activeProfile;
    this.preProfileSnapshot = result.preProfileSnapshot;
    this.saveToStorage();
    this.notify();
    this.postToApi();
    return result;
  }

  /** Reset all preferences to defaults */
  reset(): void {
    this.prefs = { ...DEFAULT_PREFERENCES, language: this.prefs.language };
    this.activeProfile = null;
    this.preProfileSnapshot = null;
    this.saveToStorage();
    this.notify();
    this.postToApi();
  }

  /** Full reset including language */
  resetAll(): void {
    this.prefs = { ...DEFAULT_PREFERENCES };
    this.activeProfile = null;
    this.preProfileSnapshot = null;
    this.saveToStorage();
    this.notify();
    this.postToApi();
  }

  onChange(listener: PreferenceListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private saveToStorage(): void {
    try {
      const stored = {
        ...this.prefs,
        activeProfile: this.activeProfile,
        preProfileSnapshot: this.preProfileSnapshot,
      };
      localStorage.setItem(`${STORAGE_PREFIX}${this.token}`, JSON.stringify(stored));
    } catch {
      // Storage full or unavailable — fail silently
    }
  }

  private notify(): void {
    const snapshot = this.get();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  /** Fire-and-forget POST — no retry on failure.
   * Avoid AbortController timeouts: aborted fetches show as Next.js runtime errors.
   */
  private postToApi(): void {
    const url = `${this.apiUrl}/api/v1/widget/preferences`;
    const body = JSON.stringify({ token: this.token, preferences: this.prefs });

    void Promise.race([
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), API_TIMEOUT_MS);
      }),
    ]).catch(() => undefined);
  }
}
