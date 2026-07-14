'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Card } from '@accessshield/ui';
import { ScanHistoryTable } from '@/components/dashboard/scans/ScanHistoryTable';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import { useScans } from '@/lib/hooks/useApi';

const ScoreTrendChart = dynamic(
  () =>
    import('@/components/dashboard/home/ScoreTrendChart').then((mod) => ({
      default: mod.ScoreTrendChart,
    })),
  {
    ssr: false,
    loading: () => (
      <LoadingState
        message="Please wait, loading score chart…"
        variant="inline"
        size="sm"
        className="h-80 rounded-lg"
      />
    ),
  },
);

export interface AssetOverviewProps {
  assetId: string;
}

export function AssetOverview({ assetId }: AssetOverviewProps) {
  const { data, isLoading } = useScans({ asset_id: assetId, limit: 20 });
  const scans = data?.rows ?? [];
  const completedScans = scans.filter((scan) => scan.status === 'completed' && scan.score !== null);

  const trendData = completedScans
    .slice()
    .reverse()
    .map((scan) => ({
      scanId: scan.id,
      date: scan.completedAt ?? scan.createdAt,
      score: scan.score ?? 0,
    }));

  if (isLoading) {
    return <LoadingState message="Please wait, loading scan data…" variant="card" />;
  }

  return (
    <div className="space-y-6">
      {trendData.length > 0 ? (
        <ScoreTrendChart scans={trendData} />
      ) : (
        <Card className="p-6">
          <p className="text-center text-text-secondary">
            No completed scans yet.{' '}
            <Link
              href="/dashboard/scans/test"
              className="text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded"
            >
              Run a scan
            </Link>{' '}
            to see score trends.
          </p>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Scan History</h3>
        <ScanHistoryTable
          scans={scans}
          isLoading={false}
          total={data?.meta?.total ?? scans.length}
          showAsset={false}
        />
      </Card>
    </div>
  );
}
