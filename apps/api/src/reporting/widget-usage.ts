import type { Redis } from 'ioredis';
import type { Database } from '@accessshield/db';
import {
  buildWidgetAnalyticsSummary,
  consumeIncludeInNextReport,
  daysAgoUtc,
  getIncludeInNextReport,
  utcDateString,
} from '../lib/widget-analytics';
import type { WidgetUsageForReport } from './types';

const PROFILE_LABELS: Record<string, string> = {
  'screen-reader': 'Screen reader',
  'low-vision': 'Low vision',
  'colour-blind': 'Colour blind',
  motor: 'Motor / mobility',
  'dyslexia-cognitive': 'Dyslexia / cognitive',
  'seizure-safe': 'Seizure safe',
};

const SETTING_LABELS: Record<string, string> = {
  highContrast: 'High contrast',
  dyslexiaFont: 'Dyslexia font',
  readingGuide: 'Reading guide',
  largeCursor: 'Large cursor',
  largeTargets: 'Large click areas',
  skipLinks: 'Skip links',
  keyboardHighlights: 'Keyboard highlights',
  colourBlindMode: 'Colour vision',
  textSpacing: 'Text spacing',
  stopAnimations: 'Stop animations',
  reduceMotion: 'Reduce motion',
  muteAutoplay: 'Mute autoplay',
  screenReaderOptimisation: 'Screen reader optimisation',
  ariaEnhancement: 'ARIA enhancement',
};

const LANG_LABELS: Record<string, string> = {
  en: 'English',
  hi: 'Hindi (हिन्दी)',
};

function labelOf(map: Record<string, string>, id: string): string {
  return map[id] ?? id;
}

export async function resolveWidgetUsageForReport(
  db: Database,
  redis: Redis,
  orgId: string,
  widgetAnalytics: boolean | undefined,
): Promise<WidgetUsageForReport | undefined> {
  const flagged = await getIncludeInNextReport(redis, orgId);
  if (!widgetAnalytics && !flagged) return undefined;

  const to = utcDateString();
  const from = daysAgoUtc(29);
  const summary = await buildWidgetAnalyticsSummary(db, redis, orgId, from, to);

  return {
    panelOpens: summary.panelOpens,
    topProfiles: summary.topProfiles.map((row) => ({
      ...row,
      label: labelOf(PROFILE_LABELS, row.id),
    })),
    topSettings: summary.topSettings.map((row) => ({
      ...row,
      label: labelOf(SETTING_LABELS, row.id),
    })),
    languageSplit: summary.languageSplit.map((row) => ({
      ...row,
      label: labelOf(LANG_LABELS, row.id),
    })),
    hindiUsagePercent: summary.hindiUsagePercent,
    periodLabel: `${from} to ${to} (UTC)`,
  };
}
