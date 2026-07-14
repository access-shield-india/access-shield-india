import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { DashboardHome } from '@/components/dashboard/home/DashboardHome';
import { prefetchDashboardHome } from '@/lib/dashboard/prefetch';

export default async function DashboardPage() {
  const queryClient = await prefetchDashboardHome();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardHome />
    </HydrationBoundary>
  );
}
