'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { fetchAdminOrgAssetDetail } from '@/lib/api/admin';
import {
  AdminBadge,
  AdminCard,
  AdminPageHeader,
  AdminStatCard,
} from '@/components/dashboard/admin';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import { cn } from '@/lib/utils';

const SEVERITY_ORDER = ['critical', 'serious', 'moderate', 'minor'] as const;

const SEVERITY_STYLES: Record<
  (typeof SEVERITY_ORDER)[number],
  { bar: string; badge: 'error' | 'info' | 'neutral'; label: string }
> = {
  critical: { bar: 'bg-red-600', badge: 'error', label: 'Critical' },
  serious: { bar: 'bg-amber-600', badge: 'error', label: 'Serious' },
  moderate: { bar: 'bg-primary-600', badge: 'info', label: 'Moderate' },
  minor: { bar: 'bg-gray-500', badge: 'neutral', label: 'Minor' },
};

const SCAN_STATUS_TONE: Record<string, 'success' | 'error' | 'neutral' | 'info'> = {
  completed: 'success',
  running: 'info',
  pending: 'neutral',
  failed: 'error',
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function SeverityBars({
  title,
  counts,
  emptyLabel,
}: {
  title: string;
  counts: Record<(typeof SEVERITY_ORDER)[number], number>;
  emptyLabel: string;
}) {
  const total = SEVERITY_ORDER.reduce((sum, key) => sum + (counts[key] ?? 0), 0);

  return (
    <AdminCard title={title}>
      {total === 0 ? (
        <p className="text-sm text-text-tertiary">{emptyLabel}</p>
      ) : (
        <ul className="space-y-3" aria-label={title}>
          {SEVERITY_ORDER.map((key) => {
            const value = counts[key] ?? 0;
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            const style = SEVERITY_STYLES[key];
            return (
              <li key={key}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-text-primary">{style.label}</span>
                  <span className="tabular-nums text-text-secondary">
                    {value}{' '}
                    <span className="text-text-tertiary">({pct}%)</span>
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-gray-100"
                  role="presentation"
                  aria-hidden="true"
                >
                  <div
                    className={cn('h-full rounded-full transition-all', style.bar)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AdminCard>
  );
}

export default function AdminAssetDetailPage() {
  const params = useParams<{ id: string; assetId: string }>();
  const orgId = params.id;
  const assetId = params.assetId;

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'org', orgId, 'asset', assetId],
    queryFn: () => fetchAdminOrgAssetDetail(orgId, assetId),
  });

  if (isLoading) {
    return <LoadingState message="Loading asset…" variant="inline" size="sm" />;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-error-700" role="alert">
        {(error as Error | undefined)?.message ?? 'Asset not found.'}
      </p>
    );
  }

  const { asset, summary, scans, openIssues } = data;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={asset.name}
        description={`${asset.organisationName} · ${asset.type.replace(/_/g, ' ')}`}
        backHref={`/dashboard/admin/organisations/${orgId}`}
        backLabel="Back to organisation"
        actions={
          <AdminBadge
            label={asset.isActive ? 'Active' : 'Inactive'}
            tone={asset.isActive ? 'success' : 'neutral'}
          />
        }
      />

      <AdminCard title="Asset details">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-text-tertiary">URL</dt>
            <dd className="mt-0.5">
              <a
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 break-all font-medium text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
              >
                {asset.url}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="sr-only">(opens in new tab)</span>
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Standards</dt>
            <dd className="mt-0.5 font-medium text-text-primary">
              {asset.standards?.length ? asset.standards.join(', ') : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Created</dt>
            <dd className="mt-0.5 font-medium text-text-primary">{formatDate(asset.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Last scanned</dt>
            <dd className="mt-0.5 font-medium text-text-primary">
              {formatDateTime(asset.lastScannedAt ?? summary.latestScanAt)}
            </dd>
          </div>
          {asset.description && (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-text-tertiary">Description</dt>
              <dd className="mt-0.5 text-text-primary">{asset.description}</dd>
            </div>
          )}
        </dl>
      </AdminCard>

      <section aria-labelledby="asset-summary-heading" className="space-y-3">
        <h2 id="asset-summary-heading" className="text-sm font-semibold text-text-primary">
          Snapshot
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminStatCard
            label="Latest score"
            value={summary.latestScore != null ? `${summary.latestScore}` : '—'}
            hint="Most recent completed scan"
          />
          <AdminStatCard
            label="Open issues"
            value={summary.openIssuesCount}
            hint="Open + in progress"
            tone={summary.openIssuesCount > 0 ? 'warning' : 'success'}
          />
          <AdminStatCard
            label="Scans"
            value={summary.scanCount}
            hint={`${summary.completedScanCount} completed · ${summary.failedScanCount} failed`}
          />
          <AdminStatCard
            label="Latest pages scanned"
            value={summary.latestPagesScanned ?? '—'}
          />
          <AdminStatCard
            label="Latest violations"
            value={summary.latestViolationCount ?? '—'}
            hint="From last completed scan"
          />
          <AdminStatCard
            label="Last scan"
            value={formatDate(summary.latestScanAt)}
            hint={formatDateTime(summary.latestScanAt)}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <SeverityBars
          title="Open issues by severity"
          counts={summary.issuesBySeverity}
          emptyLabel="No open issues on this asset."
        />
        <SeverityBars
          title="Latest scan — violations by impact"
          counts={summary.latestViolationsByImpact}
          emptyLabel="No completed scan with violations yet."
        />
      </div>

      {(Object.keys(summary.issuesByStatus).length > 0 || summary.topRules.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminCard title="Issues by status">
            {Object.keys(summary.issuesByStatus).length === 0 ? (
              <p className="text-sm text-text-tertiary">No issues tracked yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 text-sm">
                {Object.entries(summary.issuesByStatus)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <li key={status} className="flex items-center justify-between py-2.5">
                      <span className="capitalize text-text-primary">
                        {status.replace(/_/g, ' ')}
                      </span>
                      <span className="tabular-nums font-medium text-text-secondary">{count}</span>
                    </li>
                  ))}
              </ul>
            )}
          </AdminCard>

          <AdminCard title="Top violated rules" description="Across all scans on this asset.">
            {summary.topRules.length === 0 ? (
              <p className="text-sm text-text-tertiary">No rule hits yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 text-sm">
                {summary.topRules.map((rule) => (
                  <li key={`${rule.ruleId}-${rule.impact}`} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-text-primary">
                        {rule.ruleId}
                      </span>
                      <span className="capitalize text-xs text-text-tertiary">{rule.impact}</span>
                    </span>
                    <span className="shrink-0 tabular-nums font-medium text-text-secondary">
                      {rule.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>
      )}

      <AdminCard title="Scan history" description="Newest first (up to 50).">
        {scans.length === 0 ? (
          <p className="text-sm text-text-tertiary">No scans for this asset yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  <th className="px-0 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Score</th>
                  <th className="px-4 py-2 font-medium">Pages</th>
                  <th className="px-4 py-2 font-medium">Violations</th>
                  <th className="px-4 py-2 font-medium">WCAG</th>
                  <th className="px-4 py-2 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {scans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-gray-50/60">
                    <td className="whitespace-nowrap px-0 py-2.5 text-text-primary">
                      {formatDateTime(scan.createdAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <AdminBadge
                        label={scan.status}
                        tone={SCAN_STATUS_TONE[scan.status] ?? 'neutral'}
                      />
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-text-secondary">
                      {scan.score != null ? scan.score : '—'}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-text-secondary">
                      {scan.pagesScanned}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-text-secondary">
                      {scan.violationCount}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">
                      {scan.wcagVersion} {scan.wcagLevel}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-text-secondary">
                      {formatDateTime(scan.completedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <AdminCard title="Open issues" description="Recent open and in-progress remediation items.">
        {openIssues.length === 0 ? (
          <p className="text-sm text-text-tertiary">No open issues.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  <th className="px-0 py-2 font-medium">Title</th>
                  <th className="px-4 py-2 font-medium">Severity</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                  <th className="px-4 py-2 font-medium">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {openIssues.map((issue) => {
                  const sev = issue.severity as (typeof SEVERITY_ORDER)[number];
                  const tone = SEVERITY_STYLES[sev]?.badge ?? 'neutral';
                  return (
                    <tr key={issue.id} className="hover:bg-gray-50/60">
                      <td className="max-w-md px-0 py-2.5 font-medium text-text-primary">
                        {issue.title}
                      </td>
                      <td className="px-4 py-2.5">
                        <AdminBadge label={issue.severity} tone={tone} />
                      </td>
                      <td className="px-4 py-2.5 capitalize text-text-secondary">
                        {issue.status.replace(/_/g, ' ')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-text-secondary">
                        {formatDate(issue.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-text-secondary">
                        {formatDate(issue.dueDate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <p className="text-sm text-text-tertiary">
        <Link
          href={`/dashboard/admin/organisations/${orgId}`}
          className="font-medium text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          ← Back to {asset.organisationName}
        </Link>
      </p>
    </div>
  );
}
