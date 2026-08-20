'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { useDocumentScanStatus, useDocumentScanResults } from '@/lib/hooks/useApi';
import { downloadDocumentScanReport } from '@/lib/api/client';
import { DocumentViolationCard } from '@/components/dashboard/document-scanner';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import { cn } from '@/lib/utils';
import type { DocumentViolation } from '@/lib/api/types';

const SEVERITY_STYLES = {
  critical: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    ring: 'ring-red-500',
    label: 'Critical',
  },
  serious: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    ring: 'ring-orange-500',
    label: 'Serious',
  },
  moderate: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    ring: 'ring-yellow-500',
    label: 'Moderate',
  },
  minor: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    ring: 'ring-gray-400',
    label: 'Minor',
  },
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  alt_text: 'Alt Text',
  heading_structure: 'Headings',
  colour_contrast: 'Colour Contrast',
  reading_order: 'Reading Order',
  table_structure: 'Tables',
  metadata: 'Metadata',
  language: 'Language',
  link_text: 'Links',
  form_fields: 'Forms',
  scanned_document: 'Scanned PDF',
  animation_timing: 'Animations',
  slide_titles: 'Slide Titles',
  readability: 'Readability',
  pdf_structure: 'PDF Structure',
  tagging: 'Tagging',
};

const PROGRESS_STEPS = [
  { pct: 10, label: 'Downloading document' },
  { pct: 30, label: 'Parsing document structure' },
  { pct: 50, label: 'Running accessibility checks' },
  { pct: 70, label: 'Analysing violations' },
  { pct: 85, label: 'Generating AI summary' },
  { pct: 100, label: 'Saving results' },
];

export default function DocumentScanResultsPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;

  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { data: statusData, error: statusError } = useDocumentScanStatus(jobId);

  const isCompleted = statusData?.status === 'completed';
  const isFailed = statusData?.status === 'failed';

  const {
    data: results,
    isLoading: resultsLoading,
    error: resultsError,
  } = useDocumentScanResults(jobId, isCompleted);

  const progress = statusData?.progress_percent ?? 0;

  // Scanning state
  if (!isCompleted && !isFailed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary-50">
          <Loader2 className="h-10 w-10 animate-spin text-primary-700" aria-hidden="true" />
        </div>

        <h1 className="mb-2 text-xl font-semibold text-gray-900">
          {statusData?.status === 'queued' ? 'Queued for scanning...' : 'Scanning document...'}
        </h1>

        {statusData?.document_name && (
          <p className="mb-6 text-sm text-gray-500">Analysing {statusData.document_name}</p>
        )}

        {/* Progress bar */}
        <div className="mx-auto w-64">
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-primary-700 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">{progress}% complete</p>
        </div>

        {/* Progress steps */}
        <div className="mt-8 space-y-2 text-xs text-gray-400">
          {PROGRESS_STEPS.map((step) => (
            <div
              key={step.label}
              className={cn(
                'flex items-center justify-center gap-2',
                progress >= step.pct && 'text-primary-600',
              )}
            >
              <div
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  progress >= step.pct ? 'bg-primary-600' : 'bg-gray-300',
                )}
              />
              {step.label}
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-gray-400">
          You can leave this page. We&apos;ll notify you when the scan completes.
        </p>
      </div>
    );
  }

  // Error state
  if (isFailed || statusError || resultsError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="font-medium text-red-600" role="alert">
          {statusData?.error_message || 'Scan failed. Please try again.'}
        </p>
        <Link
          href="/dashboard/document-scanner"
          className="mt-4 inline-block text-sm text-primary-600 hover:underline"
        >
          ← Try scanning another document
        </Link>
      </div>
    );
  }

  // Loading results
  if (resultsLoading || !results) {
    return <LoadingState message="Loading scan results..." variant="page" />;
  }

  // Filter violations
  const allViolations: DocumentViolation[] = results.violations ?? [];
  const filteredViolations = allViolations.filter((v) => {
    if (severityFilter && v.severity !== severityFilter) return false;
    if (categoryFilter && v.category !== categoryFilter) return false;
    return true;
  });

  const categoriesInResults = [...new Set(allViolations.map((v) => v.category))];

  const score = results.compliance_score ?? 0;
  const scoreColor =
    score >= 80 ? 'text-green-700' : score >= 60 ? 'text-orange-600' : 'text-red-700';
  const documentName = results.document_name ?? 'document-scan';

  async function handleDownloadReport() {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const safeName = documentName.replace(/[^\w.-]+/g, '_');
      await downloadDocumentScanReport(jobId, `${safeName}-report.pdf`);
    } catch {
      setDownloadError('Failed to download report. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/document-scanner"
            className="mb-2 inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            New scan
          </Link>
          <h1 className="text-xl font-bold text-gray-900">
            {results.document_name ?? 'Document scan results'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {(results.document_type ?? 'document').toUpperCase()} · {results.total_violations}{' '}
            violation
            {results.total_violations !== 1 ? 's' : ''} · Scanned in{' '}
            {results.scan_duration_seconds ?? 0}s
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleDownloadReport()}
          disabled={isDownloading}
          aria-busy={isDownloading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="h-4 w-4" aria-hidden="true" />
          )}
          {isDownloading ? 'Generating…' : 'Download Report'}
        </button>
      </div>

      {downloadError && (
        <p className="text-sm text-red-700" role="alert">
          {downloadError}
        </p>
      )}

      {/* Score and severity counts */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {/* Score */}
        <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm md:col-span-1">
          <p className={cn('text-4xl font-bold', scoreColor)}>{score}</p>
          <p className="mt-1 text-xs text-gray-500">Compliance Score</p>
        </div>

        {/* Severity counts */}
        {(['critical', 'serious', 'moderate', 'minor'] as const).map((sev) => {
          const style = SEVERITY_STYLES[sev];
          const count = results[`${sev}_count`] ?? 0;
          const isActive = severityFilter === sev;

          return (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(isActive ? null : sev)}
              className={cn(
                'rounded-xl border p-4 text-center transition-all',
                style.bg,
                style.text,
                isActive ? `ring-2 ${style.ring}` : 'border-transparent',
              )}
            >
              <p className="text-2xl font-bold">{count}</p>
              <p className="mt-1 text-xs">{style.label}</p>
            </button>
          );
        })}
      </div>

      {/* AI Summary */}
      {results.ai_summary && (
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-700">
            AI Summary
          </p>
          <p className="whitespace-pre-line text-sm text-gray-800">{results.ai_summary}</p>
        </div>
      )}

      {/* GIGW checkpoint results */}
      {results.gigw_checkpoint_results &&
        Object.keys(results.gigw_checkpoint_results).length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">GIGW Checkpoint Coverage</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Object.entries(results.gigw_checkpoint_results).map(([checkpoint, data]) => (
                <div
                  key={checkpoint}
                  className={cn(
                    'rounded-lg border p-3 text-center text-xs',
                    data.status === 'pass'
                      ? 'border-green-200 bg-green-50 text-green-800'
                      : data.status === 'fail'
                        ? 'border-red-200 bg-red-50 text-red-800'
                        : 'border-gray-200 bg-gray-50 text-gray-600',
                  )}
                >
                  <p className="font-mono font-semibold">{checkpoint}</p>
                  <p className="mt-1 capitalize">{data.status}</p>
                  {data.count > 0 && (
                    <p className="text-[10px] opacity-75">{data.count} issue(s)</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Violations section */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Violations
            {filteredViolations.length !== allViolations.length && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredViolations.length} of {allViolations.length})
              </span>
            )}
          </h2>

          {/* Category filter tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                !categoryFilter
                  ? 'border-primary-700 bg-primary-700 text-white'
                  : 'border-gray-300 text-gray-600 hover:border-primary-400',
              )}
            >
              All
            </button>
            {categoriesInResults.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  categoryFilter === cat
                    ? 'border-primary-700 bg-primary-700 text-white'
                    : 'border-gray-300 text-gray-600 hover:border-primary-400',
                )}
              >
                {CATEGORY_LABELS[cat] ?? cat} (
                {allViolations.filter((v) => v.category === cat).length})
              </button>
            ))}
          </div>
        </div>

        {/* Violations list */}
        {filteredViolations.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            {allViolations.length === 0
              ? '🎉 No violations found! This document meets accessibility standards.'
              : 'No violations match the current filter.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredViolations.map((violation) => (
              <DocumentViolationCard key={violation.violation_id} violation={violation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
