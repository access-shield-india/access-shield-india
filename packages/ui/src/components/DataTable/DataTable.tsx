'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { cn, focusRing } from '../../lib/cn';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon } from '../../lib/icons';
import { Button } from '../Button/index';

export interface DataTableColumn<T> {
  id: string;
  header: string;
  accessor: (row: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  pageSize?: number;
  emptyMessage?: string;
  caption?: string;
  className?: string;
}

type SortDirection = 'ascending' | 'descending' | 'none';

export function DataTable<T>({
  columns,
  data,
  getRowId,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  pageSize = 10,
  emptyMessage = 'No data available',
  caption,
  className,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('none');
  const [page, setPage] = useState(0);

  const handleSort = useCallback(
    (columnId: string) => {
      if (sortColumn === columnId) {
        setSortDirection((d) =>
          d === 'ascending' ? 'descending' : d === 'descending' ? 'none' : 'ascending',
        );
        if (sortDirection === 'descending') setSortColumn(null);
      } else {
        setSortColumn(columnId);
        setSortDirection('ascending');
      }
    },
    [sortColumn, sortDirection],
  );

  const sortedData = useMemo(() => {
    if (!sortColumn || sortDirection === 'none') return data;
    const col = columns.find((c) => c.id === sortColumn);
    if (!col?.sortValue) return data;
    const sorted = [...data].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return sortDirection === 'ascending' ? -1 : 1;
      if (av > bv) return sortDirection === 'ascending' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [data, sortColumn, sortDirection, columns]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const pageData = sortedData.slice(page * pageSize, (page + 1) * pageSize);
  const allPageSelected =
    pageData.length > 0 && pageData.every((row) => selectedIds.includes(getRowId(row)));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    const pageIds = pageData.map(getRowId);
    if (allPageSelected) {
      onSelectionChange(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      onSelectionChange([...new Set([...selectedIds, ...pageIds])]);
    }
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id],
    );
  };

  if (data.length === 0) {
    return (
      <div
        role="status"
        className={cn('rounded-lg border border-border bg-white p-12 text-center', className)}
      >
        <p className="text-text-secondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border', className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-full border-collapse text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="sticky top-0 z-10 bg-primary-light">
            <tr>
              {selectable && (
                <th scope="col" className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    checked={allPageSelected}
                    onChange={toggleAll}
                    className={cn('h-4 w-4 rounded border-border', focusRing)}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  aria-sort={
                    sortColumn === col.id && sortDirection !== 'none'
                      ? sortDirection
                      : col.sortable
                        ? 'none'
                        : undefined
                  }
                  className="px-4 py-3 font-semibold text-text-primary"
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.id)}
                      className={cn(
                        'inline-flex min-h-11 items-center gap-1 font-semibold',
                        focusRing,
                      )}
                    >
                      {col.header}
                      {sortColumn === col.id && sortDirection === 'ascending' && (
                        <ChevronUpIcon size={14} aria-hidden="true" />
                      )}
                      {sortColumn === col.id && sortDirection === 'descending' && (
                        <ChevronDownIcon size={14} aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row) => {
              const rowId = getRowId(row);
              const isSelected = selectedIds.includes(rowId);
              return (
                <tr
                  key={rowId}
                  className={cn('border-t border-border', isSelected && 'bg-primary-light/50')}
                >
                  {selectable && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select row ${rowId}`}
                        checked={isSelected}
                        onChange={() => toggleRow(rowId)}
                        className={cn('h-4 w-4 rounded border-border', focusRing)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.id} className="px-4 py-3 text-text-secondary">
                      {col.accessor(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <nav
        aria-label="Table pagination"
        className="flex items-center justify-between border-t border-border bg-white px-4 py-3"
      >
        <p className="text-sm text-text-tertiary" aria-live="polite">
          Page {page + 1} of {totalPages} ({sortedData.length} rows)
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            aria-label="Previous page"
            disabled={page === 0}
            disabledReason="Already on first page"
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeftIcon size={16} aria-hidden="true" />
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            aria-label="Next page"
            disabled={page >= totalPages - 1}
            disabledReason="Already on last page"
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRightIcon size={16} aria-hidden="true" />
          </Button>
        </div>
      </nav>
    </div>
  );
}

DataTable.displayName = 'DataTable';
