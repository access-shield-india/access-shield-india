'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, ChevronDown, Minus } from 'lucide-react';
import { Badge } from '@accessshield/ui';
import { truncate } from '@/lib/utils';
import type { IssueSummary } from '@/lib/api/types';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

const STANDARD_LABELS: Record<string, string> = {
  WCAG22: 'WCAG 2.2',
  IS17802: 'IS 17802',
  GIGW3: 'GIGW 3.0',
  SEBI: 'SEBI',
};

const PRIORITY_CONFIG = {
  High: { icon: AlertCircle, badge: 'error' as const },
  Medium: { icon: AlertTriangle, badge: 'warning' as const },
  Low: { icon: Minus, badge: 'secondary' as const },
};

export interface IssueSummaryListProps {
  issues: IssueSummary[];
  isLoading: boolean;
  search?: string;
}

function matchesSearch(issue: IssueSummary, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    issue.headline,
    issue.impact,
    issue.fix,
    issue.owner,
    issue.priority,
    issue.wcagCriterion,
    issue.ruleId,
    ...issue.pages,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

function foundOnLabel(issue: IssueSummary): string {
  if (issue.pageCount === 0) {
    return issue.count === 1 ? 'Found once' : `Found ${issue.count} times`;
  }
  if (issue.pageCount === 1) {
    return issue.count === 1 ? 'Found once on 1 page' : `Found ${issue.count} times on 1 page`;
  }
  return `Found ${issue.count} times on ${issue.pageCount} pages`;
}

function IssueCard({ issue }: { issue: IssueSummary }) {
  const [open, setOpen] = useState(false);
  const detailsId = `issue-spots-${issue.ruleId}`;
  const priority = PRIORITY_CONFIG[issue.priority];
  const Icon = priority.icon;
  const standardLabel = issue.standard
    ? (STANDARD_LABELS[issue.standard] ?? issue.standard)
    : null;

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={priority.badge}
          className="inline-flex items-center gap-1"
        >
          <Icon className="h-3 w-3" aria-hidden="true" />
          {issue.priority} priority
        </Badge>
        <span className="text-sm font-medium text-text-secondary">Owner: {issue.owner}</span>
      </div>

      <h2 className="mt-3 text-lg font-semibold leading-normal text-text-primary">
        {issue.headline}.
      </h2>

      <dl className="mt-4 space-y-3 text-base leading-normal">
        <div>
          <dt className="font-medium text-text-primary">Business impact</dt>
          <dd className="text-text-secondary">{issue.impact}</dd>
        </div>
        <div>
          <dt className="font-medium text-text-primary">Fix</dt>
          <dd className="text-text-secondary">{issue.fix}</dd>
        </div>
      </dl>

      <p className="mt-4 text-sm text-text-secondary">{foundOnLabel(issue)}</p>

      {(standardLabel || issue.wcagCriterion) && (
        <p className="mt-1 text-sm text-text-tertiary">
          Standard: {standardLabel ?? 'WCAG 2.2'}
          {issue.wcagCriterion ? ` · ${issue.wcagCriterion}` : ''}
        </p>
      )}

      {issue.occurrences.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm font-medium text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen((current) => !current)}
          >
            <ChevronDown
              className={`h-4 w-4 ${open ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
            {open ? 'Hide the exact spots' : 'Show the exact spots'}
          </button>
          {open && (
            <ul id={detailsId} className="mt-3 space-y-3">
              {issue.occurrences.map((spot) => (
                <li key={spot.id} className="rounded-md border border-gray-200 bg-bg-secondary p-3">
                  {spot.pageUrl ? (
                    <a
                      href={spot.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block break-all text-sm text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
                    >
                      {spot.pageUrl}
                    </a>
                  ) : (
                    <span className="text-sm text-text-tertiary">Page not recorded</span>
                  )}
                  {spot.selector && (
                    <code className="mt-2 block break-all text-xs text-text-secondary">
                      {truncate(spot.selector, 120)}
                    </code>
                  )}
                </li>
              ))}
              {issue.moreOccurrences > 0 && (
                <li className="text-sm text-text-secondary">
                  And {issue.moreOccurrences} more. Open the technical list to see every one.
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

export function IssueSummaryList({ issues, isLoading, search = '' }: IssueSummaryListProps) {
  const visible = useMemo(
    () => issues.filter((issue) => matchesSearch(issue, search)),
    [issues, search],
  );

  if (isLoading) {
    return <LoadingState message="Summarising issues…" variant="card" />;
  }

  if (issues.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-text-primary">No issues found</h2>
        <p className="mt-2 text-base leading-normal text-text-secondary">
          The pages we scanned did not raise an automated accessibility issue.
        </p>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <p className="text-base text-text-secondary" role="status">
        No issues match this search.
      </p>
    );
  }

  const placeCount = visible.reduce((total, issue) => total + issue.count, 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary" role="status">
        {visible.length} {visible.length === 1 ? 'issue type' : 'issue types'} · {placeCount}{' '}
        {placeCount === 1 ? 'place' : 'places'}
      </p>
      <ul className="space-y-4">
        {visible.map((issue) => (
          <li key={issue.ruleId}>
            <IssueCard issue={issue} />
          </li>
        ))}
      </ul>
    </div>
  );
}
