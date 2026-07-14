'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  createAdminOrganisation,
  fetchAdminOrganisations,
  isWidgetOn,
  type AdminOrganisation,
} from '@/lib/api/admin';
import { AdminBadge, AdminPageHeader } from '@/components/dashboard/admin';
import { Button, Input, Modal, Select } from '@accessshield/ui';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

const PLAN_OPTIONS = [
  { value: 'trial', label: 'Trial' },
  { value: 'starter', label: 'Free' },
  { value: 'widget', label: 'Widget Only' },
  { value: 'compliance_shield', label: 'Stay Compliant' },
  { value: 'regulatory_defense', label: 'Regulatory Defense' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'government', label: 'Government' },
];

function formatPlan(plan: string): string {
  return plan.replace(/_/g, ' ');
}

export default function AdminOrganisationsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [name, setName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [planTier, setPlanTier] = useState('starter');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'organisations', search],
    queryFn: () => fetchAdminOrganisations(1, search),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createAdminOrganisation({
        name,
        planTier,
        billingEmail: billingEmail || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organisations'] });
      setModalOpen(false);
      setName('');
      setBillingEmail('');
      setPlanTier('starter');
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const orgs: AdminOrganisation[] = data?.data ?? [];

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Organisations"
        description="Create and manage customer tenants."
        actions={
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            Create organisation
          </Button>
        }
      />

      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(searchInput.trim());
        }}
      >
        <Input
          label="Search"
          placeholder="Name or slug…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          containerClassName="flex-1 max-w-md"
        />
        <Button type="submit" variant="secondary" size="sm">
          Search
        </Button>
      </form>

      {isLoading ? (
        <LoadingState message="Loading organisations…" variant="inline" size="sm" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200/90 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-text-tertiary">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Plan</th>
                <th className="px-4 py-2.5 font-medium">Users</th>
                <th className="px-4 py-2.5 font-medium">Assets</th>
                <th className="px-4 py-2.5 font-medium">Scans</th>
                <th className="px-4 py-2.5 font-medium">Widget</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-text-tertiary">
                    No organisations found.
                  </td>
                </tr>
              )}
              {orgs.map((org) => (
                <tr key={org.id} className="transition-colors hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 font-medium text-text-primary">{org.name}</td>
                  <td className="px-4 py-2.5 capitalize text-text-secondary">
                    {formatPlan(org.planTier)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-text-secondary">
                    {org.userCount ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-text-secondary">
                    {org.assetCount ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-text-secondary">
                    {org.scansThisMonth ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <AdminBadge
                      label={isWidgetOn(org.widgetEnabled) ? 'On' : 'Off'}
                      tone={isWidgetOn(org.widgetEnabled) ? 'success' : 'error'}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <AdminBadge
                      label={org.isActive ? 'Active' : 'Suspended'}
                      tone={org.isActive ? 'success' : 'neutral'}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/dashboard/admin/organisations/${org.id}`}
                      className="text-sm font-medium text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create organisation">
        <div className="space-y-4">
          <Input
            label="Organisation name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Billing email"
            type="email"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
          />
          <Select label="Plan" options={PLAN_OPTIONS} value={planTier} onChange={setPlanTier} />
          {error && (
            <p className="text-sm text-error-700" role="alert">
              {error}
            </p>
          )}
          <Button
            variant="primary"
            className="w-full"
            disabled={!name.trim()}
            isLoading={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Create
          </Button>
        </div>
      </Modal>
    </div>
  );
}
