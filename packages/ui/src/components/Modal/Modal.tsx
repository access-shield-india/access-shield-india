'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { cn, focusRing } from '../../lib/cn';
import { XIcon } from '../../lib/icons';

export interface ModalProps {
  /** Preferred open prop */
  open?: boolean;
  /** Alias for open — used by portal screens */
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Alias for onOpenChange(false) */
  onClose?: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Hide the default close button */
  hideClose?: boolean;
  className?: string;
}

export function Modal({
  open,
  isOpen,
  onOpenChange,
  onClose,
  title,
  description,
  children,
  hideClose = false,
  className,
}: ModalProps) {
  const titleId = 'modal-title';
  const descriptionId = 'modal-description';
  const resolvedOpen = open ?? isOpen ?? false;

  const handleOpenChange = (next: boolean) => {
    onOpenChange?.(next);
    if (!next) {
      onClose?.();
    }
  };

  return (
    <Dialog.Root open={resolvedOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border border-border bg-white p-6 shadow-xl',
            'max-h-[85vh] overflow-y-auto',
            className,
          )}
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <Dialog.Title id={titleId} className="text-xl font-semibold text-text-primary">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description id={descriptionId} className="mt-2 text-sm text-text-secondary">
              {description}
            </Dialog.Description>
          )}
          <div className="mt-4">{children}</div>
          {!hideClose && (
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close dialog"
                className={cn(
                  'absolute right-4 top-4 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md',
                  'text-text-tertiary hover:text-text-primary',
                  focusRing,
                )}
              >
                <XIcon size={20} aria-hidden="true" />
              </button>
            </Dialog.Close>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

Modal.displayName = 'Modal';
