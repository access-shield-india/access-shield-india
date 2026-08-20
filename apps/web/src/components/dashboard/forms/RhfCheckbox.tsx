'use client';

import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Checkbox } from '@accessshield/ui';

interface RhfCheckboxProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
}

/**
 * Radix Checkbox does not emit native input onChange, so RHF register() never
 * sees ticks. Bind checked / onCheckedChange through Controller instead.
 */
export function RhfCheckbox<T extends FieldValues>({ control, name, label }: RhfCheckboxProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Checkbox
          label={label}
          checked={Boolean(field.value)}
          onCheckedChange={(value) => field.onChange(value === true)}
          onBlur={field.onBlur}
          name={field.name}
        />
      )}
    />
  );
}
