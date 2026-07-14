'use client';

import Link from 'next/link';
import { Card, Progress, Button } from '@accessshield/ui';
import { ChevronRight } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { Asset } from '@/lib/api/types';
import { useTriggerScan } from '@/lib/hooks/useApi';

/** Stable placeholder score until latest scan score is wired from the API. */
function placeholderScore(assetId: string): number {
  let hash = 0;
  for (let i = 0; i < assetId.length; i += 1) {
    hash = (hash + assetId.charCodeAt(i) * (i + 1)) % 40;
  }
  return 60 + hash;
}

export interface AssetListProps {
  assets: Asset[];
}

export function AssetList({ assets }: AssetListProps) {
  const { mutate: triggerScan, isPending } = useTriggerScan();

  if (assets.length === 0) {
    return (
      <Card>
        <div className="text-center py-12" role="status" aria-live="polite">
          <p className="text-text-secondary">No assets yet</p>
          <Link
            href="/dashboard/assets"
            className="mt-4 inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded-md px-2 py-1"
          >
            Add your first asset
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Assets</h3>
        <Link
          href="/dashboard/assets"
          className="text-sm text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded-md px-2 py-1"
        >
          View all
        </Link>
      </div>

      <div className="space-y-4">
        {assets.map((asset) => {
          const score = placeholderScore(asset.id);

          return (
            <div
              key={asset.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <Link
                  href={`/dashboard/assets/${asset.id}`}
                  className="text-sm font-medium text-text-primary hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded"
                >
                  {asset.name}
                </Link>
                <p className="text-xs text-text-tertiary truncate mt-1">{asset.url}</p>
                {asset.lastScannedAt && (
                  <p className="text-xs text-text-tertiary mt-1">
                    Last scan: {formatRelativeTime(asset.lastScannedAt)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div
                  className="w-32"
                  role="meter"
                  aria-valuenow={score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${asset.name} accessibility score: ${score}%`}
                >
                  <Progress value={score} className="h-2" />
                  <p className="text-xs text-text-tertiary text-right mt-1">{score}%</p>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => triggerScan({ asset_id: asset.id })}
                  isLoading={isPending}
                  aria-label={`Scan ${asset.name} now`}
                >
                  Scan
                </Button>

                <Link
                  href={`/dashboard/assets/${asset.id}`}
                  className="inline-flex items-center text-text-tertiary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded"
                  aria-label={`View ${asset.name} details`}
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
