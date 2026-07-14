'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Info } from 'lucide-react';
import { getAccessToken } from '@/lib/api/client';
import type { Asset, UpdateWidgetSettingsInput, WidgetSettings } from '@/lib/api/types';
import { Button, Switch, Select, CopyButton } from '@accessshield/ui';
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

const WEB_ASSET_TYPES: Asset['type'][] = ['website', 'web_app'];

export interface AssetWidgetProps {
  asset: Asset;
}

async function fetchAssetWidgetSettings(token: string, assetId: string): Promise<WidgetSettings> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/widget/assets/${assetId}/settings`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error('Failed to fetch asset widget settings');
  const json = await response.json();
  return json.data;
}

async function updateAssetWidgetSettings(
  token: string,
  assetId: string,
  input: UpdateWidgetSettingsInput,
) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/widget/assets/${assetId}/settings`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) throw new Error('Failed to update asset widget settings');
  return response.json();
}

export function AssetWidget({ asset }: AssetWidgetProps) {
  const queryClient = useQueryClient();
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const isWebAsset = WEB_ASSET_TYPES.includes(asset.type);

  const {
    data: settings,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['asset-widget-settings', asset.id],
    queryFn: async () => {
      const token = await getAccessToken();
      const data = await fetchAssetWidgetSettings(token, asset.id);
      setAllowedDomains(data.allowedDomains);
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateWidgetSettingsInput) => {
      const token = await getAccessToken();
      return updateAssetWidgetSettings(token, asset.id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-widget-settings', asset.id] });
    },
  });

  function handleAddDomain() {
    const trimmed = newDomain
      .trim()
      .toLowerCase()
      .replace(/^www\./, '');
    if (trimmed && !allowedDomains.includes(trimmed)) {
      setAllowedDomains([...allowedDomains, trimmed]);
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

  if (isError) {
    return (
      <div
        className="rounded-lg border border-error-200 bg-error-100 p-6 text-error-700"
        role="alert"
      >
        Could not load widget settings for this asset. Please try again.
      </div>
    );
  }

  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL ?? 'https://cdn.accessshield.in';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.accessshield.in';

  const embedCode = `<script>
  (function() {
    var s = document.createElement('script');
    s.src = '${cdnUrl}/widget.js';
    s.setAttribute('data-token', '${settings.token}');
    s.setAttribute('data-api-url', '${apiUrl}');
    s.setAttribute('data-position', '${settings.position}');
    s.setAttribute('data-lang', '${settings.defaultLanguage}');
    document.head.appendChild(s);
  })();
</script>`;

  return (
    <div className="space-y-6">
      {!isWebAsset && (
        <div className="rounded-lg border border-warning-200 bg-warning-100 p-4">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-warning-700 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-warning-700">
              This asset is a {asset.type.replace('_', ' ')}. The accessibility widget embeds on
              websites — configure domains if this asset also has a public web presence.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-white p-6">
        <Switch
          label="Widget enabled for this asset"
          hint={`When disabled, the widget token for ${asset.name} will not load on allowed domains.`}
          checked={settings.isEnabled}
          disabled={updateMutation.isPending}
          onCheckedChange={(checked) => updateMutation.mutate({ isEnabled: checked })}
        />
      </div>

      <div className="rounded-lg border border-border bg-white p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-text-primary">Asset Widget Token</h3>
          <p className="text-sm text-text-secondary mt-1">
            Unique token for <strong>{asset.name}</strong>. Separate from your organisation-wide
            widget in Settings.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-border bg-bg-secondary p-3">
          <code className="flex-1 font-mono text-sm text-text-primary break-all">
            {settings.token}
          </code>
          <CopyButton
            text={settings.token}
            label="Copy asset widget token"
            size="sm"
            variant="ghost"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-white p-6">
        <h3 className="text-base font-semibold text-text-primary mb-4">Allowed Domains</h3>
        <p className="text-sm text-text-secondary mb-4">
          Only these domains can use this asset&apos;s widget token. We pre-filled{' '}
          {asset.url ? <code className="text-xs">{asset.url}</code> : 'your asset URL'} when
          possible. Leave empty to allow all domains.
        </p>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            id={`asset-widget-domain-${asset.id}`}
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
                className="text-text-tertiary hover:text-error-700 min-w-[44px] min-h-[44px] flex items-center justify-center -m-2"
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

      <div className="rounded-lg border border-border bg-white p-6">
        <h3 className="text-base font-semibold text-text-primary mb-4">Widget Appearance</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Position"
            options={POSITION_OPTIONS}
            value={settings.position}
            onChange={(value) =>
              updateMutation.mutate({ position: value as WidgetSettings['position'] })
            }
          />

          <Select
            label="Default Language"
            options={LANGUAGE_OPTIONS}
            value={settings.defaultLanguage}
            onChange={(value) =>
              updateMutation.mutate({
                defaultLanguage: value as WidgetSettings['defaultLanguage'],
              })
            }
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text-primary">Embed Code</h3>
          <CopyButton text={embedCode} label="Copy embed code" size="sm" variant="ghost" />
        </div>

        <pre className="overflow-x-auto rounded-md border border-border bg-gray-900 p-4 text-sm text-gray-100 font-mono">
          <code>{embedCode}</code>
        </pre>

        <p className="mt-3 text-sm text-text-secondary">
          Paste this in the <code>&lt;head&gt;</code> of the website for this asset.
        </p>
      </div>

      <Button variant="primary" size="lg" onClick={handleSave} isLoading={updateMutation.isPending}>
        <Save className="mr-2 h-4 w-4" aria-hidden="true" />
        Save widget settings
      </Button>
    </div>
  );
}
