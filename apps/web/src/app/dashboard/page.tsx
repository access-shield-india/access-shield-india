import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { redirect } from 'next/navigation';
import { DashboardHome } from '@/components/dashboard/home/DashboardHome';
import { getServerDashboardRole } from '@/lib/dashboard/session';
import { prefetchDashboardHome } from '@/lib/dashboard/prefetch';

export default async function DashboardPage() {
  const role = await getServerDashboardRole();
  if (role === 'super_admin') {
    redirect('/dashboard/admin');
  }

  const queryClient = await prefetchDashboardHome();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardHome />
    </HydrationBoundary>
  );
}
