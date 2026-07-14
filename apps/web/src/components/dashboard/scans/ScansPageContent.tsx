'use client';

import Link from 'next/link';
import { FlaskConical } from 'lucide-react';
import { getButtonStyle, getButtonThemeClassName } from '@accessshield/ui';
import { ScanHistoryTable } from '@/components/dashboard/scans/ScanHistoryTable';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import { useScans } from '@/lib/hooks/useApi';

export function ScansPageContent() {
  const { data, isLoading } = useScans({ limit: 50 });
  const scans = data?.rows ?? [];
  const total = data?.meta?.total ?? scans.length;

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary-50 to-white border border-gray-200 rounded-2xl p-8 shadow-lg flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Scans</h1>
          <p className="text-lg text-gray-600 font-medium">
            History of accessibility scans and their results across your assets
          </p>
        </div>
        <Link
          href="/dashboard/scans/test"
          className={getButtonThemeClassName('secondary', 'md')}
          data-as-btn="secondary"
          style={getButtonStyle('secondary')}
        >
          <FlaskConical className="mr-2 h-5 w-5" aria-hidden="true" />
          Scanner test lab
        </Link>
      </div>

      {isLoading ? (
        <LoadingState message="Loading scan history…" variant="card" />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <ScanHistoryTable scans={scans} isLoading={false} total={total} />
        </div>
      )}
    </div>
  );
}
