'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/dashboard/settings?tab=widget', match: '/dashboard/settings', label: 'Settings' },
  { href: '/dashboard/widget/analytics', match: '/dashboard/widget/analytics', label: 'Analytics' },
] as const;

export function WidgetSectionNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Widget sections" className="border-b border-border">
      <ul className="flex gap-1">
        {ITEMS.map((item) => {
          const active = pathname === item.match || pathname.startsWith(`${item.match}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center px-4 py-2 text-sm font-medium',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
                  active
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-text-tertiary hover:text-text-primary',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
