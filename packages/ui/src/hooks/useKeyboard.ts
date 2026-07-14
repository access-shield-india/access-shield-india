'use client';

import { useCallback, type KeyboardEvent } from 'react';

export type KeyboardAction =
  | 'enter'
  | 'space'
  | 'escape'
  | 'arrowUp'
  | 'arrowDown'
  | 'arrowLeft'
  | 'arrowRight'
  | 'home'
  | 'end'
  | 'tab';

const KEY_MAP: Record<string, KeyboardAction> = {
  Enter: 'enter',
  ' ': 'space',
  Escape: 'escape',
  ArrowUp: 'arrowUp',
  ArrowDown: 'arrowDown',
  ArrowLeft: 'arrowLeft',
  ArrowRight: 'arrowRight',
  Home: 'home',
  End: 'end',
  Tab: 'tab',
};

export interface UseKeyboardOptions {
  onEnter?: (event: KeyboardEvent) => void;
  onSpace?: (event: KeyboardEvent) => void;
  onEscape?: (event: KeyboardEvent) => void;
  onArrowUp?: (event: KeyboardEvent) => void;
  onArrowDown?: (event: KeyboardEvent) => void;
  onArrowLeft?: (event: KeyboardEvent) => void;
  onArrowRight?: (event: KeyboardEvent) => void;
  onHome?: (event: KeyboardEvent) => void;
  onEnd?: (event: KeyboardEvent) => void;
  /** Prevent default for matched keys */
  preventDefault?: KeyboardAction[] | boolean;
}

/** Normalise keyboard event handling across components */
export function useKeyboard(options: UseKeyboardOptions = {}) {
  const {
    onEnter,
    onSpace,
    onEscape,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onHome,
    onEnd,
    preventDefault = false,
  } = options;

  const handlers: Partial<Record<KeyboardAction, (event: KeyboardEvent) => void>> = {
    enter: onEnter,
    space: onSpace,
    escape: onEscape,
    arrowUp: onArrowUp,
    arrowDown: onArrowDown,
    arrowLeft: onArrowLeft,
    arrowRight: onArrowRight,
    home: onHome,
    end: onEnd,
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const action = KEY_MAP[event.key];
      if (!action) return;

      const handler = handlers[action];
      if (!handler) return;

      const shouldPrevent =
        preventDefault === true ||
        (Array.isArray(preventDefault) && preventDefault.includes(action));

      if (shouldPrevent) {
        event.preventDefault();
      }

      handler(event);
    },
    [
      onEnter,
      onSpace,
      onEscape,
      onArrowUp,
      onArrowDown,
      onArrowLeft,
      onArrowRight,
      onHome,
      onEnd,
      preventDefault,
    ],
  );

  const getAction = useCallback((event: KeyboardEvent): KeyboardAction | undefined => {
    return KEY_MAP[event.key];
  }, []);

  return { handleKeyDown, getAction };
}
