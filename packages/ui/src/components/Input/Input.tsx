'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn, focusRing } from '../../lib/cn';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Optional when a visible label is rendered elsewhere */
  label?: string;
  hint?: string;
  error?: string;
  showCharCount?: boolean;
  maxLength?: number;
  containerClassName?: string;
  leftIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      showCharCount = false,
      maxLength,
      required,
      disabled,
      className,
      containerClassName,
      id: externalId,
      value,
      defaultValue,
      leftIcon,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = externalId ?? props.name ?? generatedId;
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const countId = showCharCount ? `${id}-count` : undefined;

    const describedBy = [hintId, errorId, countId].filter(Boolean).join(' ') || undefined;

    const currentLength =
      typeof value === 'string'
        ? value.length
        : typeof defaultValue === 'string'
          ? defaultValue.length
          : 0;

    return (
      <div className={cn('space-y-1.5', containerClassName)}>
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-text-secondary">
            {label}
            {required && (
              <span aria-label="required" className="ml-0.5 text-error-700">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            required={required}
            disabled={disabled}
            maxLength={maxLength}
            aria-required={required || undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            aria-label={!label ? props['aria-label'] : undefined}
            className={cn(
              'w-full min-h-11 rounded-md border px-3 py-2 text-base text-text-primary',
              focusRing,
              error ? 'border-error-700' : 'border-border',
              disabled && 'cursor-not-allowed bg-gray-50 opacity-60',
              leftIcon && 'pl-10',
              className,
            )}
            value={value}
            defaultValue={defaultValue}
            {...props}
          />
        </div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {hint && !error && (
              <p id={hintId} className="text-sm text-text-tertiary">
                {hint}
              </p>
            )}
            {error && (
              <p id={errorId} role="alert" className="text-sm text-error-700">
                {error}
              </p>
            )}
          </div>
          {showCharCount && maxLength && (
            <p id={countId} className="text-sm text-text-tertiary" aria-live="polite">
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  },
);

Input.displayName = 'Input';
