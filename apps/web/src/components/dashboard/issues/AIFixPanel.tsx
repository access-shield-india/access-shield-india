'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { getAccessToken } from '@/lib/api/client';
import { apiUrl } from '@/lib/api/base';
import type { IssueDetail } from '@/lib/api/types';
import { Tabs } from '@accessshield/ui';
import { CopyButton } from '@accessshield/ui';
import { Button } from '@accessshield/ui';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import {
  DevPreviewBanner,
  FixBeforeAfter,
  isIssueDevPreviewFix,
  resolveFixBeforeAfter,
} from '@/components/dashboard/issues/AiFixDisplay';
import { Lightbulb, Code, Type } from 'lucide-react';

async function fetchIssueDetail(token: string, issueId: string): Promise<IssueDetail> {
  const response = await fetch(apiUrl(`/api/v1/issues/${issueId}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch issue detail');
  const json = await response.json();
  return json.data;
}

async function requestAiFix(token: string, issueId: string): Promise<IssueDetail> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const response = await fetch(apiUrl(`/api/v1/issues/${issueId}/ai-fix`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        title?: string;
        detail?: string;
      } | null;
      throw new Error(body?.detail ?? body?.title ?? 'Failed to generate AI fix');
    }

    const json = await response.json();
    return json.data;
  } finally {
    clearTimeout(timeout);
  }
}

interface AIFixPanelProps {
  issueId: string;
}

export function AIFixPanel({ issueId }: AIFixPanelProps) {
  const queryClient = useQueryClient();

  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue', issueId],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchIssueDetail(token, issueId);
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      return requestAiFix(token, issueId);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['issue', issueId], (current: IssueDetail | undefined) =>
        current
          ? {
              ...current,
              aiFixSuggestion: data.aiFixSuggestion ?? null,
              aiExplanation: data.aiExplanation ?? null,
              aiAltText: data.aiAltText ?? current.aiAltText,
              aiFixDevPreview: data.aiFixDevPreview === true,
              aiFixBefore: data.aiFixBefore ?? current.aiFixBefore,
              aiFixAfter: data.aiFixAfter ?? null,
            }
          : current,
      );
    },
  });

  const mutateFix = useRef(generateMutation.mutate);
  mutateFix.current = generateMutation.mutate;
  const fixAttempted = useRef(false);

  useEffect(() => {
    fixAttempted.current = false;
    generateMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when navigating to another issue
  }, [issueId]);

  useEffect(() => {
    if (isLoading || !issue || fixAttempted.current) {
      return;
    }
    const hasRealFix = Boolean(issue.aiFixSuggestion) && !isIssueDevPreviewFix(issue);
    if (hasRealFix) {
      return;
    }
    fixAttempted.current = true;
    mutateFix.current();
  }, [isLoading, issue, issueId]);

  if (isLoading || !issue) {
    return <LoadingState message="Loading AI suggestions…" variant="card" />;
  }

  const tabs = [
    {
      id: 'fix',
      label: 'AI Fix Suggestion',
      icon: <Code className="h-4 w-4" aria-hidden="true" />,
      content: (
        <AIFixTab
          issue={issue}
          status={generateMutation.status}
          errorMessage={generateMutation.error?.message ?? null}
          onRetry={() => {
            fixAttempted.current = true;
            mutateFix.current();
          }}
        />
      ),
    },
    {
      id: 'explanation',
      label: 'Plain English Explanation',
      icon: <Lightbulb className="h-4 w-4" aria-hidden="true" />,
      content: <ExplanationTab issue={issue} />,
    },
  ];

  if (issue.violation?.ruleId === 'image-alt') {
    tabs.push({
      id: 'alt-text',
      label: 'Alt Text',
      icon: <Type className="h-4 w-4" aria-hidden="true" />,
      content: <AltTextTab issue={issue} issueId={issueId} />,
    });
  }

  const tabItems = tabs.map((tab) => ({
    value: tab.id,
    label: tab.label,
    content: tab.content,
  }));

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-4">AI-Powered Assistance</h2>
      <Tabs items={tabItems} defaultValue="fix" ariaLabel="AI assistance" />
    </div>
  );
}

function AIFixTab({
  issue,
  status,
  errorMessage,
  onRetry,
}: {
  issue: IssueDetail;
  status: 'idle' | 'pending' | 'error' | 'success';
  errorMessage: string | null;
  onRetry: () => void;
}) {
  if (issue.aiFixSuggestion) {
    const devPreview = isIssueDevPreviewFix(issue);
    const beforeAfter = resolveFixBeforeAfter(issue);
    const isRegenerating = status === 'pending';

    return (
      <div className="space-y-4">
        {devPreview && <DevPreviewBanner />}

        {devPreview && status === 'success' && !isRegenerating && (
          <p className="text-sm text-error-700" role="alert">
            Regeneration completed but Claude was not used. Ensure{' '}
            <code className="rounded bg-error-100 px-1 text-xs">INTERNAL_AI_SERVICE_KEY</code> is
            set in the repo root{' '}
            <code className="rounded bg-error-100 px-1 text-xs">.env.local</code> and restart the
            API, then run{' '}
            <code className="rounded bg-error-100 px-1 text-xs">
              pnpm --filter @accessshield/ai-service dev
            </code>
            .
          </p>
        )}

        {beforeAfter ? (
          <FixBeforeAfter beforeHtml={beforeAfter.beforeHtml} afterHtml={beforeAfter.afterHtml} />
        ) : (
          <div className="rounded-md border border-border bg-bg-secondary p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-2">Suggested Fix</h3>
            <div className="relative">
              <pre
                className="overflow-x-auto rounded-md bg-gray-900 p-4 text-sm text-gray-100 font-mono"
                aria-label="Suggested fixed HTML"
              >
                <code>{issue.aiFixSuggestion}</code>
              </pre>
              <div className="absolute top-2 right-2">
                <CopyButton
                  text={issue.aiFixSuggestion}
                  label="Copy fixed HTML"
                  variant="secondary"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {devPreview && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRetry}
              disabled={isRegenerating}
              aria-busy={isRegenerating}
            >
              {isRegenerating ? 'Regenerating…' : 'Regenerate with Claude'}
            </Button>
          )}
          {issue.jiraIssueKey ? (
            <Button variant="outline" size="sm" disabled>
              Already synced to Jira
            </Button>
          ) : (
            <Button variant="primary" size="sm">
              Apply to Jira
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (status === 'error' && errorMessage) {
    return (
      <div className="py-8 text-center" role="alert">
        <p className="text-base text-error-700">{errorMessage}</p>
        <p className="mt-2 text-sm text-text-secondary">
          Check that the API and AI service are running. For full AI fixes, set ANTHROPIC_API_KEY in
          apps/ai-service/.env.
        </p>
        <Button variant="primary" size="md" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="py-8 text-center" aria-live="polite" aria-busy={status === 'pending'}>
      <div className="inline-flex h-12 w-12 animate-spin items-center justify-center rounded-full border-4 border-primary-200 border-t-primary-600" />
      <p className="mt-4 text-base text-text-secondary">Generating fix suggestion...</p>
      <p className="mt-2 text-sm text-text-tertiary">This usually takes 10–20 seconds</p>
    </div>
  );
}

function ExplanationTab({ issue }: { issue: IssueDetail }) {
  if (!issue.aiExplanation) {
    return (
      <div className="py-8 text-center text-text-tertiary">
        <p>Explanation will appear after the fix is generated.</p>
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none">
      <div className="text-base text-text-primary leading-relaxed whitespace-pre-wrap">
        {issue.aiExplanation}
      </div>

      {issue.wcagCriterion && (
        <div className="mt-6 rounded-md border border-border bg-bg-secondary p-4">
          <h3 className="text-sm font-semibold text-text-primary">Legal Reference</h3>
          <p className="mt-2 text-sm text-text-secondary">
            Under WCAG 2.2 Level AA, Criterion {issue.wcagCriterion} requires accessible
            implementations. This is also mandated by IS 17802 (Indian Standard) and the Rights of
            Persons with Disabilities Act 2016.
          </p>
        </div>
      )}
    </div>
  );
}

function AltTextTab({ issue, issueId }: { issue: IssueDetail; issueId: string }) {
  const [isDecorative, setIsDecorative] = useState(false);
  const queryClient = useQueryClient();

  const altTextMutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      const response = await fetch(apiUrl(`/api/v1/issues/${issueId}/ai-alt-text`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Failed to generate alt text');
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
    },
  });

  useEffect(() => {
    if (!issue.aiAltText && altTextMutation.isIdle) {
      altTextMutation.mutate();
    }
  }, [issue.aiAltText, altTextMutation.isIdle, altTextMutation.mutate]);

  if (!issue.aiAltText) {
    return altTextMutation.isPending ? (
      <LoadingState message="Generating alt text…" variant="inline" size="sm" />
    ) : (
      <p className="py-8 text-center text-text-secondary">Alt text suggestion not yet available</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-bg-secondary p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-2">Suggested Alt Text</h3>
        <p className="text-base text-text-primary leading-relaxed">
          &ldquo;{issue.aiAltText}&rdquo;
        </p>
        <div className="mt-3">
          <CopyButton text={issue.aiAltText} label="Copy alt text" variant="outline" size="sm" />
        </div>
      </div>

      <div className="rounded-md border border-accent-600 bg-accent-100 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isDecorative}
            onChange={(e) => setIsDecorative(e.target.checked)}
            aria-label="Mark as decorative (empty alt text)"
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-accent-700">
              Mark as decorative (alt=&quot;&quot;)
            </span>
            <p className="mt-1 text-sm text-accent-700">
              Only use this if the image is purely decorative and doesn&apos;t convey any
              information.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
