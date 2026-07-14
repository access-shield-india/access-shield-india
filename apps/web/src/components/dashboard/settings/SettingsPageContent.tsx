'use client';

import { Suspense } from 'react';
import { Tabs, type TabItem } from '@accessshield/ui';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import { OrgSettingsForm } from '@/components/dashboard/settings/OrgSettingsForm';
import { UserTable } from '@/components/dashboard/settings/UserTable';
import { JiraIntegrationCard } from '@/components/dashboard/settings/JiraIntegrationCard';
import { BillingCard } from '@/components/dashboard/settings/BillingCard';
import { NotificationSettings } from '@/components/dashboard/settings/NotificationSettings';
import { WidgetSettings } from '@/components/dashboard/settings/WidgetSettings';

const SETTINGS_TABS: TabItem[] = [
  {
    value: 'organisation',
    label: 'Organisation',
    content: (
      <Suspense
        fallback={
          <LoadingState message="Please wait, loading organisation settings…" variant="card" />
        }
      >
        <OrgSettingsForm />
      </Suspense>
    ),
  },
  {
    value: 'team',
    label: 'Team & Roles',
    content: (
      <Suspense
        fallback={<LoadingState message="Please wait, loading team members…" variant="card" />}
      >
        <UserTable />
      </Suspense>
    ),
  },
  {
    value: 'integrations',
    label: 'Integrations',
    content: (
      <Suspense
        fallback={<LoadingState message="Please wait, loading integrations…" variant="card" />}
      >
        <JiraIntegrationCard />
      </Suspense>
    ),
  },
  {
    value: 'billing',
    label: 'Billing',
    content: (
      <Suspense fallback={<LoadingState message="Please wait, loading billing…" variant="card" />}>
        <BillingCard />
      </Suspense>
    ),
  },
  {
    value: 'notifications',
    label: 'Notifications',
    content: (
      <Suspense
        fallback={
          <LoadingState message="Please wait, loading notification settings…" variant="card" />
        }
      >
        <NotificationSettings />
      </Suspense>
    ),
  },
  {
    value: 'widget',
    label: 'Widget',
    content: (
      <Suspense
        fallback={<LoadingState message="Please wait, loading widget settings…" variant="card" />}
      >
        <WidgetSettings />
      </Suspense>
    ),
  },
];

export function SettingsPageContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="mt-2 text-base text-text-secondary">
          Manage your organisation settings, team members, and integrations
        </p>
      </div>

      <Tabs
        items={SETTINGS_TABS}
        defaultValue="organisation"
        ariaLabel="Settings sections"
        lazyMount
      />
    </div>
  );
}
