'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { forwardRef, useCallback, useId, useMemo, useState } from 'react';
import { useAnnounce } from '../../hooks/useAnnounce';
import { cn, focusRing } from '../../lib/cn';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, SearchIcon } from '../../lib/icons';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Alias for onValueChange */
  onChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  multiple?: boolean;
  values?: string[];
  onValuesChange?: (values: string[]) => void;
  id?: string;
  className?: string;
}

function MultiSelect({
  label,
  options,
  values = [],
  onValuesChange,
  placeholder = 'Select options',
  hint,
  error,
  required,
  disabled,
  searchable = false,
  id: externalId,
  className,
}: Omit<SelectProps, 'multiple' | 'value' | 'onValueChange'>) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const listboxId = `${id}-listbox`;
  const { announce } = useAnnounce();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);

  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const toggle = useCallback(
    (optionValue: string, optionLabel: string) => {
      const next = values.includes(optionValue)
        ? values.filter((v) => v !== optionValue)
        : [...values, optionValue];
      onValuesChange?.(next);
      const action = values.includes(optionValue) ? 'deselected' : 'selected';
      announce(`${optionLabel} ${action}. ${next.length} selected.`);
    },
    [values, onValuesChange, announce],
  );

  const displayText =
    values.length === 0
      ? placeholder
      : options
          .filter((o) => values.includes(o.value))
          .map((o) => o.label)
          .join(', ');

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        id={`${id}-label`}
        htmlFor={`${id}-trigger`}
        className="text-sm font-medium text-text-secondary"
      >
        {label}
        {required && (
          <span aria-label="required" className="ml-0.5 text-error-700">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <button
          id={`${id}-trigger`}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-labelledby={`${id}-label`}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'flex w-full min-h-11 items-center justify-between rounded-md border bg-white px-3 py-2 text-base',
            focusRing,
            error ? 'border-error-700' : 'border-border',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <span className={values.length === 0 ? 'text-text-tertiary' : 'text-text-primary'}>
            {displayText}
          </span>
          <ChevronDownIcon size={16} aria-hidden="true" />
        </button>
        {open && (
          <div
            className="absolute z-50 mt-1 w-full rounded-md border border-border bg-white shadow-lg"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false);
                return;
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex((i) => Math.min(i + 1, filtered.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIndex((i) => Math.max(i - 1, 0));
              }
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const opt = filtered[focusedIndex];
                if (opt && !opt.disabled) toggle(opt.value, opt.label);
              }
            }}
          >
            {searchable && (
              <div className="border-b border-border p-2">
                <div className="relative">
                  <SearchIcon
                    size={16}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary"
                  />
                  <input
                    type="search"
                    aria-label={`Search ${label}`}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setFocusedIndex(0);
                    }}
                    className={cn(
                      'w-full min-h-11 rounded-md border border-border py-2 pl-8 pr-3 text-sm',
                      focusRing,
                    )}
                  />
                </div>
              </div>
            )}
            <ul
              id={listboxId}
              role="listbox"
              aria-multiselectable="true"
              aria-labelledby={`${id}-label`}
              className="max-h-60 overflow-auto p-1"
            >
              {filtered.map((option, index) => {
                const selected = values.includes(option.value);
                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={option.disabled || undefined}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm',
                      index === focusedIndex && 'bg-primary-light',
                      option.disabled && 'cursor-not-allowed opacity-50',
                      selected && 'font-medium text-primary',
                    )}
                    onClick={() => !option.disabled && toggle(option.value, option.label)}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded border',
                        selected ? 'border-primary bg-primary text-white' : 'border-border',
                      )}
                      aria-hidden="true"
                    >
                      {selected && <CheckIcon size={12} />}
                    </span>
                    {option.label}
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-text-tertiary" role="presentation">
                  No options found
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
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
  );
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    label,
    options,
    value,
    defaultValue,
    onValueChange,
    onChange,
    name,
    placeholder = 'Select an option',
    hint,
    error,
    required,
    disabled,
    searchable = false,
    multiple = false,
    values,
    onValuesChange,
    id: externalId,
    className,
  },
  _ref,
) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const { announce } = useAnnounce();

  if (multiple) {
    return (
      <MultiSelect
        label={label}
        options={options}
        values={values}
        onValuesChange={onValuesChange}
        placeholder={placeholder}
        hint={hint}
        error={error}
        required={required}
        disabled={disabled}
        searchable={searchable}
        id={id}
        className={className}
      />
    );
  }

  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const handleValueChange = (newValue: string) => {
    onValueChange?.(newValue);
    onChange?.(newValue);
    const option = options.find((o) => o.value === newValue);
    if (option) announce(`${option.label} selected`);
  };

  const resolvedLabel = label ?? 'Select option';

  return (
    <div className={cn('space-y-1.5', className)}>
      {name && <input type="hidden" name={name} value={value ?? defaultValue ?? ''} readOnly />}
      <label htmlFor={id} className="text-sm font-medium text-text-secondary">
        {resolvedLabel}
        {required && (
          <span aria-label="required" className="ml-0.5 text-error-700">
            *
          </span>
        )}
      </label>
      <SelectPrimitive.Root
        value={value || undefined}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        disabled={disabled}
        required={required}
      >
        <SelectPrimitive.Trigger
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(
            'flex w-full min-h-11 items-center justify-between rounded-md border bg-white px-3 py-2 text-base',
            focusRing,
            error ? 'border-error-700' : 'border-border',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <ChevronDownIcon size={16} aria-hidden="true" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="z-[100] overflow-hidden rounded-md border border-border bg-white shadow-lg"
            position="popper"
            sideOffset={4}
          >
            {searchable && (
              <div className="border-b border-border p-2">
                <SearchFilter options={options} label={resolvedLabel} />
              </div>
            )}
            <SelectPrimitive.Viewport className="max-h-60 overflow-auto p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    'relative flex min-h-11 cursor-pointer select-none items-center rounded-sm px-8 py-2 text-sm outline-none',
                    'data-[highlighted]:bg-primary-light data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  )}
                >
                  <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <CheckIcon size={14} />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1">
              <ChevronUpIcon size={16} />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1">
              <ChevronDownIcon size={16} />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
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
  );
});

function SearchFilter({ options, label }: { options: SelectOption[]; label: string }) {
  const [query, setQuery] = useState('');
  return (
    <div className="relative">
      <SearchIcon
        size={16}
        className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary"
      />
      <input
        type="search"
        aria-label={`Search ${label}`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        className={cn(
          'w-full min-h-11 rounded-md border border-border py-2 pl-8 pr-3 text-sm',
          focusRing,
        )}
      />
      <span className="sr-only" aria-live="polite">
        {query
          ? `${options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())).length} results`
          : ''}
      </span>
    </div>
  );
}

Select.displayName = 'Select';
