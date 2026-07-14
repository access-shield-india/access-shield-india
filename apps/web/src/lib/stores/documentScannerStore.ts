'use client';

import { create } from 'zustand';

export interface DocumentScanJob {
  job_id: string;
  document_name: string;
  document_type: 'pdf' | 'docx' | 'pptx' | 'xlsx';
  document_size_bytes: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress_percent: number;
  estimated_duration_seconds: number;
  created_at: string;
  poll_url: string;
  results_url: string;
}

export interface DocumentViolation {
  violation_id: string;
  checkpoint_id: string;
  standard: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  category: string;
  description: string;
  location: string;
  wcag_criterion: string | null;
  impact: string;
  remediation: string;
  auto_fixable: boolean;
}

export interface DocumentScanResult {
  id: string;
  job_id: string;
  document_name: string;
  document_type: string;
  total_violations: number;
  critical_count: number;
  serious_count: number;
  moderate_count: number;
  minor_count: number;
  compliance_score: number;
  violations: DocumentViolation[];
  violations_total: number;
  violations_page: number;
  violations_limit: number;
  violations_pages: number;
  summary: Record<string, number>;
  gigw_checkpoint_results: Record<string, { status: string; count: number }>;
  ai_summary: string;
  scan_duration_seconds: number;
  created_at: string;
}

export interface DocumentScanListItem {
  id: string;
  documentName: string;
  documentType: 'pdf' | 'docx' | 'pptx' | 'xlsx';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  complianceScore: number | null;
  criticalCount: number;
  seriousCount: number;
  moderateCount: number;
  minorCount: number;
  createdAt: string;
  completedAt: string | null;
}

interface DocumentScannerStore {
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;

  currentJob: DocumentScanJob | null;
  setCurrentJob: (job: DocumentScanJob | null) => void;

  results: DocumentScanResult | null;
  setResults: (results: DocumentScanResult | null) => void;

  isUploading: boolean;
  setIsUploading: (v: boolean) => void;

  uploadError: string | null;
  setUploadError: (err: string | null) => void;

  severityFilter: string | null;
  setSeverityFilter: (severity: string | null) => void;

  categoryFilter: string | null;
  setCategoryFilter: (category: string | null) => void;

  reset: () => void;
}

export const useDocumentScannerStore = create<DocumentScannerStore>((set) => ({
  uploadedFile: null,
  setUploadedFile: (file) => set({ uploadedFile: file }),

  currentJob: null,
  setCurrentJob: (job) => set({ currentJob: job }),

  results: null,
  setResults: (results) => set({ results }),

  isUploading: false,
  setIsUploading: (v) => set({ isUploading: v }),

  uploadError: null,
  setUploadError: (err) => set({ uploadError: err }),

  severityFilter: null,
  setSeverityFilter: (severity) => set({ severityFilter: severity }),

  categoryFilter: null,
  setCategoryFilter: (category) => set({ categoryFilter: category }),

  reset: () =>
    set({
      uploadedFile: null,
      currentJob: null,
      results: null,
      isUploading: false,
      uploadError: null,
      severityFilter: null,
      categoryFilter: null,
    }),
}));
