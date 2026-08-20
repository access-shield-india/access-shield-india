'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, Eye, FileSpreadsheet, Presentation, File } from 'lucide-react';
import { useDocumentScans } from '@/lib/hooks/useApi';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import { cn } from '@/lib/utils';
import { formatIndianDate } from '@/lib/utils';
import type { DocumentType, DocumentScanStatus } from '@/lib/api/types';

const DOC_TYPE_ICONS: Record<DocumentType, typeof FileText> = {
  pdf: FileText,
  docx: FileText,
  pptx: Presentation,
  xlsx: FileSpreadsheet,
};

const STATUS_STYLES: Record<DocumentScanStatus, { bg: string; text: string; label: string }> = {
  queued: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Queued' },
  processing: { bg: 'bg-primary-100', text: 'text-primary-800', label: 'Processing' },
  completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
  failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
};

const DOC_TYPE_FILTERS: { value: DocumentType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'Word' },
  { value: 'pptx', label: 'PowerPoint' },
  { value: 'xlsx', label: 'Excel' },
];

const STATUS_FILTERS: { value: DocumentScanStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'completed', label: 'Completed' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
];

export default function DocumentScanHistoryPage() {
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DocumentScanStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, error } = useDocumentScans({
    page,
    limit,
    status: statusFilter === 'all' ? undefined : statusFilter,
    document_type: typeFilter === 'all' ? undefined : typeFilter,
  });

  const scans = data?.scans ?? [];
  const total = data?.meta?.total ?? scans.length;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6 rounded-2xl border border-gray-200 bg-gradient-to-r from-primary-50 to-white p-8 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-extrabold text-gray-900">Document Scan History</h1>
          <p className="text-lg font-medium text-gray-600">
            View past document accessibility scans and their results
          </p>
        </div>
        <Link
          href="/dashboard/document-scanner"
          className="inline-flex items-center gap-2 rounded-xl bg-primary-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-800"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Scan
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="type-filter" className="text-sm font-medium text-gray-700">
            Type:
          </label>
          <select
            id="type-filter"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as DocumentType | 'all');
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {DOC_TYPE_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
            Status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as DocumentScanStatus | 'all');
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {STATUS_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && <LoadingState message="Loading scan history..." variant="card" />}

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          Failed to load scan history. Please try again.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && scans.length === 0 && (
        <div className="py-16 text-center">
          <File className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
          <p className="mt-4 text-gray-500">
            No document scans yet.{' '}
            <Link href="/dashboard/document-scanner" className="text-primary-600 hover:underline">
              Scan your first document
            </Link>
          </p>
        </div>
      )}

      {/* Scans table */}
      {!isLoading && !error && scans.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {['Document', 'Type', 'Score', 'Critical', 'Status', 'Date', ''].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {scans.map((scan) => {
                  const DocIcon = DOC_TYPE_ICONS[scan.documentType] ?? File;
                  const statusStyle = STATUS_STYLES[scan.status] ?? STATUS_STYLES.queued;
                  const score = scan.complianceScore;
                  const scoreColor =
                    score === null
                      ? 'text-gray-400'
                      : score >= 80
                        ? 'text-green-700'
                        : score >= 60
                          ? 'text-orange-600'
                          : 'text-red-700';

                  return (
                    <tr key={scan.id} className="transition-colors hover:bg-gray-50">
                      <td className="max-w-xs truncate px-4 py-4">
                        <div className="flex items-center gap-3">
                          <DocIcon
                            className="h-5 w-5 flex-shrink-0 text-gray-400"
                            aria-hidden="true"
                          />
                          <span className="font-medium text-gray-900">{scan.documentName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs uppercase text-gray-500">
                        {scan.documentType}
                      </td>
                      <td className={cn('px-4 py-4 font-bold', scoreColor)}>{score ?? '—'}</td>
                      <td className="px-4 py-4 font-medium text-red-700">
                        {scan.criticalCount ?? '—'}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                            statusStyle.bg,
                            statusStyle.text,
                          )}
                        >
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-500">
                        {formatIndianDate(scan.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        {scan.status === 'completed' ? (
                          <Link
                            href={`/dashboard/document-scanner/results/${scan.id}`}
                            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            View
                          </Link>
                        ) : scan.status === 'processing' || scan.status === 'queued' ? (
                          <Link
                            href={`/dashboard/document-scanner/results/${scan.id}`}
                            className="text-xs text-gray-500 hover:underline"
                          >
                            Track
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
