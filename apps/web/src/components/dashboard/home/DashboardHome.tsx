'use client';

import { AlertCircle, Globe, TrendingUp, Calendar } from 'lucide-react';
import { KPICard } from '@/components/dashboard/home/KPICard';
import { ScoreRingCard } from '@/components/dashboard/home/ScoreRingCard';
import { ScoreTrendChart } from '@/components/dashboard/home/ScoreTrendChart';
import { AssetList } from '@/components/dashboard/home/AssetList';
import { ActivityFeed } from '@/components/dashboard/home/ActivityFeed';
import { useDashboardStats, useAssets } from '@/lib/hooks/useApi';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

export function DashboardHome() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: assets = [], isLoading: assetsLoading } = useAssets();

  if (statsLoading && !stats) {
    return <LoadingState message="Please wait, loading dashboard…" variant="page" />;
  }

  const mockScans = [
    { scanId: '1', date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), score: 65 },
    { scanId: '2', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), score: 68 },
    { scanId: '3', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), score: 72 },
    { scanId: '4', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), score: 75 },
    {
      scanId: '5',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      score: stats?.score ?? 78,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">Your accessibility compliance overview.</p>
      </div>

      <div
        role="list"
        aria-label="Key metrics"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KPICard
          label="Accessibility Score"
          value={stats?.score ?? '—'}
          trend={
            stats?.scoreDelta
              ? {
                  value: stats.scoreDelta,
                  direction: stats.scoreDelta >= 0 ? 'up' : 'down',
                }
              : undefined
          }
          icon={TrendingUp}
          href="/dashboard/scans"
        />
        <KPICard
          label="Open Issues"
          value={stats?.openIssues ?? 0}
          icon={AlertCircle}
          href="/dashboard/issues"
        />
        <KPICard
          label="Assets"
          value={stats?.assetsCount ?? 0}
          icon={Globe}
          href="/dashboard/assets"
        />
        <KPICard
          label="Last Scan"
          value={
            stats?.lastScanDate
              ? new Date(stats.lastScanDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                })
              : 'Never'
          }
          icon={Calendar}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ScoreRingCard
            score={stats?.score ?? 0}
            previousScore={stats?.score ? stats.score - (stats.scoreDelta ?? 0) : null}
          />
        </div>
        <div className="lg:col-span-2">
          <ScoreTrendChart scans={mockScans} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {assetsLoading ? (
            <LoadingState message="Please wait, loading assets…" variant="card" />
          ) : (
            <AssetList assets={assets} />
          )}
        </div>
        <div className="lg:col-span-1">
          <ActivityFeed activities={stats?.recentActivity ?? []} />
        </div>
      </div>
    </div>
  );
}
