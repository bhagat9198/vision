'use client';

import { useState } from 'react';
import { Package, Loader2, Check, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ZipCreationProps {
  photoCount: number;
  selectedSize: string;
  estimatedSize: string;
  onCreateZip: () => void;
}

type ZipStatus = 'idle' | 'creating' | 'ready' | 'error';

export function ZipCreation({ photoCount, selectedSize, estimatedSize, onCreateZip }: ZipCreationProps) {
  const [status, setStatus] = useState<ZipStatus>('idle');
  const [progress, setProgress] = useState(0);

  const handleCreateZip = async () => {
    setStatus('creating');
    setProgress(0);

    // Simulate zip creation progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setStatus('ready');
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    onCreateZip();
  };

  const handleDownload = () => {
    // Trigger download
    console.log('Downloading zip file');
  };

  const handleReset = () => {
    setStatus('idle');
    setProgress(0);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              status === 'ready' ? 'bg-green-100 dark:bg-green-900' :
              status === 'creating' ? 'bg-blue-100 dark:bg-blue-900' :
              'bg-muted'
            }`}>
              {status === 'creating' ? (
                <Loader2 className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
              ) : status === 'ready' ? (
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : (
                <Package className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold">
                {status === 'idle' && 'Create Download Package'}
                {status === 'creating' && 'Creating ZIP File...'}
                {status === 'ready' && 'ZIP Ready for Download'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {status === 'idle' && `${photoCount} photos • ${selectedSize} quality • ~${estimatedSize}`}
                {status === 'creating' && 'Please wait while we prepare your photos'}
                {status === 'ready' && 'Your download package is ready'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          {status === 'creating' && (
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {Math.round(progress)}% complete
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {status === 'idle' && (
              <Button onClick={handleCreateZip} className="w-full gap-2">
                <Package className="h-4 w-4" />
                Create ZIP Package
              </Button>
            )}

            {status === 'ready' && (
              <>
                <Button onClick={handleDownload} className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Download ZIP
                </Button>
                <Button variant="outline" size="icon" onClick={handleReset}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

