'use client';

import { Download, Package, Loader2, Clock, FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DownloadPackage } from '@/lib/types';
import { ExpiryCountdown } from './ExpiryCountdown';
import { cn } from '@/lib/utils';

interface DownloadPackageCardProps {
  package_: DownloadPackage;
  onDownload: (packageId: string) => void;
}

const statusConfig = {
  pending: { label: 'Pending', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900' },
  processing: { label: 'Processing', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900' },
  ready: { label: 'Ready', color: 'text-green-600 bg-green-100 dark:bg-green-900' },
  expired: { label: 'Expired', color: 'text-red-600 bg-red-100 dark:bg-red-900' },
};

export function DownloadPackageCard({ package_, onDownload }: DownloadPackageCardProps) {
  const status = statusConfig[package_.status];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-start gap-4 p-4">
          {/* Icon */}
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
            package_.status === 'ready' ? 'bg-primary/10' : 'bg-muted'
          )}>
            <FileArchive className={cn(
              'h-6 w-6',
              package_.status === 'ready' ? 'text-primary' : 'text-muted-foreground'
            )} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold truncate">{package_.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {package_.description}
                </p>
              </div>
              <span className={cn('text-xs px-2 py-1 rounded-full font-medium flex-shrink-0', status.color)}>
                {status.label}
              </span>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>{package_.photoCount} photos</span>
              <span>•</span>
              <span>{package_.totalSize}</span>
              <span>•</span>
              <span className="capitalize">{package_.sizeOption}</span>
            </div>

            {/* Expiry & Actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <ExpiryCountdown expiresAt={package_.expiresAt} />
              
              {package_.status === 'ready' && (
                <Button size="sm" onClick={() => onDownload(package_.id)} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}
              
              {package_.status === 'processing' && (
                <Button size="sm" disabled className="gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

