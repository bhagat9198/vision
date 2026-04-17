'use client';

import Link from 'next/link';
import { MessageSquare, Heart, Download, Eye, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
  activities: ActivityItem[];
}

const activityIcons = {
  comment: MessageSquare,
  like: Heart,
  download: Download,
  view: Eye,
  upload: Upload,
};

const activityColors = {
  comment: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
  like: 'bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-400',
  download: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
  view: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
  upload: 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400',
};

function formatTimeAgo(timestamp: string): string {
  const now = new Date().getTime();
  const time = new Date(timestamp).getTime();
  const diff = now - time;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.type];
            return (
              <div key={activity.id} className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors">
                <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0', activityColors[activity.type])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    {activity.clientName && (
                      <span className="font-medium">{activity.clientName}</span>
                    )}
                    {' '}{activity.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Link
                      href={`/photographer/events/${activity.eventId}`}
                      className="text-xs text-primary hover:underline truncate"
                    >
                      {activity.eventName}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      • {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

