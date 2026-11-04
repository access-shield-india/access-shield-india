'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button, Select } from '@accessshield/ui';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import { getAccessToken } from '@/lib/api/client';
import { PRICING_CATALOG } from '@/lib/pricing/catalog';
import { cn } from '@/lib/utils';

interface Engagement {
  id: string;
  type: string;
  title: string;
  status: string;
  dueAt: string | null;
  notes: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  requested: 'bg-primary-100 text-primary-700 border-primary-300',
  scoped: 'bg-accent-100 text-accent-700 border-accent-600/30',
  in_progress: 'bg-warning-100 text-warning-700 border-warning-100',
  delivered: 'bg-success-100 text-success-700 border-success-100',
  cancelled: 'bg-gray-100 text-gray-700 border-gray-200',
};

async function fetchEngagements(token: string): Promise<Engagement[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/engagements`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load engagements');
  const json = await res.json();
  return json.data;
}

export default function EngagementsPage() {
  const queryClient = useQueryClient();
  const [type, setType] = useState('audit-web');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['engagements'],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchEngagements(token);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/engagements`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, title: title || `Request: ${type}`, notes: notes || undefined }),
      });
      if (!res.ok) throw new Error('Failed to create engagement');
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['engagements'] });
      setTitle('');
      setNotes('');
    },
  });

  const typeOptions = PRICING_CATALOG.expertServices.map((s) => ({
    value: s.id,
    label: `${s.name} (from ₹${s.priceInr.toLocaleString('en-IN')})`,
  }));

  if (isLoading) {
    return <LoadingState message="Loading engagements…" />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">Expert engagements</h1>
        <p className="mt-2 text-base text-text-secondary">
          Track audits, AT testing, remediation, and SEBI packs. Software alone is not a
          conformance certificate — expert path recommended for RPwD / SEBI evidence.
        </p>
        <p className="mt-2 text-sm text-text-tertiary">{PRICING_CATALOG.automationDisclaimer}</p>
      </header>

      <section
        aria-labelledby="request-engagement"
        className="rounded-lg border border-border bg-white p-6"
      >
        <h2 id="request-engagement" className="text-lg font-semibold text-text-primary">
          Request engagement
        </h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <Select
            label="Service type"
            options={typeOptions}
            value={type}
            onChange={setType}
          />
          <div className="space-y-1.5">
            <label htmlFor="eng-title" className="text-sm font-medium text-text-primary">
              Title
            </label>
            <input
              id="eng-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
              placeholder="e.g. Q2 WCAG audit — investor portal"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="eng-notes" className="text-sm font-medium text-text-primary">
              Notes
            </label>
            <textarea
              id="eng-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
              placeholder="Domains, deadlines, SEBI yes/no…"
            />
          </div>
          <Button type="submit" variant="primary" disabled={createMutation.isPending}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {createMutation.isPending ? 'Submitting…' : 'Submit request'}
          </Button>
          {createMutation.isError && (
            <p role="alert" className="text-sm text-error-700">
              Could not create engagement. Try again or email sales.
            </p>
          )}
        </form>
      </section>

      <section aria-labelledby="engagement-list">
        <h2 id="engagement-list" className="text-lg font-semibold text-text-primary">
          Your engagements
        </h2>
        {data.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-text-tertiary">
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            No engagements yet — request an audit after your free scan.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.map((eng) => (
              <li
                key={eng.id}
                className="rounded-lg border border-border bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-text-primary">{eng.title}</p>
                    <p className="text-sm text-text-secondary">{eng.type}</p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                      STATUS_STYLES[eng.status] ?? STATUS_STYLES.requested,
                    )}
                  >
                    {eng.status.replace('_', ' ')}
                  </span>
                </div>
                {eng.notes && <p className="mt-2 text-sm text-text-secondary">{eng.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
