import {
  DEFAULT_PREFERENCES,
  SETTING_KEYS,
  type WidgetPreferences,
  type WidgetSettings,
} from './types/preferences';

export interface AccessibilityProfile {
  id: string;
  labelKey: string;
  descriptionKey: string;
  /** Inline SVG path data (viewBox 0 0 24 24) — keep tiny for bundle budget */
  icon: string;
  settings: Partial<WidgetSettings>;
}

export const PROFILES: AccessibilityProfile[] = [
  {
    id: 'screen-reader',
    labelKey: 'profileScreenReader',
    descriptionKey: 'profileScreenReaderDesc',
    icon: 'M4 12a8 8 0 1116 0v5h-3v-5a5 5 0 00-10 0v5H4z',
    settings: {
      screenReaderOptimisation: true,
      skipLinks: true,
      ariaEnhancement: true,
    },
  },
  {
    id: 'low-vision',
    labelKey: 'profileLowVision',
    descriptionKey: 'profileLowVisionDesc',
    icon: 'M12 5C5 5 2 12 2 12s3 7 10 7 10-7 10-7-3-7-10-7zm0 10a3 3 0 110-6 3 3 0 010 6z',
    settings: {
      textSize: 1.3,
      highContrast: true,
      readingGuide: true,
      largeCursor: true,
    },
  },
  {
    id: 'colour-blind',
    labelKey: 'profileColourBlind',
    descriptionKey: 'profileColourBlindDesc',
    icon: 'M12 2a10 10 0 100 20V2z',
    settings: {
      colourBlindMode: 'deuteranopia',
      patternFills: true,
      iconIndicators: true,
    },
  },
  {
    id: 'motor',
    labelKey: 'profileMotor',
    descriptionKey: 'profileMotorDesc',
    icon: 'M3 7h18v10H3zm3 3h2v2H6zm5 0h2v2h-2zm5 0h2v2h-2zM8 14h8v1.5H8z',
    settings: {
      keyboardHighlights: true,
      largeTargets: true,
      disableHoverOnly: true,
    },
  },
  {
    id: 'dyslexia-cognitive',
    labelKey: 'profileDyslexia',
    descriptionKey: 'profileDyslexiaDesc',
    icon: 'M8 18L12 6l4 12h-2.1l-.7-2.2h-3.4L10.1 18H8zm3.4-4h1.2L12 11z',
    settings: {
      dyslexiaFont: true,
      textSpacing: 'comfortable',
      readingGuide: true,
      pauseAnimations: true,
    },
  },
  {
    id: 'seizure-safe',
    labelKey: 'profileSeizure',
    descriptionKey: 'profileSeizureDesc',
    icon: 'M7 5h3v14H7zm7 0h3v14h-3z',
    settings: {
      stopAnimations: true,
      reduceMotion: true,
      muteAutoplay: true,
    },
  },
];

export function getProfile(id: string): AccessibilityProfile | undefined {
  return PROFILES.find((p) => p.id === id);
}

export interface ProfileApplyResult {
  settings: WidgetPreferences;
  activeProfile: string | null;
  preProfileSnapshot: Partial<WidgetPreferences> | null;
  turnedOn: boolean;
  count: number;
  profile: AccessibilityProfile | null;
}

function cloneSettings(prefs: WidgetPreferences): WidgetPreferences {
  return { ...prefs };
}

function restoreFromSnapshot(
  snapshot: Partial<WidgetPreferences> | null,
  language: WidgetPreferences['language'],
): WidgetPreferences {
  return { ...DEFAULT_PREFERENCES, ...snapshot, language };
}

/**
 * Activate `profileId`, or deactivate it if already active.
 * Swapping profiles restores the previous snapshot first, then applies the new one.
 */
export function toggleProfile(
  current: WidgetPreferences,
  activeProfile: string | null,
  snapshot: Partial<WidgetPreferences> | null,
  profileId: string,
): ProfileApplyResult {
  const profile = getProfile(profileId);
  if (!profile) {
    return {
      settings: current,
      activeProfile,
      preProfileSnapshot: snapshot,
      turnedOn: false,
      count: 0,
      profile: null,
    };
  }

  if (activeProfile === profileId) {
    return {
      settings: restoreFromSnapshot(snapshot, current.language),
      activeProfile: null,
      preProfileSnapshot: null,
      turnedOn: false,
      count: Object.keys(profile.settings).length,
      profile,
    };
  }

  const base =
    activeProfile && snapshot
      ? restoreFromSnapshot(snapshot, current.language)
      : cloneSettings(current);

  return {
    settings: { ...base, ...profile.settings },
    activeProfile: profileId,
    preProfileSnapshot: cloneSettings(base),
    turnedOn: true,
    count: Object.keys(profile.settings).length,
    profile,
  };
}

/** True when the user changed an individual setting while a profile is on */
export function isProfileCustomized(
  current: WidgetPreferences,
  activeProfile: string | null,
  snapshot: Partial<WidgetPreferences> | null,
): boolean {
  if (!activeProfile) return false;
  const profile = getProfile(activeProfile);
  if (!profile) return false;

  const expected: WidgetPreferences = {
    ...DEFAULT_PREFERENCES,
    ...snapshot,
    ...profile.settings,
    language: current.language,
  };

  for (const key of SETTING_KEYS) {
    if (key === 'language') continue;
    if (current[key] !== expected[key]) return true;
  }
  return false;
}

export function clearProfile(
  current: WidgetPreferences,
  snapshot: Partial<WidgetPreferences> | null,
): ProfileApplyResult {
  return {
    settings: restoreFromSnapshot(snapshot, current.language),
    activeProfile: null,
    preProfileSnapshot: null,
    turnedOn: false,
    count: 0,
    profile: null,
  };
}
