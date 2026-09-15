'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { AlertCircle, AlertTriangle, ExternalLink, Info, Minus } from 'lucide-react';
import { DataTable, Badge, Button, type DataTableColumn } from '@accessshield/ui';
import { getAccessToken } from '@/lib/api/client';
import type { Issue, IssueFilters } from '@/lib/api/types';
import { truncate } from '@/lib/utils';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

const SEVERITY_CONFIG = {
  critical: { icon: AlertCircle, color: 'error' as const },
  serious: { icon: AlertTriangle, color: 'warning' as const },
  moderate: { icon: Info, color: 'info' as const },
  minor: { icon: Minus, color: 'secondary' as const },
};

const STANDARD_LABELS: Record<string, string> = {
  WCAG22: 'WCAG 2.2',
  IS17802: 'IS 17802',
  GIGW3: 'GIGW 3.0',
  SEBI: 'SEBI',
};

interface IssueListProps {
  searchParams: IssueFilters;
}

async function fetchIssues(token: string, filters: IssueFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, String(value));
  });

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/issues?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!response.ok) throw new Error('Failed to fetch issues');
  const json = await response.json();
  return { issues: json.data as Issue[], meta: json.meta };
}

function issueHref(issue: Issue): string {
  return `/dashboard/issues/${issue.id}`;
}

function wcagUrl(criterion: string): string {
  return `https://www.w3.org/WAI/WCAG22/Understanding/${criterion.replace(/\./g, '')}`;
}

export function IssueList({ searchParams }: IssueListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const page = Number(searchParams.page) || 1;

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(
      Object.entries(searchParams).filter(([, value]) => value !== undefined) as [string, string][],
    );
    params.set('page', String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  const { data, isLoading } = useQuery({
    queryKey: ['issues', searchParams],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchIssues(token, { ...searchParams, page: String(page) });
    },
  });

  const columns: DataTableColumn<Issue>[] = [
    {
      id: 'impact',
      header: 'Severity',
      accessor: (issue) => {
        const config = SEVERITY_CONFIG[issue.severity];
        const Icon = config.icon;
        return (
          <Badge variant={config.color} className="inline-flex items-center gap-1">
            <Icon className="h-3 w-3" aria-hidden="true" />
            <span className="capitalize">{issue.severity}</span>
          </Badge>
        );
      },
    },
    {
      id: 'standard',
      header: 'Standard',
      accessor: (issue) => {
        const standard = issue.violation?.standard;
        return (
          <span className="text-sm text-text-secondary">
            {standard ? (STANDARD_LABELS[standard] ?? standard) : '—'}
          </span>
        );
      },
    },
    {
      id: 'wcagCriteria',
      header: 'WCAG',
      accessor: (issue) => {
        const criterion = issue.violation?.wcagCriteria?.[0];
        if (!criterion) return <span className="text-text-tertiary">—</span>;
        return (
          <a
            href={wcagUrl(criterion)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded"
          >
            {criterion}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        );
      },
    },
    {
      id: 'description',
      header: 'Description',
      accessor: (issue) => {
        const description = issue.violation?.description || issue.description || issue.title;
        return (
          <Link
            href={issueHref(issue)}
            title={description}
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded"
          >
            {truncate(description, 80)}
            <span className="sr-only">. Open issue details and AI fix</span>
          </Link>
        );
      },
    },
    {
      id: 'pageUrl',
      header: 'Page URL',
      accessor: (issue) => {
        const pageUrl = issue.violation?.pageUrl;
        if (!pageUrl) return <span className="text-text-tertiary">—</span>;
        return (
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block max-w-xs truncate text-sm text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded"
            title={pageUrl}
          >
            {truncate(pageUrl, 50)}
          </a>
        );
      },
    },
    {
      id: 'selector',
      header: 'Element',
      accessor: (issue) => (
        <code
          className="rounded bg-gray-100 px-2 py-1 text-xs"
          title={issue.violation?.selector ?? undefined}
        >
          {truncate(issue.violation?.selector || '—', 30)}
        </code>
      ),
    },
  ];

  if (isLoading) {
    return <LoadingState message="Please wait, loading issues…" variant="card" />;
  }

  if (!data || data.issues.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-white p-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-text-tertiary" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold text-text-primary">No issues found</h2>
        <p className="mt-2 text-base text-text-secondary">
          Try adjusting your filters or search terms
        </p>
      </div>
    );
  }

  const { issues, meta } = data;
  const from = ((meta?.page ?? 1) - 1) * (meta?.pageSize ?? meta?.limit ?? 25) + 1;
  const to = Math.min(from + issues.length - 1, meta?.total ?? issues.length);

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Click an issue to open its details and the AI fix.
      </p>
      <DataTable
        columns={columns}
        data={issues}
        getRowId={(issue) => issue.id}
        emptyMessage="No issues found"
        caption="Issues. Choose a description to open the issue and its AI fix."
        pageSize={Math.max(issues.length, 1)}
        onRowActivate={(issue) => router.push(issueHref(issue))}
      />

      {meta?.total ? (
        <div
          className="flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3"
          role="navigation"
          aria-label="Issues pagination"
        >
          <p className="text-sm text-text-secondary">
            Showing {from}–{to} of {meta.total} issues
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={(meta.page ?? 1) === 1}
              onClick={() => goToPage((meta.page ?? 1) - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={to >= (meta.total ?? 0)}
              onClick={() => goToPage((meta.page ?? 1) + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
