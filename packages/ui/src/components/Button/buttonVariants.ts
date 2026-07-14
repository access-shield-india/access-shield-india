import { cva, type VariantProps } from 'class-variance-authority';
import {
  BUTTON_LAYOUT_CLASS,
  BUTTON_SIZE_CLASS,
  BUTTON_VARIANT_CLASS,
  type ButtonThemeSize,
  type ButtonThemeVariant,
  getButtonThemeClassName,
} from './buttonTheme';

/** Tailwind layout classes + plain CSS theme classes (globals.css) for reliable colors */
export const buttonVariants = cva(BUTTON_LAYOUT_CLASS, {
  variants: {
    variant: {
      primary: BUTTON_VARIANT_CLASS.primary,
      secondary: BUTTON_VARIANT_CLASS.secondary,
      outline: BUTTON_VARIANT_CLASS.outline,
      ghost: BUTTON_VARIANT_CLASS.ghost,
      onDark: BUTTON_VARIANT_CLASS.onDark,
      danger: BUTTON_VARIANT_CLASS.danger,
    },
    size: {
      sm: `${BUTTON_SIZE_CLASS.sm} as-btn-sm`,
      md: `${BUTTON_SIZE_CLASS.md} as-btn-md`,
      lg: `${BUTTON_SIZE_CLASS.lg} as-btn-lg`,
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export function getButtonClassName(
  variant: ButtonThemeVariant = 'primary',
  size: ButtonThemeSize = 'md',
  className?: string,
): string {
  return getButtonThemeClassName(variant, size, className);
}

export { BUTTON_VARIANT_STYLE, getButtonStyle, getButtonThemeClassName } from './buttonTheme';
