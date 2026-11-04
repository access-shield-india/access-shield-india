'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Select } from '@accessshield/ui';
import { AdminBadge, AdminPageHeader } from '@/components/dashboard/admin';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import { fetchAdminUsers, updateAdminUser } from '@/lib/api/admin';

const ROLE_FILTER = [
  { value: '', label: 'All roles' },
  { value: 'super_admin', label: 'Super admin' },
  { value: 'customer_admin', label: 'Customer admin' },
  { value: 'accessibility_officer', label: 'Accessibility officer' },
  { value: 'developer', label: 'Developer' },
  { value: 'auditor', label: 'Auditor' },
];

const ACTIVE_FILTER = [
  { value: '', label: 'All statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Disabled' },
];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users', page, search, role, isActive],
    queryFn: () => fetchAdminUsers({ page, q: search, role, isActive }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) =>
      updateAdminUser(id, { isActive: next }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const rows = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        description="All registered logins across organisations. Disable blocks API access and Keycloak login."
      />

      <form
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(q.trim());
        }}
      >
        <div className="min-w-[200px] flex-1">
          <Input
            label="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Email, name, org…"
          />
        </div>
        <Select label="Role" options={ROLE_FILTER} value={role} onChange={setRole} />
        <Select
          label="Status"
          options={ACTIVE_FILTER}
          value={isActive}
          onChange={setIsActive}
        />
        <Button type="submit" variant="primary">
          Search
        </Button>
      </form>

      {isLoading && <LoadingState message="Loading users…" variant="inline" size="sm" />}
      {error && (
        <p className="text-sm text-error-700" role="alert">
          Failed to load users.
        </p>
      )}

      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-text-tertiary">No users match your filters.</p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border bg-white">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-border bg-bg-secondary">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                  User
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                  Organisation
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                  Role / plan
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-text-primary">{u.fullName ?? '—'}</p>
                    <p className="text-xs text-text-secondary">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/dashboard/admin/organisations/${u.organisationId}`}
                      className="font-medium text-primary-600 hover:text-primary-700"
                    >
                      {u.organisationName}
                    </Link>
                    {!u.orgActive && (
                      <span className="ml-2 text-xs text-error-700">(org suspended)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {u.role}
                    <br />
                    <span className="text-xs">{u.planTier}</span>
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge
                      tone={u.isActive ? 'success' : 'error'}
                      label={u.isActive ? 'Active' : 'Disabled'}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={toggleMutation.isPending}
                      onClick={() => toggleMutation.mutate({ id: u.id, next: !u.isActive })}
                    >
                      {u.isActive ? 'Disable' : 'Enable'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 20 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-text-secondary">
            Page {page} · {total} total
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
