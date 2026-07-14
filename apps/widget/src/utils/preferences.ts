import {
  DEFAULT_PREFERENCES,
  type PreferenceUpdate,
  type WidgetPreferences,
} from '../types/preferences';

const STORAGE_PREFIX = 'accessshield_prefs_';
const API_TIMEOUT_MS = 2000;

type PreferenceListener = (prefs: WidgetPreferences) => void;

/** Manages preference load, save, sync, and change notifications */
export class PreferencesManager {
  private prefs: WidgetPreferences;
  private readonly token: string;
  private readonly apiUrl: string;
  private listeners: PreferenceListener[] = [];

  constructor(token: string, apiUrl: string, initial?: Partial<WidgetPreferences>) {
    this.token = token;
    this.apiUrl = apiUrl;
    this.prefs = { ...DEFAULT_PREFERENCES, ...initial };
  }

  /** Load preferences from localStorage before first render */
  static loadFromStorage(token: string): Partial<WidgetPreferences> | null {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${token}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<WidgetPreferences>;
      return parsed;
    } catch {
      return null;
    }
  }

  get(): WidgetPreferences {
    return { ...this.prefs };
  }

  /** Apply partial update, persist, and notify listeners */
  update(partial: PreferenceUpdate): void {
    this.prefs = { ...this.prefs, ...partial };
    this.saveToStorage();
    this.notify();
    this.postToApi();
  }

  /** Reset all preferences to defaults */
  reset(): void {
    this.prefs = { ...DEFAULT_PREFERENCES, language: this.prefs.language };
    this.saveToStorage();
    this.notify();
    this.postToApi();
  }

  /** Full reset including language */
  resetAll(): void {
    this.prefs = { ...DEFAULT_PREFERENCES };
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
      localStorage.setItem(`${STORAGE_PREFIX}${this.token}`, JSON.stringify(this.prefs));
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

  /** Fire-and-forget POST — no retry on failure */
  private postToApi(): void {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    void fetch(`${this.apiUrl}/api/v1/widget/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: this.token, preferences: this.prefs }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
  }
}
