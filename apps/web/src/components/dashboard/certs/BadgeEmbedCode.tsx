'use client';

import { useState } from 'react';
import type { Certificate } from '@/lib/api/types';
import { CopyButton } from '@accessshield/ui';

const BADGE_VARIANTS = [
  { id: 'round', label: 'Round', width: 120, height: 120 },
  { id: 'horizontal', label: 'Horizontal', width: 240, height: 80 },
  { id: 'compact', label: 'Compact', width: 160, height: 60 },
];

interface BadgeEmbedCodeProps {
  certificate: Certificate;
}

const DEFAULT_BADGE_VARIANT = BADGE_VARIANTS[0]!;

export function BadgeEmbedCode({ certificate }: BadgeEmbedCodeProps) {
  const [selectedVariant, setSelectedVariant] = useState('round');

  const variant = BADGE_VARIANTS.find((v) => v.id === selectedVariant) ?? DEFAULT_BADGE_VARIANT;
  const badgeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/certificates/${certificate.certificateNumber}/badge?variant=${variant.id}`;
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify/${certificate.certificateNumber}`;

  const embedCode = `<a href="${verifyUrl}" target="_blank" rel="noopener noreferrer" aria-label="View ${certificate.asset?.name} accessibility certificate">
  <img src="${badgeUrl}" alt="AccessibleNow Accessibility Certificate - ${certificate.level ?? 'WCAG 2.2 AA'}" width="${variant.width}" height="${variant.height}" />
</a>`;

  return (
    <div className="space-y-6">
      {/* Variant selector */}
      <fieldset>
        <legend className="block text-sm font-medium text-text-primary mb-3">Badge Variant</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {BADGE_VARIANTS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelectedVariant(v.id)}
              className={`rounded-lg border p-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 ${
                selectedVariant === v.id
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-border hover:bg-gray-50'
              }`}
              aria-pressed={selectedVariant === v.id}
            >
              <div className="aspect-square flex items-center justify-center rounded-md bg-gray-100 mb-2">
                <div
                  className="bg-gradient-to-br from-primary-600 to-accent-600 rounded-md"
                  style={{
                    width: `${(v.width / 240) * 100}%`,
                    height: `${(v.height / 120) * 100}%`,
                  }}
                  aria-hidden="true"
                />
              </div>
              <p className="text-sm font-medium text-text-primary">{v.label}</p>
              <p className="text-xs text-text-tertiary">
                {v.width}×{v.height}px
              </p>
            </button>
          ))}
        </div>
      </fieldset>

      {/* Badge preview */}
      <div>
        <p className="block text-sm font-medium text-text-primary mb-3" id="badge-preview-label">
          Preview
        </p>
        <div
          className="flex items-center justify-center rounded-lg border border-border bg-bg-secondary p-6"
          aria-labelledby="badge-preview-label"
        >
          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${certificate.asset?.name} accessibility certificate`}
          >
            <div
              className="bg-gradient-to-br from-primary-600 to-accent-600 rounded-md shadow-lg flex items-center justify-center text-white font-bold"
              style={{ width: variant.width, height: variant.height }}
              aria-hidden="true"
            >
              {selectedVariant === 'round' && '✓'}
              {selectedVariant === 'horizontal' && 'ACCESSIBLE'}
              {selectedVariant === 'compact' && 'A11Y'}
            </div>
          </a>
        </div>
      </div>

      {/* Embed code */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label htmlFor="embed-code" className="text-sm font-medium text-text-primary">
            Embed Code
          </label>
          <CopyButton text={embedCode} label="Copy embed code" size="sm" variant="ghost" />
        </div>
        <pre
          id="embed-code"
          className="overflow-x-auto rounded-md border border-border bg-gray-900 p-4 text-sm text-gray-100 font-mono"
          aria-label="HTML embed code for certificate badge"
        >
          <code>{embedCode}</code>
        </pre>
      </div>

      <div className="rounded-md border border-primary-200 bg-primary-50 p-4">
        <p className="text-sm text-primary-700">
          <strong>Note:</strong> This badge will automatically update if the certificate is revoked
          or expires. The badge links to a public verification page showing the full certificate
          details.
        </p>
      </div>
    </div>
  );
}
