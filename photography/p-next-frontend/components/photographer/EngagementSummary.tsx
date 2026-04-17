'use client';

import { Eye, Download, Heart, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EngagementSummaryProps {
  views: number;
  downloads: number;
  likes: number;
  comments: number;
}

export function EngagementSummary({ views, downloads, likes, comments }: EngagementSummaryProps) {
  const stats = [
    { label: 'Views', value: views, icon: Eye, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900' },
    { label: 'Downloads', value: downloads, icon: Download, color: 'text-green-600 bg-green-100 dark:bg-green-900' },
    { label: 'Likes', value: likes, icon: Heart, color: 'text-rose-600 bg-rose-100 dark:bg-rose-900' },
    { label: 'Comments', value: comments, icon: MessageSquare, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Engagement Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

