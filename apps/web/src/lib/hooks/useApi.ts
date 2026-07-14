'use client';

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  listAssets,
  getAsset,
  createAsset,
  createMobileAsset,
  deleteAsset,
  createScan,
  getScan,
  listScans,
  listViolations,
  getAccessToken,
  getDashboardStats,
  uploadDocumentScan,
  getDocumentScanStatus,
  getDocumentScanResults,
  listDocumentScans,
  type CreateAssetInput,
  type CreateScanInput,
  type ScanDetail,
  type ListScansParams,
  type DashboardStats,
  type DashboardActivity,
  type DocumentScanJob,
  type DocumentScanResult,
  type DocumentScanListItem,
  type DocumentScanStatusResponse,
  type ListDocumentScansParams,
} from '@/lib/api/client';
import { ApiError } from '@/lib/api/types';

/** Assets */
export function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const token = await getAccessToken();
      return listAssets(token);
    },
  });
}

export function useAsset(assetId: string | null) {
  return useQuery({
    queryKey: ['assets', assetId],
    queryFn: async () => {
      if (!assetId) throw new Error('Asset ID required');
      const token = await getAccessToken();
      return getAsset(token, assetId);
    },
    enabled: Boolean(assetId),
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAssetInput) => {
      const token = await getAccessToken();
      return createAsset(token, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset created successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
}

export function useCreateMobileAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const token = await getAccessToken();
      return createMobileAsset(token, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Mobile app uploaded and asset created');
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ assetId }: { assetId: string; redirectTo?: string }) => {
      const token = await getAccessToken();
      await deleteAsset(token, assetId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Asset deleted');
      if (variables.redirectTo) {
        router.push(variables.redirectTo);
      }
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
}

/** Scans */
export function useScan(scanId: string | null, options?: Partial<UseQueryOptions<ScanDetail>>) {
  return useQuery({
    queryKey: ['scans', scanId],
    queryFn: async () => {
      if (!scanId) throw new Error('Scan ID required');
      const token = await getAccessToken();
      return getScan(token, scanId);
    },
    enabled: Boolean(scanId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const isActive = status === 'running' || status === 'pending';
      return isActive ? 3000 : false;
    },
    ...options,
  });
}

export function useTriggerScan() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (input: CreateScanInput) => {
      const token = await getAccessToken();
      return createScan(token, input);
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      queryClient.invalidateQueries({ queryKey: ['scans', variables.asset_id] });
      toast.success('Scan started successfully');
      router.push(`/dashboard/scans/${result.scanId}`);
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
}

export function useScans(params?: ListScansParams) {
  return useQuery({
    queryKey: ['scans', params],
    queryFn: async () => {
      const token = await getAccessToken();
      return listScans(token, params);
    },
    refetchInterval: (query) => {
      const rows = query.state.data?.rows ?? [];
      const hasActive = rows.some((scan) => scan.status === 'running' || scan.status === 'pending');
      return hasActive ? 5000 : false;
    },
  });
}

/** Violations */
export function useViolations(
  scanId: string | null,
  params?: { page?: number; limit?: number; severity?: string },
  scanStatus?: ScanDetail['status'],
) {
  return useQuery({
    queryKey: ['violations', scanId, params],
    queryFn: async () => {
      if (!scanId) throw new Error('Scan ID required');
      const token = await getAccessToken();
      return listViolations(token, scanId, params);
    },
    enabled: Boolean(scanId) && scanStatus === 'completed',
  });
}

/** Dashboard stats */
export type { DashboardStats, DashboardActivity };
/** @deprecated Use DashboardActivity */
export type Activity = DashboardActivity;

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const token = await getAccessToken();
      return getDashboardStats(token);
    },
  });
}

/** Mobile Scans */
export interface MobileScanDetail {
  id: string;
  scanId: string;
  assetId: string;
  platform: 'android' | 'ios';
  bundleId: string | null;
  osVersion: string | null;
  deviceModel: string | null;
  framework: string | null;
  frameworkAutoDetected: boolean;
  screensDiscovered: number;
  screensScanned: number;
  discoveredScreens: string[];
  testEnvironment: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export function useMobileScan(mobileScanId: string | null) {
  return useQuery({
    queryKey: ['mobile-scans', mobileScanId],
    queryFn: async () => {
      if (!mobileScanId) throw new Error('Mobile scan ID required');
      const token = await getAccessToken();
      const response = await fetch(`/api/v1/mobile-scans/${mobileScanId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch mobile scan');
      }
      const result = await response.json();
      return result.data as MobileScanDetail;
    },
    enabled: Boolean(mobileScanId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const isActive = status === 'running' || status === 'pending';
      return isActive ? 5000 : false;
    },
  });
}

interface TriggerMobileScanInput {
  formData: FormData;
  onProgress?: (percent: number) => void;
}

interface TriggerMobileScanResult {
  scanId: string;
  mobileScanId: string;
  status: string;
  message: string;
}

export function useTriggerMobileScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      formData,
      onProgress,
    }: TriggerMobileScanInput): Promise<TriggerMobileScanResult> => {
      const token = await getAccessToken();

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

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
              resolve(response.data as TriggerMobileScanResult);
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

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });

        xhr.open('POST', '/api/v1/mobile-scans');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      queryClient.invalidateQueries({ queryKey: ['mobile-scans'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Mobile scan started — estimated 8-12 minutes');
    },
    onError: (error: ApiError | Error) => {
      toast.error(error.message || 'Failed to start mobile scan');
    },
  });
}

// ─── Document Scans ───────────────────────────────────────────────────────

export type {
  DocumentScanJob,
  DocumentScanResult,
  DocumentScanListItem,
  DocumentScanStatusResponse,
  ListDocumentScansParams,
};

interface UploadDocumentScanInput {
  formData: FormData;
  onProgress?: (percent: number) => void;
}

export function useUploadDocumentScan() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      formData,
      onProgress,
    }: UploadDocumentScanInput): Promise<DocumentScanJob> => {
      const token = await getAccessToken();
      return uploadDocumentScan(token, formData, onProgress);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['document-scans'] });
      toast.success('Document scan started');
      router.push(`/dashboard/document-scanner/results/${result.job_id}`);
    },
    onError: (error: ApiError | Error) => {
      toast.error(error.message || 'Failed to upload document');
    },
  });
}

export function useDocumentScanStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['document-scans', jobId, 'status'],
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID required');
      const token = await getAccessToken();
      return getDocumentScanStatus(token, jobId);
    },
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const isActive = status === 'queued' || status === 'processing';
      return isActive ? 3000 : false;
    },
  });
}

export function useDocumentScanResults(jobId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['document-scans', jobId, 'results'],
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID required');
      const token = await getAccessToken();
      return getDocumentScanResults(token, jobId);
    },
    enabled: Boolean(jobId) && enabled,
  });
}

export function useDocumentScans(params?: ListDocumentScansParams) {
  return useQuery({
    queryKey: ['document-scans', params],
    queryFn: async () => {
      const token = await getAccessToken();
      return listDocumentScans(token, params);
    },
    refetchInterval: (query) => {
      const scans = query.state.data?.scans ?? [];
      const hasActive = scans.some(
        (scan) => scan.status === 'queued' || scan.status === 'processing',
      );
      return hasActive ? 5000 : false;
    },
  });
}
