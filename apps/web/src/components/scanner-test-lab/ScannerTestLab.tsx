'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  CheckboxGroup,
  DataTable,
  Input,
  Progress,
  ScoreRing,
  Select,
  type DataTableColumn,
} from '@accessshield/ui';
import {
  cancelScan,
  checkApiHealth,
  createAsset,
  createScan,
  getAccessToken,
  getScan,
  listAssets,
  listViolations,
} from '@/lib/api/client';
import type {
  Asset,
  ComplianceStandard,
  ScanDetail,
  ScanType,
  ViolationRow,
  WcagLevel,
} from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

const STANDARD_OPTIONS: { value: ComplianceStandard; label: string }[] = [
  { value: 'WCAG22', label: 'WCAG 2.2' },
  { value: 'IS17802', label: 'IS 17802' },
  { value: 'GIGW3', label: 'GIGW 3.0' },
  { value: 'SEBI', label: 'SEBI' },
];

const SCAN_TYPE_OPTIONS = [
  { value: 'single_page', label: 'Single page (fastest)' },
  { value: 'full', label: 'Full crawl' },
  { value: 'incremental', label: 'Incremental' },
];

const WCAG_OPTIONS = [
  { value: 'A', label: 'Level A' },
  { value: 'AA', label: 'Level AA' },
  { value: 'AAA', label: 'Level AAA' },
];

const TERMINAL_STATUSES = new Set(['completed', 'failed']);

function statusVariant(status: ScanDetail['status']): 'default' | 'success' | 'outline' {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'outline';
  return 'default';
}

function formatApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.problem.detail ?? error.problem.title;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

export function ScannerTestLab() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetUrl, setAssetUrl] = useState('https://dequeuniversity.com/demo/mars/');
  const [scanType, setScanType] = useState<ScanType>('single_page');
  const [wcagLevel, setWcagLevel] = useState<WcagLevel>('AA');
  const [standards, setStandards] = useState<ComplianceStandard[]>(['WCAG22', 'IS17802']);
  const [maxPages, setMaxPages] = useState('1');
  const [excludePaths, setExcludePaths] = useState('');
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [scanDetail, setScanDetail] = useState<ScanDetail | null>(null);
  const [violations, setViolations] = useState<ViolationRow[]>([]);
  const [violationsPage, setViolationsPage] = useState(1);
  const [violationsTotal, setViolationsTotal] = useState(0);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [apiHealth, setApiHealth] = useState<{ status: string; db: string; redis: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [isCreatingAsset, setIsCreatingAsset] = useState(false);
  const [isStartingScan, setIsStartingScan] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const assetOptions = useMemo(
    () =>
      assets.map((asset) => ({
        value: asset.id,
        label: `${asset.name} — ${asset.url}`,
      })),
    [assets],
  );

  const progressPercent = useMemo(() => {
    if (!scanDetail?.progress || scanDetail.progress.pagesTotal === 0) return 0;
    return Math.round((scanDetail.progress.pagesScanned / scanDetail.progress.pagesTotal) * 100);
  }, [scanDetail?.progress]);

  const loadAssets = useCallback(async () => {
    setIsLoadingAssets(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const rows = await listAssets(token);
      setAssets(rows);
      if (rows.length > 0 && !selectedAssetId) {
        setSelectedAssetId(rows[0]!.id);
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setIsLoadingAssets(false);
    }
  }, [selectedAssetId]);

  const loadViolations = useCallback(async (scanId: string, page = 1, severity?: string) => {
    try {
      const token = await getAccessToken();
      const { rows, meta } = await listViolations(token, scanId, {
        page,
        limit: 20,
        severity: severity || undefined,
      });
      setViolations(rows);
      setViolationsPage(page);
      setViolationsTotal(meta?.total ?? rows.length);
    } catch (err) {
      setError(formatApiError(err));
    }
  }, []);

  const refreshScan = useCallback(
    async (scanId: string) => {
      const token = await getAccessToken();
      const detail = await getScan(token, scanId);
      setScanDetail(detail);

      if (detail.status === 'completed') {
        await loadViolations(scanId, 1, severityFilter === 'all' ? undefined : severityFilter);
      }

      return detail;
    },
    [loadViolations, severityFilter],
  );

  useEffect(() => {
    void loadAssets();
    void checkApiHealth()
      .then(setApiHealth)
      .catch(() => setApiHealth(null));
  }, [loadAssets]);

  useEffect(() => {
    if (!activeScanId) return;

    const poll = async () => {
      try {
        const detail = await refreshScan(activeScanId);
        if (TERMINAL_STATUSES.has(detail.status) && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch (err) {
        setError(formatApiError(err));
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    };

    void poll();
    pollRef.current = setInterval(() => void poll(), 2500);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [activeScanId, refreshScan]);

  useEffect(() => {
    if (activeScanId && scanDetail?.status === 'completed') {
      void loadViolations(
        activeScanId,
        violationsPage,
        severityFilter === 'all' ? undefined : severityFilter,
      );
    }
  }, [severityFilter, activeScanId, scanDetail?.status, violationsPage, loadViolations]);

  async function handleCreateAsset() {
    setError(null);
    setInfo(null);
    setIsCreatingAsset(true);
    try {
      const token = await getAccessToken();
      const created = await createAsset(token, {
        name: assetName.trim() || new URL(assetUrl).hostname,
        url: assetUrl.trim(),
        type: 'website',
      });
      setAssets((prev) => [created, ...prev]);
      setSelectedAssetId(created.id);
      setInfo(`Asset "${created.name}" created.`);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setIsCreatingAsset(false);
    }
  }

  async function handleStartScan() {
    if (!selectedAssetId) {
      setError('Select or create an asset before starting a scan.');
      return;
    }

    setError(null);
    setInfo(null);
    setIsStartingScan(true);
    setScanDetail(null);
    setViolations([]);
    setViolationsTotal(0);

    try {
      const token = await getAccessToken();
      const excludeList = excludePaths
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      const result = await createScan(token, {
        asset_id: selectedAssetId,
        scan_type: scanType,
        wcag_level: wcagLevel,
        standards,
        max_pages: Number(maxPages) || 1,
        exclude_paths: excludeList.length > 0 ? excludeList : undefined,
      });

      setActiveScanId(result.scanId);
      setInfo(result.message);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setIsStartingScan(false);
    }
  }

  async function handleCancelScan() {
    if (!activeScanId) return;
    setIsCancelling(true);
    setError(null);
    try {
      const token = await getAccessToken();
      await cancelScan(token, activeScanId);
      setInfo('Scan cancellation requested.');
      await refreshScan(activeScanId);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setIsCancelling(false);
    }
  }

  function toggleStandard(value: ComplianceStandard, checked: boolean) {
    setStandards((prev) => (checked ? [...prev, value] : prev.filter((s) => s !== value)));
  }

  const violationColumns: DataTableColumn<ViolationRow>[] = [
    {
      id: 'severity',
      header: 'Severity',
      accessor: (row) => <Badge severity={row.impact} />,
      sortValue: (row) => row.impact,
    },
    {
      id: 'rule',
      header: 'Rule',
      accessor: (row) => <span className="font-mono text-xs">{row.ruleId}</span>,
      sortValue: (row) => row.ruleId,
    },
    {
      id: 'wcag',
      header: 'WCAG',
      accessor: (row) => row.wcagCriteria?.join(', ') || '—',
    },
    {
      id: 'page',
      header: 'Page',
      accessor: (row) =>
        row.pageUrl ? (
          <a
            href={row.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 underline-offset-2 hover:underline"
          >
            {(() => {
              try {
                return new URL(row.pageUrl).pathname || row.pageUrl;
              } catch {
                return row.pageUrl;
              }
            })()}
          </a>
        ) : (
          '—'
        ),
    },
    {
      id: 'description',
      header: 'Description',
      accessor: (row) => (
        <span className="line-clamp-2 text-sm" title={row.description}>
          {row.description}
        </span>
      ),
    },
    {
      id: 'help',
      header: 'Help',
      accessor: (row) =>
        row.helpUrl ? (
          <a
            href={row.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-600 underline-offset-2 hover:underline"
          >
            Docs
          </a>
        ) : (
          '—'
        ),
    },
  ];

  const isScanActive = scanDetail?.status === 'pending' || scanDetail?.status === 'running';

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error" title="Error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      {info && (
        <Alert variant="info" title="Status" onDismiss={() => setInfo(null)}>
          {info}
        </Alert>
      )}

      <Card heading="Environment" headingLevel={2}>
        <dl className="grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-text-tertiary">API</dt>
            <dd className="font-mono text-sm">
              {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-tertiary">Health</dt>
            <dd className="text-sm">
              {apiHealth ? (
                <>
                  {apiHealth.status} · DB {apiHealth.db} · Redis {apiHealth.redis}
                </>
              ) : (
                'Unreachable — start API with pnpm --filter @accessshield/api dev'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-tertiary">Worker reminder</dt>
            <dd className="text-sm text-text-secondary">
              Run{' '}
              <code className="rounded bg-gray-100 px-1">
                pnpm --filter @accessshield/api dev:worker
              </code>{' '}
              in a second terminal
            </dd>
          </div>
        </dl>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card heading="1. Asset" headingLevel={2} description="Register a website to scan.">
            <div className="mt-4 space-y-4">
              <Input
                label="Display name"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="My website"
                hint="Optional — defaults to hostname"
              />
              <Input
                label="Website URL"
                type="url"
                value={assetUrl}
                onChange={(e) => setAssetUrl(e.target.value)}
                required
                placeholder="https://example.com"
              />
              <Button
                type="button"
                onClick={() => void handleCreateAsset()}
                disabled={isCreatingAsset || !assetUrl.trim()}
                aria-busy={isCreatingAsset}
              >
                {isCreatingAsset ? 'Creating…' : 'Create asset'}
              </Button>

              <Select
                label="Select asset for scan"
                options={assetOptions}
                value={selectedAssetId || undefined}
                onValueChange={setSelectedAssetId}
                disabled={isLoadingAssets || assetOptions.length === 0}
                placeholder={
                  isLoadingAssets ? 'Loading assets…' : 'No assets yet — create one above'
                }
                hint={isLoadingAssets ? 'Loading assets…' : `${assets.length} asset(s) available`}
              />
            </div>
          </Card>

          <Card heading="2. Scan configuration" headingLevel={2}>
            <div className="mt-4 space-y-4">
              <Select
                label="Scan type"
                options={SCAN_TYPE_OPTIONS}
                value={scanType}
                onValueChange={(v) => setScanType(v as ScanType)}
              />
              <Select
                label="WCAG level"
                options={WCAG_OPTIONS}
                value={wcagLevel}
                onValueChange={(v) => setWcagLevel(v as WcagLevel)}
              />
              <CheckboxGroup legend="Compliance standards">
                {STANDARD_OPTIONS.map((option) => (
                  <Checkbox
                    key={option.value}
                    label={option.label}
                    checked={standards.includes(option.value)}
                    onCheckedChange={(checked) => toggleStandard(option.value, checked === true)}
                  />
                ))}
              </CheckboxGroup>
              <Input
                label="Max pages"
                type="number"
                min={1}
                max={500}
                value={maxPages}
                onChange={(e) => setMaxPages(e.target.value)}
                hint="Use 1 with single_page for quick tests"
              />
              <Input
                label="Exclude paths"
                value={excludePaths}
                onChange={(e) => setExcludePaths(e.target.value)}
                placeholder="/api/, /admin/"
                hint="Comma-separated path prefixes"
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => void handleStartScan()}
                  disabled={isStartingScan || !selectedAssetId}
                  aria-busy={isStartingScan}
                >
                  {isStartingScan ? 'Queuing…' : 'Start scan'}
                </Button>
                {isScanActive && activeScanId && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void handleCancelScan()}
                    disabled={isCancelling}
                  >
                    {isCancelling ? 'Cancelling…' : 'Cancel scan'}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card
            heading="3. Scan output"
            headingLevel={2}
            description="Live progress while running; score and violations when complete."
          >
            {!scanDetail && !activeScanId && (
              <p className="mt-4 text-sm text-text-tertiary">
                Start a scan to see status, progress, and violations here.
              </p>
            )}

            {scanDetail && (
              <div className="mt-4 space-y-6">
                <div className="flex flex-wrap items-start gap-6">
                  {scanDetail.score !== null && scanDetail.status === 'completed' && (
                    <ScoreRing score={scanDetail.score} label="Accessibility score" />
                  )}
                  <dl className="grid flex-1 gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm text-text-tertiary">Scan ID</dt>
                      <dd className="break-all font-mono text-xs">{scanDetail.id}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-text-tertiary">Status</dt>
                      <dd className="mt-1">
                        <Badge
                          variant={statusVariant(scanDetail.status)}
                          label={scanDetail.status}
                        />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-text-tertiary">Pages scanned</dt>
                      <dd className="text-sm">{scanDetail.pagesScanned}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-text-tertiary">Violations</dt>
                      <dd className="text-sm">{scanDetail.violationCount}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-text-tertiary">WCAG</dt>
                      <dd className="text-sm">
                        {scanDetail.wcagVersion} {scanDetail.wcagLevel}
                      </dd>
                    </div>
                    {scanDetail.errorMessage && (
                      <div className="sm:col-span-2">
                        <dt className="text-sm text-text-tertiary">Error</dt>
                        <dd className="text-sm text-error-700">{scanDetail.errorMessage}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {scanDetail.progress && isScanActive && (
                  <div className="space-y-2">
                    <Progress
                      value={progressPercent}
                      label={`Scanning pages (${scanDetail.progress.pagesScanned}/${scanDetail.progress.pagesTotal})`}
                    />
                    {scanDetail.progress.currentUrl && (
                      <p className="truncate text-sm text-text-tertiary">
                        Current: {scanDetail.progress.currentUrl}
                      </p>
                    )}
                  </div>
                )}

                {scanDetail.status === 'pending' && (
                  <Alert variant="warning" title="Waiting for worker">
                    Scan is queued. Ensure the scan worker process is running.
                  </Alert>
                )}
              </div>
            )}
          </Card>

          {violations.length > 0 && (
            <Card heading="Violations" headingLevel={2}>
              <div className="mt-4 space-y-4">
                <Select
                  label="Filter by severity"
                  options={[
                    { value: 'all', label: 'All severities' },
                    { value: 'critical', label: 'Critical' },
                    { value: 'serious', label: 'Serious' },
                    { value: 'moderate', label: 'Moderate' },
                    { value: 'minor', label: 'Minor' },
                  ]}
                  value={severityFilter}
                  onValueChange={setSeverityFilter}
                />
                <DataTable
                  columns={violationColumns}
                  data={violations}
                  getRowId={(row) => row.id}
                  pageSize={20}
                  caption={`${violationsTotal} violation(s) found`}
                  emptyMessage="No violations match this filter"
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
