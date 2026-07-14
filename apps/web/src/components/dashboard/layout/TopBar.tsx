'use client';

import { Bell } from 'lucide-react';
import { Breadcrumb } from '@accessshield/ui';
import { UserMenu } from './UserMenu';
import { usePathname } from 'next/navigation';

export function TopBar() {
  const pathname = usePathname();

  const breadcrumbItems = pathname
    .split('/')
    .filter(Boolean)
    .map((segment, index, array) => {
      const href = '/' + array.slice(0, index + 1).join('/');
      const label = segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      return { href, label };
    });

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200/90 bg-white px-5">
      <Breadcrumb items={breadcrumbItems} aria-label="Breadcrumb navigation" />

      <div className="flex items-center gap-4">
        <button
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-text-secondary hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          aria-label="Notifications (0 unread)"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
        </button>

        <UserMenu />
      </div>
    </header>
  );
}
