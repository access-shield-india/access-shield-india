'use client';

import { ExternalLink } from 'lucide-react';
import { Tabs, Badge } from '@accessshield/ui';
import { AssetOverview } from '@/components/dashboard/assets/AssetOverview';
import { AssetConfiguration } from '@/components/dashboard/assets/AssetConfiguration';
import { AssetWidget } from '@/components/dashboard/assets/AssetWidget';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import { useAsset } from '@/lib/hooks/useApi';

export function AssetDetailPageContent({ id }: { id: string }) {
  const { data: asset, isLoading, isError } = useAsset(id);

  if (isLoading) {
    return <LoadingState message="Please wait, loading asset details…" variant="page" />;
  }

  if (isError || !asset) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-2xl font-bold text-text-primary">Asset not found</h1>
        <p className="mt-2 text-text-secondary">
          The asset you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">{asset.name}</h1>
        <a
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 rounded text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          aria-label={`Visit ${asset.name} (opens in new tab)`}
        >
          {asset.url}
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
        <div className="mt-3 flex gap-2">
          <Badge variant="secondary">WCAG 2.2 AA</Badge>
          <Badge variant="secondary">IS 17802</Badge>
        </div>
      </div>

      <Tabs
        defaultValue="overview"
        ariaLabel="Asset sections"
        lazyMount
        items={[
          {
            value: 'overview',
            label: 'Overview',
            content: <AssetOverview assetId={id} />,
          },
          {
            value: 'configuration',
            label: 'Configuration',
            content: <AssetConfiguration asset={asset} />,
          },
          {
            value: 'widget',
            label: 'Widget',
            content: <AssetWidget asset={asset} />,
          },
        ]}
      />
    </div>
  );
}
