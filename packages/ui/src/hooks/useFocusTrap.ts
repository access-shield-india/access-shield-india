'use client';

import { useCallback, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export interface UseFocusTrapOptions {
  /** Whether the focus trap is active */
  active?: boolean;
  /** Element to return focus to on deactivate */
  returnFocusTo?: HTMLElement | null;
  /** Called when Escape is pressed */
  onEscape?: () => void;
}

/** Trap focus within a container — for modals and drawers */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  options: UseFocusTrapOptions = {},
) {
  const { active = true, returnFocusTo, onEscape } = options;
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback((): HTMLElement[] => {
    const container = containerRef.current;
    if (!container) return [];
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute('aria-disabled') && el.offsetParent !== null,
    );
  }, []);

  useEffect(() => {
    if (!active) return;

    previousFocusRef.current = (document.activeElement as HTMLElement) ?? null;

    const container = containerRef.current;
    if (!container) return;

    const focusable = getFocusableElements();
    if (focusable.length > 0) {
      focusable[0]?.focus();
    } else {
      container.setAttribute('tabindex', '-1');
      container.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      if (event.key !== 'Tab') return;

      const elements = getFocusableElements();
      if (elements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) return;

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      const returnTo = returnFocusTo ?? previousFocusRef.current;
      returnTo?.focus();
    };
  }, [active, getFocusableElements, onEscape, returnFocusTo]);

  return containerRef;
}
