'use client';

import Link from 'next/link';
import { ExternalLink, PlayCircle, Settings } from 'lucide-react';
import { Card, Badge, Button, getButtonStyle, getButtonThemeClassName } from '@accessshield/ui';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { Asset } from '@/lib/api/types';
import { useTriggerScan } from '@/lib/hooks/useApi';
import { DeleteAssetDialog } from '@/components/dashboard/assets/DeleteAssetDialog';

function stableScoreFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i)) % 40;
  }
  return hash + 60;
}

export interface AssetCardProps {
  asset: Asset;
}

export function AssetCard({ asset }: AssetCardProps) {
  const { mutate: triggerScan, isPending } = useTriggerScan();

  // Stable placeholder score until latest scan score is wired through the API
  const score = stableScoreFromId(asset.id);

  const getScoreColor = (s: number) => {
    if (s >= 80)
      return 'bg-gradient-to-br from-green-50 to-green-100 text-green-800 border-green-300 shadow-green-100';
    if (s >= 50)
      return 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-800 border-amber-300 shadow-amber-100';
    return 'bg-gradient-to-br from-red-50 to-red-100 text-red-800 border-red-300 shadow-red-100';
  };

  return (
    <Card
      role="article"
      aria-labelledby={`asset-${asset.id}-name`}
      className="group hover:shadow-xl transition-all duration-300 border-gray-200 hover:border-primary-300 bg-white overflow-hidden"
    >
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2
            id={`asset-${asset.id}-name`}
            className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors min-w-0 flex-1"
          >
            {asset.name}
          </h2>
          <div className="flex shrink-0 items-start gap-2">
            <DeleteAssetDialog asset={asset} variant="icon" />
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-xl font-extrabold shadow-lg ${getScoreColor(score)}`}
              role="meter"
              aria-valuenow={score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Score: ${score}`}
            >
              {score}
            </div>
          </div>
        </div>

        <a
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded truncate p-2 bg-primary-50 hover:bg-primary-100 transition-colors"
          aria-label={`Visit ${asset.name} (opens in new tab)`}
        >
          <span className="truncate">{asset.url}</span>
          <ExternalLink className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        </a>

        <div className="flex flex-wrap gap-2">
          <Badge
            variant="secondary"
            className="border border-primary-200 bg-primary-50 text-primary-700 font-semibold"
          >
            WCAG 2.2 AA
          </Badge>
          <Badge
            variant="secondary"
            className="border border-amber-200 bg-amber-50 text-amber-700 font-semibold"
          >
            IS 17802
          </Badge>
        </div>

        {asset.lastScannedAt && (
          <p className="text-xs text-gray-500 font-medium bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            Last scan:{' '}
            <span className="text-gray-700">{formatRelativeTime(asset.lastScannedAt)}</span>
          </p>
        )}
      </div>

      <div className="border-t border-gray-100 bg-gray-50 p-4 flex gap-3">
        <Button
          size="sm"
          variant="primary"
          onClick={() => triggerScan({ asset_id: asset.id })}
          isLoading={isPending}
          className="flex-1"
        >
          <PlayCircle className="mr-2 h-4 w-4" aria-hidden="true" />
          Scan Now
        </Button>
        <Link
          href={`/dashboard/assets/${asset.id}`}
          className={cn(getButtonThemeClassName('outline', 'sm'), 'flex-1')}
          data-as-btn="outline"
          style={getButtonStyle('outline')}
        >
          <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
          Details
        </Link>
      </div>
    </Card>
  );
}
