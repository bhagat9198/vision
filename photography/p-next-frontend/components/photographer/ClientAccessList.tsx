'use client';

import { Eye, Heart, Download, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientVisit } from '@/lib/types';

interface ClientAccessListProps {
  clients: ClientVisit[];
}

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

export function ClientAccessList({ clients }: ClientAccessListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Client Access</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {clients.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No visitors yet</p>
          ) : (
            clients.map((client) => (
              <div key={client.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{client.clientName}</p>
                    {client.clientEmail && (
                      <p className="text-xs text-muted-foreground">{client.clientEmail}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Last visit: {formatTimeAgo(client.visitedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {client.photosViewed} viewed
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3 text-rose-500" /> {client.photosLiked} liked
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-3 w-3 text-green-500" /> {client.photosDownloaded} downloaded
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3 text-blue-500" /> {client.commentsLeft} comments
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

