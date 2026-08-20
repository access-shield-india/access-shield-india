'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, FileText, Languages, MousePointerClick, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button, Card } from '@accessshield/ui';
import { getAccessToken } from '@/lib/api/client';
import type { WidgetAnalyticsSummary } from '@/lib/api/types';
import { formatIndianDate } from '@/lib/utils';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import { WidgetSectionNav } from '@/components/dashboard/widget/WidgetSectionNav';

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
  pauseAnimations: 'Pause animations',
  patternFills: 'Pattern fills',
  iconIndicators: 'Icon indicators',
  disableHoverOnly: 'Show hover menus on focus',
};

function labelOf(map: Record<string, string>, id: string): string {
  return map[id] ?? id.replace(/[-_]/g, ' ');
}

async function fetchSummary(): Promise<WidgetAnalyticsSummary> {
  const token = await getAccessToken();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/widget/analytics/summary`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error('Failed to load widget analytics');
  const json = (await response.json()) as { data: WidgetAnalyticsSummary };
  return json.data;
}

async function setIncludeInReport(include: boolean): Promise<{ includeInNextReport: boolean }> {
  const token = await getAccessToken();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/widget/analytics/include-in-report`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ include }),
    },
  );
  if (!response.ok) throw new Error('Failed to update report flag');
  const json = (await response.json()) as { data: { includeInNextReport: boolean } };
  return json.data;
}

function ChartTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: [string, string];
  rows: Array<{ key: string; label: string; value: string | number }>;
}) {
  return (
    <details className="mt-4">
      <summary className="cursor-pointer text-sm font-medium text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded">
        View as table
      </summary>
      <table className="mt-2 w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 text-left font-medium text-text-secondary">{columns[0]}</th>
            <th className="py-2 text-right font-medium text-text-secondary">{columns[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-gray-100">
              <td className="py-2 text-text-primary">{row.label}</td>
              <td className="py-2 text-right text-text-primary">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function WidgetAnalyticsView() {
  const queryClient = useQueryClient();
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['widget-analytics'],
    queryFn: fetchSummary,
  });

  const includeMutation = useMutation({
    mutationFn: setIncludeInReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widget-analytics'] });
    },
  });

  const trendData = useMemo(
    () =>
      (data?.dailyTrend ?? []).map((row) => ({
        date: formatIndianDate(row.date),
        opens: row.opens,
      })),
    [data?.dailyTrend],
  );

  const profileData = useMemo(
    () =>
      (data?.topProfiles ?? []).map((row) => ({
        name: labelOf(PROFILE_LABELS, row.id),
        count: row.count,
      })),
    [data?.topProfiles],
  );

  const settingData = useMemo(
    () =>
      (data?.topSettings ?? []).map((row) => ({
        name: labelOf(SETTING_LABELS, row.id),
        count: row.count,
      })),
    [data?.topSettings],
  );

  if (isLoading) {
    return <LoadingState message="Loading widget analytics…" variant="card" />;
  }

  if (isError || !data) {
    return (
      <p role="alert" className="text-sm text-error-700">
        Could not load widget analytics. Try again in a moment.
      </p>
    );
  }

  const mostUsedProfile = data.topProfiles[0]
    ? labelOf(PROFILE_LABELS, data.topProfiles[0].id)
    : 'None yet';
  const mostUsedSetting = data.topSettings[0]
    ? labelOf(SETTING_LABELS, data.topSettings[0].id)
    : 'None yet';
  const isEmpty = data.panelOpens === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Widget analytics</h1>
        <p className="mt-2 text-base text-text-secondary">
          Anonymous, aggregate usage of your accessibility widget. No visitor identifiers are
          stored.
        </p>
      </div>

      <WidgetSectionNav />

      {isEmpty ? (
        <Card>
          <h2 className="text-lg font-semibold text-text-primary">No usage yet</h2>
          <p className="mt-2 text-base text-text-secondary">
            Embed the widget on a site and open the panel once. Usage will show here within an hour.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="primary" asChild>
              <Link href="/dashboard/settings?tab=widget">Open widget settings</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/widget">Widget setup docs</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="text-sm font-medium text-text-secondary">Panel opens (30d)</p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-text-primary">
                <MousePointerClick className="h-5 w-5 text-primary-600" aria-hidden="true" />
                {data.panelOpens.toLocaleString('en-IN')}
              </p>
            </Card>
            <Card>
              <p className="text-sm font-medium text-text-secondary">Most-used profile</p>
              <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-text-primary">
                <Sparkles className="h-5 w-5 text-primary-600" aria-hidden="true" />
                {mostUsedProfile}
              </p>
            </Card>
            <Card>
              <p className="text-sm font-medium text-text-secondary">Most-used setting</p>
              <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-text-primary">
                <BarChart3 className="h-5 w-5 text-primary-600" aria-hidden="true" />
                {mostUsedSetting}
              </p>
            </Card>
            <Card>
              <p className="text-sm font-medium text-text-secondary">Hindi usage</p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-text-primary">
                <Languages className="h-5 w-5 text-primary-600" aria-hidden="true" />
                {data.hindiUsagePercent}%
              </p>
            </Card>
          </section>

          <div
            className="rounded-lg border border-primary-100 bg-primary-50 p-6"
            role="region"
            aria-labelledby="widget-evidence-heading"
          >
            <h2 id="widget-evidence-heading" className="text-lg font-semibold text-primary-900">
              Evidence for your accessibility programme
            </h2>
            <p className="mt-2 text-base text-text-secondary">
              {data.panelOpens.toLocaleString('en-IN')} visitors activated assistive features on
              your site this month. Include this in your SEBI annual accessibility report and RPwD
              Act documentation.
            </p>
            <div className="mt-4">
              <Button
                variant="primary"
                onClick={() => includeMutation.mutate(!data.includeInNextReport)}
                isLoading={includeMutation.isPending}
                aria-pressed={data.includeInNextReport}
              >
                <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                {data.includeInNextReport
                  ? 'Included in next Executive / SEBI report'
                  : 'Include in next report'}
              </Button>
            </div>
          </div>

          <Card>
            <h2 className="text-lg font-semibold text-text-primary">Daily trend</h2>
            <div
              className="mt-4 h-64"
              role="img"
              aria-label={`Daily panel opens from ${formatIndianDate(data.from)} to ${formatIndianDate(data.to)}. Total ${data.panelOpens} opens.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <YAxis allowDecimals={false} stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="opens"
                    name="Panel opens"
                    stroke="#6D28D9"
                    strokeWidth={2}
                    isAnimationActive={!prefersReducedMotion}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ChartTable
              caption="Daily panel opens"
              columns={['Date', 'Opens']}
              rows={trendData.map((row) => ({
                key: row.date,
                label: row.date,
                value: row.opens,
              }))}
            />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="text-lg font-semibold text-text-primary">Profiles</h2>
              <div
                className="mt-4 h-64"
                role="img"
                aria-label={`Most used profiles. Top: ${mostUsedProfile}.`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={profileData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" allowDecimals={false} stroke="#6B7280" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      stroke="#6B7280"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      name="Activations"
                      fill="#6D28D9"
                      isAnimationActive={!prefersReducedMotion}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ChartTable
                caption="Profile activations"
                columns={['Profile', 'Count']}
                rows={profileData.map((row) => ({
                  key: row.name,
                  label: row.name,
                  value: row.count,
                }))}
              />
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
              <div
                className="mt-4 h-64"
                role="img"
                aria-label={`Most used settings. Top: ${mostUsedSetting}.`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={settingData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" allowDecimals={false} stroke="#6B7280" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      stroke="#6B7280"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      name="Turns on"
                      fill="#8B5CF6"
                      isAnimationActive={!prefersReducedMotion}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ChartTable
                caption="Setting activations"
                columns={['Setting', 'Count']}
                rows={settingData.map((row) => ({
                  key: row.name,
                  label: row.name,
                  value: row.count,
                }))}
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
