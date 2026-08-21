'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createAdminOrgUser,
  fetchAdminOrgSummary,
  fetchAdminOrgUsers,
  fetchAdminOrgWidgetAnalytics,
  updateAdminOrganisation,
  updateAdminOrgWidget,
  updateAdminUser,
} from '@/lib/api/admin';
import {
  AdminBadge,
  AdminCard,
  AdminPageHeader,
  AdminStatCard,
  AdminTabs,
} from '@/components/dashboard/admin';
import { Button, Input, Select, Switch } from '@accessshield/ui';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

const PLAN_OPTIONS = [
  { value: 'trial', label: 'Trial' },
  { value: 'starter', label: 'Free' },
  { value: 'widget', label: 'Widget Only' },
  { value: 'compliance_shield', label: 'Stay Compliant' },
  { value: 'regulatory_defense', label: 'Regulatory Defense' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'government', label: 'Government' },
];

const ROLE_OPTIONS = [
  { value: 'customer_admin', label: 'Customer Admin' },
  { value: 'accessibility_officer', label: 'Accessibility Officer' },
  { value: 'developer', label: 'Developer' },
  { value: 'auditor', label: 'Auditor' },
];

type TabId = 'overview' | 'users' | 'widget' | 'settings';

const TABS = [
  { id: 'overview' as const, label: 'Overview' },
  { id: 'users' as const, label: 'Users' },
  { id: 'widget' as const, label: 'Widget' },
  { id: 'settings' as const, label: 'Settings' },
];

function formatLimit(current: number, limit: number | null): string {
  if (limit === null) return `${current} / ∞`;
  return `${current} / ${limit}`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export default function AdminOrganisationDetailPage() {
  const params = useParams<{ id: string }>();
  const orgId = params.id;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('customer_admin');
  const [userError, setUserError] = useState('');

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin', 'org', orgId, 'summary'],
    queryFn: () => fetchAdminOrgSummary(orgId),
  });

  const { data: widgetAnalytics } = useQuery({
    queryKey: ['admin', 'org', orgId, 'widget-analytics'],
    queryFn: () => fetchAdminOrgWidgetAnalytics(orgId),
    enabled: activeTab === 'widget',
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'organisation', orgId, 'users'],
    queryFn: () => fetchAdminOrgUsers(orgId),
  });

  const updateOrgMutation = useMutation({
    mutationFn: (input: { planTier?: string; isActive?: boolean }) =>
      updateAdminOrganisation(orgId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'org', orgId, 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'organisations'] });
    },
  });

  const widgetMutation = useMutation({
    mutationFn: (isEnabled: boolean) => updateAdminOrgWidget(orgId, { isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'org', orgId, 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'organisations'] });
    },
  });

  const toggleUserMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      updateAdminUser(userId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organisation', orgId, 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'org', orgId, 'summary'] });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: () =>
      createAdminOrgUser(orgId, {
        email: userEmail,
        password: userPassword,
        fullName: userName,
        role: userRole,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organisation', orgId, 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'org', orgId, 'summary'] });
      setUserEmail('');
      setUserName('');
      setUserPassword('');
      setUserError('');
    },
    onError: (err: Error) => setUserError(err.message),
  });

  if (summaryLoading) {
    return <LoadingState message="Loading organisation…" variant="inline" size="sm" />;
  }

  if (!summary) {
    return (
      <p className="text-sm text-error-700" role="alert">
        Organisation not found.
      </p>
    );
  }

  const { organisation: org, widget } = summary;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={org.name}
        description={`${org.slug} · ${org.isActive ? 'Active' : 'Suspended'}`}
        backHref="/dashboard/admin/organisations"
        backLabel="Organisations"
      />

      <AdminTabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
        ariaLabel="Organisation sections"
      />

      {activeTab === 'overview' && (
        <section
          id="panel-overview"
          role="tabpanel"
          aria-labelledby="tab-overview"
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AdminStatCard
              label="Users"
              value={`${summary.activeUserCount} / ${summary.userCount}`}
              hint="Active / total"
            />
            <AdminStatCard
              label="Assets"
              value={formatLimit(summary.assetCount, summary.assetsLimit)}
            />
            <AdminStatCard
              label="Scans (month)"
              value={formatLimit(summary.scansThisMonth, summary.scansLimit)}
            />
            <AdminStatCard label="Lifetime scans" value={summary.scansLifetime} />
            <AdminStatCard label="Open issues" value={summary.openIssuesCount} />
            <AdminStatCard label="Widget" value={widget.isEnabled ? 'Enabled' : 'Disabled'} />
          </div>

          <AdminCard title="Details">
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-text-tertiary">Plan</dt>
                <dd className="mt-0.5 font-medium capitalize text-text-primary">
                  {org.planTier.replace(/_/g, ' ')}
                </dd>
              </div>
              <div>
                <dt className="text-text-tertiary">Billing email</dt>
                <dd className="mt-0.5 font-medium text-text-primary">{org.billingEmail ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-text-tertiary">GSTIN</dt>
                <dd className="mt-0.5 font-medium text-text-primary">{org.gstin ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-text-tertiary">Created</dt>
                <dd className="mt-0.5 font-medium text-text-primary">
                  {formatDate(org.createdAt)}
                </dd>
              </div>
            </dl>
          </AdminCard>
        </section>
      )}

      {activeTab === 'users' && (
        <section id="panel-users" role="tabpanel" aria-labelledby="tab-users" className="space-y-4">
          <AdminCard title="Team members" description="Activate or deactivate access per user.">
            {usersLoading ? (
              <LoadingState message="Loading users…" variant="inline" size="sm" />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-text-tertiary">
                      <th className="px-0 py-2 font-medium">Name</th>
                      <th className="px-4 py-2 font-medium">Email</th>
                      <th className="px-4 py-2 font-medium">Role</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50/60">
                        <td className="px-0 py-2.5 text-text-primary">{user.fullName ?? '—'}</td>
                        <td className="px-4 py-2.5 text-text-secondary">{user.email}</td>
                        <td className="px-4 py-2.5 text-text-secondary">{user.role}</td>
                        <td className="px-4 py-2.5">
                          <AdminBadge
                            label={user.isActive ? 'Active' : 'Inactive'}
                            tone={user.isActive ? 'success' : 'neutral'}
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            isLoading={toggleUserMutation.isPending}
                            onClick={() =>
                              toggleUserMutation.mutate({
                                userId: user.id,
                                isActive: !user.isActive,
                              })
                            }
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>

          <AdminCard title="Add user">
            <div className="space-y-4 max-w-lg">
              <Input
                label="Full name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
              <Input
                label="Temporary password"
                type="password"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
              />
              <Select label="Role" options={ROLE_OPTIONS} value={userRole} onChange={setUserRole} />
              {userError && (
                <p className="text-sm text-error-700" role="alert">
                  {userError}
                </p>
              )}
              <Button
                variant="primary"
                size="sm"
                disabled={!userEmail || !userPassword || !userName}
                isLoading={createUserMutation.isPending}
                onClick={() => createUserMutation.mutate()}
              >
                Create user
              </Button>
            </div>
          </AdminCard>
        </section>
      )}

      {activeTab === 'widget' && (
        <section id="panel-widget" role="tabpanel" aria-labelledby="tab-widget" className="space-y-4">
          <AdminCard
            title="Widget control"
            description="Disabling stops the widget on all sites using this organisation's token."
          >
            <Switch
              label="Widget enabled"
              hint="When off, /widget/verify returns invalid and embedded widgets stop rendering."
              checked={widget.isEnabled}
              disabled={widgetMutation.isPending}
              onCheckedChange={(checked) => widgetMutation.mutate(checked)}
            />

            <dl className="mt-6 grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-text-tertiary">Position</dt>
                <dd className="mt-0.5 font-medium text-text-primary">{widget.position}</dd>
              </div>
              <div>
                <dt className="text-text-tertiary">Language</dt>
                <dd className="mt-0.5 font-medium text-text-primary">{widget.language}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-text-tertiary">Allowed domains</dt>
                <dd className="mt-0.5 font-medium text-text-primary">
                  {widget.allowedDomains.length > 0
                    ? widget.allowedDomains.join(', ')
                    : 'All domains allowed'}
                </dd>
              </div>
              {widget.updatedAt && (
                <div>
                  <dt className="text-text-tertiary">Last updated</dt>
                  <dd className="mt-0.5 font-medium text-text-primary">
                    {formatDate(widget.updatedAt)}
                  </dd>
                </div>
              )}
            </dl>
          </AdminCard>

          <AdminCard
            title="Widget analytics (30 days)"
            description="Anonymous aggregate usage. No visitor identifiers."
          >
            {widgetAnalytics ? (
              <dl className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-text-tertiary">Panel opens</dt>
                  <dd className="mt-0.5 font-medium text-text-primary">
                    {widgetAnalytics.panelOpens.toLocaleString('en-IN')}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Hindi usage</dt>
                  <dd className="mt-0.5 font-medium text-text-primary">
                    {widgetAnalytics.hindiUsagePercent}%
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Top profile</dt>
                  <dd className="mt-0.5 font-medium text-text-primary">
                    {widgetAnalytics.topProfiles[0]?.id ?? 'None yet'}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Top setting</dt>
                  <dd className="mt-0.5 font-medium text-text-primary">
                    {widgetAnalytics.topSettings[0]?.id ?? 'None yet'}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-text-secondary">Loading analytics…</p>
            )}
          </AdminCard>
        </section>
      )}

      {activeTab === 'settings' && (
        <section id="panel-settings" role="tabpanel" aria-labelledby="tab-settings">
          <AdminCard title="Organisation settings">
            <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
              <Select
                label="Plan tier"
                options={PLAN_OPTIONS}
                value={org.planTier}
                onChange={(value) => updateOrgMutation.mutate({ planTier: value })}
              />
              <div className="flex items-end">
                <Button
                  variant={org.isActive ? 'outline' : 'primary'}
                  size="sm"
                  isLoading={updateOrgMutation.isPending}
                  onClick={() => updateOrgMutation.mutate({ isActive: !org.isActive })}
                >
                  {org.isActive ? 'Suspend organisation' : 'Activate organisation'}
                </Button>
              </div>
            </div>
          </AdminCard>
        </section>
      )}
    </div>
  );
}
