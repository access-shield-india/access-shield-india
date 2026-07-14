import type { Locale } from './config';
import type { Dictionary } from './dictionaries/types';
import { en } from './dictionaries/en';
import { hi } from './dictionaries/hi';

const dictionaries: Record<Locale, Dictionary> = { en, hi };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? en;
}

export type { Dictionary };
