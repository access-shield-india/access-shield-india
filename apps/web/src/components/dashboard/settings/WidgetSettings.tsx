'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, RefreshCw, AlertTriangle } from 'lucide-react';
import { getAccessToken } from '@/lib/api/client';
import type {
  WidgetSettings as WidgetSettingsType,
  UpdateWidgetSettingsInput,
} from '@/lib/api/types';
import { Button, Switch } from '@accessshield/ui';
import { Select } from '@accessshield/ui';
import { CopyButton } from '@accessshield/ui';
import { Modal } from '@accessshield/ui';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

const POSITION_OPTIONS = [
  { value: 'bottom-right' as const, label: 'Bottom Right' },
  { value: 'bottom-left' as const, label: 'Bottom Left' },
  { value: 'top-right' as const, label: 'Top Right' },
  { value: 'top-left' as const, label: 'Top Left' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en' as const, label: 'English' },
  { value: 'hi' as const, label: 'Hindi (हिन्दी)' },
];

async function fetchWidgetSettings(token: string): Promise<WidgetSettingsType> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/widget/settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch widget settings');
  const json = await response.json();
  return json.data;
}

async function updateWidgetSettings(token: string, input: UpdateWidgetSettingsInput) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/widget/settings`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Failed to update widget settings');
  return response.json();
}

async function regenerateToken(token: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/widget/regenerate-token`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) throw new Error('Failed to regenerate token');
  return response.json();
}

export function WidgetSettings() {
  const queryClient = useQueryClient();
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['widget-settings'],
    queryFn: async () => {
      const token = await getAccessToken();
      const data = await fetchWidgetSettings(token);
      setAllowedDomains(data.allowedDomains);
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateWidgetSettingsInput) => {
      const token = await getAccessToken();
      return updateWidgetSettings(token, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widget-settings'] });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      return regenerateToken(token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widget-settings'] });
      setRegenerateModalOpen(false);
    },
  });

  function handleAddDomain() {
    if (newDomain && !allowedDomains.includes(newDomain)) {
      setAllowedDomains([...allowedDomains, newDomain]);
      setNewDomain('');
    }
  }

  function handleRemoveDomain(domain: string) {
    setAllowedDomains(allowedDomains.filter((d) => d !== domain));
  }

  function handleSave() {
    updateMutation.mutate({
      allowedDomains,
      position: settings?.position,
      defaultLanguage: settings?.defaultLanguage,
      primaryColor: settings?.primaryColor,
      isEnabled: settings?.isEnabled,
    });
  }

  if (isLoading || !settings) {
    return <LoadingState message="Loading widget settings…" variant="card" />;
  }

  const embedCode = `<script>
  (function() {
    var s = document.createElement('script');
    s.src = '${process.env.NEXT_PUBLIC_CDN_URL}/widget.js';
    s.setAttribute('data-token', '${settings.token}');
    document.head.appendChild(s);
  })();
</script>`;

  return (
    <div className="space-y-6">
      {/* Widget on/off */}
      <div className="rounded-lg border border-border bg-white p-6">
        <Switch
          label="Widget enabled"
          hint="When disabled, the accessibility widget will not appear on your websites."
          checked={settings.isEnabled}
          disabled={updateMutation.isPending}
          onCheckedChange={(checked) => updateMutation.mutate({ isEnabled: checked })}
        />
      </div>

      {/* Widget token */}
      <div className="rounded-lg border border-border bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Widget Token</h3>
            <p className="text-sm text-text-secondary mt-1">
              Use this token to embed the accessibility widget on your website
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRegenerateModalOpen(true)}
            className="text-error-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Regenerate
          </Button>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-border bg-bg-secondary p-3">
          <code className="flex-1 font-mono text-sm text-text-primary">{settings.token}</code>
          <CopyButton text={settings.token} label="Copy widget token" size="sm" variant="ghost" />
        </div>
      </div>

      {/* Allowed domains */}
      <div className="rounded-lg border border-border bg-white p-6">
        <h3 className="text-base font-semibold text-text-primary mb-4">Allowed Domains</h3>
        <p className="text-sm text-text-secondary mb-4">
          Whitelist the domains that can use this widget token. Leave empty to allow all domains.
        </p>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="example.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddDomain();
              }
            }}
            className="flex-1 rounded-md border border-border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          />
          <Button variant="outline" onClick={handleAddDomain}>
            Add
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {allowedDomains.map((domain) => (
            <span
              key={domain}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-bg-secondary px-3 py-1.5 text-sm"
            >
              {domain}
              <button
                type="button"
                onClick={() => handleRemoveDomain(domain)}
                className="text-text-tertiary hover:text-error-700"
                aria-label={`Remove ${domain}`}
              >
                ×
              </button>
            </span>
          ))}
          {allowedDomains.length === 0 && (
            <span className="text-sm text-text-tertiary">All domains allowed</span>
          )}
        </div>
      </div>

      {/* Position & Language */}
      <div className="rounded-lg border border-border bg-white p-6">
        <h3 className="text-base font-semibold text-text-primary mb-4">Widget Appearance</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Position"
            options={POSITION_OPTIONS}
            value={settings.position}
            onChange={(value) =>
              updateMutation.mutate({ position: value as WidgetSettingsType['position'] })
            }
          />

          <Select
            label="Default Language"
            options={LANGUAGE_OPTIONS}
            value={settings.defaultLanguage}
            onChange={(value) =>
              updateMutation.mutate({
                defaultLanguage: value as WidgetSettingsType['defaultLanguage'],
              })
            }
          />
        </div>
      </div>

      {/* Embed code */}
      <div className="rounded-lg border border-border bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text-primary">Embed Code</h3>
          <CopyButton text={embedCode} label="Copy embed code" size="sm" variant="ghost" />
        </div>

        <pre className="overflow-x-auto rounded-md border border-border bg-gray-900 p-4 text-sm text-gray-100 font-mono">
          <code>{embedCode}</code>
        </pre>

        <p className="mt-3 text-sm text-text-secondary">
          Paste this code in the <code>&lt;head&gt;</code> section of your website
        </p>
      </div>

      {/* Preview */}
      <div className="rounded-lg border border-border bg-white p-6">
        <h3 className="text-base font-semibold text-text-primary mb-4">Live Preview</h3>
        <div className="relative h-64 rounded-md border border-border bg-bg-secondary overflow-hidden">
          <iframe
            src={`${process.env.NEXT_PUBLIC_APP_URL}/widget/preview?token=${settings.token}`}
            className="w-full h-full"
            title="Widget preview"
          />
        </div>
      </div>

      {/* Save button */}
      <Button variant="primary" size="lg" onClick={handleSave} isLoading={updateMutation.isPending}>
        <Save className="mr-2 h-4 w-4" aria-hidden="true" />
        Save settings
      </Button>

      {/* Regenerate token modal */}
      <Modal
        isOpen={regenerateModalOpen}
        onClose={() => setRegenerateModalOpen(false)}
        title="Regenerate Widget Token"
        description="This will break existing embeds using the old token"
      >
        <div className="space-y-4">
          <div className="rounded-md border border-error-200 bg-error-100 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle
                className="h-5 w-5 text-error-700 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <p className="text-sm text-error-700">
                <strong>Warning:</strong> Regenerating the token will immediately invalidate the
                current token. All websites using the old token will stop showing the widget until
                you update the embed code.
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setRegenerateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => regenerateMutation.mutate()}
              isLoading={regenerateMutation.isPending}
              className="bg-error-700 hover:bg-error-800"
            >
              Regenerate Token
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
