'use client';

import { Smartphone, Apple, Layers, GitBranch, Cpu, MonitorSmartphone } from 'lucide-react';
import { Badge, Skeleton } from '@accessshield/ui';
import { useMobileScan } from '@/lib/hooks/useApi';

export interface MobileScanSummaryProps {
  mobileScanId: string;
}

export function MobileScanSummary({ mobileScanId }: MobileScanSummaryProps) {
  const { data: mobileScan, isLoading } = useMobileScan(mobileScanId);

  if (isLoading) {
    return <MobileScanSummarySkeleton />;
  }

  if (!mobileScan) {
    return null;
  }

  const platform = mobileScan.platform ?? 'android';
  const PlatformIcon = platform === 'ios' ? Apple : Smartphone;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Platform Icon */}
        <div
          className={`
            flex h-12 w-12 items-center justify-center rounded-xl shrink-0
            ${platform === 'android' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}
          `}
        >
          <PlatformIcon className="h-6 w-6" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center flex-wrap gap-2 mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Mobile Scan Details</h2>
            <Badge
              variant="secondary"
              className={`text-xs font-semibold ${
                platform === 'android'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-50 text-gray-700 border-gray-200'
              }`}
            >
              {platform === 'android' ? 'Android' : 'iOS'}
            </Badge>
            {mobileScan.framework && (
              <Badge
                variant="secondary"
                className="text-xs font-medium bg-purple-50 text-purple-700 border-purple-200"
              >
                {mobileScan.framework}
              </Badge>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Device Info */}
            {(mobileScan.osVersion || mobileScan.deviceModel) && (
              <div className="flex items-start gap-2">
                <MonitorSmartphone
                  className="h-4 w-4 text-gray-400 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-gray-500">Test Device</p>
                  <p className="text-sm font-medium text-gray-900">
                    {[mobileScan.osVersion, mobileScan.deviceModel].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            )}

            {/* Screens Coverage */}
            <div className="flex items-start gap-2">
              <Layers className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs text-gray-500">Screen Coverage</p>
                <p className="text-sm font-medium text-gray-900">
                  {mobileScan.screensDiscovered ?? 0} discovered · {mobileScan.screensScanned ?? 0}{' '}
                  scanned
                </p>
              </div>
            </div>

            {/* Framework */}
            {mobileScan.framework && (
              <div className="flex items-start gap-2">
                <Cpu className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-xs text-gray-500">Framework</p>
                  <p className="text-sm font-medium text-gray-900">
                    {mobileScan.framework}
                    {mobileScan.frameworkAutoDetected && (
                      <span className="text-xs text-gray-500 ml-1">(auto-detected)</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Test Environment */}
            {mobileScan.testEnvironment && (
              <div className="flex items-start gap-2">
                <GitBranch className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-xs text-gray-500">Environment</p>
                  <p className="text-sm font-medium text-gray-900">{mobileScan.testEnvironment}</p>
                </div>
              </div>
            )}
          </div>

          {/* Discovered Screens */}
          {mobileScan.discoveredScreens && mobileScan.discoveredScreens.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                Screen Traversal ({mobileScan.discoveredScreens.length} screens)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {mobileScan.discoveredScreens.slice(0, 12).map((screen, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs font-medium text-gray-700"
                  >
                    {screen}
                  </span>
                ))}
                {mobileScan.discoveredScreens.length > 12 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-xs text-gray-500">
                    +{mobileScan.discoveredScreens.length - 12} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileScanSummarySkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

MobileScanSummary.displayName = 'MobileScanSummary';
