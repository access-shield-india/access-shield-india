'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Wrench } from 'lucide-react';
import type { DocumentViolation } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-800',
    label: 'Critical',
  },
  serious: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-800',
    label: 'Serious',
  },
  moderate: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-800',
    label: 'Moderate',
  },
  minor: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-600',
    label: 'Minor',
  },
} as const;

export interface DocumentViolationCardProps {
  violation: DocumentViolation;
  defaultExpanded?: boolean;
}

export function DocumentViolationCard({
  violation,
  defaultExpanded = false,
}: DocumentViolationCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const style = SEVERITY_STYLES[violation.severity] ?? SEVERITY_STYLES.minor;

  return (
    <div className={cn('overflow-hidden rounded-lg border', style.border, style.bg)}>
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-black/5"
        aria-expanded={expanded}
        aria-controls={`violation-details-${violation.violation_id}`}
      >
        <span
          className={cn('mt-0.5 flex-shrink-0 rounded px-2 py-0.5 text-xs font-bold', style.badge)}
        >
          {style.label}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-gray-900">{violation.description}</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <span className="text-xs text-gray-500">{violation.location}</span>
            {violation.checkpoint_id && (
              <span className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-xs text-blue-700">
                {violation.checkpoint_id}
              </span>
            )}
            {violation.wcag_criterion && (
              <span className="rounded bg-purple-50 px-1.5 py-0.5 font-mono text-xs text-purple-700">
                WCAG {violation.wcag_criterion}
              </span>
            )}
            {violation.auto_fixable && (
              <span className="flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-700">
                <Wrench className="h-3 w-3" aria-hidden="true" />
                Auto-fixable
              </span>
            )}
          </div>
        </div>

        {expanded ? (
          <ChevronUp className="mt-1 h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
        ) : (
          <ChevronDown className="mt-1 h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
        )}
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div
          id={`violation-details-${violation.violation_id}`}
          className="space-y-4 border-t border-gray-200 px-4 pb-4 pt-4"
        >
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Impact
            </p>
            <p className="text-sm text-gray-700">{violation.impact}</p>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              How to Fix
            </p>
            <p className="whitespace-pre-line text-sm text-gray-700">{violation.remediation}</p>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <span>
              Standard: <strong className="font-medium text-gray-700">{violation.standard}</strong>
            </span>
            <span>
              Category: <strong className="font-medium text-gray-700">{violation.category}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

DocumentViolationCard.displayName = 'DocumentViolationCard';
