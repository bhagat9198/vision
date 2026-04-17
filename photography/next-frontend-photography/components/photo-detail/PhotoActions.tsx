'use client';

import { Heart, MessageCircle, Download, Share2, Bookmark, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PhotoActionsProps {
  likes: number;
  comments: number;
  downloadable?: boolean;
  isFavorite?: boolean;
  onLike?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onFavorite?: () => void;
  onCommentClick?: () => void;
}

export function PhotoActions({
  likes,
  comments,
  downloadable = true,
  isFavorite = false,
  onLike,
  onDownload,
  onShare,
  onFavorite,
  onCommentClick,
}: PhotoActionsProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);
  const [isFav, setIsFav] = useState(isFavorite);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    onLike?.();
  };

  const handleFavorite = () => {
    setIsFav(!isFav);
    onFavorite?.();
  };

  return (
    <div className="flex items-center justify-between py-4 border-b">
      {/* Left Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={cn('gap-2', isLiked && 'text-red-500')}
        >
          <Heart className={cn('h-5 w-5', isLiked && 'fill-current')} />
          <span>{likeCount}</span>
        </Button>
        
        <Button variant="ghost" size="sm" onClick={onCommentClick} className="gap-2">
          <MessageCircle className="h-5 w-5" />
          <span>{comments}</span>
        </Button>
        
        <Button variant="ghost" size="sm" onClick={onShare}>
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1">
        {downloadable && (
          <Button variant="ghost" size="sm" onClick={onDownload}>
            <Download className="h-5 w-5" />
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFavorite}
          className={cn(isFav && 'text-yellow-500')}
        >
          <Bookmark className={cn('h-5 w-5', isFav && 'fill-current')} />
        </Button>
      </div>
    </div>
  );
}

