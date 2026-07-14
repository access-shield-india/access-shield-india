'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Award, ExternalLink, Copy, XCircle, AlertTriangle } from 'lucide-react';
import { getAccessToken } from '@/lib/api/client';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import type { Certificate, RevokeCertificateInput } from '@/lib/api/types';
import { Badge, Button, getButtonStyle, getButtonThemeClassName, Modal } from '@accessshield/ui';
import { BadgeEmbedCode } from './BadgeEmbedCode';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  active: {
    label: 'Valid',
    bg: 'bg-success-100',
    text: 'text-success-700',
  },
  expired: {
    label: 'Expired',
    bg: 'bg-error-100',
    text: 'text-error-700',
  },
  revoked: {
    label: 'Revoked',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
  },
};

async function fetchCertificates(token: string): Promise<Certificate[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/certificates`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch certificates');
  const json = await response.json();
  return json.data;
}

async function revokeCertificate(token: string, certId: string, input: RevokeCertificateInput) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/certificates/${certId}/revoke`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) throw new Error('Failed to revoke certificate');
  return response.json();
}

export function CertificateList() {
  const queryClient = useQueryClient();
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [certToRevoke, setCertToRevoke] = useState<Certificate | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [embedModalOpen, setEmbedModalOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ['certificates'],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchCertificates(token);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ certId, reason }: { certId: string; reason: string }) => {
      const token = await getAccessToken();
      return revokeCertificate(token, certId, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      setRevokeModalOpen(false);
      setCertToRevoke(null);
      setRevokeReason('');
    },
  });

  if (isLoading) {
    return <LoadingState message="Loading certificates…" variant="page" />;
  }

  if (certificates.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-white p-12 text-center">
        <Award className="mx-auto h-12 w-12 text-text-tertiary" aria-hidden="true" />
        <h3 className="mt-4 text-lg font-semibold text-text-primary">No certificates issued yet</h3>
        <p className="mt-2 text-base text-text-secondary">
          Issue your first certificate for a qualified asset above
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {certificates.map((cert) => {
          const statusConfig = STATUS_CONFIG[cert.status];
          const expiresAt = new Date(cert.expiresAt);
          const daysUntilExpiry = Math.ceil(
            (expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
          );
          const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;

          return (
            <div
              key={cert.id}
              className="rounded-lg border border-border bg-white p-6 space-y-4"
              aria-label={`${cert.asset?.name} certificate — ${statusConfig.label}, expires ${expiresAt.toLocaleDateString('en-IN')}`}
            >
              {/* Badge Preview */}
              <div className="flex items-center justify-center rounded-md bg-bg-secondary p-6">
                <div
                  className="h-30 w-30 flex items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-accent-600 text-white shadow-lg"
                  aria-hidden="true"
                >
                  <Award className="h-16 w-16" />
                </div>
              </div>

              {/* Certificate Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-text-primary">{cert.asset?.name}</h3>
                <p className="text-sm text-text-secondary">{cert.asset?.url}</p>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{cert.level ?? 'WCAG 2.2 AA'}</Badge>
                  <Badge className={cn(statusConfig.bg, statusConfig.text)}>
                    {statusConfig.label}
                  </Badge>
                </div>

                <div className="text-sm text-text-secondary space-y-1">
                  <p>
                    Score: <strong>{cert.scoreAtIssuance ?? cert.scan?.score ?? 'N/A'}/100</strong>
                  </p>
                  <p>
                    Issued:{' '}
                    <time dateTime={cert.issuedAt}>
                      {new Date(cert.issuedAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </time>
                  </p>
                  <p>
                    Expires:{' '}
                    <time
                      dateTime={cert.expiresAt}
                      className={cn(
                        isExpiringSoon || cert.status === 'expired'
                          ? 'font-semibold text-error-700'
                          : '',
                      )}
                    >
                      {expiresAt.toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </time>
                  </p>
                </div>

                {isExpiringSoon && cert.status === 'active' && (
                  <div className="flex items-start gap-2 rounded-md bg-accent-100 p-2">
                    <AlertTriangle
                      className="h-4 w-4 text-accent-700 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <p className="text-sm text-accent-700">Expires in {daysUntilExpiry} days</p>
                  </div>
                )}

                {cert.status === 'revoked' && cert.revokeReason && (
                  <div className="rounded-md bg-error-100 p-2">
                    <p className="text-sm text-error-700">
                      <strong>Revoked:</strong> {cert.revokeReason}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setSelectedCert(cert);
                    setEmbedModalOpen(true);
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                  Copy embed code
                </Button>
                <a
                  href={`/verify/${cert.certificateNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(getButtonThemeClassName('outline', 'sm'), 'w-full justify-start')}
                  data-as-btn="outline"
                  style={getButtonStyle('outline')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                  View public page
                  <span className="sr-only">(opens in new tab)</span>
                </a>
                {cert.status === 'active' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-error-700 hover:bg-error-50"
                    onClick={() => {
                      setCertToRevoke(cert);
                      setRevokeModalOpen(true);
                    }}
                  >
                    <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                    Revoke
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Embed code modal */}
      {selectedCert && (
        <Modal
          isOpen={embedModalOpen}
          onClose={() => {
            setEmbedModalOpen(false);
            setSelectedCert(null);
          }}
          title="Certificate Embed Code"
          description={`Embed the accessibility certificate badge for ${selectedCert.asset?.name}`}
        >
          <BadgeEmbedCode certificate={selectedCert} />
        </Modal>
      )}

      {/* Revoke confirmation modal */}
      <Modal
        isOpen={revokeModalOpen}
        onClose={() => {
          setRevokeModalOpen(false);
          setCertToRevoke(null);
          setRevokeReason('');
        }}
        title="Revoke Certificate"
        description="Please provide a reason for revoking this certificate"
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="revoke-reason"
              className="block text-sm font-medium text-text-primary mb-2"
            >
              Reason{' '}
              <span className="text-error-700" aria-label="required">
                *
              </span>
            </label>
            <textarea
              id="revoke-reason"
              rows={4}
              className="w-full rounded-md border border-border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              required
              aria-required="true"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setRevokeModalOpen(false);
                setCertToRevoke(null);
                setRevokeReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (certToRevoke && revokeReason.trim()) {
                  revokeMutation.mutate({
                    certId: certToRevoke.id,
                    reason: revokeReason,
                  });
                }
              }}
              disabled={!revokeReason.trim()}
              isLoading={revokeMutation.isPending}
              className="bg-error-700 hover:bg-error-800"
            >
              Revoke Certificate
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
