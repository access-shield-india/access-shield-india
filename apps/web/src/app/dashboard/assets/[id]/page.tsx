import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { AssetDetailPageContent } from '@/components/dashboard/assets/AssetDetailPageContent';
import { prefetchAsset } from '@/lib/dashboard/prefetch';

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
  const queryClient = await prefetchAsset(params.id);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AssetDetailPageContent id={params.id} />
    </HydrationBoundary>
  );
}
