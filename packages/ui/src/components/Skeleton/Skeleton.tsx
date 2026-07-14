import { cn } from '../../lib/cn';

export interface SkeletonProps {
  className?: string;
  /** Accessible label for the loading container */
  label?: string;
  lines?: number;
}

export function Skeleton({ className, label = 'Loading content', lines = 1 }: SkeletonProps) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={cn(
            'h-4 animate-pulse rounded-md bg-gray-200',
            i === lines - 1 && lines > 1 && 'w-3/4',
          )}
        />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

Skeleton.displayName = 'Skeleton';
