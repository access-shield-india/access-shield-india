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

  const title = violation.title || violation.description;
  const occurrences = violation.occurrences ?? [];
  const standardRefs = violation.standard_refs ?? [];
  const fixSteps = violation.fix_steps ?? [];
  const primaryAnchor = occurrences[0]?.anchor ?? violation.location;

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
          {violation.severity_label || style.label}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-gray-900">{title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {primaryAnchor && (
              <span className="text-xs text-gray-500">
                {primaryAnchor}
                {violation.occurrence_count > 1 && ` + ${violation.occurrence_count - 1} more`}
              </span>
            )}
            {violation.occurrence_count > 1 && (
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                {violation.occurrence_label}
              </span>
            )}
            {violation.category_label && (
              <span className="text-xs text-gray-500">{violation.category_label}</span>
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
          {/* Where it is */}
          {occurrences.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Where in the document
              </p>
              <ul className="space-y-1.5">
                {occurrences.map((occurrence, index) => (
                  <li
                    key={`${occurrence.anchor}-${index}`}
                    className="rounded border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-gray-900">{occurrence.anchor}</span>
                    {occurrence.context && (
                      <span className="ml-2 text-xs text-gray-500">under {occurrence.context}</span>
                    )}
                    {occurrence.excerpt && (
                      <p className="mt-1 border-l-2 border-gray-300 pl-2 font-mono text-xs text-gray-600">
                        {occurrence.excerpt}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              {violation.occurrences_truncated && (
                <p className="mt-1.5 text-xs text-gray-500">
                  Showing the first {occurrences.length} of {violation.occurrence_count} places. The
                  downloadable report lists the same set; fix the pattern rather than each instance.
                </p>
              )}
            </div>
          )}

          {/* Why it matters */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Why this matters
            </p>
            <p className="text-sm text-gray-700">{violation.impact}</p>
          </div>

          {/* What the standard requires */}
          {violation.requirement && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                What the standard requires
              </p>
              <p className="text-sm text-gray-700">{violation.requirement}</p>
            </div>
          )}

          {/* How to fix */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              How to fix it
            </p>
            {fixSteps.length > 0 ? (
              <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
                {fixSteps.map((step, index) => (
                  <li key={`${step.slice(0, 24)}-${index}`}>{step}</li>
                ))}
              </ol>
            ) : (
              <p className="whitespace-pre-line text-sm text-gray-700">
                {violation.fix_prose || violation.remediation}
              </p>
            )}
          </div>

          {/* Standards breached */}
          {standardRefs.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Standards breached
              </p>
              <ul className="space-y-1">
                {standardRefs.map((ref) => (
                  <li key={`${ref.framework}-${ref.ref}`} className="text-xs text-gray-600">
                    <span
                      className={cn(
                        'mr-2 inline-block rounded px-1.5 py-0.5 font-mono font-medium',
                        ref.scope ? 'bg-gray-100 text-gray-600' : 'bg-primary-50 text-primary-700',
                      )}
                    >
                      {ref.framework_label} {ref.ref}
                      {ref.level ? ` (Level ${ref.level})` : ''}
                    </span>
                    {ref.title}
                    {ref.scope && <span className="ml-1 italic text-gray-500">— {ref.scope}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

DocumentViolationCard.displayName = 'DocumentViolationCard';
