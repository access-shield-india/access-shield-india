import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AdminCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function AdminCard({ title, description, children, className }: AdminCardProps) {
  return (
    <section
      className={cn('rounded-lg border border-gray-200/90 bg-white', className)}
      aria-labelledby={title ? 'admin-card-title' : undefined}
    >
      {(title || description) && (
        <div className="border-b border-gray-100 px-5 py-4">
          {title && (
            <h2 id="admin-card-title" className="text-sm font-semibold text-text-primary">
              {title}
            </h2>
          )}
          {description && <p className="mt-0.5 text-sm text-text-secondary">{description}</p>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
