'use client';

import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/api/client';
import { apiUrl } from '@/lib/api/base';
import type { Issue, ScanDetail } from '@/lib/api/types';

export interface ScanProgress {
  status: string;
  pagesScanned: number;
  pagesTotal: number;
  currentUrl: string;
  score: number | null;
}

interface RealtimeEnvelope {
  channel: string;
  event: string;
  table: string;
  new: Record<string, unknown>;
}

async function openRealtimeStream(channels: string[]): Promise<EventSource> {
  const token = await getAccessToken();
  const ticketRes = await fetch(apiUrl('/api/v1/realtime/ticket'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channels }),
  });

  if (!ticketRes.ok) {
    throw new Error('Failed to create realtime ticket');
  }

  const body = (await ticketRes.json()) as {
    data: { streamPath: string };
  };

  const streamUrl = apiUrl(body.data.streamPath);
  return new EventSource(streamUrl);
}

/**
 * Subscribe to real-time scan progress updates via API SSE.
 */
export function useScanProgress(scanId: string | null): ScanProgress | null {
  const [progress, setProgress] = useState<ScanProgress | null>(null);

  useEffect(() => {
    if (!scanId) return;

    let source: EventSource | null = null;
    let cancelled = false;

    void (async () => {
      try {
        source = await openRealtimeStream([`scan:${scanId}`]);
        if (cancelled) {
          source.close();
          return;
        }

        source.addEventListener('UPDATE', (evt) => {
          const envelope = JSON.parse((evt as MessageEvent).data) as RealtimeEnvelope;
          const scan = envelope.new as Partial<ScanDetail> & {
            pagesScanned?: number;
            pagesTotal?: number;
            progress?: { pagesTotal?: number; currentUrl?: string };
          };
          setProgress({
            status: String(scan.status ?? 'running'),
            pagesScanned: Number(scan.pagesScanned ?? 0),
            pagesTotal: Number(scan.progress?.pagesTotal ?? scan.pagesTotal ?? 0),
            currentUrl: String(scan.progress?.currentUrl ?? ''),
            score: (scan.score as number | null) ?? null,
          });
        });
      } catch {
        // SSE optional — polling UIs still work
      }
    })();

    return () => {
      cancelled = true;
      source?.close();
    };
  }, [scanId]);

  return progress;
}

export interface Notification {
  id: string;
  action: string;
  resourceType: string;
  description: string;
  createdAt: string;
}

/**
 * Subscribe to real-time notifications for the organization.
 */
export function useNotifications(orgId: string | null): Notification[] {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!orgId) return;

    let source: EventSource | null = null;
    let cancelled = false;

    void (async () => {
      try {
        source = await openRealtimeStream([`org:${orgId}`]);
        if (cancelled) {
          source.close();
          return;
        }

        source.addEventListener('INSERT', (evt) => {
          const envelope = JSON.parse((evt as MessageEvent).data) as RealtimeEnvelope;
          const log = envelope.new as {
            id: string;
            action: string;
            resource_type?: string;
            resourceType?: string;
            metadata?: Record<string, unknown>;
            created_at?: string;
            createdAt?: string;
          };
          const notification: Notification = {
            id: log.id,
            action: log.action,
            resourceType: log.resource_type ?? log.resourceType ?? 'unknown',
            description: formatAuditLogDescription(log),
            createdAt: log.created_at ?? log.createdAt ?? new Date().toISOString(),
          };
          setNotifications((prev) => [notification, ...prev].slice(0, 10));
        });
      } catch {
        // optional
      }
    })();

    return () => {
      cancelled = true;
      source?.close();
    };
  }, [orgId]);

  return notifications;
}

function formatAuditLogDescription(log: {
  action: string;
  resource_type?: string;
  resourceType?: string;
  metadata?: Record<string, unknown>;
}): string {
  const resourceType = log.resource_type ?? log.resourceType ?? 'resource';
  const { action, metadata } = log;

  const descriptions: Record<string, string> = {
    'scan.completed': `Scan completed on ${metadata?.assetName ?? 'asset'}`,
    'scan.failed': `Scan failed on ${metadata?.assetName ?? 'asset'}`,
    'asset.created': `New asset created: ${metadata?.assetName ?? 'Unknown'}`,
    'issue.assigned': `Issue assigned to ${metadata?.assigneeName ?? 'user'}`,
    'certificate.issued': `Certificate issued for ${metadata?.assetName ?? 'asset'}`,
    'report.generated': `Report generated for ${metadata?.assetName ?? 'asset'}`,
  };

  const key = `${resourceType}.${action}`;
  return descriptions[key] || `${action} on ${resourceType}`;
}

/**
 * Subscribe to real-time issue updates for the organization.
 */
export function useIssueUpdates(orgId: string | null, onUpdate: (issue: Issue) => void): void {
  useEffect(() => {
    if (!orgId) return;

    let source: EventSource | null = null;
    let cancelled = false;

    void (async () => {
      try {
        source = await openRealtimeStream([`issues:${orgId}`]);
        if (cancelled) {
          source.close();
          return;
        }

        source.addEventListener('UPDATE', (evt) => {
          const envelope = JSON.parse((evt as MessageEvent).data) as RealtimeEnvelope;
          onUpdate(envelope.new as unknown as Issue);
        });
      } catch {
        // optional
      }
    })();

    return () => {
      cancelled = true;
      source?.close();
    };
  }, [orgId, onUpdate]);
}
