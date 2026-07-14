import { cn, focusRing } from '../../lib/cn';

export interface SkipLinkProps {
  href?: string;
  label?: string;
  className?: string;
}

/** WCAG 2.4.1 Bypass Blocks — skip navigation link */
export function SkipLink({
  href = '#main-content',
  label = 'Skip to main content',
  className,
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only',
        'focus:absolute focus:left-4 focus:top-4 focus:z-50',
        'focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white focus:shadow-lg',
        focusRing,
        className,
      )}
    >
      {label}
    </a>
  );
}

SkipLink.displayName = 'SkipLink';
