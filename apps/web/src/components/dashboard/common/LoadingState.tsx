'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingStateProps {
  /** Visible status message */
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'inline' | 'card' | 'page';
  className?: string;
}

const SPINNER_SIZE = {
  sm: 'h-5 w-5',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
} as const;

const MESSAGE_SIZE = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
} as const;

const PADDING = {
  inline: 'py-4',
  card: 'py-12',
  page: 'py-16',
} as const;

/** Accessible loading spinner with message — use while API data is loading. */
export function LoadingState({
  message = 'Loading…',
  size = 'md',
  variant = 'card',
  className,
}: LoadingStateProps) {
  const displayMessage =
    variant === 'page' && message === 'Loading…' ? 'Please wait, loading…' : message;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        PADDING[variant],
        variant === 'card' && 'rounded-lg border border-border bg-white',
        className,
      )}
    >
      <Loader2
        className={cn(
          'animate-spin text-primary-600 motion-reduce:animate-none',
          SPINNER_SIZE[size],
        )}
        aria-hidden="true"
      />
      <p className={cn('mt-4 font-medium text-text-secondary', MESSAGE_SIZE[size])}>
        {displayMessage}
      </p>
    </div>
  );
}
