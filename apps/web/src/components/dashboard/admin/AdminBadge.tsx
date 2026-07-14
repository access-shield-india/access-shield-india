import { cn } from '@/lib/utils';

type AdminBadgeTone = 'success' | 'error' | 'neutral' | 'info';

export interface AdminBadgeProps {
  label: string;
  tone?: AdminBadgeTone;
  dot?: boolean;
}

const toneStyles: Record<AdminBadgeTone, string> = {
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  error: 'bg-red-50 text-red-800 ring-red-600/20',
  neutral: 'bg-gray-100 text-gray-700 ring-gray-500/20',
  info: 'bg-blue-50 text-blue-800 ring-blue-600/20',
};

const dotStyles: Record<AdminBadgeTone, string> = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  neutral: 'bg-gray-500',
  info: 'bg-blue-600',
};

export function AdminBadge({ label, tone = 'neutral', dot = true }: AdminBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        toneStyles[tone],
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', dotStyles[tone])} aria-hidden="true" />
      )}
      {label}
    </span>
  );
}
