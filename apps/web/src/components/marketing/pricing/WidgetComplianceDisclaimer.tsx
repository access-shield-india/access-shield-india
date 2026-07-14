import Link from 'next/link';
import { PRICING_CATALOG } from '@/lib/pricing/catalog';

export function WidgetComplianceDisclaimer() {
  return (
    <aside
      className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-normal text-amber-900"
      role="note"
      aria-label="Accessibility widget compliance notice"
    >
      <p>
        <strong>Important:</strong> {PRICING_CATALOG.widgetDisclaimer}{' '}
        <Link
          href="/terms"
          className="font-medium underline hover:text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          See our Terms
        </Link>
        .
      </p>
    </aside>
  );
}
