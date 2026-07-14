'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { User, Calendar, Globe, Tag, ExternalLink } from 'lucide-react';
import { getAccessToken } from '@/lib/api/client';
import type { IssueDetail, IssueSeverity, User as UserType } from '@/lib/api/types';
import { Select } from '@accessshield/ui';
import { Input } from '@accessshield/ui';
import { Badge } from '@accessshield/ui';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

const SEVERITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'serious', label: 'Serious' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'minor', label: 'Minor' },
];

async function fetchIssueDetail(token: string, issueId: string): Promise<IssueDetail> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/issues/${issueId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch issue detail');
  const json = await response.json();
  return json.data;
}

async function fetchTeamMembers(token: string): Promise<UserType[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch team members');
  const json = await response.json();
  return json.data;
}

async function updateIssue(token: string, issueId: string, updates: Record<string, unknown>) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/issues/${issueId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update issue');
  return response.json();
}

interface IssueMetadataProps {
  issueId: string;
}

export function IssueMetadata({ issueId }: IssueMetadataProps) {
  const queryClient = useQueryClient();

  const { data: issue } = useQuery({
    queryKey: ['issue', issueId],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchIssueDetail(token, issueId);
    },
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchTeamMembers(token);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const token = await getAccessToken();
      return updateIssue(token, issueId, updates);
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['issue', issueId] });
      const previousIssue = queryClient.getQueryData(['issue', issueId]);

      queryClient.setQueryData(['issue', issueId], (old: IssueDetail | undefined) => {
        if (!old) return old;
        return { ...old, ...updates };
      });

      return { previousIssue };
    },
    onError: (err, updates, context) => {
      if (context?.previousIssue) {
        queryClient.setQueryData(['issue', issueId], context.previousIssue);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
    },
  });

  if (!issue) {
    return <LoadingState message="Loading issue metadata…" variant="card" />;
  }

  const assigneeOptions = [
    { value: 'unassigned', label: 'Unassigned' },
    ...teamMembers.map((user) => ({
      value: user.id,
      label: user.fullName ?? user.email,
    })),
  ];

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <h2 className="text-base font-semibold text-text-primary mb-4">Metadata</h2>

      <div className="space-y-4">
        {/* Priority/Severity */}
        <div>
          <label
            htmlFor="severity"
            className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2"
          >
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            Severity
          </label>
          <Select
            id="severity"
            options={SEVERITY_OPTIONS}
            value={issue.severity}
            onChange={(value) => updateMutation.mutate({ severity: value as IssueSeverity })}
          />
        </div>

        {/* Assignee */}
        <div>
          <label
            htmlFor="assignee"
            className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2"
          >
            <User className="h-4 w-4" aria-hidden="true" />
            Assignee
          </label>
          <Select
            id="assignee"
            options={assigneeOptions}
            value={issue.assignedTo ?? 'unassigned'}
            onValueChange={(value) =>
              updateMutation.mutate({ assignedTo: value === 'unassigned' ? null : value })
            }
          />
        </div>

        {/* Asset */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
            <Globe className="h-4 w-4" aria-hidden="true" />
            Asset
          </div>
          <Link
            href={`/dashboard/assets/${issue.assetId}`}
            className="text-base text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          >
            {issue.asset?.name ?? 'Unknown'}
          </Link>
        </div>

        {/* Due Date */}
        <div>
          <label
            htmlFor="due-date"
            className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2"
          >
            <Calendar className="h-4 w-4" aria-hidden="true" />
            Due Date
          </label>
          <Input
            id="due-date"
            type="date"
            value={issue.dueDate ? new Date(issue.dueDate).toISOString().split('T')[0] : ''}
            onChange={(e) => updateMutation.mutate({ dueDate: e.target.value || null })}
            pattern="\d{2}/\d{2}/\d{4}"
          />
        </div>

        {/* Labels */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
            <Tag className="h-4 w-4" aria-hidden="true" />
            Labels
          </div>
          <div className="flex flex-wrap gap-2">
            {issue.labels?.map((label) => (
              <Badge key={label} variant="secondary">
                {label}
              </Badge>
            ))}
            {(!issue.labels || issue.labels.length === 0) && (
              <span className="text-sm text-text-tertiary">No labels</span>
            )}
          </div>
        </div>

        {/* Jira Integration */}
        {issue.jiraIssueKey && (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Jira Issue
            </div>
            <a
              href={issue.jiraIssueUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-base text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
            >
              {issue.jiraIssueKey}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">(opens in new tab)</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function AlertCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path strokeLinecap="round" d="M12 8v4m0 4h.01" strokeWidth="2" />
    </svg>
  );
}
