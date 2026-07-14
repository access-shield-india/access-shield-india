'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/dashboard/admin', label: 'Overview', exact: true },
  { href: '/dashboard/admin/organisations', label: 'Organisations', exact: false },
] as const;

export function AdminSubNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Platform admin" className="flex gap-6 border-b border-gray-200">
      {LINKS.map((link) => {
        const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              '-mb-px inline-flex min-h-11 items-center border-b-2 px-0.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
              isActive
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-text-secondary hover:border-gray-300 hover:text-text-primary',
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
