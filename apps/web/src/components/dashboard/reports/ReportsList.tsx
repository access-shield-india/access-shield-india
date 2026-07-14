'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Download, Trash2, FileCode } from 'lucide-react';
import { getAccessToken, downloadReportFile } from '@/lib/api/client';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import type { Report } from '@/lib/api/types';
import { Badge } from '@accessshield/ui';
import { Button } from '@accessshield/ui';
import { Modal } from '@accessshield/ui';
import { useState } from 'react';

const REPORT_TYPE_LABELS: Record<string, string> = {
  executive: 'Executive Summary',
  technical: 'Technical Report',
  wcag_compliance: 'WCAG Compliance',
  legal_rpwd: 'RPwD Legal',
  sebi: 'SEBI Report',
  accessibility_statement: 'Accessibility Statement',
};

async function fetchReports(token: string): Promise<Report[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/reports`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch reports');
  const json = await response.json();
  return json.data;
}

async function deleteReport(token: string, reportId: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/reports/${reportId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to delete report');
}

export function ReportsList() {
  const queryClient = useQueryClient();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchReports(token);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const token = await getAccessToken();
      return deleteReport(token, reportId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setDeleteModalOpen(false);
      setReportToDelete(null);
    },
  });

  if (isLoading) {
    return <LoadingState message="Loading reports…" variant="page" />;
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-white p-12 text-center">
        <FileText className="mx-auto h-12 w-12 text-text-tertiary" aria-hidden="true" />
        <h3 className="mt-4 text-lg font-semibold text-text-primary">No reports generated yet</h3>
        <p className="mt-2 text-base text-text-secondary">
          Generate your first report using the button above
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead className="border-b border-border bg-bg-secondary">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                >
                  Asset
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                >
                  Scan Date
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                >
                  Generated
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-semibold text-text-primary"
                >
                  Format
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-sm font-semibold text-text-primary"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-bg-secondary transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText
                        className="h-5 w-5 text-text-tertiary shrink-0"
                        aria-hidden="true"
                      />
                      <span className="font-medium text-text-primary">{report.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="inline-flex items-center gap-1">
                      {REPORT_TYPE_LABELS[report.reportType ?? 'technical']}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-text-primary">
                      {report.scan?.asset?.name ?? 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <time dateTime={report.scan?.createdAt} className="text-sm text-text-secondary">
                      {report.scan?.createdAt
                        ? new Date(report.scan.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </time>
                  </td>
                  <td className="px-4 py-3">
                    <time dateTime={report.createdAt} className="text-sm text-text-secondary">
                      {new Date(report.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </time>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="inline-flex items-center gap-1">
                      {report.format === 'pdf' ? (
                        <>
                          <FileText className="h-3 w-3" aria-hidden="true" />
                          PDF
                        </>
                      ) : (
                        <>
                          <FileCode className="h-3 w-3" aria-hidden="true" />
                          HTML
                        </>
                      )}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Download ${report.title} as ${report.format.toUpperCase()}`}
                        onClick={() => {
                          const ext = report.format === 'pdf' ? 'pdf' : 'html';
                          const safeName = report.title.replace(/[^\w.-]+/g, '_');
                          void downloadReportFile(report.id, `${safeName}.${ext}`);
                        }}
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReportToDelete(report);
                          setDeleteModalOpen(true);
                        }}
                        aria-label={`Delete ${report.title}`}
                        className="text-error-700 hover:bg-error-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setReportToDelete(null);
        }}
        title="Delete Report"
        description={`Are you sure you want to delete "${reportToDelete?.title}"? This action cannot be undone.`}
      >
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => {
              setDeleteModalOpen(false);
              setReportToDelete(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (reportToDelete) {
                deleteMutation.mutate(reportToDelete.id);
              }
            }}
            isLoading={deleteMutation.isPending}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
