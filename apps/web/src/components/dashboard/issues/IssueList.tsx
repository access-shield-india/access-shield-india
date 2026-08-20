'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { AlertCircle, AlertTriangle, Info, Minus, User, Calendar } from 'lucide-react';
import { getAccessToken } from '@/lib/api/client';
import type { Issue, IssueFilters } from '@/lib/api/types';
import { Badge, Button, getButtonStyle, getButtonThemeClassName } from '@accessshield/ui';
import { cn } from '@/lib/utils';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

const SEVERITY_CONFIG = {
  critical: {
    label: 'Critical',
    icon: AlertCircle,
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
  },
  serious: {
    label: 'Serious',
    icon: AlertTriangle,
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  moderate: {
    label: 'Moderate',
    icon: Info,
    bg: 'bg-primary-100',
    text: 'text-primary-800',
    border: 'border-primary-300',
  },
  minor: {
    label: 'Minor',
    icon: Minus,
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
  },
};

const STATUS_CONFIG = {
  open: { label: 'Open', bg: 'bg-error-100', text: 'text-error-700' },
  in_progress: { label: 'In Progress', bg: 'bg-accent-100', text: 'text-accent-700' },
  resolved: { label: 'Resolved', bg: 'bg-success-100', text: 'text-success-700' },
  wont_fix: { label: "Won't Fix", bg: 'bg-gray-100', text: 'text-gray-700' },
  duplicate: { label: 'Duplicate', bg: 'bg-gray-100', text: 'text-gray-700' },
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

  if (isLoading) {
    return <LoadingState message="Please wait, loading issues…" variant="card" />;
  }

  if (!data || data.issues.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-white p-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-text-tertiary" aria-hidden="true" />
        <h3 className="mt-4 text-lg font-semibold text-text-primary">No issues found</h3>
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
      {/* Issues table */}
      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead className="border-b border-border bg-bg-secondary">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                >
                  Issue
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                >
                  Asset
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                >
                  Assignee
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                >
                  Due Date
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-sm font-semibold text-text-primary"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {issues.map((issue) => {
                const severityConfig = SEVERITY_CONFIG[issue.severity];
                const statusConfig = STATUS_CONFIG[issue.status];
                const SeverityIcon = severityConfig.icon;
                const isOverdue =
                  issue.dueDate &&
                  new Date(issue.dueDate) < new Date() &&
                  issue.status !== 'resolved';

                return (
                  <tr key={issue.id} className="hover:bg-bg-secondary transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn('mt-0.5 rounded-md p-1.5', severityConfig.bg)}
                          aria-hidden="true"
                        >
                          <SeverityIcon
                            className={cn('h-4 w-4', severityConfig.text)}
                            aria-hidden="true"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/dashboard/issues/${issue.id}`}
                            className="font-medium text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
                          >
                            {issue.title}
                          </Link>
                          <div className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
                            <Badge
                              variant="secondary"
                              className={cn(
                                'inline-flex items-center gap-1 border',
                                severityConfig.bg,
                                severityConfig.text,
                                severityConfig.border,
                              )}
                            >
                              {severityConfig.label}
                            </Badge>
                            {issue.violation?.wcagCriteria?.[0] && (
                              <span>WCAG {issue.violation.wcagCriteria[0]}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-text-primary">
                        {issue.asset?.name ?? 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {issue.assignee ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700"
                            aria-hidden="true"
                          >
                            {issue.assignee.fullName?.[0] ??
                              issue.assignee.email?.[0]?.toUpperCase() ??
                              '?'}
                          </div>
                          <span className="text-sm text-text-primary">
                            {issue.assignee.fullName ?? issue.assignee.email}
                          </span>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm text-text-tertiary">
                          <User className="h-4 w-4" aria-hidden="true" />
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn(statusConfig.bg, statusConfig.text)}>
                        {statusConfig.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {issue.dueDate ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Calendar
                            className={cn(
                              'h-4 w-4',
                              isOverdue ? 'text-error-700' : 'text-text-tertiary',
                            )}
                            aria-hidden="true"
                          />
                          <time
                            dateTime={issue.dueDate}
                            className={cn(
                              isOverdue ? 'font-semibold text-error-700' : 'text-text-primary',
                            )}
                          >
                            {new Date(issue.dueDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </time>
                          {isOverdue && <span className="text-error-700 font-medium">Overdue</span>}
                        </div>
                      ) : (
                        <span className="text-sm text-text-tertiary">No due date</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/issues/${issue.id}`}
                        className={getButtonThemeClassName('outline', 'sm')}
                        data-as-btn="outline"
                        style={getButtonStyle('outline')}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {meta && meta.total && meta.total > (meta.pageSize ?? meta?.limit ?? 25) && (
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
      )}
    </div>
  );
}
