import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { ScansPageContent } from '@/components/dashboard/scans/ScansPageContent';
import { prefetchScans } from '@/lib/dashboard/prefetch';

export default async function ScansPage() {
  const queryClient = await prefetchScans(50);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScansPageContent />
    </HydrationBoundary>
  );
}
