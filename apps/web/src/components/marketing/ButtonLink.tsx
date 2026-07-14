'use client';

import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import {
  getButtonStyle,
  getButtonThemeClassName,
  type ButtonThemeSize,
  type ButtonThemeVariant,
} from '@accessshield/ui';
import { localizedHref } from '@/lib/i18n/paths';
import { useOptionalLocale } from '@/lib/i18n/locale-context';
import { cn } from '@/lib/utils';

export interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonThemeVariant;
  size?: ButtonThemeSize;
}

function resolveHref(
  href: ComponentProps<typeof Link>['href'],
  locale: ReturnType<typeof useOptionalLocale>,
) {
  if (typeof href === 'string' && href.startsWith('/')) {
    return localizedHref(href, locale);
  }
  return href;
}

/** Link styled as a theme button — auto-prefixes locale for internal paths. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  style,
  href,
  ...props
}: ButtonLinkProps) {
  const locale = useOptionalLocale();
  const v = (variant ?? 'primary') as ButtonThemeVariant;
  const s = (size ?? 'md') as ButtonThemeSize;

  return (
    <Link
      href={resolveHref(href, locale)}
      data-as-btn={v}
      className={cn(getButtonThemeClassName(v, s), className)}
      style={{ ...getButtonStyle(v), ...style }}
      {...props}
    />
  );
}

export interface ButtonAnchorProps extends ComponentProps<'a'> {
  variant?: ButtonThemeVariant;
  size?: ButtonThemeSize;
  children: ReactNode;
}

/** External anchor styled as a theme button. */
export function ButtonAnchor({
  variant = 'primary',
  size = 'md',
  className,
  style,
  children,
  ...props
}: ButtonAnchorProps) {
  const v = (variant ?? 'primary') as ButtonThemeVariant;
  const s = (size ?? 'md') as ButtonThemeSize;

  return (
    <a
      data-as-btn={v}
      className={cn(getButtonThemeClassName(v, s), className)}
      style={{ ...getButtonStyle(v), ...style }}
      {...props}
    >
      {children}
    </a>
  );
}
