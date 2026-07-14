'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getAccessToken } from '@/lib/api/client';
import type { IssueDetail, IssueStatus } from '@/lib/api/types';
import { Badge } from '@accessshield/ui';
import { Button } from '@accessshield/ui';
import { Modal } from '@accessshield/ui';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, AlertCircle, XCircle, PlayCircle } from 'lucide-react';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

const STATUS_CONFIG = {
  open: {
    label: 'Open',
    icon: AlertCircle,
    bg: 'bg-error-100',
    text: 'text-error-700',
    border: 'border-error-200',
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    bg: 'bg-accent-100',
    text: 'text-accent-700',
    border: 'border-accent-600',
  },
  resolved: {
    label: 'Resolved',
    icon: CheckCircle,
    bg: 'bg-success-100',
    text: 'text-success-700',
    border: 'border-success-100',
  },
  wont_fix: {
    label: "Won't Fix",
    icon: XCircle,
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
  },
  duplicate: {
    label: 'Duplicate',
    icon: XCircle,
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
  },
};

const WORKFLOW_TRANSITIONS: Record<IssueStatus, Array<{ status: IssueStatus; label: string }>> = {
  open: [{ status: 'in_progress', label: 'Start Working' }],
  in_progress: [{ status: 'resolved', label: 'Mark Resolved' }],
  resolved: [{ status: 'open', label: 'Reopen' }],
  wont_fix: [],
  duplicate: [],
};

async function fetchIssueDetail(token: string, issueId: string): Promise<IssueDetail> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/issues/${issueId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch issue detail');
  const json = await response.json();
  return json.data;
}

async function updateIssueStatus(token: string, issueId: string, status: IssueStatus) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/issues/${issueId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Failed to update issue status');
  return response.json();
}

interface StatusWorkflowProps {
  issueId: string;
}

export function StatusWorkflow({ issueId }: StatusWorkflowProps) {
  const queryClient = useQueryClient();
  const [wontFixModalOpen, setWontFixModalOpen] = useState(false);
  const [wontFixReason, setWontFixReason] = useState('');

  const { data: issue } = useQuery({
    queryKey: ['issue', issueId],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchIssueDetail(token, issueId);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: IssueStatus) => {
      const token = await getAccessToken();
      return updateIssueStatus(token, issueId, newStatus);
    },
    onMutate: async (newStatus) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['issue', issueId] });
      const previousIssue = queryClient.getQueryData(['issue', issueId]);

      queryClient.setQueryData(['issue', issueId], (old: IssueDetail | undefined) => {
        if (!old) return old;
        return { ...old, status: newStatus };
      });

      return { previousIssue };
    },
    onError: (err, newStatus, context) => {
      // Revert on error
      if (context?.previousIssue) {
        queryClient.setQueryData(['issue', issueId], context.previousIssue);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issue-stats'] });
    },
  });

  if (!issue) {
    return <LoadingState message="Loading workflow…" variant="card" />;
  }

  const statusConfig = STATUS_CONFIG[issue.status];
  const StatusIcon = statusConfig.icon;
  const transitions = WORKFLOW_TRANSITIONS[issue.status];

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <h2 className="text-base font-semibold text-text-primary mb-4">Status</h2>

      {/* Current status */}
      <div className="mb-6">
        <Badge
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 text-base font-medium border',
            statusConfig.bg,
            statusConfig.text,
            statusConfig.border,
          )}
        >
          <StatusIcon className="h-5 w-5" aria-hidden="true" />
          {statusConfig.label}
        </Badge>
      </div>

      {/* Workflow actions */}
      <div className="space-y-2">
        {transitions.map((transition) => (
          <Button
            key={transition.status}
            variant="outline"
            className="w-full justify-start"
            onClick={() => statusMutation.mutate(transition.status)}
            disabled={statusMutation.isPending}
            aria-label={`${transition.label} issue ${issue.title}`}
          >
            <PlayCircle className="mr-2 h-4 w-4" aria-hidden="true" />
            {transition.label}
          </Button>
        ))}

        {/* Won't Fix always available */}
        {issue.status !== 'wont_fix' && issue.status !== 'duplicate' && (
          <Button
            variant="outline"
            className="w-full justify-start text-error-700 hover:bg-error-50 hover:border-error-200"
            onClick={() => setWontFixModalOpen(true)}
            disabled={statusMutation.isPending}
          >
            <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
            Won&apos;t Fix
          </Button>
        )}
      </div>

      {/* Won't Fix modal */}
      <Modal
        isOpen={wontFixModalOpen}
        onClose={() => setWontFixModalOpen(false)}
        title="Mark as Won't Fix"
        description="Provide a reason for marking this issue as won't fix"
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="wont-fix-reason"
              className="block text-sm font-medium text-text-primary mb-2"
            >
              Reason{' '}
              <span className="text-error-700" aria-label="required">
                *
              </span>
            </label>
            <textarea
              id="wont-fix-reason"
              rows={4}
              className="w-full rounded-md border border-border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
              value={wontFixReason}
              onChange={(e) => setWontFixReason(e.target.value)}
              required
              aria-required="true"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setWontFixModalOpen(false);
                setWontFixReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (wontFixReason.trim()) {
                  statusMutation.mutate('wont_fix');
                  setWontFixModalOpen(false);
                  setWontFixReason('');
                }
              }}
              disabled={!wontFixReason.trim()}
              isLoading={statusMutation.isPending}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
