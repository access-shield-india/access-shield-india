'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Progress } from '@accessshield/ui';
import { ViolationFilters } from '@/components/dashboard/scans/ViolationFilters';
import { ViolationTable } from '@/components/dashboard/scans/ViolationTable';
import { MobileScanSummary } from '@/components/dashboard/mobile/MobileScanSummary';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import { useScan, useViolations } from '@/lib/hooks/useApi';
import { formatIndianDate } from '@/lib/utils';

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-error-100 text-error-700 border-error-200' },
  serious: { label: 'Serious', color: 'bg-warning-100 text-warning-700 border-warning-200' },
  moderate: { label: 'Moderate', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  minor: { label: 'Minor', color: 'bg-gray-100 text-gray-700 border-gray-200' },
};

function statusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Queued';
    case 'running':
      return 'In progress';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}

export default function ScanDetailPage({ params }: { params: { id: string } }) {
  const { id: scanId } = params;
  const [filters, setFilters] = useState({
    severity: 'all',
    standard: 'all',
    status: 'all',
    search: '',
  });

  const { data: scan, isLoading: scanLoading } = useScan(scanId);
  const { data: violationsData, isLoading: violationsLoading } = useViolations(
    scanId,
    { severity: filters.severity !== 'all' ? filters.severity : undefined },
    scan?.status,
  );

  if (scanLoading) {
    return <LoadingState message="Loading scan details…" variant="page" />;
  }

  if (!scan) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-text-primary">Scan not found</h1>
        <p className="mt-2 text-text-secondary">
          The scan you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
    );
  }

  const isActive = scan.status === 'running' || scan.status === 'pending';
  const isMobileScan =
    scan.assetType === 'mobile_app' ||
    scan.assetUrl?.startsWith('mobile://') ||
    scan.assetUrl?.startsWith('android://') ||
    scan.assetUrl?.startsWith('ios://');
  const workerHint = isMobileScan
    ? 'Make sure the mobile scanner worker is running: pnpm --filter @accessshield/mobile-scanner worker'
    : 'Make sure the API scan worker is running: pnpm --filter @accessshield/api dev:worker';
  const severityCounts = (violationsData?.rows ?? []).reduce(
    (acc, row) => {
      acc[row.impact] = (acc[row.impact] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const subtitle =
    scan.status === 'completed' && scan.completedAt
      ? `Completed on ${formatIndianDate(scan.completedAt)}`
      : `Status: ${statusLabel(scan.status)}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Scan Results</h1>
        <p className="mt-2 text-text-secondary">
          {subtitle} · Score: {scan.score ?? '—'}/100
          {scan.violationCount > 0 ? ` · ${scan.violationCount} violations` : ''}
        </p>
      </div>

      {/* Mobile Scan Summary - shown only for mobile scans */}
      {isMobileScan && scan.mobileScanId && <MobileScanSummary mobileScanId={scan.mobileScanId} />}

      {isActive && (
        <div
          className="rounded-lg border border-primary-200 bg-primary-50 p-4"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary-600" aria-hidden="true" />
            <p className="text-sm font-medium text-primary-700">
              {scan.status === 'pending' ? 'Scan queued — waiting for worker' : 'Scan in progress'}
            </p>
          </div>

          {scan.progress ? (
            <>
              <Progress
                value={
                  scan.progress.pagesTotal > 0
                    ? (scan.progress.pagesScanned / scan.progress.pagesTotal) * 100
                    : 0
                }
                className="mb-2"
              />
              <p className="text-xs text-primary-600">
                Pages scanned: {scan.progress.pagesScanned} of {scan.progress.pagesTotal}
              </p>
              {scan.progress.currentUrl && (
                <p className="text-xs text-primary-600 truncate">
                  Current page: {scan.progress.currentUrl}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-primary-600">
              {scan.status === 'pending' ? workerHint : 'Starting scan…'}
            </p>
          )}
        </div>
      )}

      {scan.status === 'completed' && scan.errorMessage && (
        <div className="rounded-lg border border-warning-200 bg-warning-100 p-4" role="status">
          <p className="text-sm text-warning-700">{scan.errorMessage}</p>
        </div>
      )}

      {scan.status === 'completed' && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Object.entries(SEVERITY_CONFIG).map(([severity, config]) => {
              const Icon =
                severity === 'critical' || severity === 'serious' ? AlertCircle : CheckCircle;

              return (
                <div
                  key={severity}
                  className={`flex items-center gap-3 rounded-lg border p-4 ${config.color}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <div>
                    <p className="text-2xl font-bold">{severityCounts[severity] ?? 0}</p>
                    <p className="text-sm">{config.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <ViolationFilters filters={filters} onFiltersChange={setFilters} />

          <ViolationTable
            violations={violationsData?.rows ?? []}
            isLoading={violationsLoading}
            total={violationsData?.meta?.total ?? scan.violationCount}
          />
        </>
      )}

      {scan.status === 'failed' && (
        <div className="rounded-lg border border-error-200 bg-error-50 p-4" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-error-700" aria-hidden="true" />
            <h3 className="font-medium text-error-700">Scan Failed</h3>
          </div>
          <p className="mt-2 text-sm text-error-600">
            {scan.errorMessage || 'An error occurred during scanning'}
          </p>
        </div>
      )}
    </div>
  );
}
