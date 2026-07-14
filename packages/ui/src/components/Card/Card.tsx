import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  /** Use article for self-contained content, div for grouped UI */
  as?: 'article' | 'div';
  heading?: string;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  description?: string;
}

export function Card({
  children,
  as: Component = 'div',
  heading,
  headingLevel = 3,
  description,
  className,
  ...props
}: CardProps) {
  const HeadingTag = `h${headingLevel}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const headingId = heading ? 'card-heading' : undefined;
  const descId = description ? 'card-description' : undefined;

  return (
    <Component
      className={cn('rounded-lg border border-border bg-white p-6 shadow-sm', className)}
      aria-labelledby={headingId}
      aria-describedby={descId}
      {...props}
    >
      {heading && (
        <HeadingTag id={headingId} className="text-lg font-semibold text-text-primary">
          {heading}
        </HeadingTag>
      )}
      {description && (
        <p id={descId} className="mt-1 text-sm text-text-secondary">
          {description}
        </p>
      )}
      <div className={heading || description ? 'mt-4' : undefined}>{children}</div>
    </Component>
  );
}

Card.displayName = 'Card';
