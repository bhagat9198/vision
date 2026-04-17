'use client';

import { useState } from 'react';
import { QrCode, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface QRCodeDisplayProps {
  eventId: string;
  eventName: string;
}

export function QRCodeDisplay({ eventId, eventName }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/event/${eventId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* QR Code Placeholder */}
          <div className="w-40 h-40 bg-white rounded-xl border-2 border-dashed flex items-center justify-center">
            <div className="text-center">
              <QrCode className="h-20 w-20 mx-auto text-gray-800" />
              <p className="text-xs text-muted-foreground mt-2">QR Code</p>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="font-semibold">Client Access Link</h3>
            <p className="text-sm text-muted-foreground break-all max-w-xs">
              {shareUrl}
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button variant="outline" size="sm" asChild className="gap-2">
              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Preview
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

