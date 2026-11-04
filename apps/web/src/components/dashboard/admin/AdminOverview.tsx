'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CreditCard,
  Inbox,
  ScanSearch,
  Users,
  AlertTriangle,
  CheckCircle2,
  Puzzle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fetchAdminStats, formatINRFromPaise } from '@/lib/api/admin';
import { AdminPageHeader, AdminStatCard, AdminCard } from '@/components/dashboard/admin';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import { cn } from '@/lib/utils';

interface AttentionItem {
  id: string;
  title: string;
  detail: string;
  count: number;
  href: string;
  tone: 'warning' | 'accent';
}

interface Shortcut {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  cta: string;
}

const SHORTCUTS: Shortcut[] = [
  {
    href: '/dashboard/admin/users',
    title: 'Users',
    description: 'Search accounts, disable logins, and review roles across every tenant.',
    icon: Users,
    cta: 'Open user directory',
  },
  {
    href: '/dashboard/admin/organisations',
    title: 'Organisations',
    description: 'Change plans, suspend tenants, inspect assets, and manage widget kill-switches.',
    icon: Building2,
    cta: 'Manage organisations',
  },
  {
    href: '/dashboard/admin/billing',
    title: 'Billing',
    description: 'Track invoices, mark payments, and clear pending GST billing queues.',
    icon: CreditCard,
    cta: 'Review invoices',
  },
  {
    href: '/dashboard/admin/inquiries',
    title: 'Inquiries',
    description: 'Work enterprise quotes, waitlist leads, and expert engagement requests.',
    icon: Inbox,
    cta: 'Open sales inbox',
  },
];

function formatToday(): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

export function AdminOverview() {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: fetchAdminStats,
  });

  const attention: AttentionItem[] = stats
    ? [
        {
          id: 'invoices',
          title: 'Pending invoices',
          detail: formatINRFromPaise(stats.pendingInvoicePaise ?? 0),
          count: stats.pendingInvoices,
          href: '/dashboard/admin/billing',
          tone: 'warning',
        },
        {
          id: 'quotes',
          title: 'Enterprise quotes',
          detail: 'Awaiting sales follow-up',
          count: stats.newEnterpriseQuotes,
          href: '/dashboard/admin/inquiries',
          tone: 'accent',
        },
        {
          id: 'waitlist',
          title: 'Waitlist leads',
          detail: 'Uncontacted sign-ups',
          count: stats.newWaitlist,
          href: '/dashboard/admin/inquiries',
          tone: 'accent',
        },
        {
          id: 'engagements',
          title: 'Requested engagements',
          detail: 'Expert services queue',
          count: stats.requestedEngagements,
          href: '/dashboard/admin/inquiries',
          tone: 'accent',
        },
      ].filter((item) => item.count > 0)
    : [];

  const attentionTotal = attention.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Platform control plane"
        description={`Operate tenants, billing, and sales for AccessibleNow · ${formatToday()}`}
      />

      {isLoading && <LoadingState message="Loading platform overview…" variant="inline" size="sm" />}
      {error && (
        <p className="text-sm text-error-700" role="alert">
          Failed to load platform stats. Refresh and try again.
        </p>
      )}

      {stats && (
        <>
          <section
            aria-labelledby="admin-attention-heading"
            className={cn(
              'overflow-hidden rounded-xl border',
              attentionTotal > 0
                ? 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white'
                : 'border-success-100 bg-gradient-to-br from-success-100/40 via-white to-white',
            )}
          >
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
                    attentionTotal > 0
                      ? 'bg-amber-100 text-warning-700'
                      : 'bg-success-100 text-success-700',
                  )}
                  aria-hidden="true"
                >
                  {attentionTotal > 0 ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                </span>
                <div>
                  <h2 id="admin-attention-heading" className="text-base font-semibold text-text-primary">
                    {attentionTotal > 0
                      ? `${attentionTotal} item${attentionTotal === 1 ? '' : 's'} need attention`
                      : 'Queues are clear'}
                  </h2>
                  <p className="mt-0.5 text-sm text-text-secondary">
                    {attentionTotal > 0
                      ? 'Jump straight into billing or the sales inbox.'
                      : 'No pending invoices, quotes, waitlist leads, or engagement requests.'}
                  </p>
                </div>
              </div>
            </div>

            {attention.length > 0 && (
              <ul className="divide-y divide-amber-100/80 border-t border-amber-100/80">
                {attention.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex min-h-11 items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-text-primary">{item.title}</span>
                        <span className="block text-xs text-text-tertiary">{item.detail}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex min-h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-semibold tabular-nums',
                            item.tone === 'warning'
                              ? 'bg-amber-100 text-warning-700'
                              : 'bg-primary-100 text-primary-700',
                          )}
                        >
                          {item.count}
                          <span className="sr-only"> items</span>
                        </span>
                        <ArrowRight className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="admin-health-heading" className="space-y-3">
            <h2 id="admin-health-heading" className="text-sm font-semibold text-text-primary">
              Platform health
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AdminStatCard
                label="Organisations"
                value={stats.organisations}
                hint={`${stats.activeOrganisations} active`}
                icon={Building2}
              />
              <AdminStatCard label="Users" value={stats.users} hint="Registered logins" icon={Users} />
              <AdminStatCard
                label="Scans this month"
                value={stats.scansThisMonth}
                hint="Platform-wide"
                icon={ScanSearch}
              />
              <AdminStatCard
                label="Widgets enabled"
                value={stats.widgetsEnabled}
                hint="Kill-switch off"
                icon={Puzzle}
              />
              <AdminStatCard
                label="Pending invoices"
                value={stats.pendingInvoices}
                hint={formatINRFromPaise(stats.pendingInvoicePaise ?? 0)}
                icon={CreditCard}
                tone={stats.pendingInvoices > 0 ? 'warning' : 'default'}
              />
              <AdminStatCard
                label="Sales inbox"
                value={
                  stats.newEnterpriseQuotes + stats.newWaitlist + stats.requestedEngagements
                }
                hint="Quotes · waitlist · engagements"
                icon={Inbox}
                tone={
                  stats.newEnterpriseQuotes + stats.newWaitlist + stats.requestedEngagements > 0
                    ? 'accent'
                    : 'default'
                }
              />
            </div>
          </section>
        </>
      )}

      <section aria-labelledby="admin-navigate-heading" className="space-y-3">
        <h2 id="admin-navigate-heading" className="text-sm font-semibold text-text-primary">
          Navigate admin
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SHORTCUTS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col rounded-xl border border-gray-200/90 bg-white p-5 transition-colors hover:border-primary-200 hover:bg-primary-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
              >
                <span className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-semibold text-text-primary">{item.title}</span>
                    <span className="mt-1 block text-sm leading-normal text-text-secondary">
                      {item.description}
                    </span>
                  </span>
                </span>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600">
                  {item.cta}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <AdminCard title="How this console works" description="Platform ops only — not an organisation workspace.">
        <ul className="list-disc space-y-2 pl-5 text-sm text-text-secondary">
          <li>
            <strong className="font-medium text-text-primary">Users</strong> — enable or hard-disable
            logins; changes sync to Keycloak when configured.
          </li>
          <li>
            <strong className="font-medium text-text-primary">Organisations</strong> — plan tier,
            suspension, assets, and widget remote kill-switch.
          </li>
          <li>
            <strong className="font-medium text-text-primary">Billing</strong> — invoice status across
            tenants (amounts in ₹ / paise).
          </li>
          <li>
            <strong className="font-medium text-text-primary">Inquiries</strong> — enterprise quotes,
            waitlist, and expert engagement requests from the funnel.
          </li>
        </ul>
      </AdminCard>
    </div>
  );
}
