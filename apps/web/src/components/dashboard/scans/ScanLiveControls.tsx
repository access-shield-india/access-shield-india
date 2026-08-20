'use client';

import { useState } from 'react';
import { Pause, Play, XCircle } from 'lucide-react';
import { Button } from '@accessshield/ui';
import { useCancelScan, usePauseScan, useResumeScan } from '@/lib/hooks/useApi';

export interface ScanLiveControlsProps {
  scanId: string;
  paused: boolean;
}

export function ScanLiveControls({ scanId, paused }: ScanLiveControlsProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const pauseMutation = usePauseScan(scanId);
  const resumeMutation = useResumeScan(scanId);
  const cancelMutation = useCancelScan(scanId);
  const busy = pauseMutation.isPending || resumeMutation.isPending || cancelMutation.isPending;

  if (confirmCancel) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium text-error-700">
          Cancel this scan? Remaining pages will not be checked.
        </p>
        <Button
          type="button"
          variant="danger"
          size="md"
          disabled={busy}
          isLoading={cancelMutation.isPending}
          onClick={() => cancelMutation.mutate()}
        >
          Yes, cancel scan
        </Button>
        <Button
          type="button"
          variant="outline"
          size="md"
          disabled={busy}
          onClick={() => setConfirmCancel(false)}
        >
          Keep scanning
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {paused ? (
        <Button
          type="button"
          variant="primary"
          size="md"
          disabled={busy}
          isLoading={resumeMutation.isPending}
          onClick={() => resumeMutation.mutate()}
        >
          <Play className="mr-2 h-4 w-4" aria-hidden="true" />
          Resume
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="md"
          disabled={busy}
          isLoading={pauseMutation.isPending}
          onClick={() => pauseMutation.mutate()}
        >
          <Pause className="mr-2 h-4 w-4" aria-hidden="true" />
          Pause
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="md"
        disabled={busy}
        onClick={() => setConfirmCancel(true)}
      >
        <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
        Cancel scan
      </Button>
    </div>
  );
}
