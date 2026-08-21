import { describe, expect, it } from 'vitest';
import en from '../i18n/en.json';
import hi from './hi';

const DEVANAGARI = /[\u0900-\u097F]/;
const LATIN_ONLY_KEYS = new Set(['panelTitle']);

describe('Hindi catalogue (IS 17802 IS-002)', () => {
  it('covers every English key', () => {
    expect(Object.keys(hi).sort()).toEqual(Object.keys(en).sort());
  });

  it('uses Devanagari Unicode, never ASCII transliteration', () => {
    for (const [key, value] of Object.entries(hi)) {
      if (LATIN_ONLY_KEYS.has(key)) continue;
      expect(DEVANAGARI.test(value), `${key} must contain Devanagari`).toBe(true);
    }
  });

  it('uses the specified GIGW profile names', () => {
    expect(hi.profileScreenReader).toBe('स्क्रीन रीडर उपयोगकर्ता');
    expect(hi.profileLowVision).toBe('कम दृष्टि');
    expect(hi.profileColourBlind).toBe('वर्णांधता');
    expect(hi.profileMotor).toBe('गतिशीलता सहायता');
    expect(hi.profileDyslexia).toBe('डिस्लेक्सिया/संज्ञानात्मक');
    expect(hi.profileSeizure).toBe('मिर्गी-सुरक्षित');
  });
});
