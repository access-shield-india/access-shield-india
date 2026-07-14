import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { AlertCircleIcon, AlertTriangleIcon, InfoIcon, MinusIcon } from '../../lib/icons';

const severityConfig = {
  critical: {
    label: 'Critical',
    icon: AlertCircleIcon,
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  serious: {
    label: 'Serious',
    icon: AlertTriangleIcon,
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  moderate: {
    label: 'Moderate',
    icon: InfoIcon,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  minor: {
    label: 'Minor',
    icon: MinusIcon,
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
} as const;

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium',
  {
    variants: {
      severity: {
        critical: severityConfig.critical.className,
        serious: severityConfig.serious.className,
        moderate: severityConfig.moderate.className,
        minor: severityConfig.minor.className,
      },
      variant: {
        default: 'bg-primary-light text-primary-dark border-primary/20',
        secondary: 'bg-gray-100 text-gray-700 border-gray-200',
        accent: 'bg-accent-light text-accent-700 border-accent/20',
        success: 'bg-success-100 text-success-700 border-success-700/20',
        outline: 'bg-white text-text-secondary border-border',
        error: 'bg-red-100 text-red-800 border-red-200',
        warning: 'bg-amber-100 text-amber-800 border-amber-200',
        info: 'bg-blue-100 text-blue-800 border-blue-200',
      },
      size: {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-xs px-2 py-0.5',
        lg: 'text-sm px-3 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  /** Severity uses icon + text + colour — never colour alone (WCAG 1.4.1) */
  severity?: keyof typeof severityConfig;
  label?: string;
}

export function Badge({
  severity,
  variant,
  size,
  label,
  children,
  className,
  ...props
}: BadgeProps) {
  if (severity) {
    const config = severityConfig[severity];
    const Icon = config.icon;
    const displayLabel = label ?? config.label;

    return (
      <span className={cn(badgeVariants({ severity, size }), className)} {...props}>
        <Icon size={12} aria-hidden="true" />
        <span>{displayLabel}</span>
        {children}
      </span>
    );
  }

  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {label ?? children}
    </span>
  );
}

Badge.displayName = 'Badge';
