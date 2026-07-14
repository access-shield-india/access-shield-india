import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminSubNav } from '@/components/dashboard/admin';
import { getServerDashboardRole } from '@/lib/dashboard/session';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const userRole = await getServerDashboardRole();

  if (!userRole) {
    redirect('/login?redirectTo=/dashboard/admin');
  }

  if (userRole !== 'super_admin') {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-gray-200/90 bg-white p-6">
        <h1 className="text-lg font-semibold text-text-primary">Platform admin access required</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Your account has the <strong>{userRole}</strong> role. Only{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">super_admin</code> can use
          this console.
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          Sign in as <strong>sysadmin@accessshield.in</strong> after running{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
            bash scripts/seed-sysadmin.sh
          </code>
          , then sign out and back in if you recently changed roles.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminSubNav />
      {children}
    </div>
  );
}
