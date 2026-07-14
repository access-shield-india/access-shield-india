'use client';

import { DataTable, Badge, type DataTableColumn } from '@accessshield/ui';
import { ExternalLink, AlertCircle, AlertTriangle, Info, Minus } from 'lucide-react';
import { truncate } from '@/lib/utils';
import type { ViolationRow } from '@/lib/api/types';
import type { IssueSeverity } from '@accessshield/types';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

const SEVERITY_CONFIG = {
  critical: { icon: AlertCircle, color: 'error' },
  serious: { icon: AlertTriangle, color: 'warning' },
  moderate: { icon: Info, color: 'info' },
  minor: { icon: Minus, color: 'secondary' },
} as const;

export interface ViolationTableProps {
  violations: ViolationRow[];
  isLoading: boolean;
  total: number;
}

export function ViolationTable({ violations, isLoading, total }: ViolationTableProps) {
  const columns: DataTableColumn<ViolationRow>[] = [
    {
      id: 'impact',
      header: 'Severity',
      sortable: true,
      sortValue: (violation) => violation.impact,
      accessor: (violation) => {
        const config = SEVERITY_CONFIG[violation.impact as IssueSeverity];
        const Icon = config.icon;
        return (
          <Badge
            variant={config.color as 'error' | 'warning' | 'info' | 'secondary'}
            className="inline-flex items-center gap-1"
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
            <span className="capitalize">{violation.impact}</span>
          </Badge>
        );
      },
    },
    {
      id: 'wcagCriteria',
      header: 'WCAG',
      accessor: (violation) =>
        violation.wcagCriteria && violation.wcagCriteria.length > 0 ? (
          <a
            href={`https://www.w3.org/WAI/WCAG22/Understanding/${violation.wcagCriteria[0]!.replace(/\./g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded"
          >
            {violation.wcagCriteria[0]}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ) : (
          <span className="text-text-tertiary">—</span>
        ),
    },
    {
      id: 'description',
      header: 'Description',
      accessor: (violation) => (
        <span className="text-sm" title={violation.description}>
          {truncate(violation.description, 80)}
        </span>
      ),
    },
    {
      id: 'pageUrl',
      header: 'Page URL',
      accessor: (violation) => (
        <a
          href={violation.pageUrl ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded truncate block max-w-xs"
          title={violation.pageUrl ?? undefined}
        >
          {truncate(violation.pageUrl ?? '—', 50)}
        </a>
      ),
    },
    {
      id: 'selector',
      header: 'Element',
      accessor: (violation) => (
        <code
          className="text-xs bg-gray-100 px-2 py-1 rounded"
          title={violation.selector ?? undefined}
        >
          {truncate(violation.selector || '—', 30)}
        </code>
      ),
    },
  ];

  if (isLoading) {
    return <LoadingState message="Loading violations…" variant="card" />;
  }

  return (
    <div>
      <DataTable
        columns={columns}
        data={violations}
        getRowId={(row) => row.id}
        emptyMessage="No violations found"
        caption="Scan violations"
      />
      {total > 0 && (
        <p className="mt-4 text-sm text-text-tertiary" role="status">
          Showing {violations.length} of {total} violations
        </p>
      )}
    </div>
  );
}
