import { getSession, signOut } from 'next-auth/react';
import { apiUrl, getApiBase } from './base';
import type {
  ApiResponse,
  Asset,
  CreateAssetInput,
  CreateScanInput,
  CreateScanResult,
  ListScansParams,
  ScanDetail,
  ScanListItem,
  ViolationRow,
  DocumentScanJob,
  DocumentScanResult,
  DocumentScanListItem,
  DocumentScanStatusResponse,
  ListDocumentScansParams,
  DocumentType,
} from './types';
import { ApiError } from './types';

export type {
  Asset,
  CreateAssetInput,
  CreateScanInput,
  CreateScanResult,
  ListScansParams,
  ScanDetail,
  ScanListItem,
  ViolationRow,
  DocumentScanJob,
  DocumentScanResult,
  DocumentScanListItem,
  DocumentScanStatusResponse,
  ListDocumentScansParams,
} from './types';

/**
 * Retrieve the Keycloak access token for API Bearer calls.
 * Concurrent callers share one in-flight session read.
 */
let tokenPromise: Promise<string> | null = null;

export async function getAccessToken(): Promise<string> {
  if (!tokenPromise) {
    tokenPromise = (async () => {
      const session = await getSession();
      if (!session?.accessToken) {
        const redirectTo =
          typeof window !== 'undefined'
            ? `${window.location.pathname}${window.location.search}`
            : '/dashboard';
        await signOut({ callbackUrl: `/login?redirectTo=${encodeURIComponent(redirectTo)}` });
        throw new Error('Not authenticated — please sign in again.');
      }
      return session.accessToken;
    })().finally(() => {
      tokenPromise = null;
    });
  }

  return tokenPromise;
}

async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let problem: ApiError['problem'];
    try {
      problem = (await response.json()) as ApiError['problem'];
    } catch {
      problem = {
        type: 'https://api.accessshield.in/problems/unknown',
        title: 'Request failed',
        status: response.status,
        detail: response.statusText,
        timestamp: new Date().toISOString(),
      };
    }
    throw new ApiError(problem);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/** List assets for the current organisation */
export async function listAssets(token: string): Promise<Asset[]> {
  const response = await apiFetch<ApiResponse<Asset[]>>('/api/v1/assets', token);
  return response.data;
}

/** Fetch a single asset by ID */
export async function getAsset(token: string, assetId: string): Promise<Asset> {
  const response = await apiFetch<ApiResponse<Asset>>(`/api/v1/assets/${assetId}`, token);
  return response.data;
}

/** Register a new scannable asset */
export async function createAsset(token: string, input: CreateAssetInput): Promise<Asset> {
  const response = await apiFetch<ApiResponse<Asset>>('/api/v1/assets', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.data;
}

/** Register a new mobile app asset with APK/IPA file upload */
export async function createMobileAsset(token: string, formData: FormData): Promise<Asset> {
  const baseUrl = getApiBase();
  const url = baseUrl ? `${baseUrl}/api/v1/assets/mobile` : '/api/v1/assets/mobile';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let problem: ApiError['problem'];
    try {
      problem = (await response.json()) as ApiError['problem'];
    } catch {
      problem = {
        type: 'https://api.accessshield.in/problems/unknown',
        title: 'Request failed',
        status: response.status,
        detail: response.statusText,
        timestamp: new Date().toISOString(),
      };
    }
    throw new ApiError(problem);
  }

  const result = (await response.json()) as ApiResponse<Asset>;
  return result.data;
}

/** Permanently delete an asset and all related scans, violations, and issues */
export async function deleteAsset(token: string, assetId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/assets/${assetId}`, token, { method: 'DELETE' });
}

/** Queue a new accessibility scan */
export async function createScan(token: string, input: CreateScanInput): Promise<CreateScanResult> {
  const response = await apiFetch<ApiResponse<CreateScanResult>>('/api/v1/scans', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.data;
}

/** Fetch scan status and optional live progress */
export async function getScan(token: string, scanId: string): Promise<ScanDetail> {
  const response = await apiFetch<ApiResponse<ScanDetail>>(`/api/v1/scans/${scanId}`, token);
  return response.data;
}

/** Fetch paginated scan history for the organisation */
export async function listScans(
  token: string,
  params?: ListScansParams,
): Promise<{ rows: ScanListItem[]; meta: ApiResponse<ScanListItem[]>['meta'] }> {
  const search = new URLSearchParams();
  if (params?.page) search.set('page', String(params.page));
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.status) search.set('status', params.status);
  if (params?.asset_id) search.set('asset_id', params.asset_id);

  const query = search.toString();
  const path = `/api/v1/scans${query ? `?${query}` : ''}`;
  const response = await apiFetch<ApiResponse<ScanListItem[]>>(path, token);
  return { rows: response.data, meta: response.meta };
}

/** Fetch paginated violations for a completed scan */
export async function listViolations(
  token: string,
  scanId: string,
  params?: { page?: number; limit?: number; severity?: string },
): Promise<{ rows: ViolationRow[]; meta: ApiResponse<ViolationRow[]>['meta'] }> {
  const search = new URLSearchParams();
  if (params?.page) search.set('page', String(params.page));
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.severity) search.set('severity', params.severity);

  const query = search.toString();
  const path = `/api/v1/scans/${scanId}/violations${query ? `?${query}` : ''}`;
  const response = await apiFetch<ApiResponse<ViolationRow[]>>(path, token);
  return { rows: response.data, meta: response.meta };
}

/** Request cancellation of a pending or running scan */
export async function cancelScan(token: string, scanId: string): Promise<void> {
  await apiFetch<ApiResponse<{ message: string }>>(`/api/v1/scans/${scanId}/cancel`, token, {
    method: 'POST',
  });
}

/** Download a generated report file (authenticated — required for local dev storage). */
export async function downloadReportFile(reportId: string, filename: string): Promise<void> {
  const token = await getAccessToken();

  const response = await fetch(apiUrl(`/api/v1/reports/${reportId}/file`), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 404) {
    const meta = await apiFetch<ApiResponse<{ downloadUrl: string }>>(
      `/api/v1/reports/${reportId}/download`,
      token,
    );
    if (meta.data.downloadUrl) {
      window.open(meta.data.downloadUrl, '_blank', 'noopener,noreferrer');
      return;
    }
  }

  if (!response.ok) {
    throw new Error('Failed to download report');
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

/** Check API health (no auth required) */
export async function checkApiHealth(): Promise<{ status: string; db: string; redis: string }> {
  const response = await fetch(apiUrl('/health'));
  if (!response.ok) {
    throw new Error('API health check failed');
  }
  return response.json() as Promise<{ status: string; db: string; redis: string }>;
}

/** Dashboard aggregated stats */
export interface DashboardStats {
  score: number | null;
  scoreDelta: number | null;
  openIssues: number;
  criticalIssues: number;
  assetsCount: number;
  lastScanDate: string | null;
  recentActivity: DashboardActivity[];
}

export interface DashboardActivity {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  userId: string | null;
  userName: string | null;
  description: string;
  createdAt: string;
}

export async function getDashboardStats(token: string): Promise<DashboardStats> {
  const response = await apiFetch<ApiResponse<DashboardStats>>('/api/v1/dashboard/stats', token);
  return response.data;
}

// ─── Document Scans ───────────────────────────────────────────────────────

/** Upload a document and start accessibility scan */
export async function uploadDocumentScan(
  token: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<DocumentScanJob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const baseUrl = getApiBase();
    const url = baseUrl
      ? `${baseUrl}/api/v1/document-scans/upload`
      : '/api/v1/document-scans/upload';

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response.data as DocumentScanJob);
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new ApiError(error));
        } catch {
          reject(new Error(xhr.statusText || 'Upload failed'));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

/** Get document scan status */
const DOCUMENT_TYPES: DocumentType[] = ['pdf', 'docx', 'pptx', 'xlsx'];

function parseDocumentType(value: unknown): DocumentType {
  if (typeof value === 'string' && DOCUMENT_TYPES.includes(value as DocumentType)) {
    return value as DocumentType;
  }
  return 'pdf';
}

function normalizeDocumentScanStatus(
  data: DocumentScanStatusResponse & {
    jobId?: string;
    progressPercent?: number;
    documentName?: string;
    errorMessage?: string;
  },
): DocumentScanStatusResponse {
  return {
    job_id: data.job_id ?? data.jobId ?? '',
    status: data.status,
    progress_percent: data.progress_percent ?? data.progressPercent ?? 0,
    document_name: data.document_name ?? data.documentName ?? '',
    error_message: data.error_message ?? data.errorMessage,
  };
}

function normalizeDocumentScanResult(data: Record<string, unknown>): DocumentScanResult {
  return {
    id: (data.id as string) ?? '',
    job_id: (data.job_id as string) ?? (data.jobId as string) ?? '',
    document_name: (data.document_name as string) ?? (data.documentName as string) ?? '',
    document_type: parseDocumentType(data.document_type ?? data.documentType),
    total_violations: (data.total_violations as number) ?? (data.totalViolations as number) ?? 0,
    critical_count: (data.critical_count as number) ?? (data.criticalCount as number) ?? 0,
    serious_count: (data.serious_count as number) ?? (data.seriousCount as number) ?? 0,
    moderate_count: (data.moderate_count as number) ?? (data.moderateCount as number) ?? 0,
    minor_count: (data.minor_count as number) ?? (data.minorCount as number) ?? 0,
    compliance_score: (data.compliance_score as number) ?? (data.complianceScore as number) ?? 0,
    violations: (data.violations as DocumentScanResult['violations']) ?? [],
    violations_total:
      (data.violations_total as number) ??
      (data.violationsTotal as number) ??
      (data.violations as unknown[])?.length ??
      0,
    violations_page: (data.violations_page as number) ?? (data.violationsPage as number) ?? 1,
    violations_limit: (data.violations_limit as number) ?? (data.violationsLimit as number) ?? 0,
    violations_pages: (data.violations_pages as number) ?? (data.violationsPages as number) ?? 1,
    summary: (data.summary as DocumentScanResult['summary']) ?? {},
    gigw_checkpoint_results:
      (data.gigw_checkpoint_results as DocumentScanResult['gigw_checkpoint_results']) ??
      (data.gigwCheckpointResults as DocumentScanResult['gigw_checkpoint_results']) ??
      {},
    ai_summary: (data.ai_summary as string) ?? (data.aiSummary as string) ?? '',
    scan_duration_seconds:
      (data.scan_duration_seconds as number) ?? (data.scanDurationSeconds as number) ?? 0,
    created_at: (data.created_at as string) ?? (data.createdAt as string) ?? '',
  };
}

export async function getDocumentScanStatus(
  token: string,
  jobId: string,
): Promise<DocumentScanStatusResponse> {
  const response = await apiFetch<ApiResponse<DocumentScanStatusResponse>>(
    `/api/v1/document-scans/${jobId}/status`,
    token,
  );
  return normalizeDocumentScanStatus(response.data);
}

/** Get document scan results */
export async function getDocumentScanResults(
  token: string,
  jobId: string,
): Promise<DocumentScanResult> {
  const response = await apiFetch<ApiResponse<DocumentScanResult>>(
    `/api/v1/document-scans/${jobId}/results`,
    token,
  );
  return normalizeDocumentScanResult(response.data as unknown as Record<string, unknown>);
}

/** Download document scan PDF report */
export async function downloadDocumentScanReport(jobId: string, filename: string): Promise<void> {
  const token = await getAccessToken();

  const response = await fetch(apiUrl(`/api/v1/document-scans/${jobId}/report`), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Failed to download report');
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

/** List document scans for the organisation */
export async function listDocumentScans(
  token: string,
  params?: ListDocumentScansParams,
): Promise<{ scans: DocumentScanListItem[]; meta: ApiResponse<DocumentScanListItem[]>['meta'] }> {
  const search = new URLSearchParams();
  if (params?.page) search.set('page', String(params.page));
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.status) search.set('status', params.status);
  if (params?.document_type) search.set('document_type', params.document_type);

  const query = search.toString();
  const path = `/api/v1/document-scans${query ? `?${query}` : ''}`;
  const response = await apiFetch<ApiResponse<DocumentScanListItem[]>>(path, token);
  return { scans: response.data, meta: response.meta };
}
