'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Calendar, Folder, Heart, MessageCircle, Share2, Star, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommentsSection } from '@/components/photo-detail';
import { cn } from '@/lib/utils';
import { usePhotoInteractions } from '@/lib/hooks/use-photo-interactions';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';

export default function PhotoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const photoId = params.photoId as string;
  const commentInputRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<any | null>(null);
  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);

  // Interaction hooks need to be integrated or mocked if not fully ready for API
  const { isLiked, isFavorited, toggleLike, toggleFavorite, isLoaded } = usePhotoInteractions();
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [favAnimating, setFavAnimating] = useState(false);
  const [commentAnimating, setCommentAnimating] = useState(false);
  const [shareAnimating, setShareAnimating] = useState(false);
  const [downloadAnimating, setDownloadAnimating] = useState(false);

  // Popup state for visual feedback
  const [popup, setPopup] = useState<{ text: string; type: 'like' | 'fav' | 'share' | 'download' | 'comment' } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const API_URL = 'http://localhost:4000/api/v1';

        // Fetch Event and Photo in parallel
        // Note: photo endpoint accepts eventId query param for scoped lookup
        const [eventRes, photoRes] = await Promise.all([
          fetch(`${API_URL}/events/public/${eventId}`),
          fetch(`${API_URL}/photos/${photoId}?eventId=${eventId}`)
        ]);

        const eventData = await eventRes.json();
        const photoData = await photoRes.json();

        if (eventData.success) {
          setEvent(eventData.data);
        }

        if (photoData.success) {
          setPhoto(photoData.data);
          // Assumes photoData.data includes comments, or we fetch them separately if needed.
          // Backend findById includes comments.
          setComments(photoData.data.comments || []);

          // Fetch similar photos if we have a photo ID (UUID) from the response
          // We might need a separate endpoint for similar photos using the UUID
          // For now, leave empty or implement if backend supports finding similar by displayId
        }

      } catch (err) {
        console.error('Failed to fetch photo details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId, photoId]);

  // Focus comment input on mount
  useEffect(() => {
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 300);
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black"><p className="text-zinc-400">Loading...</p></div>;
  }

  if (!photo || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-zinc-400">Photo not found</p>
      </div>
    );
  }

  // We use photo.id (UUID) for interactions because the hook likely expects UUIDs
  const liked = isLoaded && isLiked(photo.id);
  const favorited = isLoaded && isFavorited(photo.id);

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const showPopup = (text: string, type: 'like' | 'fav' | 'share' | 'download' | 'comment') => {
    setPopup({ text, type });
    setTimeout(() => setPopup(null), 1200);
  };

  const handleLike = () => {
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 300);
    toggleLike(photo.id, (event as any).id, photo.thumbnail, photo.url);
    showPopup(liked ? 'Unliked' : '❤️ Liked!', 'like');
  };

  const handleFavorite = () => {
    setFavAnimating(true);
    setTimeout(() => setFavAnimating(false), 400);
    toggleFavorite(photo.id, (event as any).id, photo.thumbnail, photo.url);
    showPopup(favorited ? 'Removed' : '⭐ Saved!', 'fav');
  };

  const handleShare = () => {
    setShareAnimating(true);
    setTimeout(() => setShareAnimating(false), 300);
    const photoUrl = `${window.location.origin}/event/${eventId}/photo/${photoId}`;
    navigator.clipboard.writeText(photoUrl);
    showPopup('📋 Link copied!', 'share');
  };

  const handleDownload = () => {
    setDownloadAnimating(true);
    setTimeout(() => setDownloadAnimating(false), 300);
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = `photo-${photo.displayId}.jpg`;
    link.click();
    showPopup('⬇️ Downloading...', 'download');
  };

  const handleCommentClick = () => {
    setCommentAnimating(true);
    setTimeout(() => setCommentAnimating(false), 300);
    commentInputRef.current?.focus();
  };

  // Mock album and similar photos references were removed as we need real data or simplified view
  // For now displaying what we have.
  const albumName = photo.album?.name;

  // Use real counts from photo object
  const displayLikeCount = (photo._count?.likes || 0) + (liked ? 1 : 0);
  // comments count from array length
  const displayCommentsCount = comments.length;

  // Helper for absolute image URLs
  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `http://localhost:4000${url.startsWith('/') ? '' : '/'}${url}`;
  };


  const handleAddComment = async (text: string) => {
    try {
      const API_URL = 'http://localhost:4000/api/v1';
      // Use existing user info if available, otherwise default to Guest
      // In a real app we might prompt for name
      const userName = (event as any).photographer?.name || 'Guest User';

      const res = await fetch(`${API_URL}/comments/photo/${photo.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          userName, // Matches Zod schema in comment.dto.ts
          // userAvatar: ..., // Optional
          // userEmail: ... // Optional
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Optimistically add to list or re-fetch
        // For simplicity, let's append the new comment with current time
        const newCommentObj = {
          id: data.data.id || Math.random().toString(),
          text,
          userName,
          userAvatar: null,
          createdAt: new Date().toISOString(), // Backend return createdAt, we can use that or now
          timestamp: new Date().toISOString() // Component uses timestamp or createdAt? Component uses 'timestamp' in formatTimestamp but checks... 
          // Wait, CommentsSection map uses: comment.timestamp for formatTimestamp.
          // Let's check backend response.
        };

        // Actually best to re-fetch or use returned data
        // The backend returns the created comment in data.data
        if (data.data) {
          // Mapping backend response to UI comment shape if needed
          // Backend Comment model: id, text, userName, userAvatar, userEmail, photoId, createdAt
          // UI Comment type? Let's assume it matches closely but let's check CommentsSection again.
          // CommentsSection uses: id, userAvatar, userName, timestamp, text
          // We'll adapt it.
          const created = data.data;
          setComments([...comments, { ...created, timestamp: created.createdAt }]);
        }

        showPopup('Comment added!', 'comment');
      } else {
        console.error('Failed to add comment');
        showPopup('Failed to add comment', 'comment');
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      showPopup('Error adding comment', 'comment');
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Facebook-style overlay header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="text-white hover:bg-white/20 rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="font-semibold text-white truncate">{event.name}</h1>
                {albumName && (
                  <p className="text-sm text-zinc-400 flex items-center gap-1">
                    <Folder className="h-3 w-3" />
                    {albumName}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="text-white hover:bg-white/20 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Facebook style layout */}
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Photo Section - Full height on desktop */}
        <div className="flex-1 relative flex items-center justify-center bg-black pt-16 lg:pt-0">
          <div className="relative w-full h-[50vh] lg:h-screen">
            <Image
              src={getImageUrl(photo.url)}
              alt={`Photo ${photo.displayId}`}
              fill
              className="object-contain"
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
          </div>
        </div>

        {/* Sidebar - Comments & Actions */}
        <div className="w-full lg:w-[400px] bg-white dark:bg-zinc-900 flex flex-col max-h-screen lg:h-screen overflow-hidden">
          {/* Header with event info */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 hidden lg:block">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-semibold">
                {event.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-white">{event.name}</p>
                {photo.createdAt && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatTimestamp(photo.createdAt)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 relative">
            {/* Popup Effect */}
            <AnimatePresence>
              {popup && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.8 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
                >
                  <div className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium shadow-lg backdrop-blur-sm',
                    popup.type === 'like' && 'bg-rose-500/90 text-white',
                    popup.type === 'fav' && 'bg-amber-500/90 text-white',
                    popup.type === 'share' && 'bg-blue-500/90 text-white',
                    popup.type === 'download' && 'bg-green-500/90 text-white',
                    popup.type === 'comment' && 'bg-zinc-700/90 text-white'
                  )}>
                    {popup.text}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {/* Like Button */}
                <motion.div animate={likeAnimating ? { scale: [1, 1.3, 1] } : {}}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
                    className={cn(
                      'gap-2 rounded-full transition-colors',
                      liked && 'text-rose-500 hover:text-rose-600'
                    )}
                  >
                    <Heart className={cn('h-5 w-5', liked && 'fill-current')} />
                    <AnimatePresence mode="wait">
                      {displayLikeCount > 0 && (
                        <motion.span
                          key={displayLikeCount}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                        >
                          {displayLikeCount}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>

                {/* Comment Button */}
                <motion.div animate={commentAnimating ? { scale: [1, 1.2, 1] } : {}}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCommentClick}
                    className="gap-2 rounded-full"
                  >
                    <MessageCircle className="h-5 w-5" />
                    {displayCommentsCount > 0 && <span>{displayCommentsCount}</span>}
                  </Button>
                </motion.div>

                {/* Share Button */}
                <motion.div animate={shareAnimating ? { scale: [1, 1.2, 1] } : {}}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleShare}
                    className="rounded-full"
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                </motion.div>
              </div>

              <div className="flex items-center gap-1">
                {/* Download Button */}
                {photo.downloadable && (
                  <motion.div animate={downloadAnimating ? { scale: [1, 1.2, 1] } : {}}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDownload}
                      className="rounded-full"
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                  </motion.div>
                )}

                {/* Favorite Button */}
                <motion.div animate={favAnimating ? { scale: [1, 1.3, 1], rotate: [0, 15, -15, 0] } : {}}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFavorite}
                    className={cn(
                      'rounded-full transition-colors',
                      favorited && 'text-amber-500 hover:text-amber-600'
                    )}
                  >
                    <Star className={cn('h-5 w-5', favorited && 'fill-current')} />
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
            {/* We omit sections that require data we haven't fetched yet like PersonTags or SimilarPhotos unless backend provides them in findById response */}
            {/* Backend findById response DOES NOT currently include personTags or similar photos. 
                 It includes comments.
                 If we need those sections, we should update backend or fetch them here.
                 For now, suppressing them to match 'getPhotoById' mock implementation or lack thereof.
             */}

            {/* Comments */}
            <div className="p-4">
              <CommentsSection comments={comments} onAddComment={handleAddComment} commentInputRef={commentInputRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

