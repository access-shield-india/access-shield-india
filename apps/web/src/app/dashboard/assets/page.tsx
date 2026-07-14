import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { AssetsPageContent } from '@/components/dashboard/assets/AssetsPageContent';
import { prefetchAssets } from '@/lib/dashboard/prefetch';

export default async function AssetsPage() {
  const queryClient = await prefetchAssets();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AssetsPageContent />
    </HydrationBoundary>
  );
}
