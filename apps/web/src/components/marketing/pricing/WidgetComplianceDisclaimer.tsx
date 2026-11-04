import { PRICING_CATALOG } from '@/lib/pricing/catalog';

export function WidgetComplianceDisclaimer() {
  return (
    <aside
      className="mx-auto mt-12 max-w-3xl rounded-lg border border-warning-100 bg-warning-100/50 p-4 text-sm leading-normal text-warning-700"
      role="note"
    >
      <p>
        <strong>Important:</strong> {PRICING_CATALOG.automationDisclaimer}
      </p>
      <p className="mt-2">{PRICING_CATALOG.widgetDisclaimer}</p>
      <p className="mt-2 text-xs text-text-tertiary">{PRICING_CATALOG.strategyDisclaimer}</p>
    </aside>
  );
}
