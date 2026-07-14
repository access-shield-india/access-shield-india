'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { cn } from '../../lib/cn';

export interface FocusScopeProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Whether focus trapping is active */
  trapped?: boolean;
  /** Return focus to this element on deactivate */
  returnFocusTo?: HTMLElement | null;
  /** Called when Escape is pressed */
  onEscape?: () => void;
}

/** Wraps focus-trapped regions such as modals and drawers */
export function FocusScope({
  children,
  trapped = true,
  returnFocusTo,
  onEscape,
  className,
  ...props
}: FocusScopeProps) {
  const containerRef = useFocusTrap<HTMLDivElement>({
    active: trapped,
    returnFocusTo,
    onEscape,
  });

  return (
    <div ref={containerRef} className={cn(className)} {...props}>
      {children}
    </div>
  );
}

FocusScope.displayName = 'FocusScope';
