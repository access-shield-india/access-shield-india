'use client';

import { useState, useMemo } from 'react';
import { Plus, Globe, Smartphone, LayoutGrid } from 'lucide-react';
import { Button } from '@accessshield/ui';
import { AssetCard } from '@/components/dashboard/assets/AssetCard';
import { MobileAppCard } from '@/components/dashboard/mobile/MobileAppCard';
import { AddAssetModal } from '@/components/dashboard/assets/AddAssetModal';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import { useAssets } from '@/lib/hooks/useApi';
import type { Asset } from '@/lib/api/types';

type AssetTypeFilter = 'all' | 'websites' | 'mobile';

function isMobileAsset(asset: Asset): boolean {
  return asset.type === 'mobile_app';
}

function isWebAsset(asset: Asset): boolean {
  return asset.type === 'website' || asset.type === 'web_app';
}

export function AssetsPageContent() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetTypeFilter>('all');
  const { data: assets = [], isLoading } = useAssets();

  const filteredAssets = useMemo(() => {
    if (assetTypeFilter === 'all') return assets;
    if (assetTypeFilter === 'websites') return assets.filter(isWebAsset);
    if (assetTypeFilter === 'mobile') return assets.filter(isMobileAsset);
    return assets;
  }, [assets, assetTypeFilter]);

  const counts = useMemo(
    () => ({
      all: assets.length,
      websites: assets.filter(isWebAsset).length,
      mobile: assets.filter(isMobileAsset).length,
    }),
    [assets],
  );

  const tabs: { id: AssetTypeFilter; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'all', label: 'All', icon: LayoutGrid },
    { id: 'websites', label: 'Websites', icon: Globe },
    { id: 'mobile', label: 'Mobile Apps', icon: Smartphone },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary-50 to-white border border-gray-200 rounded-2xl p-8 shadow-lg flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Assets</h1>
          <p className="text-lg text-gray-600 font-medium">
            Websites and applications being monitored for accessibility
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={() => setShowAddModal(true)}
          className="shadow-lg"
        >
          <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
          Add Asset
        </Button>
      </div>

      {/* Asset Type Tabs */}
      <div
        role="tablist"
        aria-label="Filter assets by type"
        className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = assetTypeFilter === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isSelected}
              aria-controls={`${tab.id}-tabpanel`}
              id={`${tab.id}-tab`}
              onClick={() => setAssetTypeFilter(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2
                ${
                  isSelected
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
              <span
                className={`
                  ml-1 px-2 py-0.5 rounded-full text-xs font-semibold
                  ${isSelected ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-600'}
                `}
              >
                {counts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      <div
        id={`${assetTypeFilter}-tabpanel`}
        role="tabpanel"
        aria-labelledby={`${assetTypeFilter}-tab`}
        tabIndex={0}
      >
        {isLoading ? (
          <LoadingState message="Loading assets…" variant="page" />
        ) : filteredAssets.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-16 text-center shadow-sm">
            <div className="mx-auto w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-6">
              <Plus className="h-12 w-12 text-primary-600" aria-hidden="true" />
            </div>
            <p className="mb-6 text-xl font-semibold text-gray-700">
              {assetTypeFilter === 'all'
                ? 'No assets yet'
                : assetTypeFilter === 'websites'
                  ? 'No websites added'
                  : 'No mobile apps added'}
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowAddModal(true)}
              className="shadow-lg"
            >
              <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
              {assetTypeFilter === 'all'
                ? 'Add your first asset'
                : assetTypeFilter === 'websites'
                  ? 'Add a website'
                  : 'Add a mobile app'}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredAssets.map((asset) =>
              isMobileAsset(asset) ? (
                <MobileAppCard key={asset.id} asset={asset} />
              ) : (
                <AssetCard key={asset.id} asset={asset} />
              ),
            )}
          </div>
        )}
      </div>

      <AddAssetModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}
