'use client';

import { AnnouncerProvider, TooltipProvider } from '@accessshield/ui';
import type { ReactNode } from 'react';

/** Shared UI context for Select, Tooltip, and other accessible components */
export function UiProviders({ children }: { children: ReactNode }) {
  return (
    <AnnouncerProvider>
      <TooltipProvider>{children}</TooltipProvider>
    </AnnouncerProvider>
  );
}
