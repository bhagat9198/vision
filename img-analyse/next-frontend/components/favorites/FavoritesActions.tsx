'use client';

import { useState } from 'react';
import { Download, Share2, CheckSquare, Square, Loader2, X, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FavoritesActionsProps {
  totalPhotos: number;
  selectedCount: number;
  downloadAllowed: boolean;
  selectMode: boolean;
  onToggleSelectMode: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDownload: () => void;
  onShare: () => void;
}

export function FavoritesActions({
  totalPhotos,
  selectedCount,
  downloadAllowed,
  selectMode,
  onToggleSelectMode,
  onSelectAll,
  onClearSelection,
  onDownload,
  onShare,
}: FavoritesActionsProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    // Simulate download
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsDownloading(false);
    onDownload();
  };

  const handleShare = () => {
    // Copy link to clipboard
    navigator.clipboard.writeText(window.location.href);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2000);
    onShare();
  };

  return (
    <div className="space-y-3">
      {/* Selection Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectMode
            ? `${selectedCount} of ${totalPhotos} selected`
            : `${totalPhotos} favorite photos`}
        </div>
        <Button variant="ghost" size="sm" onClick={onToggleSelectMode} className="gap-2">
          {selectMode ? (
            <>
              <X className="h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <CheckSquare className="h-4 w-4" />
              Select
            </>
          )}
        </Button>
      </div>

      {/* Selection Actions */}
      {selectMode && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onSelectAll} className="gap-2">
            <Square className="h-4 w-4" />
            Select All
          </Button>
          {selectedCount > 0 && (
            <Button variant="outline" size="sm" onClick={onClearSelection}>
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Main Actions */}
      <div className="flex gap-2">
        {downloadAllowed && (
          <Button
            onClick={handleDownload}
            disabled={isDownloading || (selectMode && selectedCount === 0)}
            className="flex-1 gap-2"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download {selectMode && selectedCount > 0 ? `(${selectedCount})` : 'All'}
              </>
            )}
          </Button>
        )}

        <Button variant="outline" onClick={handleShare} className="flex-1 gap-2">
          <Share2 className="h-4 w-4" />
          Share Favorites
        </Button>
      </div>

      {/* Share Toast */}
      {showShareToast && (
        <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg text-sm">
          <Link2 className="h-4 w-4" />
          Link copied to clipboard!
        </div>
      )}
    </div>
  );
}

