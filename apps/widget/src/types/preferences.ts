/** Font size preference for host page scaling */
export type FontSize = 'sm' | 'default' | 'lg';

/** Supported widget UI languages (MVP) */
export type Language = 'en' | 'hi';

/** Launcher button position on viewport */
export type WidgetPosition =
  'bottom-right' | 'bottom-left' | 'middle-right' | 'top-right' | 'top-left';

/** Colour-vision modes (user has this deficiency — we enhance distinction) */
export type ColourBlindMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';

/** Letter/word/line spacing preset */
export type TextSpacing = 'default' | 'comfortable';

/** All user-adjustable widget preferences (host-page settings) */
export interface WidgetPreferences {
  fontSize: FontSize;
  /** Multiplier; 1 = 100%. Profile "low vision" uses 1.3. Overrides fontSize when ≠ 1. */
  textSize: number;
  dyslexiaFont: boolean;
  darkMode: boolean;
  lightMode: boolean;
  highContrast: boolean;
  negativeContrast: boolean;
  grayscale: boolean;
  saturation: number;
  readingGuide: boolean;
  readingMask: boolean;
  linkHighlight: boolean;
  focusIndicator: boolean;
  keyboardNavMode: boolean;
  keyboardHighlights: boolean;
  skipNavigation: boolean;
  skipLinks: boolean;
  focusTracker: boolean;
  textToSpeech: boolean;
  speechRate: number;
  language: Language;
  screenReaderOptimisation: boolean;
  ariaEnhancement: boolean;
  largeCursor: boolean;
  colourBlindMode: ColourBlindMode;
  patternFills: boolean;
  iconIndicators: boolean;
  largeTargets: boolean;
  disableHoverOnly: boolean;
  textSpacing: TextSpacing;
  pauseAnimations: boolean;
  stopAnimations: boolean;
  reduceMotion: boolean;
  muteAutoplay: boolean;
}

/** Alias used by the profile system */
export type WidgetSettings = WidgetPreferences;

/** Partial update payload for preference changes */
export type PreferenceUpdate = Partial<WidgetPreferences>;

/** Persisted localStorage shape — settings plus profile metadata */
export interface StoredWidgetState extends WidgetPreferences {
  activeProfile?: string | null;
  preProfileSnapshot?: Partial<WidgetPreferences> | null;
}

export interface ProfilePersistState {
  activeProfile: string | null;
  preProfileSnapshot: Partial<WidgetPreferences> | null;
}

/** Widget initialisation options from script tag attributes */
export interface WidgetInitOptions {
  token: string;
  position: WidgetPosition;
  lang: Language;
  apiUrl: string;
}

export const DEFAULT_PREFERENCES: WidgetPreferences = {
  fontSize: 'default',
  textSize: 1,
  dyslexiaFont: false,
  darkMode: false,
  lightMode: false,
  highContrast: false,
  negativeContrast: false,
  grayscale: false,
  saturation: 100,
  readingGuide: false,
  readingMask: false,
  linkHighlight: false,
  focusIndicator: false,
  keyboardNavMode: false,
  keyboardHighlights: false,
  skipNavigation: false,
  skipLinks: false,
  focusTracker: false,
  textToSpeech: false,
  speechRate: 1,
  language: 'en',
  screenReaderOptimisation: false,
  ariaEnhancement: false,
  largeCursor: false,
  colourBlindMode: 'none',
  patternFills: false,
  iconIndicators: false,
  largeTargets: false,
  disableHoverOnly: false,
  textSpacing: 'default',
  pauseAnimations: false,
  stopAnimations: false,
  reduceMotion: false,
  muteAutoplay: false,
};

export const SETTING_KEYS = Object.keys(DEFAULT_PREFERENCES) as Array<keyof WidgetPreferences>;

const POSITIONS: WidgetPosition[] = [
  'bottom-right',
  'bottom-left',
  'middle-right',
  'top-right',
  'top-left',
];

/** Parse a position from verify/script; default bottom-right if absent/unknown */
export function parseWidgetPosition(value: unknown): WidgetPosition {
  return POSITIONS.includes(value as WidgetPosition) ? (value as WidgetPosition) : 'bottom-right';
}
