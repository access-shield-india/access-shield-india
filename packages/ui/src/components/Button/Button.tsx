'use client';

import { Slot } from '@radix-ui/react-slot';
import type { VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { LoaderIcon } from '../../lib/icons';
import { getButtonStyle } from './buttonTheme';
import { buttonVariants } from './buttonVariants';

export {
  buttonVariants,
  getButtonClassName,
  BUTTON_VARIANT_STYLE,
  getButtonStyle,
} from './buttonVariants';

export interface ButtonProps
  extends
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>,
    VariantProps<typeof buttonVariants> {
  children: ReactNode;
  disabled?: boolean;
  isLoading?: boolean;
  /** Render child element (e.g. Link) with button styles */
  asChild?: boolean;
  /** Explanation shown when disabled — keeps button focusable per a11y */
  disabledReason?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant,
      size,
      isLoading = false,
      asChild = false,
      disabled,
      disabledReason,
      className,
      style,
      type = 'button',
      onClick,
      ...props
    },
    ref,
  ) => {
    const resolvedVariant = variant ?? 'primary';
    const resolvedSize = size ?? 'md';
    const isDisabled = Boolean(disabled ?? isLoading);
    const describedBy =
      disabledReason && isDisabled ? `${props.id ?? 'btn'}-disabled-reason` : undefined;

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    };

    const Comp = asChild ? Slot : 'button';

    return (
      <>
        <Comp
          ref={ref}
          type={asChild ? undefined : type}
          data-as-btn={resolvedVariant}
          aria-disabled={isDisabled || undefined}
          aria-busy={isLoading || undefined}
          aria-describedby={describedBy ?? props['aria-describedby']}
          className={cn(
            buttonVariants({ variant: resolvedVariant, size: resolvedSize }),
            isDisabled && 'cursor-not-allowed opacity-50',
            className,
          )}
          style={{ ...getButtonStyle(resolvedVariant), ...style }}
          onClick={asChild ? onClick : handleClick}
          {...props}
        >
          {isLoading ? (
            <>
              <span className="sr-only">Loading</span>
              <LoaderIcon size={16} className="mr-2 animate-spin" aria-hidden="true" />
              {children}
            </>
          ) : (
            children
          )}
        </Comp>
        {disabledReason && isDisabled && (
          <span id={describedBy} className="sr-only">
            {disabledReason}
          </span>
        )}
      </>
    );
  },
);

Button.displayName = 'Button';
