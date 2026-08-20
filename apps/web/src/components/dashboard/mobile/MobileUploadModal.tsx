'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Input, Button, Progress } from '@accessshield/ui';
import { Upload, Smartphone, AlertCircle, CheckCircle } from 'lucide-react';
import { useTriggerMobileScan } from '@/lib/hooks/useApi';
import type { Asset } from '@/lib/api/types';
import { RhfCheckbox } from '@/components/dashboard/forms/RhfCheckbox';

const uploadSchema = z.object({
  osVersion: z.string().optional(),
  deviceModel: z.string().optional(),
  standards: z.object({
    wcag22: z.boolean(),
    is17802: z.boolean(),
    sebi: z.boolean(),
  }),
});

type UploadFormData = z.infer<typeof uploadSchema>;

export interface MobileUploadModalProps {
  open: boolean;
  onClose: () => void;
  asset: Asset;
  platform: 'android' | 'ios';
}

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export function MobileUploadModal({ open, onClose, asset, platform }: MobileUploadModalProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: triggerMobileScan, isPending } = useTriggerMobileScan();

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      osVersion: '',
      deviceModel: '',
      standards: {
        wcag22: true,
        is17802: true,
        sebi: false,
      },
    },
  });

  const fileExtension = platform === 'android' ? '.apk' : '.ipa';
  const fileType = platform === 'android' ? 'APK' : 'IPA';

  const handleClose = useCallback(() => {
    setFile(null);
    setUploadProgress(0);
    form.reset();
    onClose();
  }, [form, onClose]);

  const validateFile = useCallback(
    (selectedFile: File): string | null => {
      if (!selectedFile.name.toLowerCase().endsWith(fileExtension)) {
        return `Please select a ${fileType} file for ${platform === 'android' ? 'Android' : 'iOS'}`;
      }
      if (selectedFile.size > MAX_FILE_SIZE) {
        return `File size exceeds 500MB limit (${(selectedFile.size / 1024 / 1024).toFixed(1)}MB)`;
      }
      return null;
    },
    [fileExtension, fileType, platform],
  );

  const handleFileSelect = useCallback(
    (selectedFile: File | null) => {
      if (!selectedFile) return;
      const error = validateFile(selectedFile);
      if (error) {
        form.setError('root', { message: error });
        return;
      }
      setFile(selectedFile);
      form.clearErrors('root');
    },
    [form, validateFile],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0] ?? null);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFileSelect(e.dataTransfer.files?.[0] ?? null);
    },
    [handleFileSelect],
  );

  const onSubmit = (data: UploadFormData) => {
    if (!file) {
      form.setError('root', { message: `Please upload a ${fileType} file` });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('assetId', asset.id);
    formData.append('platform', platform);
    if (data.osVersion) formData.append('osVersion', data.osVersion);
    if (data.deviceModel) formData.append('deviceModel', data.deviceModel);
    formData.append('standards', JSON.stringify(data.standards));

    triggerMobileScan(
      { formData, onProgress: setUploadProgress },
      {
        onSuccess: (result) => {
          handleClose();
          router.push(`/dashboard/scans/${result.scanId}`);
        },
        onError: () => {
          setUploadProgress(0);
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Upload ${fileType} for Scanning`}
      description={`Upload your ${platform === 'android' ? 'Android APK' : 'iOS IPA'} file to scan ${asset.name} for accessibility issues`}
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* File Upload Drop Zone */}
        <div>
          <label className="text-sm font-medium text-text-primary block mb-2">
            {fileType} File
            <span className="text-error-700 ml-0.5" aria-hidden="true">
              *
            </span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept={fileExtension}
            onChange={handleInputChange}
            className="hidden"
            aria-label={`Upload ${fileType} file`}
            aria-describedby="file-requirements"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            disabled={isPending}
            className={`
              w-full border-2 border-dashed rounded-xl p-8 text-center transition-all
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2
              ${dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50/50'}
              ${isPending ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
            `}
          >
            {file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-600" aria-hidden="true" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <p className="text-xs text-primary-600 font-medium">Click or drop to replace</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100">
                  <Upload className="h-6 w-6 text-gray-400" aria-hidden="true" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-gray-700">
                    Drop your {fileType} here, or <span className="text-primary-600">browse</span>
                  </p>
                  <p id="file-requirements" className="text-sm text-gray-500 mt-1">
                    {platform === 'android' ? 'Debug or release APK' : 'Ad-hoc or development IPA'}{' '}
                    · Max 500MB
                  </p>
                </div>
              </div>
            )}
          </button>

          {form.formState.errors.root && (
            <div className="flex items-start gap-2 mt-2 text-sm text-error-700" role="alert">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              {form.formState.errors.root.message}
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {isPending && uploadProgress > 0 && (
          <div
            className="space-y-2"
            role="progressbar"
            aria-valuenow={uploadProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Uploading...</span>
              <span className="font-medium text-gray-900">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {/* Compliance Standards */}
        <fieldset>
          <legend className="text-sm font-medium text-text-primary block mb-2">
            Compliance Standards
          </legend>
          <div className="space-y-2">
            <RhfCheckbox control={form.control} name="standards.wcag22" label="WCAG 2.2 AA" />
            <RhfCheckbox control={form.control} name="standards.is17802" label="IS 17802 (India)" />
            <RhfCheckbox control={form.control} name="standards.sebi" label="SEBI Guidelines" />
          </div>
        </fieldset>

        {/* Optional Device Info */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="OS Version"
            placeholder={platform === 'android' ? 'Android 13' : 'iOS 17.4'}
            {...form.register('osVersion')}
            hint="Optional — for test reporting"
          />
          <Input
            label="Device Model"
            placeholder={platform === 'android' ? 'Pixel 7' : 'iPhone 15'}
            {...form.register('deviceModel')}
            hint="Optional — for test reporting"
          />
        </div>

        {/* Estimated Time Notice */}
        <div className="flex items-start gap-3 p-4 bg-primary-50 rounded-xl border border-primary-100">
          <Smartphone className="h-5 w-5 text-primary-600 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium text-primary-900">Mobile scan takes 8-12 minutes</p>
            <p className="text-primary-700 mt-0.5">
              We&apos;ll notify you when the scan completes. You can close this dialog after upload
              starts.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1"
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            isLoading={isPending}
            disabled={!file}
            aria-busy={isPending}
          >
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            Upload and Scan
          </Button>
        </div>
      </form>
    </Modal>
  );
}

MobileUploadModal.displayName = 'MobileUploadModal';
