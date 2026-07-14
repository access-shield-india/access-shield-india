'use client';

import { useEffect, useState } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

/**
 * Global dashboard indicator for in-flight API requests.
 * Mutations show a banner; background fetches show a thin progress bar + delayed message.
 */
export function DashboardActivityBar() {
  const fetchingCount = useIsFetching();
  const mutatingCount = useIsMutating();
  const isFetching = fetchingCount > 0;
  const isMutating = mutatingCount > 0;
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  useEffect(() => {
    if (!isFetching || isMutating) {
      setShowSlowMessage(false);
      return;
    }

    const timer = window.setTimeout(() => setShowSlowMessage(true), 600);
    return () => window.clearTimeout(timer);
  }, [isFetching, isMutating]);

  if (!isFetching && !isMutating) {
    return null;
  }

  return (
    <div className="w-full shrink-0" role="status" aria-live="polite" aria-atomic="true">
      {isMutating ? (
        <div className="flex items-center justify-center gap-2 bg-primary-600/95 px-4 py-1.5 text-xs font-medium text-white">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <span>Please wait, processing your request…</span>
        </div>
      ) : (
        <>
          <div className="h-1 w-full overflow-hidden bg-primary-100" aria-label="Loading data">
            <div
              className="h-full w-1/3 animate-pulse bg-primary-600 motion-reduce:animate-none"
              style={{ animationDuration: '1.2s' }}
            />
          </div>
          {showSlowMessage ? (
            <p className="bg-primary-50 px-4 py-1.5 text-center text-xs font-medium text-primary-700">
              Please wait, loading your data…
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
