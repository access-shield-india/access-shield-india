import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from './types/preferences';
import { isProfileCustomized, PROFILES, toggleProfile } from './profiles';

describe('toggleProfile', () => {
  it('applies settings and snapshots previous state', () => {
    const current = { ...DEFAULT_PREFERENCES, highContrast: false, fontSize: 'lg' as const };
    const result = toggleProfile(current, null, null, 'low-vision');

    expect(result.turnedOn).toBe(true);
    expect(result.activeProfile).toBe('low-vision');
    expect(result.settings.textSize).toBe(1.3);
    expect(result.settings.highContrast).toBe(true);
    expect(result.preProfileSnapshot?.fontSize).toBe('lg');
    expect(result.count).toBe(4);
  });

  it('deactivating restores the snapshot exactly', () => {
    const current = { ...DEFAULT_PREFERENCES, fontSize: 'lg' as const };
    const on = toggleProfile(current, null, null, 'low-vision');
    const off = toggleProfile(on.settings, on.activeProfile, on.preProfileSnapshot, 'low-vision');

    expect(off.turnedOn).toBe(false);
    expect(off.activeProfile).toBeNull();
    expect(off.settings.highContrast).toBe(false);
    expect(off.settings.fontSize).toBe('lg');
    expect(off.settings.textSize).toBe(1);
  });

  it('swaps profiles via restore then apply', () => {
    const current = { ...DEFAULT_PREFERENCES, grayscale: true };
    const first = toggleProfile(current, null, null, 'low-vision');
    const swapped = toggleProfile(
      first.settings,
      first.activeProfile,
      first.preProfileSnapshot,
      'motor',
    );

    expect(swapped.activeProfile).toBe('motor');
    expect(swapped.settings.largeTargets).toBe(true);
    expect(swapped.settings.highContrast).toBe(false);
    expect(swapped.settings.grayscale).toBe(true);
    expect(swapped.preProfileSnapshot?.grayscale).toBe(true);
  });

  it('marks customized when an individual setting diverges', () => {
    const on = toggleProfile(DEFAULT_PREFERENCES, null, null, 'seizure-safe');
    const edited = { ...on.settings, grayscale: true };
    expect(isProfileCustomized(edited, on.activeProfile, on.preProfileSnapshot)).toBe(true);
    expect(isProfileCustomized(on.settings, on.activeProfile, on.preProfileSnapshot)).toBe(false);
  });

  it('loads old stored settings without profile keys', () => {
    const legacy = { fontSize: 'sm' as const };
    const merged = { ...DEFAULT_PREFERENCES, ...legacy };
    expect(merged.textSize).toBe(1);
    expect(isProfileCustomized(merged, null, null)).toBe(false);
  });

  it('defines six profiles', () => {
    expect(PROFILES.map((p) => p.id)).toEqual([
      'screen-reader',
      'low-vision',
      'colour-blind',
      'motor',
      'dyslexia-cognitive',
      'seizure-safe',
    ]);
  });
});
