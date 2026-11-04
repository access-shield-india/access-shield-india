'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Select } from '@accessshield/ui';
import { AdminBadge, AdminPageHeader, AdminTabs } from '@/components/dashboard/admin';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import {
  fetchAdminEngagements,
  fetchAdminEnterpriseQuotes,
  fetchAdminFunnelEvents,
  fetchAdminWaitlist,
  updateAdminEngagement,
  updateAdminEnterpriseQuote,
  updateAdminWaitlist,
} from '@/lib/api/admin';

type TabId = 'quotes' | 'waitlist' | 'engagements' | 'funnel';

const TABS = [
  { id: 'quotes' as const, label: 'Enterprise quotes' },
  { id: 'waitlist' as const, label: 'Waitlist' },
  { id: 'engagements' as const, label: 'Engagements' },
  { id: 'funnel' as const, label: 'Funnel activity' },
];

const QUOTE_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const WAITLIST_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'converted', label: 'Converted' },
  { value: 'closed', label: 'Closed' },
];

const ENGAGEMENT_STATUSES = [
  { value: 'requested', label: 'Requested' },
  { value: 'scoped', label: 'Scoped' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AdminInquiriesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>('quotes');

  const quotesQuery = useQuery({
    queryKey: ['admin', 'quotes'],
    queryFn: () => fetchAdminEnterpriseQuotes({ page: 1 }),
    enabled: tab === 'quotes',
  });
  const waitlistQuery = useQuery({
    queryKey: ['admin', 'waitlist'],
    queryFn: () => fetchAdminWaitlist({ page: 1 }),
    enabled: tab === 'waitlist',
  });
  const engagementsQuery = useQuery({
    queryKey: ['admin', 'engagements-all'],
    queryFn: () => fetchAdminEngagements({ page: 1 }),
    enabled: tab === 'engagements',
  });
  const funnelQuery = useQuery({
    queryKey: ['admin', 'funnel'],
    queryFn: () => fetchAdminFunnelEvents({ page: 1 }),
    enabled: tab === 'funnel',
  });

  const quoteMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateAdminEnterpriseQuote(id, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'quotes'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  const waitlistMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateAdminWaitlist(id, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'waitlist'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  const engagementMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateAdminEngagement(id, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'engagements-all'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Inquiries"
        description="Enterprise quotes, waitlist signups, expert engagements, and free-scan funnel events."
      />

      <AdminTabs
        tabs={TABS}
        activeTab={tab}
        onChange={(id) => setTab(id as TabId)}
        ariaLabel="Inquiry types"
      />

      {tab === 'quotes' && (
        <section aria-label="Enterprise quotes">
          {quotesQuery.isLoading && <LoadingState message="Loading quotes…" variant="inline" />}
          {(quotesQuery.data?.data ?? []).length === 0 && !quotesQuery.isLoading && (
            <p className="text-sm text-text-tertiary">No enterprise quotes yet.</p>
          )}
          <ul className="space-y-3">
            {(quotesQuery.data?.data ?? []).map((q) => (
              <li key={q.id} className="rounded-lg border border-border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-text-primary">{q.company}</p>
                    <p className="text-sm text-text-secondary">
                      {q.contactName} · {q.contactEmail}
                    </p>
                    <p className="mt-1 text-xs text-text-tertiary">
                      Domains: {q.domainsCount} · Apps: {q.appsCount} · SEBI:{' '}
                      {q.sebiRequired ? 'yes' : 'no'} · Seats: {q.trainingSeats}
                    </p>
                    {q.notes && <p className="mt-2 text-sm text-text-secondary">{q.notes}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <AdminBadge
                      tone={q.status === 'new' ? 'info' : 'neutral'}
                      label={q.status}
                    />
                    <Select
                      label="Update status"
                      options={QUOTE_STATUSES}
                      value={q.status}
                      onChange={(status) => quoteMutation.mutate({ id: q.id, status })}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'waitlist' && (
        <section aria-label="Waitlist">
          {waitlistQuery.isLoading && <LoadingState message="Loading waitlist…" variant="inline" />}
          <ul className="space-y-3">
            {(waitlistQuery.data?.data ?? []).map((w) => (
              <li key={w.id} className="rounded-lg border border-border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-text-primary">{w.name}</p>
                    <p className="text-sm text-text-secondary">
                      {w.email} · {w.company} ({w.companySize})
                    </p>
                  </div>
                  <Select
                    label="Status"
                    options={WAITLIST_STATUSES}
                    value={w.status}
                    onChange={(status) => waitlistMutation.mutate({ id: w.id, status })}
                  />
                </div>
              </li>
            ))}
          </ul>
          {(waitlistQuery.data?.data ?? []).length === 0 && !waitlistQuery.isLoading && (
            <p className="text-sm text-text-tertiary">No waitlist signups.</p>
          )}
        </section>
      )}

      {tab === 'engagements' && (
        <section aria-label="Engagements">
          {engagementsQuery.isLoading && (
            <LoadingState message="Loading engagements…" variant="inline" />
          )}
          <ul className="space-y-3">
            {(engagementsQuery.data?.data ?? []).map((e) => (
              <li key={e.id} className="rounded-lg border border-border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-text-primary">{e.title}</p>
                    <p className="text-sm text-text-secondary">
                      <Link
                        href={`/dashboard/admin/organisations/${e.organisationId}`}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        {e.organisationName}
                      </Link>{' '}
                      · {e.type}
                    </p>
                    {e.notes && <p className="mt-1 text-sm text-text-tertiary">{e.notes}</p>}
                  </div>
                  <Select
                    label="Status"
                    options={ENGAGEMENT_STATUSES}
                    value={e.status}
                    onChange={(status) => engagementMutation.mutate({ id: e.id, status })}
                  />
                </div>
              </li>
            ))}
          </ul>
          {(engagementsQuery.data?.data ?? []).length === 0 && !engagementsQuery.isLoading && (
            <p className="text-sm text-text-tertiary">No engagements.</p>
          )}
        </section>
      )}

      {tab === 'funnel' && (
        <section aria-label="Funnel events">
          {funnelQuery.isLoading && <LoadingState message="Loading funnel…" variant="inline" />}
          <div className="overflow-x-auto rounded-lg border border-border bg-white">
            <table className="w-full min-w-[560px]">
              <thead className="border-b border-border bg-bg-secondary">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                    Event
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                    Path
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                    When
                  </th>
                </tr>
              </thead>
              <tbody>
                {(funnelQuery.data?.data ?? []).map((f) => (
                  <tr key={f.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-sm font-medium">{f.event}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{f.path ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {new Date(f.createdAt).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(funnelQuery.data?.data ?? []).length === 0 && !funnelQuery.isLoading && (
            <p className="mt-3 text-sm text-text-tertiary">No funnel events yet.</p>
          )}
          <p className="mt-2 text-xs text-text-tertiary">
            Read-only activity feed from free scan and upgrade CTAs.
          </p>
        </section>
      )}

      {(quoteMutation.isError || waitlistMutation.isError || engagementMutation.isError) && (
        <p className="text-sm text-error-700" role="alert">
          Update failed. Try again.
        </p>
      )}
    </div>
  );
}
