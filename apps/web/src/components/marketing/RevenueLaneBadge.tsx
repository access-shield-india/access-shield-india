/** Tags Synk offers as Product / Services / Enterprise for messaging clarity. */

export type RevenueLane = 'product' | 'services' | 'enterprise';

const LABELS: Record<RevenueLane, string> = {
  product: 'Product',
  services: 'Services',
  enterprise: 'Enterprise',
};

const STYLES: Record<RevenueLane, string> = {
  product: 'bg-primary-100 text-primary-700 border-primary-300',
  services: 'bg-accent-100 text-accent-700 border-accent-600/40',
  enterprise: 'bg-bg-tertiary text-text-primary border-border',
};

interface RevenueLaneBadgeProps {
  lane: RevenueLane;
}

export function RevenueLaneBadge({ lane }: RevenueLaneBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold ${STYLES[lane]}`}
    >
      {LABELS[lane]}
    </span>
  );
}
