import type { CSSProperties } from 'react';

export type ButtonThemeVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'onDark'
  | 'danger';

export type ButtonThemeSize = 'sm' | 'md' | 'lg';

/** Layout only — colors are applied via inline styles (getButtonStyle). */
export const BUTTON_LAYOUT_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-md border-2 border-solid font-semibold no-underline transition-colors box-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A56A0] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0';

export const BUTTON_SIZE_CLASS: Record<ButtonThemeSize, string> = {
  sm: 'min-h-11 px-3 py-1.5 text-sm',
  md: 'min-h-11 px-4 py-2 text-base',
  lg: 'min-h-11 px-6 py-3 text-lg',
};

/** Canonical button colors — always applied as inline styles on the element. */
export const BUTTON_VARIANT_STYLE: Record<ButtonThemeVariant, CSSProperties> = {
  primary: {
    backgroundColor: '#1A56A0',
    borderColor: '#1A3A5C',
    color: '#FFFFFF',
  },
  secondary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#1A56A0',
    color: '#1A3A5C',
  },
  outline: {
    backgroundColor: '#EBF3FB',
    borderColor: '#1A56A0',
    color: '#1A3A5C',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    color: '#1A56A0',
  },
  onDark: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    color: '#1A3A5C',
  },
  danger: {
    backgroundColor: '#8B1A1A',
    borderColor: '#6B1414',
    color: '#FFFFFF',
  },
};

export const BUTTON_VARIANT_CLASS: Record<ButtonThemeVariant, string> = {
  primary: 'as-btn-primary',
  secondary: 'as-btn-secondary',
  outline: 'as-btn-outline',
  ghost: 'as-btn-ghost',
  onDark: 'as-btn-on-dark',
  danger: 'as-btn-danger',
};

export const BUTTON_SIZE_THEME_CLASS: Record<ButtonThemeSize, string> = {
  sm: 'as-btn-sm',
  md: 'as-btn-md',
  lg: 'as-btn-lg',
};

/** Inline styles for buttons and link-buttons — immune to Tailwind purge/cascade bugs. */
export function getButtonStyle(variant: ButtonThemeVariant = 'primary'): CSSProperties {
  return {
    ...BUTTON_VARIANT_STYLE[variant],
    WebkitAppearance: 'none',
    appearance: 'none',
    backgroundImage: 'none',
  };
}

export function getButtonThemeClassName(
  variant: ButtonThemeVariant = 'primary',
  size: ButtonThemeSize = 'md',
  className?: string,
): string {
  return [
    BUTTON_LAYOUT_CLASS,
    BUTTON_SIZE_CLASS[size],
    BUTTON_SIZE_THEME_CLASS[size],
    BUTTON_VARIANT_CLASS[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');
}
