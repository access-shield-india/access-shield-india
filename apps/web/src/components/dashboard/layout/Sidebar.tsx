'use client';

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Globe,
  ScanSearch,
  AlertCircle,
  FileText,
  Award,
  Settings,
  Shield,
  PanelLeftClose,
  PanelLeft,
  FileStack,
} from 'lucide-react';
import type { UserRole } from '@accessshield/types';
import { useUIStore } from '@/lib/stores/uiStore';
import { useDictionary } from '@/lib/i18n/locale-context';
import { cn } from '@/lib/utils';

type NavLabelKey =
  | 'dashboard'
  | 'assets'
  | 'scans'
  | 'documentScanner'
  | 'issues'
  | 'reports'
  | 'certificates'
  | 'settings'
  | 'platformAdmin';

interface NavItem {
  href: string;
  labelKey: NavLabelKey;
  icon: LucideIcon;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/dashboard/assets', labelKey: 'assets', icon: Globe },
  { href: '/dashboard/scans', labelKey: 'scans', icon: ScanSearch },
  {
    href: '/dashboard/document-scanner',
    labelKey: 'documentScanner',
    icon: FileStack,
    badge: new Date() < new Date('2026-10-01') ? 'New' : undefined,
  },
  { href: '/dashboard/issues', labelKey: 'issues', icon: AlertCircle },
  { href: '/dashboard/reports', labelKey: 'reports', icon: FileText },
  { href: '/dashboard/certs', labelKey: 'certificates', icon: Award },
  { href: '/dashboard/settings', labelKey: 'settings', icon: Settings },
];

interface SidebarProps {
  userRole?: UserRole;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { dashboard } = useDictionary();
  const { nav } = dashboard;

  const navItems: NavItem[] =
    userRole === 'super_admin'
      ? [...NAV_ITEMS, { href: '/dashboard/admin', labelKey: 'platformAdmin', icon: Shield }]
      : NAV_ITEMS;

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-gray-200/90 bg-white transition-all duration-200',
        sidebarCollapsed ? 'w-[4.5rem]' : 'w-60',
      )}
      aria-label={nav.sidebarAria}
    >
      <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
        {!sidebarCollapsed && (
          <Link
            href="/dashboard"
            className="text-base font-semibold text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded"
          >
            AccessShield
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-tertiary hover:bg-gray-100 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          aria-label={sidebarCollapsed ? nav.expand : nav.collapse}
          aria-expanded={!sidebarCollapsed}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 p-2" aria-label={nav.sidebarAria}>
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
          const Icon = item.icon;
          const label = nav[item.labelKey];

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'as-nav-item',
                isActive && 'as-nav-item-active',
                sidebarCollapsed && 'justify-center px-2',
              )}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0 text-current" aria-hidden="true" />
              {!sidebarCollapsed && (
                <span className="flex items-center gap-2">
                  {label}
                  {item.badge && (
                    <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                      {item.badge}
                    </span>
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
