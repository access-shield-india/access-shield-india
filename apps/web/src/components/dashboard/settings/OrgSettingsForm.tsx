'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, AlertTriangle } from 'lucide-react';
import { getAccessToken } from '@/lib/api/client';
import type { Organisation, UpdateOrganisationInput } from '@/lib/api/types';
import { Input } from '@accessshield/ui';
import { Button } from '@accessshield/ui';
import { Modal } from '@accessshield/ui';
import { Select } from '@accessshield/ui';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

const INDUSTRY_OPTIONS = [
  { value: 'bfsi', label: 'BFSI (Banking, Financial Services, Insurance)' },
  { value: 'government', label: 'Government' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'media', label: 'Media & Publishing' },
  { value: 'technology', label: 'Technology' },
  { value: 'other', label: 'Other' },
];

async function fetchOrganisation(token: string): Promise<Organisation> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/organisation`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch organisation');
  const json = await response.json();
  return json.data;
}

async function updateOrganisation(token: string, input: UpdateOrganisationInput) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/organisation`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Failed to update organisation');
  return response.json();
}

export function OrgSettingsForm() {
  const queryClient = useQueryClient();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');

  const { data: org, isLoading } = useQuery({
    queryKey: ['organisation'],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchOrganisation(token);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateOrganisationInput) => {
      const token = await getAccessToken();
      return updateOrganisation(token, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisation'] });
    },
  });

  if (isLoading || !org) {
    return <LoadingState message="Loading organisation settings…" variant="card" />;
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          updateMutation.mutate({
            name: formData.get('name') as string,
            gstin: (formData.get('gstin') as string) || undefined,
            billingEmail: (formData.get('billingEmail') as string) || undefined,
            billingAddress: (formData.get('billingAddress') as string) || undefined,
          });
        }}
        className="space-y-4"
      >
        <Input name="name" label="Organisation Name" defaultValue={org.name} required />

        <Select name="industry" label="Industry" options={INDUSTRY_OPTIONS} defaultValue="other" />

        <Input
          name="gstin"
          label="GSTIN (optional)"
          placeholder="22AAAAA0000A1Z5"
          defaultValue={org.gstin ?? ''}
          pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}"
        />

        <Input
          name="billingEmail"
          label="Billing Email"
          type="email"
          defaultValue={org.billingEmail ?? ''}
          required
        />

        <div>
          <label
            htmlFor="billing-name"
            className="block text-sm font-medium text-text-primary mb-2"
          >
            Billing Name
          </label>
          <Input id="billing-name" name="billingName" type="text" />
        </div>

        <div>
          <label
            htmlFor="billing-address"
            className="block text-sm font-medium text-text-primary mb-2"
          >
            Billing Address
          </label>
          <textarea
            id="billing-address"
            name="billingAddress"
            rows={4}
            className="w-full rounded-md border border-border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          />
        </div>

        <Button type="submit" variant="primary" isLoading={updateMutation.isPending}>
          <Save className="mr-2 h-4 w-4" aria-hidden="true" />
          Save changes
        </Button>
      </form>

      {/* Danger zone */}
      <div className="rounded-lg border-2 border-error-200 bg-error-50 p-6">
        <h3 className="text-base font-semibold text-error-700 mb-2">Danger Zone</h3>
        <p className="text-sm text-error-700 mb-4">
          Deleting your organisation will permanently remove all data including assets, scans,
          issues, reports, and certificates. This action cannot be undone.
        </p>
        <Button
          variant="outline"
          onClick={() => setDeleteModalOpen(true)}
          className="border-error-700 text-error-700 hover:bg-error-100"
        >
          <AlertTriangle className="mr-2 h-4 w-4" aria-hidden="true" />
          Delete organisation
        </Button>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setConfirmName('');
        }}
        title="Delete Organisation"
        description={`This action cannot be undone. Type "${org.name}" to confirm deletion.`}
      >
        <div className="space-y-4">
          <Input
            label={`Type "${org.name}" to confirm`}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            aria-label={`Type ${org.name} to confirm deletion`}
          />
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false);
                setConfirmName('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={confirmName !== org.name}
              className="bg-error-700 hover:bg-error-800"
            >
              Delete Organisation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
