import { cn } from '../../lib/cn';

export interface ProgressProps {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}

export function Progress({
  value,
  min = 0,
  max = 100,
  label = 'Progress',
  showValue = true,
  className,
}: ProgressProps) {
  const clamped = Math.min(max, Math.max(min, value));
  const percent = Math.round(((clamped - min) / (max - min)) * 100);
  const valueText = `${percent}% complete`;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-text-secondary">{label}</span>
        {showValue && (
          <span className="text-text-tertiary" aria-hidden="true">
            {percent}%
          </span>
        )}
      </div>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={valueText}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

Progress.displayName = 'Progress';
