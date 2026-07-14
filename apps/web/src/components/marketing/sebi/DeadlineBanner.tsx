export function DeadlineBanner() {
  return (
    <div role="note" className="border-l-4 border-amber-600 bg-amber-50 px-4 py-4 sm:px-6">
      <div className="flex items-start gap-3">
        <svg
          className="mt-0.5 h-6 w-6 shrink-0 text-amber-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p className="text-base font-semibold text-amber-900">
            SEBI compliance deadline: April 30, 2026
          </p>
          <p className="mt-1 text-sm leading-normal text-amber-800">
            All SEBI-regulated entities must complete WCAG 2.1 AA audits by this date. Annual
            re-assessment required.
          </p>
        </div>
      </div>
    </div>
  );
}
