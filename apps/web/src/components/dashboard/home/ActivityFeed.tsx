'use client';

import { Card } from '@accessshield/ui';
import { CheckCircle, AlertCircle, Award, PlayCircle } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { Activity } from '@/lib/hooks/useApi';

export interface ActivityFeedProps {
  activities: Activity[];
}

const ACTION_ICONS = {
  scan: PlayCircle,
  create: CheckCircle,
  update: AlertCircle,
  export: Award,
} as const;

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Activity</h3>
        <p className="text-text-tertiary text-sm text-center py-8" role="status">
          No recent activity
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-text-primary mb-4" id="activity-heading">
        Recent Activity
      </h3>
      <div className="space-y-4" role="list" aria-labelledby="activity-heading">
        {activities.map((activity) => {
          const Icon = ACTION_ICONS[activity.action as keyof typeof ACTION_ICONS] || AlertCircle;

          return (
            <div key={activity.id} className="flex gap-3" role="listitem">
              <div className="flex-shrink-0 mt-0.5">
                <div className="rounded-full bg-primary-100 p-2">
                  <Icon className="h-4 w-4 text-primary-600" aria-hidden="true" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">{activity.description}</p>
                <p className="text-xs text-text-tertiary mt-1">
                  {formatRelativeTime(activity.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
