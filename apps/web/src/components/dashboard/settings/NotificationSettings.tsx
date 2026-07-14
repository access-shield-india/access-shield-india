'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Save, Check } from 'lucide-react';
import { getAccessToken } from '@/lib/api/client';
import type {
  NotificationSettings as NotificationSettingsType,
  UpdateNotificationSettingsInput,
  NotificationType,
} from '@/lib/api/types';
import { Button } from '@accessshield/ui';
import { Switch } from '@accessshield/ui';
import { Input } from '@accessshield/ui';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

const NOTIFICATION_TYPES: Array<{ key: NotificationType; label: string; description: string }> = [
  {
    key: 'scan_completed',
    label: 'Scan completed',
    description: 'Notified when an accessibility scan finishes',
  },
  {
    key: 'critical_violation',
    label: 'Critical violation detected',
    description: 'Immediate alert for critical accessibility issues',
  },
  {
    key: 'issue_assigned',
    label: 'Issue assigned to me',
    description: 'When an accessibility issue is assigned to you',
  },
  {
    key: 'certificate_issued',
    label: 'Certificate issued',
    description: 'When an accessibility certificate is generated',
  },
  {
    key: 'invoice_generated',
    label: 'Invoice generated',
    description: 'Monthly billing invoice is ready',
  },
  {
    key: 'monthly_summary',
    label: 'Monthly compliance summary',
    description: 'Monthly report of accessibility status across all assets',
  },
];

async function fetchNotificationSettings(token: string): Promise<NotificationSettingsType> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch notification settings');
  const json = await response.json();
  return json.data;
}

async function updateNotificationSettings(token: string, input: UpdateNotificationSettingsInput) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/settings`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Failed to update notification settings');
  return response.json();
}

async function verifyWhatsApp(token: string, number: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/verify-whatsapp`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number }),
    },
  );
  if (!response.ok) throw new Error('Failed to send verification');
  return response.json();
}

export function NotificationSettings() {
  const queryClient = useQueryClient();
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [emailSettings, setEmailSettings] = useState<Partial<Record<NotificationType, boolean>>>(
    {},
  );
  const [whatsappSettings, setWhatsappSettings] = useState<
    Partial<Record<NotificationType, boolean>>
  >({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const token = await getAccessToken();
      const data = await fetchNotificationSettings(token);
      setEmailSettings(data.emailNotifications);
      setWhatsappSettings(data.whatsappNotifications);
      setWhatsappNumber(data.whatsappNumber ?? '');
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateNotificationSettingsInput) => {
      const token = await getAccessToken();
      return updateNotificationSettings(token, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      return verifyWhatsApp(token, whatsappNumber);
    },
  });

  function handleSave() {
    updateMutation.mutate({
      emailNotifications: emailSettings,
      whatsappNotifications: whatsappSettings,
      whatsappNumber: whatsappNumber || undefined,
    });
  }

  if (isLoading || !settings) {
    return <LoadingState message="Loading notification settings…" variant="card" />;
  }

  return (
    <div className="space-y-6">
      {/* Email notifications */}
      <div className="rounded-lg border border-border bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-text-secondary" aria-hidden="true" />
          <h3 className="text-base font-semibold text-text-primary">Email Notifications</h3>
        </div>

        <div className="space-y-3">
          {NOTIFICATION_TYPES.map((type) => (
            <div key={type.key} className="flex items-start gap-3 py-2">
              <Switch
                label={type.label}
                checked={emailSettings[type.key] ?? true}
                onCheckedChange={(checked) => {
                  setEmailSettings((prev) => ({ ...prev, [type.key]: checked }));
                }}
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-text-primary block">{type.label}</span>
                <span className="text-sm text-text-secondary">{type.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp notifications */}
      <div className="rounded-lg border border-border bg-white p-6">
        <h3 className="text-base font-semibold text-text-primary mb-4">WhatsApp Notifications</h3>

        <div className="space-y-4">
          <div>
            <Input
              label="Phone Number"
              type="tel"
              placeholder="+91 98765 43210"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              pattern="^\+91[6-9]\d{9}$"
            />
            {!settings.whatsappVerified && whatsappNumber && (
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => verifyMutation.mutate()}
                  isLoading={verifyMutation.isPending}
                >
                  {settings.whatsappVerified ? (
                    <>
                      <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                      Verified
                    </>
                  ) : (
                    'Verify number'
                  )}
                </Button>
              </div>
            )}
          </div>

          {settings.whatsappVerified && (
            <div className="space-y-3 pt-4 border-t border-border">
              {NOTIFICATION_TYPES.filter(
                (t) =>
                  t.key === 'scan_completed' ||
                  t.key === 'critical_violation' ||
                  t.key === 'issue_assigned',
              ).map((type) => (
                <div key={type.key} className="flex items-start gap-3 py-2">
                  <Switch
                    label={type.label}
                    checked={whatsappSettings[type.key] ?? false}
                    onCheckedChange={(checked) => {
                      setWhatsappSettings((prev) => ({ ...prev, [type.key]: checked }));
                    }}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-text-primary block">
                      {type.label}
                    </span>
                    <span className="text-sm text-text-secondary">{type.description}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* In-app notifications */}
      <div className="rounded-lg border border-border bg-white p-6">
        <h3 className="text-base font-semibold text-text-primary mb-2">In-App Notifications</h3>
        <p className="text-sm text-text-secondary">
          All in-app notifications are enabled by default and cannot be disabled. You&apos;ll see
          them in the notification bell at the top of the portal.
        </p>
      </div>

      {/* Save button */}
      <Button variant="primary" size="lg" onClick={handleSave} isLoading={updateMutation.isPending}>
        <Save className="mr-2 h-4 w-4" aria-hidden="true" />
        Save preferences
      </Button>
    </div>
  );
}
