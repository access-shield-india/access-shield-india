'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';
import { forwardRef, useId, type ComponentPropsWithoutRef } from 'react';
import { cn, focusRing } from '../../lib/cn';

export interface SwitchProps extends ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  /** Optional when the switch sits inside an external label */
  label?: string;
  hint?: string;
}

export const Switch = forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  ({ label, hint, id: externalId, className, ...props }, ref) => {
    const generatedId = useId();
    const id = externalId ?? generatedId;
    const hintId = hint ? `${id}-hint` : undefined;

    const switchControl = (
      <SwitchPrimitive.Root
        ref={ref}
        id={id}
        role="switch"
        aria-describedby={hintId}
        aria-label={label}
        className={cn(
          'relative inline-flex h-6 w-11 min-h-11 min-w-11 shrink-0 cursor-pointer items-center rounded-full',
          'border-2 border-transparent transition-colors',
          'data-[state=checked]:bg-primary data-[state=unchecked]:bg-border',
          focusRing,
          className,
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
            'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
          )}
        />
      </SwitchPrimitive.Root>
    );

    if (!label) {
      return switchControl;
    }

    return (
      <div className="flex items-center justify-between gap-4">
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
        {switchControl}
      </div>
    );
  },
);

Switch.displayName = 'Switch';
