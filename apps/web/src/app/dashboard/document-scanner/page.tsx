'use client';

import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Presentation,
  File,
} from 'lucide-react';
import { useUploadDocumentScan } from '@/lib/hooks/useApi';
import { cn } from '@/lib/utils';

const ACCEPTED_FORMATS = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
};

const FORMAT_INFO: Record<string, { icon: typeof FileText; label: string; checks: string[] }> = {
  pdf: {
    icon: FileText,
    label: 'PDF Document',
    checks: [
      'PDF tagging and structure tree',
      'Alternative text on all images',
      'Document reading order',
      'Heading hierarchy (H1–H6)',
      'Data table header markup',
      'Form field labels',
      'Document title and language metadata',
      'Colour contrast on text',
      'Hyperlink text quality',
      'Scanned image-only detection',
      'Security settings (no copy restrictions)',
      'Bookmarks for navigation',
    ],
  },
  docx: {
    icon: FileText,
    label: 'Word Document',
    checks: [
      'Heading structure and hierarchy',
      'Alternative text on images',
      'Table header row markup',
      'Document title and language',
      'Colour-only content indicators',
      'Hyperlink text quality',
      'Proper list structure (not fake bullets)',
      'Form field labels and names',
    ],
  },
  pptx: {
    icon: Presentation,
    label: 'PowerPoint Presentation',
    checks: [
      'Slide title presence and uniqueness',
      'Shape reading order (Selection Pane)',
      'Alternative text on all images',
      'Colour contrast on text',
      'Auto-advance animation timing',
      'Font size readability',
      'Hyperlink text quality',
      'Duplicate or empty slide titles',
    ],
  },
  xlsx: {
    icon: FileSpreadsheet,
    label: 'Excel Spreadsheet',
    checks: [
      'Data table header rows',
      'Chart alternative text',
      'Colour-only data encoding',
      'Merged cell accessibility',
      'Descriptive sheet tab names',
      'Named ranges for data tables',
      'Empty rows/columns in data areas',
      'Workbook title metadata',
    ],
  },
};

const EXT_TO_TYPE: Record<string, string> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.pptx': 'pptx',
  '.xlsx': 'xlsx',
};

function getDocType(file: File): string | null {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return EXT_TO_TYPE[ext] ?? null;
}

export default function DocumentScannerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { mutate: uploadDocument, isPending } = useUploadDocumentScan();

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    setError(null);
    if (rejectedFiles.length > 0) {
      const code = rejectedFiles[0]?.errors?.[0]?.code;
      if (code === 'file-too-large') {
        setError('File is too large. Maximum size is 50MB.');
      } else if (code === 'file-invalid-type') {
        setError('Unsupported file type. Please upload a PDF, Word, PowerPoint, or Excel file.');
      } else {
        setError('File rejected. Please try another file.');
      }
      return;
    }
    if (acceptedFiles.length > 0 && acceptedFiles[0]) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  const handleScan = () => {
    if (!file) return;
    setError(null);

    const formData = new FormData();
    formData.append('document', file);

    uploadDocument(
      { formData, onProgress: setUploadProgress },
      {
        onError: (err) => {
          setError(err.message || 'Upload failed. Please try again.');
          setUploadProgress(0);
        },
      },
    );
  };

  const docType = file ? getDocType(file) : null;
  const formatInfo = docType ? FORMAT_INFO[docType] : null;
  const FormatIcon = formatInfo?.icon ?? File;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-primary-50 to-white p-8 shadow-lg">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-extrabold text-gray-900">Document Scanner</h1>
            <p className="text-lg font-medium text-gray-600">
              Scan documents for WCAG 2.1 AA, GIGW 3.0, RPwD Act 2016, IS 17802, and PDF/UA
              compliance
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={cn(
            'cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200',
            isDragActive
              ? 'scale-[1.01] border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50',
            file && !error ? 'border-green-500 bg-green-50' : '',
            isPending ? 'pointer-events-none opacity-60' : '',
          )}
        >
          <input {...getInputProps()} aria-label="Upload document for accessibility scan" />

          {file && !error ? (
            <div className="flex items-center justify-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                <FormatIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">{file.name}</p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                  {formatInfo && ` · ${formatInfo.label}`}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setUploadProgress(0);
                    }}
                    className="ml-3 text-xs text-red-500 underline hover:text-red-700"
                    aria-label="Remove selected file"
                  >
                    Remove
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100">
                <Upload className="h-7 w-7 text-gray-400" aria-hidden="true" />
              </div>
              <p className="text-base font-medium text-gray-700">
                {isDragActive ? 'Drop your document here' : 'Drag & drop your document'}
              </p>
              <p className="mt-1 text-sm text-gray-400">or click to browse</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {['PDF', 'Word .docx', 'PowerPoint .pptx', 'Excel .xlsx'].map((fmt) => (
                  <span
                    key={fmt}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-400">Maximum file size: 50MB</p>
            </>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Upload progress */}
        {isPending && uploadProgress > 0 && (
          <div
            className="space-y-2"
            role="progressbar"
            aria-valuenow={uploadProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Uploading document...</span>
              <span className="font-medium text-gray-900">{uploadProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-primary-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* What will be checked */}
        {formatInfo && !error && (
          <div className="rounded-xl border border-primary-300 bg-primary-50 p-5">
            <h2 className="mb-3 text-sm font-semibold text-primary-900">
              Accessibility checks for {formatInfo.label}:
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {formatInfo.checks.map((check) => (
                <div key={check} className="flex items-start gap-2 text-xs text-primary-800">
                  <CheckCircle
                    className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary-500"
                    aria-hidden="true"
                  />
                  <span>{check}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Standards badge strip */}
        {file && (
          <div className="flex flex-wrap gap-2">
            {[
              'WCAG 2.1 AA',
              'GIGW 3.0',
              'RPwD Act 2016',
              'IS 17802:2021',
              ...(docType === 'pdf' ? ['PDF/UA-1'] : []),
            ].map((std) => (
              <span
                key={std}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 shadow-sm"
              >
                {std}
              </span>
            ))}
          </div>
        )}

        {/* Scan button */}
        <button
          type="button"
          onClick={handleScan}
          disabled={!file || isPending || Boolean(error)}
          className="w-full rounded-xl bg-primary-700 py-4 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending
            ? 'Uploading document...'
            : file
              ? `Scan ${file.name.length > 40 ? file.name.substring(0, 37) + '...' : file.name}`
              : 'Select a document to scan'}
        </button>

        {/* Past scans link */}
        <p className="text-center text-sm text-gray-500">
          View{' '}
          <a href="/dashboard/document-scanner/history" className="text-primary-600 hover:underline">
            past document scans
          </a>
        </p>
      </div>
    </div>
  );
}
