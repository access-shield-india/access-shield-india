'use client';

import { useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Input } from '@accessshield/ui';
import { Select } from '@accessshield/ui';
import { Button } from '@accessshield/ui';
import { X, Search } from 'lucide-react';
import { Badge } from '@accessshield/ui';
import { useAssets } from '@/lib/hooks/useApi';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'wont_fix', label: "Won't Fix" },
];

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'serious', label: 'Serious' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'minor', label: 'Minor' },
];

const ASSIGNEE_OPTIONS = [
  { value: 'all', label: 'All assignees' },
  { value: 'me', label: 'Assigned to me' },
  { value: 'unassigned', label: 'Unassigned' },
];

interface IssueFiltersProps {
  searchParams: {
    search?: string;
    status?: string;
    severity?: string;
    assignee?: string;
    assetId?: string;
    wcagCriterion?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export function IssueFilters({ searchParams }: IssueFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchValue, setSearchValue] = useState(searchParams.search ?? '');
  const { data: assets = [], isLoading: assetsLoading } = useAssets();

  const assetOptions = useMemo(
    () => [
      { value: 'all', label: 'All assets' },
      ...assets.map((asset) => ({ value: asset.id, label: asset.name })),
    ],
    [assets],
  );

  const activeFilterCount = Object.entries(searchParams).filter(
    ([key, value]) => value && value !== 'all' && key !== 'search',
  ).length;

  function updateFilters(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams();

    // Merge existing params with updates; reset pagination when filters change
    const merged = { ...searchParams, ...updates, page: undefined };
    Object.entries(merged).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value);
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateFilters({ search: searchValue || undefined });
  }

  function clearFilters() {
    router.push(pathname);
    setSearchValue('');
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">Filters</h2>
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active
            </Badge>
            <Button variant="ghost" size="sm" onClick={clearFilters} aria-label="Clear all filters">
              <X className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Clear filters
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Search — full width */}
        <form onSubmit={handleSearchSubmit}>
          <Input
            type="search"
            label="Search"
            placeholder="Search by title or description"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            aria-label="Search issues"
            leftIcon={<Search className="h-4 w-4" aria-hidden="true" />}
          />
        </form>

        {/* Primary filters — equal columns */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={searchParams.status ?? 'all'}
            onValueChange={(value) =>
              updateFilters({ status: value === 'all' ? undefined : value })
            }
          />

          <Select
            label="Severity"
            options={SEVERITY_OPTIONS}
            value={searchParams.severity ?? 'all'}
            onValueChange={(value) =>
              updateFilters({ severity: value === 'all' ? undefined : value })
            }
          />

          <Select
            label="Assignee"
            options={ASSIGNEE_OPTIONS}
            value={searchParams.assignee ?? 'all'}
            onValueChange={(value) =>
              updateFilters({ assignee: value === 'all' ? undefined : value })
            }
          />

          <Select
            label="Asset"
            options={assetOptions}
            value={searchParams.assetId ?? 'all'}
            onValueChange={(value) =>
              updateFilters({ assetId: value === 'all' ? undefined : value })
            }
            disabled={assetsLoading}
            searchable
            placeholder={assetsLoading ? 'Please wait, loading assets…' : 'All assets'}
          />
        </div>

        {/* WCAG + date range */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            type="text"
            label="WCAG Criterion"
            placeholder="e.g., 1.1.1"
            value={searchParams.wcagCriterion ?? ''}
            onChange={(e) => updateFilters({ wcagCriterion: e.target.value || undefined })}
          />

          <Input
            type="date"
            label="From date"
            value={searchParams.dateFrom ?? ''}
            onChange={(e) => updateFilters({ dateFrom: e.target.value || undefined })}
            pattern="\d{2}/\d{2}/\d{4}"
          />

          <Input
            type="date"
            label="To date"
            value={searchParams.dateTo ?? ''}
            onChange={(e) => updateFilters({ dateTo: e.target.value || undefined })}
            pattern="\d{2}/\d{2}/\d{4}"
          />
        </div>
      </div>
    </div>
  );
}
