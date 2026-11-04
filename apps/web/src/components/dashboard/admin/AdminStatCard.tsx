import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AdminStatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'warning' | 'accent' | 'success';
}

const TONE_STYLES = {
  default: {
    card: 'border-gray-200/90 bg-white',
    icon: 'bg-primary-50 text-primary-600',
  },
  warning: {
    card: 'border-amber-200 bg-amber-50/40',
    icon: 'bg-amber-100 text-warning-700',
  },
  accent: {
    card: 'border-primary-200 bg-primary-50/30',
    icon: 'bg-primary-100 text-primary-700',
  },
  success: {
    card: 'border-success-100 bg-success-100/30',
    icon: 'bg-success-100 text-success-700',
  },
} as const;

export function AdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: AdminStatCardProps) {
  const styles = TONE_STYLES[tone];

  return (
    <div className={cn('rounded-lg border px-4 py-3', styles.card)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">{label}</p>
        {Icon && (
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
              styles.icon,
            )}
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums text-text-primary">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-text-tertiary">{hint}</p>}
    </div>
  );
}
