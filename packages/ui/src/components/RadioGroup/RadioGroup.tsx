'use client';

import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { useId } from 'react';
import { cn, focusRing } from '../../lib/cn';

export interface RadioOption {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  legend: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function RadioGroup({
  legend,
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  required,
  disabled,
  orientation = 'vertical',
  className,
}: RadioGroupProps) {
  const groupId = useId();

  return (
    <fieldset className={cn('space-y-3', className)} disabled={disabled}>
      <legend className="text-sm font-semibold text-text-primary">{legend}</legend>
      <RadioGroupPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        name={name}
        required={required}
        orientation={orientation}
        aria-labelledby={`${groupId}-legend`}
        className={cn('flex gap-4', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap')}
      >
        {options.map((option) => {
          const id = `${groupId}-${option.value}`;
          const hintId = option.hint ? `${id}-hint` : undefined;
          return (
            <div key={option.value} className="flex items-start gap-3">
              <RadioGroupPrimitive.Item
                value={option.value}
                id={id}
                disabled={option.disabled}
                aria-describedby={hintId}
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-white',
                  'data-[state=checked]:border-primary',
                  focusRing,
                )}
              >
                <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
                </RadioGroupPrimitive.Indicator>
              </RadioGroupPrimitive.Item>
              <div>
                <label htmlFor={id} className="text-sm font-medium text-text-secondary">
                  {option.label}
                </label>
                {option.hint && (
                  <p id={hintId} className="text-sm text-text-tertiary">
                    {option.hint}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </RadioGroupPrimitive.Root>
    </fieldset>
  );
}

RadioGroup.displayName = 'RadioGroup';
