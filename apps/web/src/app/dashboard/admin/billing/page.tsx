'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Select } from '@accessshield/ui';
import { AdminBadge, AdminPageHeader } from '@/components/dashboard/admin';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import {
  fetchAdminInvoices,
  formatINRFromPaise,
  updateAdminInvoice,
} from '@/lib/api/admin';

const STATUS_FILTER = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent (pending)' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid (received)' },
  { value: 'cancelled', label: 'Cancelled' },
];

function statusTone(status: string): 'success' | 'error' | 'info' | 'neutral' {
  if (status === 'paid') return 'success';
  if (status === 'overdue') return 'error';
  if (status === 'sent' || status === 'draft') return 'info';
  return 'neutral';
}

export default function AdminBillingPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'invoices', page, status],
    queryFn: () => fetchAdminInvoices({ page, status }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string }) =>
      updateAdminInvoice(id, { status: next }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'invoices'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  const rows = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Billing"
        description="Invoices across all organisations — mark payments received or void drafts. Razorpay webhook auto-reconcile is separate."
      />

      <div className="max-w-xs">
        <Select
          label="Status"
          options={STATUS_FILTER}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
      </div>

      {isLoading && <LoadingState message="Loading invoices…" variant="inline" size="sm" />}
      {error && (
        <p className="text-sm text-error-700" role="alert">
          Failed to load invoices.
        </p>
      )}

      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-text-tertiary">No invoices yet.</p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border bg-white">
          <table className="w-full min-w-[800px]">
            <thead className="border-b border-border bg-bg-secondary">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                  Invoice
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                  Organisation
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                  Amount
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                  Due
                </th>
                <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => (
                <tr key={inv.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-sm font-medium">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/dashboard/admin/organisations/${inv.organisationId}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {inv.organisationName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">{formatINRFromPaise(inv.totalPaise)}</td>
                  <td className="px-4 py-3">
                    <AdminBadge tone={statusTone(inv.status)} label={inv.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {new Date(inv.dueDate).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {inv.status !== 'paid' && (
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={updateMutation.isPending}
                          onClick={() => updateMutation.mutate({ id: inv.id, next: 'paid' })}
                        >
                          Mark paid
                        </Button>
                      )}
                      {inv.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateMutation.isPending}
                          onClick={() => updateMutation.mutate({ id: inv.id, next: 'cancelled' })}
                        >
                          Void
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-between gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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
      )}
    </div>
  );
}
