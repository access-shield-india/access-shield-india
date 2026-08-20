'use client';

import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { getAccessToken } from '@/lib/api/client';
import type { IssueDetail } from '@/lib/api/types';
import { Badge } from '@accessshield/ui';
import { Button } from '@accessshield/ui';
import { CopyButton } from '@accessshield/ui';
import { cn } from '@/lib/utils';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

const SEVERITY_CONFIG = {
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
    bg: 'bg-primary-100',
    text: 'text-primary-800',
    border: 'border-primary-300',
  },
  minor: {
    label: 'Minor',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
  },
};

async function fetchIssueDetail(token: string, issueId: string): Promise<IssueDetail> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/issues/${issueId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch issue detail');
  const json = await response.json();
  return json.data;
}

interface ViolationDetailProps {
  issueId: string;
}

export function ViolationDetail({ issueId }: ViolationDetailProps) {
  const { data: issue } = useQuery({
    queryKey: ['issue', issueId],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchIssueDetail(token, issueId);
    },
  });

  if (!issue) {
    return <LoadingState message="Loading issue details…" variant="card" />;
  }

  const severityConfig = SEVERITY_CONFIG[issue.severity];

  return (
    <div className="space-y-6 rounded-lg border border-border bg-white p-6">
      {/* Header */}
      <div>
        <div className="flex items-start gap-3">
          <Badge
            className={cn(
              'inline-flex items-center gap-1.5 border',
              severityConfig.bg,
              severityConfig.text,
              severityConfig.border,
            )}
          >
            {severityConfig.label}
          </Badge>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-text-primary">{issue.title}</h1>
        {issue.description && (
          <p className="mt-2 text-base text-text-secondary">{issue.description}</p>
        )}
      </div>

      {/* WCAG Criterion */}
      {issue.wcagCriterion && (
        <div>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
            WCAG Criterion
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <a
              href={`https://www.w3.org/WAI/WCAG22/Understanding/${issue.wcagCriterion.replace('.', '-')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-base font-medium text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
            >
              Criterion {issue.wcagCriterion}
              {issue.wcagTitle && ` — ${issue.wcagTitle}`}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">(opens in new tab)</span>
            </a>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">WCAG 2.2</Badge>
            <Badge variant="secondary">IS 17802</Badge>
            <Badge variant="secondary">GIGW 3.0</Badge>
          </div>
        </div>
      )}

      {/* Affected Element */}
      {issue.elementHtml && (
        <div>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
            Affected Element
          </h2>
          <details className="mt-2 rounded-md border border-border bg-bg-secondary">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-text-primary hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2">
              View violating element HTML
            </summary>
            <div className="border-t border-border p-4">
              <div className="relative">
                <pre
                  className="overflow-x-auto rounded-md bg-gray-900 p-4 text-sm text-gray-100 font-mono"
                  aria-label="Violating HTML element"
                >
                  <code>{issue.elementHtml}</code>
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton
                    text={issue.elementHtml}
                    label="Copy element HTML"
                    variant="secondary"
                  />
                </div>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* CSS Selector */}
      {issue.elementSelector && (
        <div>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
            CSS Selector
          </h2>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-bg-secondary p-3">
            <code className="flex-1 font-mono text-sm text-text-primary">
              {issue.elementSelector}
            </code>
            <CopyButton
              text={issue.elementSelector}
              label="Copy CSS selector"
              size="sm"
              variant="ghost"
            />
          </div>
        </div>
      )}

      {/* Page URL */}
      {issue.violation?.pageUrl && (
        <div>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
            Page URL
          </h2>
          <div className="mt-2">
            <a
              href={issue.violation.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-base text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
            >
              {issue.violation.pageUrl}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">(opens in new tab)</span>
            </a>
          </div>
        </div>
      )}

      {/* Screenshot */}
      {issue.screenshotUrl && (
        <div>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
            Screenshot
          </h2>
          <ScreenshotViewer
            desktopUrl={issue.screenshotUrl}
            mobileUrl={issue.mobileScreenshotUrl}
            assetName={issue.asset?.name ?? 'Unknown'}
          />
        </div>
      )}
    </div>
  );
}

interface ScreenshotViewerProps {
  desktopUrl: string;
  mobileUrl?: string | null;
  assetName: string;
}

function ScreenshotViewer({ desktopUrl, mobileUrl, assetName }: ScreenshotViewerProps) {
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <div className="space-y-3">
      {/* Toggle buttons */}
      {mobileUrl && (
        <div className="flex gap-2" role="group" aria-label="Screenshot view">
          <Button
            variant={view === 'desktop' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setView('desktop')}
            aria-pressed={view === 'desktop'}
          >
            Desktop view
          </Button>
          <Button
            variant={view === 'mobile' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setView('mobile')}
            aria-pressed={view === 'mobile'}
          >
            Mobile view
          </Button>
        </div>
      )}

      {/* Screenshot */}
      <figure className="rounded-lg border border-border bg-gray-50 p-4">
        <img
          src={view === 'mobile' && mobileUrl ? mobileUrl : desktopUrl}
          alt={`Screenshot of ${assetName} showing the accessibility violation. A red border highlights the element with the issue.`}
          className="w-full rounded-md shadow-md"
        />
        <figcaption className="mt-3 text-sm text-text-secondary">
          Screenshot captured during scan. Red border indicates the violating element.
        </figcaption>
      </figure>
    </div>
  );
}
