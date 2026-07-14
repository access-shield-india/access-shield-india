'use client';

import { cn } from '@/lib/utils';

export interface AdminTab {
  id: string;
  label: string;
}

export interface AdminTabsProps {
  tabs: AdminTab[];
  activeTab: string;
  onChange: (id: string) => void;
  ariaLabel: string;
}

export function AdminTabs({ tabs, activeTab, onChange, ariaLabel }: AdminTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap gap-1 rounded-lg bg-gray-100/80 p-1"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cn(
              'min-h-11 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
              isActive
                ? 'bg-white text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
