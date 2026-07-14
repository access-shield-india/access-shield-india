'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Building2, Users } from 'lucide-react';
import { fetchAdminStats } from '@/lib/api/admin';
import { AdminPageHeader, AdminStatCard } from '@/components/dashboard/admin';
import { Button } from '@accessshield/ui';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

export default function AdminHomePage() {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: fetchAdminStats,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Platform overview"
        description="Monitor tenants, usage, and widget adoption across AccessShield India."
        actions={
          <Button variant="primary" size="sm" asChild>
            <Link href="/dashboard/admin/organisations">Manage organisations</Link>
          </Button>
        }
      />

      {isLoading && <LoadingState message="Loading platform stats…" variant="inline" size="sm" />}
      {error && (
        <p className="text-sm text-error-700" role="alert">
          Failed to load stats.
        </p>
      )}

      {stats && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminStatCard label="Organisations" value={stats.organisations} hint="Total tenants" />
          <AdminStatCard
            label="Active organisations"
            value={stats.activeOrganisations}
            hint="Not suspended"
          />
          <AdminStatCard
            label="Widgets enabled"
            value={stats.widgetsEnabled}
            hint="Remote kill-switch off"
          />
          <AdminStatCard label="Users" value={stats.users} hint="Across all tenants" />
          <AdminStatCard
            label="Scans this month"
            value={stats.scansThisMonth}
            hint="Platform-wide"
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/admin/organisations"
          className="group flex items-center gap-3 rounded-lg border border-gray-200/90 bg-white px-4 py-3 transition-colors hover:border-primary-200 hover:bg-primary-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-50 text-primary-600">
            <Building2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-medium text-text-primary">Organisations</span>
            <span className="block text-xs text-text-tertiary">Plans, users, widget control</span>
          </span>
        </Link>
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 py-3 text-text-tertiary">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-100">
            <Users className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-xs">
            User management is per-organisation from the org detail page.
          </span>
        </div>
      </div>
    </div>
  );
}
