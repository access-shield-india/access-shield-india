/** Font size preference for host page scaling */
export type FontSize = 'sm' | 'default' | 'lg';

/** Supported widget UI languages (MVP) */
export type Language = 'en' | 'hi';

/** Launcher button position on viewport */
export type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

/** All user-adjustable widget preferences */
export interface WidgetPreferences {
  fontSize: FontSize;
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
  skipNavigation: boolean;
  focusTracker: boolean;
  textToSpeech: boolean;
  speechRate: number;
  language: Language;
}

/** Partial update payload for preference changes */
export type PreferenceUpdate = Partial<WidgetPreferences>;

/** Widget initialisation options from script tag attributes */
export interface WidgetInitOptions {
  token: string;
  position: WidgetPosition;
  lang: Language;
  apiUrl: string;
}

export const DEFAULT_PREFERENCES: WidgetPreferences = {
  fontSize: 'default',
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
  skipNavigation: false,
  focusTracker: false,
  textToSpeech: false,
  speechRate: 1,
  language: 'en',
};
