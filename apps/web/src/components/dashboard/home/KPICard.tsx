'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';

export interface KPICardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  icon?: LucideIcon;
  href?: string;
}

export function KPICard({ label, value, trend, icon: Icon, href }: KPICardProps) {
  const content = (
    <div
      className="rounded-lg border border-gray-200/90 bg-white px-4 py-3 transition-colors hover:border-gray-300"
      role="listitem"
      aria-label={`${label}: ${value}${trend ? `, ${trend.direction === 'up' ? 'up' : 'down'} ${Math.abs(trend.value)}%` : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">{value}</p>
          {trend && (
            <div
              className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
                trend.value > 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {trend.direction === 'up' ? (
                <TrendingUp className="h-3 w-3" aria-hidden="true" />
              ) : (
                <TrendingDown className="h-3 w-3" aria-hidden="true" />
              )}
              <span>{`${trend.value > 0 ? '+' : ''}${trend.value}%`}</span>
              <span className="text-text-tertiary font-normal">vs last scan</span>
            </div>
          )}
        </div>
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded-lg"
      >
        {content}
      </Link>
    );
  }

  return content;
}
