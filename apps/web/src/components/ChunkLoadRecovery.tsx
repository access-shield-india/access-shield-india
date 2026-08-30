'use client';

import { useEffect } from 'react';

const RELOAD_FLAG = 'as_chunk_load_reload';

function isChunkLoadFailure(value: unknown): boolean {
  if (!value) return false;
  const message =
    typeof value === 'string'
      ? value
      : value instanceof Error
        ? value.message
        : typeof value === 'object' && value !== null && 'message' in value
          ? String((value as { message: unknown }).message)
          : String(value);
  return (
    message.includes('ChunkLoadError') ||
    message.includes('Loading chunk') ||
    message.includes('/_next/undefined')
  );
}

/**
 * After a prod redeploy, browsers may hold stale JS that requests missing chunks
 * (often as `/_next/undefined`). One hard reload usually recovers.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    const reloadOnce = () => {
      try {
        if (sessionStorage.getItem(RELOAD_FLAG) === '1') return;
        sessionStorage.setItem(RELOAD_FLAG, '1');
      } catch {
        return;
      }
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      if (isChunkLoadFailure(event.error) || isChunkLoadFailure(event.message)) {
        reloadOnce();
      }
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadFailure(event.reason)) {
        reloadOnce();
      }
    };

    // If this load stayed healthy, allow a future reload after the next deploy.
    const clearFlagTimer = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        /* ignore */
      }
    }, 4000);

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.clearTimeout(clearFlagTimer);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
