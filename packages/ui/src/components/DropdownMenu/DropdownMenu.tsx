'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';
import { cn, focusRing } from '../../lib/cn';
import { ChevronRightIcon } from '../../lib/icons';

export interface DropdownMenuItem {
  id: string;
  label: string;
  onSelect?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  shortcut?: string;
  divider?: boolean;
  items?: DropdownMenuItem[];
}

export interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownMenuItem[];
  ariaLabel?: string;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

function MenuItems({ items }: { items: DropdownMenuItem[] }) {
  return (
    <>
      {items.map((item) =>
        item.divider ? (
          <DropdownMenuPrimitive.Separator key={item.id} className="my-1 h-px bg-border" />
        ) : item.items ? (
          <DropdownMenuPrimitive.Sub key={item.id}>
            <DropdownMenuPrimitive.SubTrigger
              className={cn(
                'flex min-h-11 cursor-pointer select-none items-center justify-between rounded-sm px-3 py-2 text-sm outline-none',
                'data-[highlighted]:bg-primary-light data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                focusRing,
              )}
              disabled={item.disabled}
            >
              {item.label}
              <ChevronRightIcon size={14} aria-hidden="true" />
            </DropdownMenuPrimitive.SubTrigger>
            <DropdownMenuPrimitive.Portal>
              <DropdownMenuPrimitive.SubContent
                className="z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-white p-1 shadow-lg"
                sideOffset={2}
              >
                <MenuItems items={item.items} />
              </DropdownMenuPrimitive.SubContent>
            </DropdownMenuPrimitive.Portal>
          </DropdownMenuPrimitive.Sub>
        ) : (
          <DropdownMenuPrimitive.Item
            key={item.id}
            disabled={item.disabled}
            onSelect={item.onSelect}
            className={cn(
              'relative flex min-h-11 cursor-pointer select-none items-center justify-between rounded-sm px-3 py-2 text-sm outline-none',
              'data-[highlighted]:bg-primary-light data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
              item.destructive && 'text-error-700',
              focusRing,
            )}
          >
            {item.label}
            {item.shortcut && (
              <span className="ml-auto text-xs text-text-tertiary" aria-hidden="true">
                {item.shortcut}
              </span>
            )}
          </DropdownMenuPrimitive.Item>
        ),
      )}
    </>
  );
}

export function DropdownMenu({
  trigger,
  items,
  ariaLabel = 'Menu',
  align = 'start',
  className,
}: DropdownMenuProps) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>{trigger}</DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          sideOffset={4}
          aria-label={ariaLabel}
          className={cn(
            'z-50 min-w-[12rem] overflow-hidden rounded-md border border-border bg-white p-1 shadow-lg',
            className,
          )}
        >
          <MenuItems items={items} />
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

DropdownMenu.displayName = 'DropdownMenu';
