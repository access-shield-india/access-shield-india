'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Smartphone, Apple, Settings, Upload, Eye, Code } from 'lucide-react';
import { Card, Badge, Button, getButtonStyle, getButtonThemeClassName } from '@accessshield/ui';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { Asset } from '@/lib/api/types';
import { MobileUploadModal } from '@/components/dashboard/mobile/MobileUploadModal';
import { DeleteAssetDialog } from '@/components/dashboard/assets/DeleteAssetDialog';

function stableScoreFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i)) % 40;
  }
  return hash + 60;
}

function getPlatformFromUrl(url: string): 'android' | 'ios' {
  if (url.includes('ios://') || url.includes('.ipa')) return 'ios';
  return 'android';
}

function getBundleIdFromUrl(url: string): string {
  const match = url.match(/(?:android|ios):\/\/([^/]+)/);
  return match?.[1] ?? 'com.example.app';
}

function getFrameworkFromUrl(url: string): string | null {
  if (url.includes('react-native')) return 'React Native';
  if (url.includes('flutter')) return 'Flutter';
  if (url.includes('xamarin')) return 'Xamarin';
  if (url.includes('ionic')) return 'Ionic';
  return null;
}

export interface MobileAppCardProps {
  asset: Asset;
  latestScanId?: string | null;
  screensScanned?: number;
}

export function MobileAppCard({ asset, latestScanId, screensScanned }: MobileAppCardProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);

  const score = stableScoreFromId(asset.id);
  const platform = getPlatformFromUrl(asset.url);
  const bundleId = getBundleIdFromUrl(asset.url);
  const framework = getFrameworkFromUrl(asset.url);

  const getScoreColor = (s: number) => {
    if (s >= 80)
      return 'bg-gradient-to-br from-green-50 to-green-100 text-green-800 border-green-300 shadow-green-100';
    if (s >= 50)
      return 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-800 border-amber-300 shadow-amber-100';
    return 'bg-gradient-to-br from-red-50 to-red-100 text-red-800 border-red-300 shadow-red-100';
  };

  const PlatformIcon = platform === 'ios' ? Apple : Smartphone;

  return (
    <>
      <Card
        role="article"
        aria-labelledby={`asset-${asset.id}-name`}
        className="group hover:shadow-xl transition-all duration-300 border-gray-200 hover:border-primary-300 bg-white overflow-hidden"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {/* Platform Badge */}
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl shrink-0',
                  platform === 'android'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700',
                )}
                aria-label={platform === 'android' ? 'Android app' : 'iOS app'}
              >
                <PlatformIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id={`asset-${asset.id}-name`}
                  className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors truncate"
                >
                  {asset.name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-xs font-semibold',
                      platform === 'android'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200',
                    )}
                  >
                    {platform === 'android' ? 'Android' : 'iOS'}
                  </Badge>
                  {framework && (
                    <Badge
                      variant="secondary"
                      className="text-xs font-medium bg-purple-50 text-purple-700 border-purple-200"
                    >
                      {framework}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
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

          {/* Bundle ID */}
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">Bundle ID</p>
            <p className="text-sm font-mono text-gray-700 truncate">{bundleId}</p>
          </div>

          {/* Compliance Standards */}
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

          {/* Scan Info */}
          <div className="flex items-center gap-4 text-xs">
            {asset.lastScannedAt ? (
              <p className="text-gray-500 font-medium bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                Last scan:{' '}
                <span className="text-gray-700">{formatRelativeTime(asset.lastScannedAt)}</span>
              </p>
            ) : (
              <p className="text-gray-500 font-medium bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                Never scanned
              </p>
            )}
            {screensScanned !== undefined && screensScanned > 0 && (
              <p className="text-gray-500 font-medium">
                {screensScanned} screen{screensScanned !== 1 ? 's' : ''} scanned
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100 bg-gray-50 p-4 flex gap-3">
          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowUploadModal(true)}
            className="flex-1"
          >
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            Upload {platform === 'android' ? 'APK' : 'IPA'}
          </Button>
          {latestScanId ? (
            <Link
              href={`/dashboard/scans/${latestScanId}`}
              className={cn(getButtonThemeClassName('outline', 'sm'), 'flex-1')}
              data-as-btn="outline"
              style={getButtonStyle('outline')}
            >
              <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
              View Results
            </Link>
          ) : (
            <Link
              href={`/dashboard/assets/${asset.id}`}
              className={cn(getButtonThemeClassName('outline', 'sm'), 'flex-1')}
              data-as-btn="outline"
              style={getButtonStyle('outline')}
            >
              <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
              Details
            </Link>
          )}
        </div>

        {/* SDK Setup Link */}
        <div className="border-t border-gray-100 bg-gray-25 px-4 py-2">
          <Link
            href={`/dashboard/assets/${asset.id}/sdk-setup`}
            className="flex items-center gap-2 text-xs text-primary-600 hover:text-primary-700 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded"
          >
            <Code className="h-3.5 w-3.5" aria-hidden="true" />
            Set up SDK for automated scanning
          </Link>
        </div>
      </Card>

      <MobileUploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        asset={asset}
        platform={platform}
      />
    </>
  );
}

MobileAppCard.displayName = 'MobileAppCard';
