import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { IssueFilters } from '@/components/dashboard/issues/IssueFilters';
import { IssueList } from '@/components/dashboard/issues/IssueList';
import { IssueStats } from '@/components/dashboard/issues/IssueStats';
import { LoadingState } from '@/components/dashboard/common/LoadingState';
import { prefetchIssues } from '@/lib/dashboard/prefetch';
import type { IssueFilters as IssueFilterParams } from '@/lib/api/types';

export const metadata = {
  title: 'Issues | AccessibleNow',
  description: 'Track and manage accessibility violations across all your assets',
};

interface IssuesPageProps {
  searchParams: IssueFilterParams;
}

export default async function IssuesPage({ searchParams }: IssuesPageProps) {
  const queryClient = await prefetchIssues(searchParams as Record<string, string | undefined>);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Issues</h1>
          <p className="mt-2 text-base text-text-secondary">
            Track and manage accessibility violations across all your assets
          </p>
        </div>

        <Suspense
          fallback={
            <LoadingState
              message="Please wait, loading issue statistics…"
              variant="inline"
              size="sm"
            />
          }
        >
          <IssueStats />
        </Suspense>

        <IssueFilters searchParams={searchParams} />

        <Suspense fallback={<LoadingState message="Please wait, loading issues…" variant="card" />}>
          <IssueList searchParams={searchParams} />
        </Suspense>
      </div>
    </HydrationBoundary>
  );
}
