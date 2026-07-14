'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { getAccessToken } from '@/lib/api/client';
import type { IssueDetail, IssueComment } from '@/lib/api/types';
import { Button } from '@accessshield/ui';
import { Badge } from '@accessshield/ui';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

async function fetchIssueDetail(token: string, issueId: string): Promise<IssueDetail> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/issues/${issueId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch issue detail');
  const json = await response.json();
  return json.data;
}

async function postComment(token: string, issueId: string, body: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/issues/${issueId}/comments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body }),
    },
  );
  if (!response.ok) throw new Error('Failed to post comment');
  return response.json();
}

interface CommentThreadProps {
  issueId: string;
}

export function CommentThread({ issueId }: CommentThreadProps) {
  const queryClient = useQueryClient();
  const [commentBody, setCommentBody] = useState('');

  const { data: issue } = useQuery({
    queryKey: ['issue', issueId],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchIssueDetail(token, issueId);
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (body: string) => {
      const token = await getAccessToken();
      return postComment(token, issueId, body);
    },
    onMutate: async (body) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['issue', issueId] });
      const previousIssue = queryClient.getQueryData(['issue', issueId]);

      const tempComment: IssueComment = {
        id: 'temp-' + Date.now(),
        issueId,
        userId: 'current-user',
        body,
        createdAt: new Date().toISOString(),
        user: {
          id: 'current-user',
          fullName: 'You',
          email: '',
          role: '',
        },
      };

      queryClient.setQueryData(['issue', issueId], (old: IssueDetail | undefined) => {
        if (!old) return old;
        return { ...old, comments: [...(old.comments ?? []), tempComment] };
      });

      return { previousIssue };
    },
    onError: (err, body, context) => {
      if (context?.previousIssue) {
        queryClient.setQueryData(['issue', issueId], context.previousIssue);
      }
    },
    onSuccess: () => {
      setCommentBody('');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (commentBody.trim()) {
      commentMutation.mutate(commentBody);
    }
  }

  if (!issue) {
    return <LoadingState message="Loading comments…" variant="card" />;
  }

  const comments = issue.comments ?? [];

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-text-secondary" aria-hidden="true" />
        <h2 className="text-base font-semibold text-text-primary">Comments</h2>
        <Badge variant="secondary">{comments.length}</Badge>
      </div>

      <div className="space-y-4">
        {/* Comment list */}
        {comments.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {comments.map((comment) => {
              const timeAgo = formatTimeAgo(new Date(comment.createdAt));
              const absoluteTime = new Date(comment.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={comment.id} className="flex gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700"
                    aria-hidden="true"
                  >
                    {comment.user.fullName?.[0] ?? comment.user.email?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-text-primary">
                        {comment.user.fullName ?? comment.user.email}
                      </span>
                      {comment.user.role && (
                        <Badge variant="secondary" className="text-xs">
                          {formatRole(comment.user.role)}
                        </Badge>
                      )}
                      <time
                        dateTime={comment.createdAt}
                        title={absoluteTime}
                        className="text-sm text-text-tertiary"
                      >
                        {timeAgo}
                      </time>
                    </div>
                    <p className="text-base text-text-primary leading-relaxed whitespace-pre-wrap">
                      {comment.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-text-tertiary">
            <MessageSquare className="mx-auto h-8 w-8 mb-2" aria-hidden="true" />
            <p className="text-sm">No comments yet. Start the conversation!</p>
          </div>
        )}

        {/* Comment form */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-4 border-t border-border">
          <div>
            <label
              htmlFor="comment-body"
              className="block text-sm font-medium text-text-primary mb-2"
            >
              Add a comment
            </label>
            <textarea
              id="comment-body"
              rows={3}
              className="w-full rounded-md border border-border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
              placeholder="Write your comment here..."
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
            />
            <p className="mt-1 text-sm text-text-tertiary">
              Supports <strong>bold</strong>, <em>italic</em>, and <code>code</code>
            </p>
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={!commentBody.trim()}
            isLoading={commentMutation.isPending}
            aria-label="Post comment"
          >
            <Send className="mr-2 h-4 w-4" aria-hidden="true" />
            Post comment
          </Button>
        </form>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatRole(role: string): string {
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
