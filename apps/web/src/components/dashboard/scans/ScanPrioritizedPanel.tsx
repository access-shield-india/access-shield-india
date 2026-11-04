'use client';

import { useQuery } from '@tanstack/react-query';
import { Gauge } from 'lucide-react';
import { Badge } from '@accessshield/ui';
import { getAccessToken } from '@/lib/api/client';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import Link from 'next/link';

interface PrioritizedViolation {
  id: string;
  ruleId: string;
  impact: string;
  description?: string | null;
  pageUrl?: string | null;
  priorityScore: number;
  estimatedFixHours: number;
  scoreExplanation: string;
}

interface PrioritizedResponse {
  violations: PrioritizedViolation[];
  sprintRecommendation: PrioritizedViolation[];
  totalHours: number;
}

async function fetchPrioritized(
  token: string,
  scanId: string,
  sprintHours: number,
): Promise<PrioritizedResponse> {
  const params = new URLSearchParams({ sprintHours: String(sprintHours) });
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/scans/${scanId}/prioritized?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error('Failed to load prioritized violations');
  const json = (await response.json()) as { data: PrioritizedResponse };
  return json.data;
}

interface ScanPrioritizedPanelProps {
  scanId: string;
  /** Sprint capacity in hours for the recommended pick list */
  sprintHours?: number;
}

export function ScanPrioritizedPanel({ scanId, sprintHours = 16 }: ScanPrioritizedPanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['scan-prioritized', scanId, sprintHours],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchPrioritized(token, scanId, sprintHours);
    },
  });

  if (isLoading) {
    return <LoadingState message="Ranking violations by priority…" variant="card" />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-border bg-white p-4 text-sm text-text-secondary">
        Could not load priority ranking. Check Settings → Priority Score, then try again.
      </div>
    );
  }

  const top = data.violations.slice(0, 8);

  return (
    <section
      className="rounded-lg border border-border bg-white p-6"
      aria-labelledby="priority-backlog-heading"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100">
            <Gauge className="h-5 w-5 text-primary-700" aria-hidden="true" />
          </div>
          <div>
            <h2 id="priority-backlog-heading" className="text-lg font-semibold text-text-primary">
              Priority backlog
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Top risks for this scan · ~{data.totalHours.toFixed(1)}h total estimated · Sprint pick
              fits {sprintHours}h ({data.sprintRecommendation.length} items)
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/settings?tab=priority"
          className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded"
        >
          Tune weights
        </Link>
      </div>

      {top.length === 0 ? (
        <p className="text-sm text-text-secondary">No violations to rank.</p>
      ) : (
        <ol className="space-y-3">
          {top.map((v, index) => (
            <li
              key={v.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border bg-bg-secondary px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">
                  <span className="text-text-tertiary">{index + 1}. </span>
                  {v.ruleId}
                  <span className="ml-2 capitalize text-text-secondary">({v.impact})</span>
                </p>
                <p className="mt-1 text-sm text-text-secondary line-clamp-2">
                  {v.description ?? v.scoreExplanation}
                </p>
                {v.pageUrl ? (
                  <a
                    href={v.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block truncate text-xs text-primary-600 hover:underline"
                  >
                    {v.pageUrl}
                  </a>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge
                  variant={
                    v.priorityScore >= 80
                      ? 'error'
                      : v.priorityScore >= 60
                        ? 'warning'
                        : 'secondary'
                  }
                >
                  Score {v.priorityScore}
                </Badge>
                <span className="text-xs text-text-tertiary">~{v.estimatedFixHours}h</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
