'use client';

import { Button, Select, Input } from '@accessshield/ui';
import { Search, X } from 'lucide-react';

const ALL = 'all';

export interface ViolationFiltersProps {
  filters: {
    severity: string;
    standard: string;
    status: string;
    search: string;
  };
  onFiltersChange: (filters: ViolationFiltersProps['filters']) => void;
}

export function ViolationFilters({ filters, onFiltersChange }: ViolationFiltersProps) {
  const handleReset = () => {
    onFiltersChange({
      severity: ALL,
      standard: ALL,
      status: ALL,
      search: '',
    });
  };

  const hasFilters =
    filters.search !== '' ||
    filters.severity !== ALL ||
    filters.standard !== ALL ||
    filters.status !== ALL;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            label="Search violations"
            placeholder="Search by URL or description..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            aria-label="Search violations by URL or description"
            leftIcon={<Search className="h-4 w-4 text-gray-400" aria-hidden="true" />}
          />
        </div>

        <div className="min-w-[150px]">
          <Select
            label="Severity"
            value={filters.severity || ALL}
            onValueChange={(severity) => onFiltersChange({ ...filters, severity })}
            options={[
              { value: ALL, label: 'All' },
              { value: 'critical', label: 'Critical' },
              { value: 'serious', label: 'Serious' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'minor', label: 'Minor' },
            ]}
          />
        </div>

        <div className="min-w-[150px]">
          <Select
            label="Standard"
            value={filters.standard || ALL}
            onValueChange={(standard) => onFiltersChange({ ...filters, standard })}
            options={[
              { value: ALL, label: 'All' },
              { value: 'wcag22', label: 'WCAG 2.2' },
              { value: 'is17802', label: 'IS 17802' },
              { value: 'gigw3', label: 'GIGW 3.0' },
              { value: 'sebi', label: 'SEBI' },
            ]}
          />
        </div>

        <div className="min-w-[150px]">
          <Select
            label="Status"
            value={filters.status || ALL}
            onValueChange={(status) => onFiltersChange({ ...filters, status })}
            options={[
              { value: ALL, label: 'All' },
              { value: 'open', label: 'Open' },
              { value: 'fixed', label: 'Fixed' },
              { value: 'dismissed', label: 'Dismissed' },
            ]}
          />
        </div>

        {hasFilters && (
          <Button variant="outline" onClick={handleReset} size="sm">
            <X className="mr-2 h-4 w-4" aria-hidden="true" />
            Reset
          </Button>
        )}
      </div>

      {hasFilters && (
        <p className="mt-3 text-sm text-text-tertiary" role="status" aria-live="polite">
          Filters applied
        </p>
      )}
    </div>
  );
}
