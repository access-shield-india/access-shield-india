interface PenaltyCardProps {
  title: string;
  amount: string;
}

export function PenaltyCard({ title, amount }: PenaltyCardProps) {
  return (
    <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-6">
      <div className="flex items-start gap-3">
        <svg
          className="mt-1 h-6 w-6 shrink-0 text-amber-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-900">{title}</h3>
          <p className="mt-2 text-2xl font-bold text-amber-700">{amount}</p>
        </div>
      </div>
    </div>
  );
}
