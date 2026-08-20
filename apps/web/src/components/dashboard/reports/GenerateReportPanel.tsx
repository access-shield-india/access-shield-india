'use client';

import { useEffect, useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, X, Download, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAccessToken, listScans, downloadReportFile } from '@/lib/api/client';
import { useAssets } from '@/lib/hooks/useApi';
import type { ReportType, ReportFormat, GenerateReportInput } from '@/lib/api/types';
import { Button } from '@accessshield/ui';
import { RadioGroup } from '@accessshield/ui';
import { Input } from '@accessshield/ui';
import { Badge } from '@accessshield/ui';
import { Tooltip } from '@accessshield/ui';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const REPORT_TYPES = [
  {
    value: 'executive' as const,
    label: 'Executive Summary',
    description: 'High-level summary for leadership. 5-6 pages.',
  },
  {
    value: 'technical' as const,
    label: 'Technical Report',
    description: 'Full violation list with code. For developers.',
  },
  {
    value: 'wcag_compliance' as const,
    label: 'WCAG Compliance',
    description: 'Conformance table for all 50 WCAG 2.2 AA criteria.',
  },
  {
    value: 'legal_rpwd' as const,
    label: 'RPwD Legal',
    description: 'Legal compliance evidence for regulatory submission.',
  },
  {
    value: 'sebi' as const,
    label: 'SEBI Report',
    description: 'Format required by SEBI for financial service entities.',
    requiresSebiScan: true,
  },
  {
    value: 'accessibility_statement' as const,
    label: 'Accessibility Statement',
    description: 'Public-facing HTML statement.',
  },
];

const FORMAT_OPTIONS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'html', label: 'HTML' },
];

interface NativeSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
}

function NativeSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled,
  hint,
}: NativeSelectProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text-secondary">
        {label}
        {required && (
          <span className="ml-0.5 text-error-700" aria-label="required">
            *
          </span>
        )}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={cn(
          'flex w-full min-h-11 rounded-md border border-border bg-white px-3 py-2 text-base text-text-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && <p className="text-sm text-text-tertiary">{hint}</p>}
    </div>
  );
}

async function generateReport(token: string, input: GenerateReportInput) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/reports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      report_type: input.reportType,
      asset_id: input.assetId,
      scan_id: input.scanId,
      format: input.format,
    }),
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new Error(problem?.detail ?? 'Failed to generate report');
  }
  return response.json();
}

export function GenerateReportPanel() {
  const assetSelectId = useId();
  const scanSelectId = useId();
  const queryClient = useQueryClient();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('executive');
  const [assetId, setAssetId] = useState('');
  const [scanId, setScanId] = useState('');
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [generatedReport, setGeneratedReport] = useState<{
    id: string;
    title: string;
    format: ReportFormat;
  } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: assets = [] } = useAssets();

  const { data: scansData, isLoading: scansLoading } = useQuery({
    queryKey: ['scans', 'report', assetId],
    queryFn: async () => {
      const token = await getAccessToken();
      return listScans(token, { asset_id: assetId, status: 'completed', limit: 50 });
    },
    enabled: Boolean(assetId),
  });

  const scans = scansData?.rows ?? [];
  const selectedScan = scans.find((scan) => scan.id === scanId);
  const sebiAllowed = Boolean(selectedScan?.standards?.includes('SEBI'));

  useEffect(() => {
    if (!assetId) {
      setScanId('');
      return;
    }
    if (scans.length > 0) {
      setScanId((current) =>
        current && scans.some((scan) => scan.id === current) ? current : scans[0]!.id,
      );
    } else {
      setScanId('');
    }
  }, [assetId, scans]);

  useEffect(() => {
    if (reportType === 'sebi' && !sebiAllowed) {
      setReportType('executive');
    }
  }, [reportType, sebiAllowed]);

  const generateMutation = useMutation({
    mutationFn: async (input: GenerateReportInput) => {
      const token = await getAccessToken();
      return generateReport(token, input);
    },
    onSuccess: (data) => {
      setGeneratedReport({
        id: data.data.reportId,
        title: data.data.title,
        format: data.data.format as ReportFormat,
      });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assetId || !scanId) return;

    generateMutation.mutate({
      reportType,
      assetId,
      scanId,
      format,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
  }

  function handleClose() {
    setIsPanelOpen(false);
    setGeneratedReport(null);
    generateMutation.reset();
  }

  async function handleDownloadReport() {
    if (!generatedReport) return;
    setIsDownloading(true);
    try {
      const ext = generatedReport.format === 'pdf' ? 'pdf' : 'html';
      const safeName = generatedReport.title.replace(/[^\w.-]+/g, '_');
      await downloadReportFile(generatedReport.id, `${safeName}.${ext}`);
    } finally {
      setIsDownloading(false);
    }
  }

  const assetOptions = assets.map((asset) => ({
    value: asset.id,
    label: asset.name,
  }));

  const scanOptions = scans.map((scan) => ({
    value: scan.id,
    label: `Scan from ${new Date(scan.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })} — Score: ${scan.score ?? 'N/A'}/100 (${scan.violationCount} issues)`,
  }));

  const canGenerate = Boolean(assetId && scanId && !generateMutation.isPending);

  return (
    <>
      <Button
        variant="primary"
        size="lg"
        onClick={() => setIsPanelOpen(true)}
        className="w-full sm:w-auto"
      >
        <FileText className="mr-2 h-5 w-5" aria-hidden="true" />
        Generate New Report
      </Button>

      <AnimatePresence>
        {isPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 z-40 bg-black/50"
              aria-hidden="true"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="generate-report-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-6 py-4">
                <h2 id="generate-report-title" className="text-xl font-bold text-text-primary">
                  Generate Report
                </h2>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-md p-2 text-text-secondary hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
                  aria-label="Close panel"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="p-6">
                {generatedReport ? (
                  <div className="space-y-4 text-center py-8">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-success-100">
                      <Download className="h-8 w-8 text-success-700" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary">
                      Report Generated Successfully!
                    </h3>
                    <p className="text-base text-text-secondary">
                      Your report is ready to download
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={() => void handleDownloadReport()}
                        disabled={isDownloading}
                        aria-busy={isDownloading}
                      >
                        <Download className="mr-2 h-5 w-5" aria-hidden="true" />
                        {isDownloading ? 'Downloading…' : 'Download Report'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => {
                          setGeneratedReport(null);
                          generateMutation.reset();
                        }}
                      >
                        Generate Another
                      </Button>
                    </div>
                  </div>
                ) : generateMutation.isPending ? (
                  <div className="space-y-4 text-center py-8" aria-live="polite" aria-busy="true">
                    <Loader
                      className="mx-auto h-12 w-12 animate-spin text-primary-600"
                      aria-hidden="true"
                    />
                    <h3 className="text-lg font-semibold text-text-primary">
                      Generating your {REPORT_TYPES.find((t) => t.value === reportType)?.label}...
                    </h3>
                    <p className="text-base text-text-secondary">
                      This takes about 30–60 seconds for large scans
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <fieldset>
                      <legend className="block text-sm font-semibold text-text-primary mb-3">
                        Report Type{' '}
                        <span className="text-error-700" aria-label="required">
                          *
                        </span>
                      </legend>
                      <div className="space-y-2">
                        {REPORT_TYPES.map((type) => {
                          const needsSebiScan = 'requiresSebiScan' in type && type.requiresSebiScan;
                          const locked = Boolean(needsSebiScan) && !sebiAllowed;
                          return (
                          <label
                            key={type.value}
                            className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
                              locked
                                ? 'cursor-not-allowed opacity-50'
                                : 'cursor-pointer'
                            } ${
                              reportType === type.value
                                ? 'border-primary-600 bg-primary-50'
                                : 'border-border hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="reportType"
                              value={type.value}
                              checked={reportType === type.value}
                              onChange={(e) => setReportType(e.target.value as ReportType)}
                              disabled={locked}
                              aria-label={type.label}
                              className="mt-1 h-4 w-4 shrink-0 text-primary-600 focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
                              required
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-text-primary">{type.label}</span>
                                {needsSebiScan && (
                                  <Tooltip
                                    content={
                                      sebiAllowed
                                        ? 'This scan included the SEBI option'
                                        : 'Available only when the selected scan was run with SEBI checked'
                                    }
                                  >
                                    <Badge variant="outline" className="text-xs">
                                      SEBI scan
                                    </Badge>
                                  </Tooltip>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-text-secondary">{type.description}</p>
                            </div>
                          </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    <NativeSelect
                      id={assetSelectId}
                      label="Asset"
                      value={assetId}
                      onChange={(value) => {
                        setAssetId(value);
                        setScanId('');
                      }}
                      options={assetOptions}
                      placeholder="Select an asset"
                      disabled={assetOptions.length === 0}
                      hint={
                        assetOptions.length === 0
                          ? 'Add an asset first from the Assets page'
                          : undefined
                      }
                      required
                    />

                    {assetId && (
                      <NativeSelect
                        id={scanSelectId}
                        label="Scan"
                        value={scanId}
                        onChange={setScanId}
                        options={scanOptions}
                        placeholder={
                          scansLoading
                            ? 'Loading scans…'
                            : scanOptions.length === 0
                              ? 'No completed scans for this asset'
                              : 'Select a scan'
                        }
                        disabled={scansLoading || scanOptions.length === 0}
                        hint={
                          scansLoading
                            ? 'Loading completed scans…'
                            : scanOptions.length === 0
                              ? 'Run a scan on this asset before generating a report'
                              : 'Latest scan is selected automatically'
                        }
                        required
                      />
                    )}

                    <RadioGroup
                      legend="Report Format"
                      options={FORMAT_OPTIONS}
                      value={format}
                      onValueChange={(value) => setFormat(value as ReportFormat)}
                      required
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        type="date"
                        label="From Date (optional)"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                      <Input
                        type="date"
                        label="To Date (optional)"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>

                    {generateMutation.isError && (
                      <p role="alert" className="text-sm text-error-700">
                        {generateMutation.error instanceof Error
                          ? generateMutation.error.message
                          : 'Failed to generate report'}
                      </p>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full"
                      disabled={!canGenerate}
                    >
                      <FileText className="mr-2 h-5 w-5" aria-hidden="true" />
                      Generate Report
                    </Button>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
