import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface MarketingVisualProps {
  children: ReactNode;
  className?: string;
  /** Brief label for screen readers when the visual is decorative */
  label?: string;
}

/**
 * Frames marketing illustrations with a consistent, professional card treatment.
 * Child SVGs should use aria-hidden; this wrapper provides an optional sr-only label.
 */
export function MarketingVisual({ children, className, label }: MarketingVisualProps) {
  return (
    <figure
      className={cn(
        'relative overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-100/60 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative">{children}</div>
      {label && <figcaption className="sr-only">{label}</figcaption>}
    </figure>
  );
}
