'use client';

import { useState, type ReactNode } from 'react';
import { cn, focusRing } from '../../lib/cn';
import { ChevronLeftIcon, ChevronRightIcon } from '../../lib/icons';

export interface SidebarNavItem {
  id: string;
  label: string;
  href: string;
  icon?: ReactNode;
  current?: boolean;
}

export interface SidebarNavProps {
  items: SidebarNavItem[];
  label?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

export function SidebarNav({
  items,
  label = 'Main navigation',
  collapsible = true,
  defaultCollapsed = false,
  className,
}: SidebarNavProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <nav aria-label={label} className={cn('flex flex-col', className)}>
      {collapsible && (
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-controls="sidebar-nav-list"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'mb-4 inline-flex min-h-11 min-w-11 items-center justify-center self-end rounded-md',
            'text-text-tertiary hover:bg-primary-light hover:text-primary',
            focusRing,
          )}
        >
          {collapsed ? (
            <ChevronRightIcon size={20} aria-hidden="true" />
          ) : (
            <ChevronLeftIcon size={20} aria-hidden="true" />
          )}
        </button>
      )}
      <ul id="sidebar-nav-list" className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={item.href}
              aria-current={item.current ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                item.current
                  ? 'bg-primary-light text-primary'
                  : 'text-text-secondary hover:bg-gray-100 hover:text-text-primary',
                focusRing,
                collapsed && 'justify-center px-2',
              )}
            >
              {item.icon && <span aria-hidden="true">{item.icon}</span>}
              {!collapsed && <span>{item.label}</span>}
              {collapsed && <span className="sr-only">{item.label}</span>}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

SidebarNav.displayName = 'SidebarNav';
