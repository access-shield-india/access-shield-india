'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { useCallback, useEffect, useRef, useState, type HTMLAttributes } from 'react';
import { cn, focusRing } from '../../lib/cn';
import { AlertCircleIcon, CheckIcon, InfoIcon, XIcon } from '../../lib/icons';

const alertVariants = cva('relative flex gap-3 rounded-lg border p-4', {
  variants: {
    variant: {
      error: 'border-error-700/30 bg-error-100 text-error-700',
      success: 'border-success-700/30 bg-success-100 text-success-700',
      warning: 'border-accent/30 bg-accent-light text-accent-700',
      info: 'border-primary/30 bg-primary-light text-primary-dark',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

const variantIcons = {
  error: AlertCircleIcon,
  success: CheckIcon,
  warning: AlertCircleIcon,
  info: InfoIcon,
};

const variantRoles = {
  error: 'alert' as const,
  success: 'status' as const,
  warning: 'alert' as const,
  info: 'status' as const,
};

const variantLive = {
  error: 'assertive' as const,
  success: 'polite' as const,
  warning: 'assertive' as const,
  info: 'polite' as const,
};

export interface AlertProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title?: string;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

export function Alert({
  variant = 'info',
  title,
  children,
  onDismiss,
  autoDismissMs,
  className,
  ...props
}: AlertProps) {
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const dismiss = useCallback(() => {
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    if (!autoDismissMs || paused) return;
    timerRef.current = setTimeout(dismiss, autoDismissMs);
    return () => clearTimeout(timerRef.current);
  }, [autoDismissMs, paused, dismiss]);

  if (!visible) return null;

  const v = variant ?? 'info';
  const Icon = variantIcons[v];
  const role = variantRoles[v];
  const live = variantLive[v];

  return (
    <div
      role={role}
      aria-live={live}
      aria-atomic="true"
      className={cn(alertVariants({ variant: v }), className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      {...props}
    >
      <Icon size={20} className="shrink-0" aria-hidden="true" />
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? 'mt-1 text-sm' : 'text-sm'}>{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss alert"
          className={cn(
            'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md',
            focusRing,
          )}
        >
          <XIcon size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

Alert.displayName = 'Alert';

/** Toast wrapper — fixed position notification */
export interface ToastProps extends AlertProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function Toast({ position = 'top-right', ...props }: ToastProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div className={cn('fixed z-50 w-full max-w-sm', positionClasses[position])}>
      <Alert {...props} />
    </div>
  );
}

Toast.displayName = 'Toast';
