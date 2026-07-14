import { cn, focusRing } from '../../lib/cn';
import { ChevronRightIcon } from '../../lib/icons';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isCurrent = item.current ?? isLast;

          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
              {index > 0 && (
                <ChevronRightIcon size={14} className="text-text-tertiary" aria-hidden="true" />
              )}
              {item.href && !isCurrent ? (
                <a
                  href={item.href}
                  className={cn(
                    'inline-flex min-h-11 items-center text-primary hover:underline',
                    focusRing,
                  )}
                >
                  {item.label}
                </a>
              ) : (
                <span
                  aria-current={isCurrent ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-11 items-center',
                    isCurrent ? 'font-medium text-text-primary' : 'text-text-tertiary',
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

Breadcrumb.displayName = 'Breadcrumb';
