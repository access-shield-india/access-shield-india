'use client';

import Link from 'next/link';
import {
  DataTable,
  Badge,
  getButtonStyle,
  getButtonThemeClassName,
  type DataTableColumn,
} from '@accessshield/ui';
import { ExternalLink } from 'lucide-react';
import { formatIndianDate, truncate } from '@/lib/utils';
import type { ScanListItem } from '@/lib/api/types';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

const STATUS_VARIANT: Record<ScanListItem['status'], 'success' | 'accent' | 'outline' | 'default'> =
  {
    completed: 'success',
    running: 'accent',
    pending: 'outline',
    failed: 'default',
  };

function statusLabel(status: ScanListItem['status']): string {
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

export interface ScanHistoryTableProps {
  scans: ScanListItem[];
  isLoading: boolean;
  total: number;
  showAsset?: boolean;
}

export function ScanHistoryTable({
  scans,
  isLoading,
  total,
  showAsset = true,
}: ScanHistoryTableProps) {
  const columns: DataTableColumn<ScanListItem>[] = [
    ...(showAsset
      ? [
          {
            id: 'asset',
            header: 'Asset',
            accessor: (scan: ScanListItem) => (
              <div>
                <Link
                  href={`/dashboard/scans/${scan.id}`}
                  className="font-medium text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded"
                >
                  {scan.assetName ?? 'Unknown asset'}
                </Link>
                {scan.assetUrl && (
                  <p className="mt-0.5 text-xs text-text-tertiary">{truncate(scan.assetUrl, 48)}</p>
                )}
              </div>
            ),
          } satisfies DataTableColumn<ScanListItem>,
        ]
      : []),
    {
      id: 'date',
      header: 'Date',
      sortable: true,
      sortValue: (scan) => scan.completedAt ?? scan.createdAt,
      accessor: (scan) => (
        <time dateTime={scan.completedAt ?? scan.createdAt}>
          {formatIndianDate(scan.completedAt ?? scan.createdAt)}
        </time>
      ),
    },
    {
      id: 'pagesScanned',
      header: 'Pages',
      accessor: (scan) => scan.pagesScanned,
    },
    {
      id: 'score',
      header: 'Score',
      sortable: true,
      sortValue: (scan) => scan.score ?? -1,
      accessor: (scan) => {
        if (scan.score === null) {
          return <span className="text-gray-400 font-medium">—</span>;
        }
        const scoreColor =
          scan.score >= 80
            ? 'bg-green-100 text-green-800 border-green-300'
            : scan.score >= 50
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : 'bg-red-100 text-red-800 border-red-300';
        return (
          <span
            className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold border ${scoreColor}`}
          >
            {scan.score}
          </span>
        );
      },
    },
    {
      id: 'violations',
      header: 'Issues',
      sortable: true,
      sortValue: (scan) => scan.violationCount,
      accessor: (scan) => scan.violationCount,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (scan) => {
        const statusClasses = {
          completed: 'bg-green-50 text-green-800 border border-green-300 font-semibold shadow-sm',
          running:
            'bg-blue-50 text-blue-800 border border-blue-300 font-semibold shadow-sm animate-pulse',
          pending: 'bg-gray-50 text-gray-700 border border-gray-300 font-semibold shadow-sm',
          failed: 'bg-red-50 text-red-800 border border-red-300 font-semibold shadow-sm',
        };
        return (
          <Badge variant={STATUS_VARIANT[scan.status]} className={statusClasses[scan.status]}>
            {statusLabel(scan.status)}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'View',
      accessor: (scan) => (
        <Link
          href={`/dashboard/scans/${scan.id}`}
          className={getButtonThemeClassName('outline', 'sm', 'min-w-11')}
          data-as-btn="outline"
          style={getButtonStyle('outline')}
          aria-label={`View scan results for ${scan.assetName ?? 'asset'}`}
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </Link>
      ),
    },
  ];

  if (isLoading) {
    return <LoadingState message="Loading scan history…" variant="card" />;
  }

  return (
    <div>
      <DataTable
        columns={columns}
        data={scans}
        emptyMessage="No scans yet. Run a scan from an asset to see results here."
        caption={`Scan history (${total} total)`}
        getRowId={(scan) => scan.id}
        pageSize={20}
      />
      {total > scans.length && (
        <p className="mt-4 text-sm text-text-tertiary" role="status">
          Showing {scans.length} of {total} scans
        </p>
      )}
    </div>
  );
}
