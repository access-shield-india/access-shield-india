'use client';

import { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Input, Select, Button, Checkbox } from '@accessshield/ui';
import { useCreateAsset, useCreateMobileAsset } from '@/lib/hooks/useApi';
import { Upload, Smartphone, Globe } from 'lucide-react';

const webAssetSchema = z.object({
  name: z.string().min(2, 'Asset name must be at least 2 characters'),
  url: z
    .string({ required_error: 'URL is required' })
    .min(1, 'URL is required')
    .url('Please enter a valid URL')
    .refine((val) => val.startsWith('https://'), {
      message: 'URL must use HTTPS',
    }),
  type: z.enum(['website', 'web_app', 'document', 'pdf']),
  description: z.string().optional().default(''),
  standards: z.object({
    wcag22: z.boolean(),
    is17802: z.boolean(),
    gigw3: z.boolean(),
    sebi: z.boolean(),
  }),
  maxPages: z.number().min(5).max(500),
  scanSchedule: z.enum(['manual', 'weekly', 'monthly']),
});

const mobileAssetSchema = z.object({
  name: z.string().min(2, 'App name must be at least 2 characters'),
  platform: z.enum(['android', 'ios']),
  description: z.string().optional().default(''),
  standards: z.object({
    wcag22: z.boolean(),
    is17802: z.boolean(),
    sebi: z.boolean(),
  }),
  maxScreens: z.number().min(5).max(100),
});

type WebAssetFormData = z.infer<typeof webAssetSchema>;
type MobileAssetFormData = z.infer<typeof mobileAssetSchema>;

export interface AddAssetModalProps {
  open: boolean;
  onClose: () => void;
}

type AssetMode = 'web' | 'mobile';

export function AddAssetModal({ open, onClose }: AddAssetModalProps) {
  const [mode, setMode] = useState<AssetMode>('web');
  const [appFile, setAppFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: createAsset, isPending: isCreatingWeb } = useCreateAsset();
  const { mutate: createMobileAsset, isPending: isCreatingMobile } = useCreateMobileAsset();

  const webForm = useForm<WebAssetFormData>({
    resolver: zodResolver(webAssetSchema),
    defaultValues: {
      name: '',
      url: '',
      type: 'website',
      description: '',
      standards: {
        wcag22: true,
        is17802: true,
        gigw3: false,
        sebi: false,
      },
      maxPages: 50,
      scanSchedule: 'manual',
    },
  });

  const mobileForm = useForm<MobileAssetFormData>({
    resolver: zodResolver(mobileAssetSchema),
    defaultValues: {
      name: '',
      platform: 'android',
      description: '',
      standards: {
        wcag22: true,
        is17802: true,
        sebi: false,
      },
      maxScreens: 50,
    },
  });

  const handleClose = () => {
    webForm.reset();
    mobileForm.reset();
    setAppFile(null);
    onClose();
  };

  const onWebSubmit = (data: WebAssetFormData) => {
    createAsset(
      {
        name: data.name,
        url: data.url,
        type: data.type,
        description: data.description,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  };

  const onMobileSubmit = async (data: MobileAssetFormData) => {
    if (!appFile) {
      mobileForm.setError('root', { message: 'Please upload an APK or IPA file' });
      return;
    }

    const formData = new FormData();
    formData.append('file', appFile);
    formData.append('name', data.name);
    formData.append('platform', data.platform);
    formData.append('description', data.description ?? '');
    formData.append('maxScreens', String(data.maxScreens));
    formData.append('standards', JSON.stringify(data.standards));

    createMobileAsset(formData, {
      onSuccess: () => {
        handleClose();
      },
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const platform = mobileForm.getValues('platform');
    const validExtension = platform === 'android' ? '.apk' : '.ipa';

    if (!file.name.toLowerCase().endsWith(validExtension)) {
      mobileForm.setError('root', {
        message: `Please select a ${validExtension.toUpperCase()} file for ${platform === 'android' ? 'Android' : 'iOS'}`,
      });
      return;
    }

    setAppFile(file);
    mobileForm.clearErrors('root');
  };

  const isPending = isCreatingWeb || isCreatingMobile;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add New Asset"
      description="Register a website or mobile app to monitor for accessibility compliance"
    >
      <div className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => setMode('web')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'web'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Globe size={16} aria-hidden="true" />
            Website
          </button>
          <button
            type="button"
            onClick={() => setMode('mobile')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'mobile'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Smartphone size={16} aria-hidden="true" />
            Mobile App
          </button>
        </div>

        {/* Web Asset Form */}
        {mode === 'web' && (
          <form onSubmit={webForm.handleSubmit(onWebSubmit)} className="space-y-4">
            <Input
              label="Asset Name"
              required
              {...webForm.register('name')}
              error={webForm.formState.errors.name?.message}
              placeholder="My Website"
            />

            <Input
              label="Website URL"
              type="url"
              required
              {...webForm.register('url')}
              error={webForm.formState.errors.url?.message}
              placeholder="https://example.com"
            />

            <Controller
              name="type"
              control={webForm.control}
              render={({ field }) => (
                <Select
                  label="Asset Type"
                  required
                  value={field.value}
                  onValueChange={field.onChange}
                  options={[
                    { value: 'website', label: 'Website' },
                    { value: 'web_app', label: 'Web Application' },
                    { value: 'document', label: 'Document' },
                    { value: 'pdf', label: 'PDF' },
                  ]}
                />
              )}
            />

            <fieldset>
              <legend className="text-sm font-medium text-text-primary block mb-2">
                Compliance Standards
              </legend>
              <div className="space-y-2">
                <Checkbox {...webForm.register('standards.wcag22')} label="WCAG 2.2 AA" />
                <Checkbox {...webForm.register('standards.is17802')} label="IS 17802 (India)" />
                <Checkbox {...webForm.register('standards.gigw3')} label="GIGW 3.0 (Government)" />
                <Checkbox {...webForm.register('standards.sebi')} label="SEBI Guidelines" />
              </div>
            </fieldset>

            <Input
              label="Maximum Pages to Scan"
              type="number"
              required
              {...webForm.register('maxPages', { valueAsNumber: true })}
              error={webForm.formState.errors.maxPages?.message}
              min={5}
              max={500}
            />

            <Controller
              name="scanSchedule"
              control={webForm.control}
              render={({ field }) => (
                <Select
                  label="Scan Schedule"
                  required
                  value={field.value}
                  onValueChange={field.onChange}
                  options={[
                    { value: 'manual', label: 'Manual (on-demand)' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                  ]}
                />
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isPending} className="flex-1">
                Create Asset
              </Button>
            </div>
          </form>
        )}

        {/* Mobile App Form */}
        {mode === 'mobile' && (
          <form onSubmit={mobileForm.handleSubmit(onMobileSubmit)} className="space-y-4">
            <Input
              label="App Name"
              required
              {...mobileForm.register('name')}
              error={mobileForm.formState.errors.name?.message}
              placeholder="My Mobile App"
            />

            <Controller
              name="platform"
              control={mobileForm.control}
              render={({ field }) => (
                <Select
                  label="Platform"
                  required
                  value={field.value}
                  onValueChange={(val) => {
                    field.onChange(val);
                    setAppFile(null);
                  }}
                  options={[
                    { value: 'android', label: 'Android (APK)' },
                    { value: 'ios', label: 'iOS (IPA)' },
                  ]}
                />
              )}
            />

            {/* File Upload */}
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">
                Upload {mobileForm.watch('platform') === 'android' ? 'APK' : 'IPA'} File
                <span className="text-error-700 ml-0.5">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept={mobileForm.watch('platform') === 'android' ? '.apk' : '.ipa'}
                onChange={handleFileSelect}
                className="hidden"
                aria-describedby="file-help"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 hover:bg-primary-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                {appFile ? (
                  <div className="flex items-center justify-center gap-2 text-primary-700">
                    <Smartphone size={20} aria-hidden="true" />
                    <span className="font-medium">{appFile.name}</span>
                    <span className="text-gray-500">
                      ({(appFile.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Upload size={24} aria-hidden="true" />
                    <span>
                      Click to upload {mobileForm.watch('platform') === 'android' ? 'APK' : 'IPA'}
                    </span>
                    <span className="text-xs">Max 500MB</span>
                  </div>
                )}
              </button>
              <p id="file-help" className="mt-1 text-xs text-gray-500">
                {mobileForm.watch('platform') === 'android'
                  ? 'Debug or release APK file'
                  : 'Ad-hoc or development IPA file'}
              </p>
              {mobileForm.formState.errors.root && (
                <p className="mt-1 text-sm text-error-700" role="alert">
                  {mobileForm.formState.errors.root.message}
                </p>
              )}
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-text-primary block mb-2">
                Compliance Standards
              </legend>
              <div className="space-y-2">
                <Checkbox {...mobileForm.register('standards.wcag22')} label="WCAG 2.2 AA" />
                <Checkbox {...mobileForm.register('standards.is17802')} label="IS 17802 (India)" />
                <Checkbox {...mobileForm.register('standards.sebi')} label="SEBI Guidelines" />
              </div>
            </fieldset>

            <Input
              label="Maximum Screens to Scan"
              type="number"
              required
              {...mobileForm.register('maxScreens', { valueAsNumber: true })}
              error={mobileForm.formState.errors.maxScreens?.message}
              min={5}
              max={100}
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isPending}
                className="flex-1"
                disabled={!appFile}
              >
                Upload &amp; Create
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
