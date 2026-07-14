'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { forwardRef, useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn, focusRing } from '../../lib/cn';
import { CheckIcon, MinusIcon } from '../../lib/icons';

export interface CheckboxProps extends ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label: string;
  hint?: string;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ label, hint, indeterminate, id: externalId, className, checked, ...props }, ref) => {
    const generatedId = useId();
    const id = externalId ?? generatedId;
    const hintId = hint ? `${id}-hint` : undefined;

    return (
      <div className="flex items-start gap-3">
        <CheckboxPrimitive.Root
          ref={ref}
          id={id}
          aria-describedby={hintId}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border bg-white',
            'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white',
            'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-white',
            focusRing,
            className,
          )}
          checked={indeterminate ? 'indeterminate' : checked}
          {...props}
        >
          <CheckboxPrimitive.Indicator>
            {indeterminate ? (
              <MinusIcon size={12} aria-hidden="true" />
            ) : (
              <CheckIcon size={12} aria-hidden="true" />
            )}
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        <div>
          <label htmlFor={id} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
          {hint && (
            <p id={hintId} className="text-sm text-text-tertiary">
              {hint}
            </p>
          )}
        </div>
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';

export interface CheckboxGroupProps {
  legend: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function CheckboxGroup({ legend, hint, children, className }: CheckboxGroupProps) {
  const hintId = hint ? 'checkbox-group-hint' : undefined;

  return (
    <fieldset className={cn('space-y-3', className)} aria-describedby={hintId}>
      <legend className="text-sm font-semibold text-text-primary">{legend}</legend>
      {hint && (
        <p id={hintId} className="text-sm text-text-tertiary">
          {hint}
        </p>
      )}
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

CheckboxGroup.displayName = 'CheckboxGroup';
