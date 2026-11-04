'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@accessshield/ui';
import { AUTOMATION_DISCLAIMER, PRICING_CATALOG, formatInr } from '@/lib/pricing/catalog';
import { apiUrl } from '@/lib/api/base';

function trackFunnel(event: string, meta?: Record<string, string>) {
  void fetch(apiUrl('/api/v1/public/funnel-events'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, path: '/contact', meta }),
  }).catch(() => undefined);
}

export function ContactRevenueForms() {
  const params = useSearchParams();
  const service = params.get('service');
  const plan = params.get('plan');
  const sku = PRICING_CATALOG.expertServices.find((s) => s.id === service);

  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [form, setForm] = useState({
    contactName: '',
    contactEmail: '',
    company: '',
    domainsCount: 1,
    appsCount: 0,
    docsVolume: '',
    sebiRequired: false,
    trainingSeats: 0,
    slaHours: 72,
    notes: '',
  });

  const showEnterprise = plan === 'enterprise' || !service;
  const showServiceBanner = Boolean(sku);

  async function submitEnterprise(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    trackFunnel('contact_sales', { plan: 'enterprise' });
    try {
      const res = await fetch(apiUrl('/api/v1/public/enterprise-quotes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="mt-10 space-y-10 border-t border-border pt-10">
      {showServiceBanner && sku && (
        <aside className="rounded-lg border border-primary-100 bg-primary-50 p-4" role="note">
          <h2 className="text-lg font-semibold text-primary-900">{sku.name}</h2>
          <p className="mt-1 text-sm text-text-secondary">{sku.subtitle}</p>
          <p className="mt-2 text-xl font-bold text-primary-700">
            From {formatInr(sku.priceInr)} <span className="text-sm font-normal">excl. GST</span>
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            Email{' '}
            <a href="mailto:nilesh@accessiblenow.in" className="text-primary-600">
              nilesh@accessiblenow.in
            </a>{' '}
            with this SKU, or request an Enterprise programme below.
          </p>
        </aside>
      )}

      {showEnterprise && (
        <section aria-labelledby="enterprise-quote-heading">
          <h2 id="enterprise-quote-heading" className="text-xl font-semibold text-text-primary">
            Enterprise programme quote
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            From {formatInr(PRICING_CATALOG.enterprise.fromAnnualInr)}/yr excl. GST — software +
            monitoring + evidence packs + training.
          </p>
          <p className="mt-2 text-xs text-text-tertiary">{AUTOMATION_DISCLAIMER}</p>

          {status === 'done' ? (
            <p className="mt-4 text-success-700" role="status">
              Quote request received. We will follow up with a scoped annual proposal.
            </p>
          ) : (
            <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={submitEnterprise}>
              <div className="space-y-1.5 sm:col-span-1">
                <label htmlFor="eq-name" className="text-sm font-medium text-text-primary">
                  Contact name<span className="ml-0.5 text-error-700" aria-label="required">*</span>
                </label>
                <input
                  id="eq-name"
                  required
                  aria-required="true"
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                  className="w-full rounded-md border border-border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="eq-email" className="text-sm font-medium text-text-primary">
                  Work email<span className="ml-0.5 text-error-700" aria-label="required">*</span>
                </label>
                <input
                  id="eq-email"
                  type="email"
                  required
                  aria-required="true"
                  value={form.contactEmail}
                  onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  className="w-full rounded-md border border-border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="eq-company" className="text-sm font-medium text-text-primary">
                  Company<span className="ml-0.5 text-error-700" aria-label="required">*</span>
                </label>
                <input
                  id="eq-company"
                  required
                  aria-required="true"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  className="w-full rounded-md border border-border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                  autoComplete="organization"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="eq-domains" className="text-sm font-medium text-text-primary">
                  Domains
                </label>
                <input
                  id="eq-domains"
                  type="number"
                  min={1}
                  value={form.domainsCount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, domainsCount: Number(e.target.value) || 1 }))
                  }
                  className="w-full rounded-md border border-border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="eq-apps" className="text-sm font-medium text-text-primary">
                  Apps
                </label>
                <input
                  id="eq-apps"
                  type="number"
                  min={0}
                  value={form.appsCount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, appsCount: Number(e.target.value) || 0 }))
                  }
                  className="w-full rounded-md border border-border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="eq-docs" className="text-sm font-medium text-text-primary">
                  Docs volume
                </label>
                <input
                  id="eq-docs"
                  value={form.docsVolume}
                  onChange={(e) => setForm((f) => ({ ...f, docsVolume: e.target.value }))}
                  placeholder="e.g. 50 PDFs / quarter"
                  className="w-full rounded-md border border-border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="eq-seats" className="text-sm font-medium text-text-primary">
                  Training seats
                </label>
                <input
                  id="eq-seats"
                  type="number"
                  min={0}
                  value={form.trainingSeats}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, trainingSeats: Number(e.target.value) || 0 }))
                  }
                  className="w-full rounded-md border border-border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  id="eq-sebi"
                  type="checkbox"
                  checked={form.sebiRequired}
                  onChange={(e) => setForm((f) => ({ ...f, sebiRequired: e.target.checked }))}
                  className="h-4 w-4 rounded border-border"
                />
                <label htmlFor="eq-sebi" className="text-sm text-text-primary">
                  SEBI evidence pack required
                </label>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="eq-notes" className="text-sm font-medium text-text-primary">
                  Notes
                </label>
                <textarea
                  id="eq-notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-md border border-border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" variant="primary" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Request Enterprise quote'}
                </Button>
                {status === 'error' && (
                  <p role="alert" className="mt-2 text-sm text-error-700">
                    Could not submit. Email nilesh@accessiblenow.in instead.
                  </p>
                )}
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
