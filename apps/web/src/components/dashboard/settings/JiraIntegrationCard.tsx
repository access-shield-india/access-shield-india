'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plug, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { getAccessToken } from '@/lib/api/client';
import type { JiraIntegration } from '@/lib/api/types';
import { Button } from '@accessshield/ui';
import { Badge } from '@accessshield/ui';
import { Input } from '@accessshield/ui';
import { Select } from '@accessshield/ui';
import { Modal } from '@accessshield/ui';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

const PRIORITY_OPTIONS = [
  { value: 'Highest', label: 'Highest' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
  { value: 'Lowest', label: 'Lowest' },
];

async function fetchJiraIntegration(token: string): Promise<JiraIntegration | null> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/jira`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to fetch Jira integration');
  const json = await response.json();
  return json.data;
}

async function disconnectJira(token: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/jira`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to disconnect Jira');
}

async function syncJiraIssues(token: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/jira/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to sync Jira issues');
  return response.json();
}

export function JiraIntegrationCard() {
  const queryClient = useQueryClient();
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);

  const { data: integration, isLoading } = useQuery({
    queryKey: ['jira-integration'],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchJiraIntegration(token);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      return disconnectJira(token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jira-integration'] });
      setDisconnectModalOpen(false);
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      return syncJiraIssues(token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jira-integration'] });
    },
  });

  useEffect(() => {
    // Listen for Jira OAuth callback
    function handleMessage(event: MessageEvent) {
      if (event.data === 'jira-connected') {
        queryClient.invalidateQueries({ queryKey: ['jira-integration'] });
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [queryClient]);

  function handleConnect() {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      '/dashboard/settings/jira/auth',
      'jira-oauth',
      `width=${width},height=${height},left=${left},top=${top}`,
    );
  }

  if (isLoading) {
    return <LoadingState message="Loading Jira integration…" variant="card" />;
  }

  if (!integration) {
    return (
      <div className="rounded-lg border border-border bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 shrink-0">
            <Plug className="h-6 w-6 text-primary-700" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary">Jira Integration</h3>
            <p className="mt-2 text-base text-text-secondary">
              Connect your Jira Cloud workspace to automatically sync accessibility issues. Issues
              created in AccessShield will be pushed to Jira with full context, including
              screenshots, WCAG criteria, and AI-generated fix suggestions.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success-700" aria-hidden="true" />
                Automatic issue syncing to your Jira project
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success-700" aria-hidden="true" />
                Severity mapped to Jira priority levels
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success-700" aria-hidden="true" />
                Bi-directional status updates
              </li>
            </ul>
            <Button variant="primary" size="lg" onClick={handleConnect} className="mt-6">
              <Plug className="mr-2 h-5 w-5" aria-hidden="true" />
              Connect to Jira Cloud
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection status */}
      <div className="rounded-lg border border-border bg-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success-100 shrink-0">
              <CheckCircle className="h-6 w-6 text-success-700" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-text-primary">Jira Connected</h3>
                <Badge className="bg-success-100 text-success-700">Active</Badge>
              </div>
              <p className="text-sm text-text-secondary">
                Instance: <strong>{integration.instanceUrl}</strong>
              </p>
              <p className="text-sm text-text-secondary">
                Connected as: <strong>{integration.connectedEmail}</strong>
              </p>
              {integration.lastSyncedAt && (
                <p className="text-sm text-text-secondary mt-1">
                  Last synced:{' '}
                  <time dateTime={integration.lastSyncedAt}>
                    {new Date(integration.lastSyncedAt).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>{' '}
                  · {integration.syncedIssuesCount} issues synced
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDisconnectModalOpen(true)}
            className="text-error-700 hover:bg-error-50"
          >
            <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
            Disconnect
          </Button>
        </div>
      </div>

      {/* Field mapping */}
      <div className="rounded-lg border border-border bg-white p-6">
        <h3 className="text-base font-semibold text-text-primary mb-4">Field Mapping</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-3">
              Severity to Priority Mapping
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Critical →"
                options={PRIORITY_OPTIONS}
                value={integration.fieldMapping.severityToPriority.critical}
                onChange={() => {}}
              />
              <Select
                label="Serious →"
                options={PRIORITY_OPTIONS}
                value={integration.fieldMapping.severityToPriority.serious}
                onChange={() => {}}
              />
              <Select
                label="Moderate →"
                options={PRIORITY_OPTIONS}
                value={integration.fieldMapping.severityToPriority.moderate}
                onChange={() => {}}
              />
              <Select
                label="Minor →"
                options={PRIORITY_OPTIONS}
                value={integration.fieldMapping.severityToPriority.minor}
                onChange={() => {}}
              />
            </div>
          </div>

          <div>
            <Input
              label="WCAG Criterion Custom Field"
              placeholder="customfield_10001"
              defaultValue={integration.fieldMapping.wcagCustomField}
            />
            <p className="mt-1 text-sm text-text-tertiary">
              Custom field ID in Jira where WCAG criterion will be stored
            </p>
          </div>
        </div>
      </div>

      {/* Sync actions */}
      <div className="rounded-lg border border-border bg-white p-6">
        <h3 className="text-base font-semibold text-text-primary mb-4">Sync</h3>
        <Button
          variant="outline"
          onClick={() => syncMutation.mutate()}
          isLoading={syncMutation.isPending}
        >
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Sync all open issues
        </Button>
        <p className="mt-2 text-sm text-text-tertiary">
          Manually trigger a sync of all open AccessShield issues to Jira
        </p>
      </div>

      {/* Disconnect modal */}
      <Modal
        isOpen={disconnectModalOpen}
        onClose={() => setDisconnectModalOpen(false)}
        title="Disconnect Jira"
        description="Are you sure you want to disconnect Jira? Existing synced issues will remain in Jira, but no new issues will be created."
      >
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setDisconnectModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => disconnectMutation.mutate()}
            isLoading={disconnectMutation.isPending}
            className="bg-error-700 hover:bg-error-800"
          >
            Disconnect
          </Button>
        </div>
      </Modal>
    </div>
  );
}
