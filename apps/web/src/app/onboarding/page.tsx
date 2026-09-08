'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Select, Card, Progress, CopyButton } from '@accessshield/ui';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { useCreateAsset, useTriggerScan } from '@/lib/hooks/useApi';
import { RhfCheckbox } from '@/components/dashboard/forms/RhfCheckbox';

const STEPS = [
  { id: 1, label: 'Organisation Details' },
  { id: 2, label: 'Add First Website' },
  { id: 3, label: 'Embed Widget' },
  { id: 4, label: 'First Scan' },
];

const step1Schema = z.object({
  orgName: z.string().min(2, 'Organisation name must be at least 2 characters'),
  industry: z.string().min(1, 'Please select an industry'),
  gstin: z.string().optional(),
});

const step2Schema = z.object({
  websiteName: z.string().min(2, 'Website name is required'),
  url: z.string().url('Please enter a valid URL').startsWith('https://', 'URL must use HTTPS'),
  standards: z.object({
    wcag22: z.boolean(),
    is17802: z.boolean(),
    gigw3: z.boolean(),
    sebi: z.boolean(),
  }),
  maxPages: z.number().min(10).max(500),
});

type Step1FormData = z.infer<typeof step1Schema>;
type Step2FormData = z.infer<typeof step2Schema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [, setOrgData] = useState<Step1FormData | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [widgetAdded, setWidgetAdded] = useState(false);

  const { mutate: createAsset, isPending: isCreatingAsset } = useCreateAsset();
  const { mutate: triggerScan, isPending: isScanning } = useTriggerScan();

  const step1Form = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
  });

  const step2Form = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      standards: {
        wcag22: true,
        is17802: true,
        gigw3: false,
        sebi: false,
      },
      maxPages: 50,
    },
  });

  const handleStep1 = step1Form.handleSubmit((data) => {
    setOrgData(data);
    setCurrentStep(2);
  });

  const handleStep2 = step2Form.handleSubmit((data) => {
    createAsset(
      {
        name: data.websiteName,
        url: data.url,
        type: 'website',
        standards: [
          ...(data.standards.wcag22 ? (['WCAG22'] as const) : []),
          ...(data.standards.is17802 ? (['IS17802'] as const) : []),
          ...(data.standards.gigw3 ? (['GIGW3'] as const) : []),
          ...(data.standards.sebi ? (['SEBI'] as const) : []),
        ],
      },
      {
        onSuccess: (asset) => {
          setAssetId(asset.id);
          setCurrentStep(3);
        },
      },
    );
  });

  const handleStep3 = () => {
    setCurrentStep(4);
  };

  const handleStep4 = () => {
    if (!assetId) return;
    triggerScan(
      { asset_id: assetId },
      {
        onSuccess: () => {
          router.push('/dashboard');
        },
      },
    );
  };

  const widgetToken = assetId ? `as_${assetId.slice(0, 8)}` : 'as_xxxxxxxx';
  const embedCode = `<script
  src="https://accessiblenow.in/widget.js"
  data-token="${widgetToken}"
  async
></script>`;

  return (
    <main className="min-h-screen bg-bg-secondary px-4 py-12">
      <div className="mx-auto max-w-3xl">
        {/* Progress Indicator */}
        <nav aria-label="Onboarding steps" className="mb-8">
          <ol className="flex items-center justify-between">
            {STEPS.map((step) => {
              const isComplete = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <li
                  key={step.id}
                  className="flex flex-1 items-center"
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={isComplete ? `Completed: ${step.label}` : undefined}
                >
                  <div className="flex flex-col items-center">
                    {isComplete ? (
                      <CheckCircle className="h-8 w-8 text-success-700" aria-hidden="true" />
                    ) : (
                      <Circle
                        className={`h-8 w-8 ${isCurrent ? 'text-primary-600' : 'text-gray-300'}`}
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`mt-2 text-sm font-medium ${
                        isCurrent ? 'text-primary-600' : 'text-text-secondary'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {step.id < STEPS.length && (
                    <div className="mx-4 h-0.5 flex-1 bg-gray-200" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>
          <p
            className="mt-4 text-center text-sm text-text-tertiary"
            role="status"
            aria-live="polite"
          >
            Step {currentStep} of {STEPS.length} — {STEPS[currentStep - 1]?.label ?? ''}
          </p>
        </nav>

        {/* Step 1: Organisation Details */}
        {currentStep === 1 && (
          <Card>
            <h2 className="text-2xl font-bold text-text-primary mb-6">
              Tell us about your organisation
            </h2>
            <form onSubmit={handleStep1} className="space-y-4">
              <Input
                label="Organisation Name"
                required
                {...step1Form.register('orgName')}
                error={step1Form.formState.errors.orgName?.message}
              />

              <Select
                label="Industry"
                required
                placeholder="Select industry"
                value={step1Form.watch('industry') || undefined}
                onValueChange={(value) =>
                  step1Form.setValue('industry', value, { shouldValidate: true })
                }
                options={[
                  { value: 'bfsi', label: 'BFSI' },
                  { value: 'ecommerce', label: 'E-commerce' },
                  { value: 'government', label: 'Government' },
                  { value: 'healthcare', label: 'Healthcare' },
                  { value: 'edtech', label: 'EdTech' },
                  { value: 'it', label: 'IT Services' },
                  { value: 'other', label: 'Other' },
                ]}
              />

              <Input
                label="GSTIN (Optional)"
                {...step1Form.register('gstin')}
                error={step1Form.formState.errors.gstin?.message}
                placeholder="22AAAAA0000A1Z5"
              />

              <Button type="submit" className="w-full mt-6">
                Next
              </Button>
            </form>
          </Card>
        )}

        {/* Step 2: Add First Website */}
        {currentStep === 2 && (
          <Card>
            <h2 className="text-2xl font-bold text-text-primary mb-6">Add your first website</h2>
            <form onSubmit={handleStep2} className="space-y-4">
              <Input
                label="Website Name"
                required
                {...step2Form.register('websiteName')}
                error={step2Form.formState.errors.websiteName?.message}
              />

              <Input
                label="Website URL"
                type="url"
                required
                {...step2Form.register('url')}
                error={step2Form.formState.errors.url?.message}
                placeholder="https://example.com"
              />

              <fieldset>
                <legend className="text-sm font-medium text-text-primary block mb-2">
                  Compliance Standards
                </legend>
                <div className="space-y-2">
                  <RhfCheckbox
                    control={step2Form.control}
                    name="standards.wcag22"
                    label="WCAG 2.2 AA"
                  />
                  <RhfCheckbox
                    control={step2Form.control}
                    name="standards.is17802"
                    label="IS 17802 (India)"
                  />
                  <RhfCheckbox
                    control={step2Form.control}
                    name="standards.gigw3"
                    label="GIGW 3.0"
                  />
                  <RhfCheckbox
                    control={step2Form.control}
                    name="standards.sebi"
                    label="SEBI Guidelines"
                  />
                </div>
              </fieldset>

              <Input
                label="Maximum Pages to Scan"
                type="number"
                required
                {...step2Form.register('maxPages', { valueAsNumber: true })}
                error={step2Form.formState.errors.maxPages?.message}
                min={10}
                max={500}
              />

              <Button type="submit" className="w-full mt-6" disabled={isCreatingAsset}>
                {isCreatingAsset ? 'Creating...' : 'Next'}
              </Button>
            </form>
          </Card>
        )}

        {/* Step 3: Embed Widget */}
        {currentStep === 3 && (
          <Card>
            <h2 className="text-2xl font-bold text-text-primary mb-6">
              Embed the accessibility widget
            </h2>
            <p className="text-text-secondary mb-4">
              Copy this code and paste it before the closing{' '}
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">&lt;/body&gt;</code> tag on
              your website.
            </p>
            <div className="relative mb-6">
              <pre className="rounded-md bg-gray-900 p-4 text-sm text-gray-100 overflow-x-auto">
                <code>{embedCode}</code>
              </pre>
              <div className="absolute top-2 right-2">
                <CopyButton text={embedCode} />
              </div>
            </div>

            <label className="flex items-center gap-2 mb-6">
              <input
                type="checkbox"
                checked={widgetAdded}
                onChange={(e) => setWidgetAdded(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
              />
              <span className="text-sm text-gray-700">
                I&apos;ve added the widget to my website
              </span>
            </label>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(4)} className="flex-1">
                Skip for now
              </Button>
              <Button
                onClick={handleStep3}
                disabled={!widgetAdded}
                className="flex-1"
                aria-disabled={!widgetAdded}
              >
                Next
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: First Scan */}
        {currentStep === 4 && (
          <Card>
            <h2 className="text-2xl font-bold text-text-primary mb-6">
              Run your first accessibility scan
            </h2>
            {!isScanning ? (
              <>
                <p className="text-text-secondary mb-6">
                  We&apos;ll analyze your website for accessibility issues and generate a compliance
                  report. This usually takes 2-5 minutes.
                </p>
                <Button onClick={handleStep4} className="w-full">
                  Start Scan
                </Button>
              </>
            ) : (
              <div aria-live="polite" aria-busy="true">
                <div className="flex items-center gap-2 mb-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary-600" aria-hidden="true" />
                  <p className="font-medium text-primary-700">Scanning in progress...</p>
                </div>
                <Progress value={45} className="mb-2" />
                <p className="text-sm text-text-tertiary">
                  This will redirect to your dashboard once complete.
                </p>
              </div>
            )}
          </Card>
        )}
      </div>
    </main>
  );
}
