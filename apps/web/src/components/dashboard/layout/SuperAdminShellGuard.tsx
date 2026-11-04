'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { UserRole } from '@accessshield/types';

/**
 * Platform admins only use /dashboard/admin/* — bounce any org workspace routes.
 */
export function SuperAdminShellGuard({ userRole }: { userRole?: UserRole }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (userRole !== 'super_admin') return;
    if (pathname.startsWith('/dashboard/admin')) return;
    router.replace('/dashboard/admin');
  }, [userRole, pathname, router]);

  return null;
}
