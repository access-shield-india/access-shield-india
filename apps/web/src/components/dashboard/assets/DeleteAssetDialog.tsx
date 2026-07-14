'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Modal } from '@accessshield/ui';
import type { Asset } from '@/lib/api/types';
import { useDeleteAsset } from '@/lib/hooks/useApi';

export interface DeleteAssetDialogProps {
  asset: Asset;
  /** Called after successful deletion (before optional redirect). */
  onDeleted?: () => void;
  /** Navigate here after delete — e.g. `/dashboard/assets` from the detail page. */
  redirectTo?: string;
  /** Button presentation */
  variant?: 'button' | 'icon';
  className?: string;
}

export function DeleteAssetDialog({
  asset,
  onDeleted,
  redirectTo,
  variant = 'button',
  className,
}: DeleteAssetDialogProps) {
  const [open, setOpen] = useState(false);
  const deleteMutation = useDeleteAsset();

  const handleConfirm = () => {
    deleteMutation.mutate(
      { assetId: asset.id, redirectTo },
      {
        onSuccess: () => {
          setOpen(false);
          onDeleted?.();
        },
      },
    );
  };

  return (
    <>
      {variant === 'icon' ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className}
          onClick={() => setOpen(true)}
          aria-label={`Delete ${asset.name}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className}
          onClick={() => setOpen(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Delete asset
        </Button>
      )}

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Delete asset?"
        description={`This will permanently remove "${asset.name}" and all of its scans, violations, and issues. This cannot be undone.`}
      >
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            isLoading={deleteMutation.isPending}
            className="bg-error-700 hover:bg-error-800"
          >
            Delete permanently
          </Button>
        </div>
      </Modal>
    </>
  );
}
