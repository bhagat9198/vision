'use client';

import { Heart, MessageCircle, Star, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MouseEvent, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PhotoActionsProps {
    isLiked?: boolean;
    isFavorited?: boolean;
    likeCount?: number;
    commentCount?: number;
    onLike: (e: MouseEvent) => void;
    onComment: (e: MouseEvent) => void;
    onFavorite: (e: MouseEvent) => void;
    onShare: (e: MouseEvent) => void;
    className?: string;
}

export function PhotoActions({
    isLiked = false,
    isFavorited = false,
    likeCount = 0,
    commentCount = 0,
    onLike,
    onComment,
    onFavorite,
    onShare,
    className
}: PhotoActionsProps) {
    const [likeAnimating, setLikeAnimating] = useState(false);
    const [favAnimating, setFavAnimating] = useState(false);
    const [commentAnimating, setCommentAnimating] = useState(false);
    const [shareAnimating, setShareAnimating] = useState(false);
    const [popup, setPopup] = useState<{ text: string; type: string } | null>(null);

    const showPopup = (text: string, type: string) => {
        setPopup({ text, type });
        setTimeout(() => setPopup(null), 1000);
    };

    const handleLike = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setLikeAnimating(true);
        setTimeout(() => setLikeAnimating(false), 300);
        showPopup(isLiked ? 'Unliked' : '❤️', 'like');
        onLike(e);
    };

    const handleFavorite = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setFavAnimating(true);
        setTimeout(() => setFavAnimating(false), 300);
        showPopup(isFavorited ? 'Removed' : '⭐', 'fav');
        onFavorite(e);
    };

    const handleComment = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCommentAnimating(true);
        setTimeout(() => setCommentAnimating(false), 300);
        onComment(e);
    };

    const handleShare = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShareAnimating(true);
        setTimeout(() => setShareAnimating(false), 300);
        showPopup('📋 Copied!', 'share');
        onShare(e);
    };

    const displayLikeCount = likeCount + (isLiked ? 1 : 0);
    const displayCommentCount = commentCount;

    return (
        <div
            className={cn("flex items-center gap-1.5 pointer-events-auto cursor-auto relative", className)}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onMouseUp={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onTouchStart={(e) => { e.stopPropagation(); }}
            onTouchEnd={(e) => { e.stopPropagation(); }}
        >
            {/* Popup Effect */}
            <AnimatePresence>
                {popup && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: -30, scale: 1 }}
                        exit={{ opacity: 0, y: -50, scale: 0.8 }}
                        className="absolute left-1/2 -translate-x-1/2 top-0 z-20 pointer-events-none"
                    >
                        <div className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm whitespace-nowrap',
                            popup.type === 'like' && 'bg-rose-500/90 text-white',
                            popup.type === 'fav' && 'bg-amber-500/90 text-white',
                            popup.type === 'share' && 'bg-blue-500/90 text-white'
                        )}>
                            {popup.text}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Like Button */}
            <motion.div
                animate={likeAnimating ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.3 }}
            >
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-9 px-2.5 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 hover:text-white transition-all border border-white/10 gap-1.5",
                        isLiked && "bg-rose-500/90 text-white hover:bg-rose-600 border-transparent"
                    )}
                    onClick={handleLike}
                >
                    <Heart className={cn("h-4 w-4 transition-all", isLiked && "fill-current")} />
                    <AnimatePresence mode="wait">
                        {displayLikeCount > 0 && (
                            <motion.span
                                key={displayLikeCount}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="text-xs font-medium"
                            >
                                {displayLikeCount}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </Button>
            </motion.div>

            {/* Comment Button */}
            <motion.div
                animate={commentAnimating ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
            >
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2.5 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 hover:text-white transition-all border border-white/10 gap-1.5"
                    onClick={handleComment}
                >
                    <MessageCircle className="h-4 w-4" />
                    {displayCommentCount > 0 && (
                        <span className="text-xs font-medium">{displayCommentCount}</span>
                    )}
                </Button>
            </motion.div>

            {/* Share Button */}
            <motion.div
                animate={shareAnimating ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 hover:text-white transition-all border border-white/10"
                    onClick={handleShare}
                >
                    <Share2 className="h-4 w-4" />
                </Button>
            </motion.div>

            {/* Favorite Button */}
            <motion.div
                animate={favAnimating ? { scale: [1, 1.3, 1], rotate: [0, 15, -15, 0] } : {}}
                transition={{ duration: 0.4 }}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-9 w-9 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 hover:text-white transition-all border border-white/10",
                        isFavorited && "bg-amber-500/90 text-white hover:bg-amber-600 border-transparent"
                    )}
                    onClick={handleFavorite}
                >
                    <Star className={cn("h-4 w-4 transition-all", isFavorited && "fill-current")} />
                </Button>
            </motion.div>
        </div>
    );
}
