'use client';

import { useQuery } from '@tanstack/react-query';
import { CreditCard, Download, TrendingUp } from 'lucide-react';
import { getAccessToken } from '@/lib/api/client';
import type { Organisation, Invoice } from '@/lib/api/types';
import { Button, Badge, Progress, getButtonStyle, getButtonThemeClassName } from '@accessshield/ui';
import { cn } from '@/lib/utils';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

const PLAN_NAMES: Record<string, string> = {
  trial: 'Trial',
  starter: 'Free',
  widget: 'Widget Only',
  compliance_shield: 'Stay Compliant',
  regulatory_defense: 'Regulatory Defense',
  professional: 'Professional',
  enterprise: 'Enterprise',
  government: 'Government',
};

const STATUS_CONFIG = {
  paid: { label: 'Paid', bg: 'bg-success-100', text: 'text-success-700' },
  sent: { label: 'Sent', bg: 'bg-accent-100', text: 'text-accent-700' },
  overdue: { label: 'Overdue', bg: 'bg-error-100', text: 'text-error-700' },
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-gray-100', text: 'text-gray-700' },
};

function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

async function fetchOrganisation(token: string): Promise<Organisation> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/organisation`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch organisation');
  const json = await response.json();
  return json.data;
}

async function fetchInvoices(token: string): Promise<Invoice[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/invoices`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch invoices');
  const json = await response.json();
  return json.data;
}

async function fetchUsage(token: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/usage`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch usage');
  const json = await response.json();
  return json.data as {
    assetsUsed: number;
    assetsLimit: number | null;
    scansThisMonth: number;
    scansLimit: number | null;
  };
}

export function BillingCard() {
  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['organisation'],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchOrganisation(token);
    },
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchInvoices(token);
    },
  });

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchUsage(token);
    },
  });

  if (orgLoading || invoicesLoading || usageLoading || !org || !usage) {
    return <LoadingState message="Loading billing information…" variant="card" />;
  }

  const planName = PLAN_NAMES[org.planTier as keyof typeof PLAN_NAMES] ?? org.planTier;
  const isUnlimited = usage.assetsLimit === null;

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <div className="rounded-lg border border-border bg-white p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{planName} Plan</h3>
            <p className="text-sm text-text-secondary mt-1">Your current subscription plan</p>
          </div>
          {org.planTier !== 'enterprise' && (
            <Button variant="primary" size="sm">
              <TrendingUp className="mr-2 h-4 w-4" aria-hidden="true" />
              Upgrade plan
            </Button>
          )}
        </div>

        {/* Usage meters */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-primary">Assets</span>
              <span className="text-sm text-text-secondary">
                {usage.assetsUsed} of {isUnlimited ? 'unlimited' : usage.assetsLimit}
              </span>
            </div>
            <Progress
              value={isUnlimited ? 0 : (usage.assetsUsed / (usage.assetsLimit ?? 1)) * 100}
              aria-valuenow={usage.assetsUsed}
              aria-valuemin={0}
              aria-valuemax={usage.assetsLimit ?? 100}
              aria-valuetext={`${usage.assetsUsed} of ${isUnlimited ? 'unlimited' : usage.assetsLimit} assets used`}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-primary">Scans this month</span>
              <span className="text-sm text-text-secondary">
                {usage.scansThisMonth} of{' '}
                {usage.scansLimit === null ? 'unlimited' : usage.scansLimit}
              </span>
            </div>
            <Progress
              value={
                usage.scansLimit === null ? 0 : (usage.scansThisMonth / usage.scansLimit) * 100
              }
              aria-valuenow={usage.scansThisMonth}
              aria-valuemin={0}
              aria-valuemax={usage.scansLimit ?? 100}
              aria-valuetext={`${usage.scansThisMonth} of ${usage.scansLimit === null ? 'unlimited' : usage.scansLimit} scans used this month`}
            />
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-6"
          onClick={() => window.open('https://billing.razorpay.com', '_blank')}
        >
          <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
          Manage billing
        </Button>
      </div>

      {/* Invoices */}
      <div className="rounded-lg border border-border bg-white p-6">
        <h3 className="text-base font-semibold text-text-primary mb-4">Invoices</h3>

        {invoices.length === 0 ? (
          <p className="text-sm text-text-tertiary py-8 text-center">No invoices yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead className="border-b border-border bg-bg-secondary">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                  >
                    Invoice No.
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                  >
                    Amount
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                  >
                    GST
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-sm font-semibold text-text-primary"
                  >
                    Download
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((invoice) => {
                  const statusConfig = STATUS_CONFIG[invoice.status];

                  return (
                    <tr key={invoice.id} className="hover:bg-bg-secondary transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-text-primary">
                          {invoice.invoiceNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <time dateTime={invoice.createdAt} className="text-sm text-text-secondary">
                          {new Date(invoice.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </time>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-text-primary">
                          {formatINR(invoice.subtotalPaise)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-secondary">
                          {formatINR(invoice.gstPaise)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn(statusConfig.bg, statusConfig.text)}>
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/api/invoices/${invoice.id}/download`}
                          download
                          className={getButtonThemeClassName('ghost', 'sm')}
                          data-as-btn="ghost"
                          style={getButtonStyle('ghost')}
                          aria-label={`Download invoice ${invoice.invoiceNumber} as PDF`}
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
