'use client';

import { AlertCircle, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getAccessToken } from '@/lib/api/client';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import type { IssueStats } from '@/lib/api/types';

const STAT_CONFIG = [
  {
    key: 'openCount' as const,
    label: 'Open',
    icon: AlertCircle,
    bg: 'bg-error-100',
    text: 'text-error-700',
    border: 'border-error-200',
  },
  {
    key: 'inProgressCount' as const,
    label: 'In Progress',
    icon: Clock,
    bg: 'bg-accent-100',
    text: 'text-accent-700',
    border: 'border-accent-600',
  },
  {
    key: 'resolvedCount' as const,
    label: 'Resolved',
    icon: CheckCircle,
    bg: 'bg-success-100',
    text: 'text-success-700',
    border: 'border-success-100',
  },
  {
    key: 'criticalCount' as const,
    label: 'Critical',
    icon: AlertTriangle,
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
  },
];

async function fetchIssueStats(token: string): Promise<IssueStats> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/issues/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch issue stats');
  const json = await response.json();
  return json.data;
}

export function IssueStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['issue-stats'],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchIssueStats(token);
    },
  });

  if (isLoading || !stats) {
    return (
      <LoadingState message="Please wait, loading issue statistics…" variant="inline" size="sm" />
    );
  }

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      role="region"
      aria-label="Issue statistics"
    >
      {STAT_CONFIG.map((config) => {
        const Icon = config.icon;
        const count = stats[config.key];

        return (
          <div key={config.key} className={`rounded-lg border p-4 ${config.bg} ${config.border}`}>
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${config.bg}`}
                aria-hidden="true"
              >
                <Icon className={`h-5 w-5 ${config.text}`} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-secondary">{config.label}</p>
                <p className={`text-2xl font-bold ${config.text}`}>{count}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
