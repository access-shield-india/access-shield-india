'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Button, Badge, Progress } from '@accessshield/ui';
import { ButtonLink } from '@/components/marketing/ButtonLink';
import { apiUrl } from '@/lib/api/base';
import { ScoreRing } from './ScoreRing';

const scanSchema = z.object({
  url: z.string().url('Enter a valid website URL'),
  email: z.string().email('Enter a valid email address'),
});

type ScanFormData = z.infer<typeof scanSchema>;

type ScanState = 'form' | 'scanning' | 'results' | 'error';

interface ScanResult {
  scanId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  pagesScanned: number;
  pagesTotal: number;
  currentUrl?: string;
  score?: number;
  criticalCount: number;
  seriousCount: number;
  moderateCount: number;
  minorCount: number;
  topViolations: Array<{
    id: string;
    ruleId: string;
    impact: 'critical' | 'serious' | 'moderate' | 'minor';
    description: string;
    wcagCriteria: string[];
  }>;
  remainingViolationsCount: number;
}

export function ScanToolWidget() {
  const [state, setState] = useState<ScanState>('form');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string>('');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastAnnouncedProgress = useRef(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ScanFormData>({
    resolver: zodResolver(scanSchema),
  });

  const onSubmit = async (data: ScanFormData) => {
    try {
      setError('');
      const response = await fetch(apiUrl('/api/v1/public/scan'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          setError(
            "You've reached today's scan limit. Try again tomorrow or sign up for unlimited scans.",
          );
        } else if (response.status === 422) {
          setError(errorData.detail || 'Could not reach this website. Please check the URL.');
        } else {
          setError('Failed to start scan. Please try again.');
        }
        return;
      }

      const { data: result } = await response.json();
      setScanResult({ ...result, scanId: result.scanId } as ScanResult);
      setState('scanning');
      startPolling(result.scanId);
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    }
  };

  const startPolling = (scanId: string) => {
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(apiUrl(`/api/v1/public/scan/${scanId}`));
        if (!response.ok) {
          clearInterval(pollIntervalRef.current!);
          setState('error');
          setError('Scan polling failed. Please refresh and try again.');
          return;
        }

        const { data } = await response.json();
        setScanResult(data);

        const progress = data.pagesTotal > 0 ? (data.pagesScanned / data.pagesTotal) * 100 : 0;
        const progressMilestone = Math.floor(progress / 25) * 25;

        if (progressMilestone > lastAnnouncedProgress.current && progressMilestone > 0) {
          lastAnnouncedProgress.current = progressMilestone;
        }

        if (data.status === 'completed') {
          clearInterval(pollIntervalRef.current!);
          setState('results');
        } else if (data.status === 'failed') {
          clearInterval(pollIntervalRef.current!);
          setState('error');
          setError(
            "We couldn't complete this scan. This can happen with sites that block automated tools. Try a different URL or contact us.",
          );
        }
      } catch (err) {
        clearInterval(pollIntervalRef.current!);
        setState('error');
        setError('Scan polling failed. Please refresh and try again.');
      }
    }, 3000);

    setTimeout(() => {
      if (pollIntervalRef.current && state === 'scanning') {
        clearInterval(pollIntervalRef.current);
        setError(
          "This is taking longer than usual. We'll email you the results at the address you provided.",
        );
      }
    }, 180000);
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleReset = () => {
    setState('form');
    setScanResult(null);
    setError('');
    lastAnnouncedProgress.current = 0;
  };

  const handleShare = () => {
    const message = `My website scored ${scanResult?.score}/100 for accessibility on AccessShield India. Check yours: https://accessshield.in/scan`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (state === 'form') {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700">
              Website URL
              <span aria-label="required" className="ml-0.5 text-red-600">
                *
              </span>
            </label>
            <Input
              id="url"
              type="url"
              autoComplete="url"
              placeholder="https://example.com"
              aria-required="true"
              aria-invalid={!!errors.url}
              aria-describedby={errors.url ? 'url-error' : undefined}
              className="mt-1.5"
              {...register('url')}
            />
            {errors.url && (
              <p id="url-error" role="alert" className="mt-1.5 text-sm text-red-700">
                {errors.url.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Your email
              <span aria-label="required" className="ml-0.5 text-red-600">
                *
              </span>
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              aria-required="true"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className="mt-1.5"
              {...register('email')}
            />
            {errors.email && (
              <p id="email-error" role="alert" className="mt-1.5 text-sm text-red-700">
                {errors.email.message}
              </p>
            )}
          </div>

          {error && (
            <div role="alert" className="rounded-md bg-red-100 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            variant="primary"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Starting scan...' : 'Scan now'}
          </Button>
        </form>
      </div>
    );
  }

  if (state === 'scanning' && scanResult) {
    const progress =
      scanResult.pagesTotal > 0 ? (scanResult.pagesScanned / scanResult.pagesTotal) * 100 : 0;

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div role="status" aria-live="polite" aria-atomic="true">
          <div className="text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
              <svg
                className="h-8 w-8 animate-spin text-primary-600"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-text-primary">Scanning your website</h2>
            <p className="mt-2 text-base text-text-secondary">
              Scanning page {scanResult.pagesScanned} of {scanResult.pagesTotal}...
            </p>
            {scanResult.currentUrl && (
              <p className="mt-1 truncate text-sm text-text-tertiary">{scanResult.currentUrl}</p>
            )}
          </div>

          <div className="mt-8">
            <Progress value={progress} max={100} aria-label="Scan progress" />
          </div>
        </div>
      </div>
    );
  }

  if (state === 'results' && scanResult && scanResult.score !== undefined) {
    const severityConfig = {
      critical: {
        label: 'Critical',
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
      },
      serious: {
        label: 'Serious',
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        border: 'border-amber-200',
      },
      moderate: {
        label: 'Moderate',
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-200',
      },
      minor: {
        label: 'Minor',
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-200',
      },
    };

    return (
      <div className="space-y-8">
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <ScoreRing score={scanResult.score} size="lg" />

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {scanResult.criticalCount > 0 && (
              <Badge
                variant="secondary"
                size="lg"
                className={`${severityConfig.critical.bg} ${severityConfig.critical.text} ${severityConfig.critical.border} border`}
              >
                {scanResult.criticalCount} Critical
              </Badge>
            )}
            {scanResult.seriousCount > 0 && (
              <Badge
                variant="secondary"
                size="lg"
                className={`${severityConfig.serious.bg} ${severityConfig.serious.text} ${severityConfig.serious.border} border`}
              >
                {scanResult.seriousCount} Serious
              </Badge>
            )}
            {scanResult.moderateCount > 0 && (
              <Badge
                variant="secondary"
                size="lg"
                className={`${severityConfig.moderate.bg} ${severityConfig.moderate.text} ${severityConfig.moderate.border} border`}
              >
                {scanResult.moderateCount} Moderate
              </Badge>
            )}
            {scanResult.minorCount > 0 && (
              <Badge
                variant="secondary"
                size="lg"
                className={`${severityConfig.minor.bg} ${severityConfig.minor.text} ${severityConfig.minor.border} border`}
              >
                {scanResult.minorCount} Minor
              </Badge>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-text-primary">Top violations found</h2>
          <ul className="mt-6 space-y-4">
            {scanResult.topViolations.map((violation) => (
              <li
                key={violation.id}
                className="flex gap-4 border-b border-gray-100 pb-4 last:border-0"
              >
                <Badge
                  variant="secondary"
                  size="sm"
                  className={`${severityConfig[violation.impact].bg} ${severityConfig[violation.impact].text} ${severityConfig[violation.impact].border} shrink-0 border`}
                >
                  {severityConfig[violation.impact].label}
                </Badge>
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-primary">{violation.ruleId}</div>
                  <p className="mt-1 text-sm leading-normal text-text-secondary">
                    {violation.description}
                  </p>
                  {violation.wcagCriteria.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {violation.wcagCriteria.map((criterion) => (
                        <Badge key={criterion} variant="secondary" size="sm">
                          {criterion}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {scanResult.remainingViolationsCount > 0 && (
            <div
              role="region"
              aria-label="Additional violations locked"
              className="mt-8 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center"
            >
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-text-primary">
                {scanResult.remainingViolationsCount} more violations found
              </h3>
              <p className="mt-2 text-base leading-normal text-text-secondary">
                Sign up free to see all violations, get AI fix suggestions, and generate your
                compliance report.
              </p>
              <ButtonLink href="/signup" size="lg" variant="primary" className="mt-6">
                Get full report free
              </ButtonLink>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button onClick={handleShare} size="md" variant="outline">
            Share on WhatsApp
          </Button>
          <Button onClick={handleReset} size="md" variant="outline">
            Scan another website
          </Button>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <svg
          className="mx-auto h-16 w-16 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h2 className="mt-4 text-xl font-semibold text-text-primary">Scan failed</h2>
        <p className="mt-2 text-base leading-normal text-text-secondary">{error}</p>
        <Button onClick={handleReset} size="lg" variant="primary" className="mt-6">
          Try again
        </Button>
      </div>
    );
  }

  return null;
}
