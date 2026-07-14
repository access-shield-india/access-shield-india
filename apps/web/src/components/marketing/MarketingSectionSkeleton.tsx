import { cn } from '@/lib/utils';

export function MarketingSectionSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse bg-bg-secondary px-4 py-16 motion-reduce:animate-none',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="sr-only">Please wait, loading section…</p>
      <div className="mx-auto h-8 max-w-md rounded-md bg-gray-200" />
      <div className="mx-auto mt-4 h-4 max-w-lg rounded-md bg-gray-200" />
    </div>
  );
}
