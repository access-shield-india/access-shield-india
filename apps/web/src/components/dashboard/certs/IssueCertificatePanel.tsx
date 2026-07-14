'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, AlertCircle } from 'lucide-react';
import { getAccessToken } from '@/lib/api/client';
import type { Asset, ScanDetail, CertificateLevel, IssueCertificateInput } from '@/lib/api/types';
import { Button } from '@accessshield/ui';
import { Select } from '@accessshield/ui';
import { RadioGroup } from '@accessshield/ui';
import { Alert } from '@accessshield/ui';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

const LEVEL_OPTIONS = [
  { value: 'WCAG22_AA' as const, label: 'WCAG 2.2 AA' },
  { value: 'IS17802' as const, label: 'IS 17802 (Indian Standard)' },
  { value: 'RPwD' as const, label: 'RPwD Act 2016 Compliant' },
];

async function fetchAssets(token: string): Promise<Asset[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/assets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch assets');
  const json = await response.json();
  return json.data;
}

async function fetchScansForAsset(token: string, assetId: string): Promise<ScanDetail[]> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/scans?assetId=${assetId}&status=completed`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error('Failed to fetch scans');
  const json = await response.json();
  return json.data;
}

async function issueCertificate(token: string, input: IssueCertificateInput) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/certificates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Failed to issue certificate');
  return response.json();
}

export function IssueCertificatePanel() {
  const queryClient = useQueryClient();
  const [assetId, setAssetId] = useState('');
  const [scanId, setScanId] = useState('');
  const [level, setLevel] = useState<CertificateLevel>('WCAG22_AA');
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchAssets(token);
    },
  });

  const { data: scans = [] } = useQuery({
    queryKey: ['scans', assetId],
    queryFn: async () => {
      if (!assetId) return [];
      const token = await getAccessToken();
      return fetchScansForAsset(token, assetId);
    },
    enabled: !!assetId,
  });

  const issueMutation = useMutation({
    mutationFn: async (input: IssueCertificateInput) => {
      const token = await getAccessToken();
      return issueCertificate(token, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      setAssetId('');
      setScanId('');
      setNotes('');
      setConfirmed(false);
    },
  });

  const selectedScan = scans.find((s) => s.id === scanId);
  const isQualified = selectedScan && selectedScan.score && selectedScan.score >= 80;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assetId || !scanId || !confirmed) return;

    issueMutation.mutate({
      assetId,
      scanId,
      level,
      notes: notes || undefined,
    });
  }

  const qualifiedAssets = assets.filter((asset) =>
    scans.some((scan) => scan.assetId === asset.id && scan.score && scan.score >= 80),
  );

  const assetOptions = qualifiedAssets.map((asset) => ({
    value: asset.id,
    label: asset.name,
  }));

  const scanOptions = scans
    .filter((scan) => scan.score && scan.score >= 80)
    .map((scan) => ({
      value: scan.id,
      label: `Scan from ${new Date(scan.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })} — Score: ${scan.score}/100`,
    }));

  if (assetsLoading) {
    return (
      <div className="rounded-lg border border-border bg-white p-6">
        <LoadingState message="Please wait, loading assets…" variant="inline" size="sm" />
      </div>
    );
  }

  if (qualifiedAssets.length === 0) {
    return (
      <Alert variant="info">
        <AlertCircle className="h-5 w-5" aria-hidden="true" />
        <div>
          <h3 className="font-semibold">No assets qualified for certification</h3>
          <p className="mt-1 text-sm">
            To issue a certificate, an asset must have a completed scan with a score of 80 or higher
            and zero critical issues. Run a scan on your assets to check eligibility.
          </p>
        </div>
      </Alert>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-100">
          <Award className="h-5 w-5 text-accent-700" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Issue Certificate</h2>
          <p className="text-sm text-text-secondary">
            Certify an asset that meets accessibility standards
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Select
          label="Asset"
          options={assetOptions}
          value={assetId}
          onChange={(value) => {
            setAssetId(value);
            setScanId('');
          }}
          required
        />

        {assetId && (
          <Select label="Scan" options={scanOptions} value={scanId} onChange={setScanId} required />
        )}

        {selectedScan && !isQualified && (
          <Alert variant="warning">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            <div>
              <h3 className="font-semibold">Score too low for certification</h3>
              <p className="mt-1 text-sm">
                This scan has a score of {selectedScan.score}/100. A minimum score of 80 is required
                for certification.
              </p>
            </div>
          </Alert>
        )}

        {isQualified && (
          <>
            <RadioGroup
              legend="Certification Level"
              options={LEVEL_OPTIONS}
              value={level}
              onValueChange={(value: string) => setLevel(value as CertificateLevel)}
              required
            />

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-text-primary mb-2">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                className="w-full rounded-md border border-border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
                placeholder="Add any additional notes about this certification"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="rounded-md border border-accent-600 bg-accent-100 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
                  required
                  aria-required="true"
                />
                <span className="text-sm text-accent-700">
                  <strong>Auditor Sign-Off:</strong> I confirm this site has been manually reviewed
                  and meets the stated accessibility standard. I understand that this certificate is
                  valid for 1 year and must be renewed.
                </span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!confirmed}
              isLoading={issueMutation.isPending}
            >
              <Award className="mr-2 h-5 w-5" aria-hidden="true" />
              Issue Certificate
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
