'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Photo } from '@/lib/types';
import { PhotoActions } from './photo-actions';
import { X, Send, MessageCircle, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2, Info, Play, Pause, Camera, Calendar, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Reaction types
const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like', color: 'text-blue-500' },
  { type: 'love', emoji: '❤️', label: 'Love', color: 'text-red-500' },
  { type: 'haha', emoji: '😂', label: 'Haha', color: 'text-amber-500' },
  { type: 'wow', emoji: '😮', label: 'Wow', color: 'text-amber-500' },
  { type: 'sad', emoji: '😢', label: 'Sad', color: 'text-amber-500' },
  { type: 'angry', emoji: '😠', label: 'Angry', color: 'text-orange-500' },
];

interface FullscreenViewerProps {
  photos: Photo[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  eventId?: string;
  onLike?: (photo: Photo) => void;
  onComment?: (photo: Photo) => void;
  onFavorite?: (photo: Photo) => void;
  onShare?: (photo: Photo) => void;
  isLiked?: (photoId: string) => boolean;
  isFavorited?: (photoId: string) => boolean;
}

// Check if URL is a video
const isVideoUrl = (url: string) => {
  return url?.match(/\.(mp4|mov|webm|avi|mkv)$/i) || url?.includes('/videos/');
};

export function FullscreenViewer({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onIndexChange,
  eventId,
  onLike,
  onFavorite,
  onShare,
  isLiked,
  isFavorited,
}: FullscreenViewerProps) {
  const [showCommentSidebar, setShowCommentSidebar] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [commentReactions, setCommentReactions] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [isSlideshow, setIsSlideshow] = useState(false);
  const slideshowIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPhoto = photos[currentIndex];

  // Slideshow effect
  useEffect(() => {
    if (isSlideshow && photos.length > 1) {
      slideshowIntervalRef.current = setInterval(() => {
        setSlideDirection('right');
        onIndexChange(currentIndex >= photos.length - 1 ? 0 : currentIndex + 1);
      }, 3000); // 3 seconds per photo
    }
    return () => {
      if (slideshowIntervalRef.current) {
        clearInterval(slideshowIntervalRef.current);
      }
    };
  }, [isSlideshow, currentIndex, photos.length, onIndexChange]);

  // Stop slideshow when viewer closes
  useEffect(() => {
    if (!isOpen) {
      setIsSlideshow(false);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        if (showCommentSidebar) {
          setShowCommentSidebar(false);
        } else {
          onClose();
        }
        break;
      case 'ArrowLeft':
        if (currentIndex > 0) {
          setSlideDirection('left');
          onIndexChange(currentIndex - 1);
          setZoom(1);
        }
        break;
      case 'ArrowRight':
        if (currentIndex < photos.length - 1) {
          setSlideDirection('right');
          onIndexChange(currentIndex + 1);
          setZoom(1);
        }
        break;
      case '+':
      case '=':
        setZoom(prev => Math.min(prev + 0.5, 3));
        break;
      case '-':
        setZoom(prev => Math.max(prev - 0.5, 1));
        break;
    }
  }, [isOpen, currentIndex, photos.length, onClose, onIndexChange, showCommentSidebar]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Fetch comments when sidebar opens
  useEffect(() => {
    if (showCommentSidebar && currentPhoto) {
      fetchComments();
    }
  }, [showCommentSidebar, currentPhoto?.id]);

  // Reset zoom when photo changes
  useEffect(() => {
    setZoom(1);
  }, [currentIndex]);

  const fetchComments = async () => {
    if (!currentPhoto) return;
    setLoadingComments(true);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/photos/${currentPhoto.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentPhoto || submittingComment) return;
    setSubmittingComment(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('photographerToken');
      console.log('Submitting comment:', { photoId: currentPhoto.id, content: newComment, token: !!token });
      const res = await fetch(`http://localhost:4000/api/v1/photos/${currentPhoto.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment }),
      });
      const data = await res.json();
      console.log('Comment response:', { status: res.status, ok: res.ok, data });
      if (res.ok) {
        setNewComment('');
        fetchComments();
      } else {
        console.error('Failed to submit comment:', data);
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCommentClick = () => {
    setShowCommentSidebar(true);
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setSlideDirection('left');
      onIndexChange(currentIndex - 1);
      setZoom(1);
    }
  };

  const goToNext = () => {
    if (currentIndex < photos.length - 1) {
      setSlideDirection('right');
      onIndexChange(currentIndex + 1);
      setZoom(1);
    }
  };

  const handleThumbnailClick = (index: number) => {
    if (index !== currentIndex) {
      setSlideDirection(index > currentIndex ? 'right' : 'left');
      onIndexChange(index);
      setZoom(1);
    }
  };

  const handleReaction = (commentId: string, reactionType: string) => {
    setCommentReactions(prev => ({
      ...prev,
      [commentId]: prev[commentId] === reactionType ? '' : reactionType
    }));
    setShowReactionPicker(null);
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(replyingTo === commentId ? null : commentId);
    setReplyText('');
    setTimeout(() => replyInputRef.current?.focus(), 100);
  };

  const submitReply = async (parentCommentId: string) => {
    if (!replyText.trim() || !currentPhoto) return;
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('photographerToken');
      const res = await fetch(`http://localhost:4000/api/v1/photos/${currentPhoto.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: replyText, parentId: parentCommentId }),
      });
      if (res.ok) {
        setReplyText('');
        setReplyingTo(null);
        fetchComments();
      }
    } catch (error) {
      console.error('Failed to submit reply:', error);
    }
  };

  // Slide animation variants
  const slideVariants = {
    enter: (direction: 'left' | 'right') => ({
      x: direction === 'right' ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: 'left' | 'right') => ({
      x: direction === 'right' ? -300 : 300,
      opacity: 0,
    }),
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const isVideo = isVideoUrl(currentPhoto?.url);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[99999] bg-black/95 flex flex-col"
          onClick={handleBackdropClick}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-4">
              <span className="text-white/80 text-sm">
                {currentIndex + 1} / {photos.length}
              </span>
              {/* Slideshow Toggle */}
              <button
                onClick={() => setIsSlideshow(prev => !prev)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all",
                  isSlideshow
                    ? "bg-amber-500 text-white"
                    : "bg-white/10 text-white hover:bg-white/20"
                )}
                title={isSlideshow ? "Stop Slideshow" : "Start Slideshow"}
              >
                {isSlideshow ? (
                  <>
                    <Pause className="h-4 w-4" />
                    <span className="text-xs font-medium">Stop</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span className="text-xs font-medium">Slideshow</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex items-center gap-2">
              {/* Info Button */}
              <button
                onClick={() => setShowInfoPanel(prev => !prev)}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  showInfoPanel ? "bg-amber-500 text-white" : "hover:bg-white/10"
                )}
                title="Photo Info"
              >
                <Info className="h-5 w-5 text-white" />
              </button>
              {/* Zoom Controls */}
              <button
                onClick={() => setZoom(prev => Math.max(prev - 0.5, 1))}
                disabled={zoom <= 1}
                className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ZoomOut className="h-5 w-5 text-white" />
              </button>
              <span className="text-white/80 text-sm min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(prev => Math.min(prev + 0.5, 3))}
                disabled={zoom >= 3}
                className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ZoomIn className="h-5 w-5 text-white" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-5 w-5 text-white" />
                ) : (
                  <Maximize2 className="h-5 w-5 text-white" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            {/* Left Navigation */}
            <button
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className="absolute left-4 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-8 w-8 text-white" />
            </button>

            {/* Image/Video with slide animation */}
            <AnimatePresence mode="wait" custom={slideDirection}>
              <motion.div
                key={currentIndex}
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="max-h-full max-w-full overflow-auto"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              >
                {isVideo ? (
                  <video
                    src={currentPhoto?.url}
                    poster={currentPhoto?.thumbnail}
                    controls
                    autoPlay
                    className="max-h-[calc(100vh-200px)] max-w-full object-contain"
                  />
                ) : (
                  <img
                    src={currentPhoto?.url}
                    alt={`Photo ${currentIndex + 1}`}
                    className="max-h-[calc(100vh-200px)] max-w-full object-contain"
                    draggable={false}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Right Navigation */}
            <button
              onClick={goToNext}
              disabled={currentIndex === photos.length - 1}
              className="absolute right-4 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-8 w-8 text-white" />
            </button>

            {/* Action Buttons */}
            <div className="absolute bottom-4 right-4 z-10">
              <div className="bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 text-white shadow-lg border border-white/10">
                <PhotoActions
                  isLiked={isLiked?.(currentPhoto?.id) ?? false}
                  isFavorited={isFavorited?.(currentPhoto?.id) ?? false}
                  likeCount={currentPhoto?.likes || 0}
                  commentCount={currentPhoto?.comments || 0}
                  onLike={() => {
                    if (currentPhoto) onLike?.(currentPhoto);
                  }}
                  onComment={() => {
                    handleCommentClick();
                  }}
                  onFavorite={() => {
                    if (currentPhoto) onFavorite?.(currentPhoto);
                  }}
                  onShare={() => {
                    if (currentPhoto) onShare?.(currentPhoto);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Thumbnail Strip */}
          <div className="bg-black/80 p-3 overflow-x-auto">
            <div className="flex gap-2 justify-center min-w-max">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => handleThumbnailClick(index)}
                  className={cn(
                    "w-16 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0",
                    index === currentIndex
                      ? "border-amber-500 scale-110"
                      : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <img
                    src={photo.thumbnail}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Info Panel */}
          <AnimatePresence>
            {showInfoPanel && currentPhoto && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed top-0 right-0 h-full w-[360px] bg-zinc-900 z-[100000] border-l border-zinc-800 flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                      <Info className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Photo Details</h3>
                      <span className="text-sm text-zinc-400">Information</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowInfoPanel(false)}
                    className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-zinc-400" />
                  </button>
                </div>

                {/* Info Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  {/* Preview Image */}
                  <div className="aspect-video rounded-xl overflow-hidden bg-zinc-800">
                    <img
                      src={currentPhoto.thumbnail || currentPhoto.url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Photo Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-zinc-300">
                      <ImageIcon className="h-5 w-5 text-purple-400" />
                      <div>
                        <p className="text-xs text-zinc-500">Photo ID</p>
                        <p className="text-sm font-medium">#{currentPhoto.displayId || currentPhoto.id.slice(0, 8)}</p>
                      </div>
                    </div>

                    {currentPhoto.timestamp && (
                      <div className="flex items-center gap-3 text-zinc-300">
                        <Calendar className="h-5 w-5 text-blue-400" />
                        <div>
                          <p className="text-xs text-zinc-500">Date Taken</p>
                          <p className="text-sm font-medium">
                            {new Date(currentPhoto.timestamp).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-zinc-300">
                      <Camera className="h-5 w-5 text-amber-400" />
                      <div>
                        <p className="text-xs text-zinc-500">Aspect Ratio</p>
                        <p className="text-sm font-medium capitalize">{currentPhoto.aspectRatio || 'Unknown'}</p>
                      </div>
                    </div>

                    {eventId && (
                      <div className="flex items-center gap-3 text-zinc-300">
                        <ImageIcon className="h-5 w-5 text-green-400" />
                        <div>
                          <p className="text-xs text-zinc-500">Event</p>
                          <p className="text-sm font-medium">Event #{eventId.slice(0, 8)}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Engagement Stats */}
                  <div className="pt-4 border-t border-zinc-800">
                    <h4 className="text-sm font-semibold text-white mb-3">Engagement</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-zinc-800 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-red-400">{currentPhoto.likes || 0}</p>
                        <p className="text-xs text-zinc-500">Likes</p>
                      </div>
                      <div className="bg-zinc-800 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-blue-400">{currentPhoto.comments || 0}</p>
                        <p className="text-xs text-zinc-500">Comments</p>
                      </div>
                    </div>
                  </div>

                  {/* Download Info */}
                  {currentPhoto.downloadable !== false && (
                    <div className="pt-4 border-t border-zinc-800">
                      <div className="flex items-center gap-2 text-green-400">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        <span className="text-sm">Available for download</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Comment Sidebar - Facebook Style */}
          <AnimatePresence>
            {showCommentSidebar && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed top-0 right-0 h-full w-[420px] bg-zinc-900 z-[100000] border-l border-zinc-800 flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Comments</h3>
                      <span className="text-sm text-zinc-400">{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCommentSidebar(false)}
                    className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-zinc-400" />
                  </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto">
                  {loadingComments ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-12 px-6">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                        <MessageCircle className="h-8 w-8 text-zinc-600" />
                      </div>
                      <p className="text-white font-medium mb-1">No comments yet</p>
                      <p className="text-sm text-zinc-500">Be the first to share what you think!</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-1">
                      {comments.map((comment: any) => (
                        <div key={comment.id} className="group">
                          {/* Main Comment */}
                          <div className="flex gap-3 p-2 rounded-xl hover:bg-zinc-800/50 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-semibold shrink-0 shadow-lg">
                              {comment.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* Comment Bubble */}
                              <div className="bg-zinc-800 rounded-2xl px-4 py-2.5 inline-block max-w-full">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-white text-sm font-semibold">
                                    {comment.user?.name || 'Anonymous'}
                                  </span>
                                </div>
                                <p className="text-zinc-200 text-sm leading-relaxed break-words">{comment.content}</p>
                              </div>

                              {/* Action Row */}
                              <div className="flex items-center gap-4 mt-1.5 ml-2">
                                <span className="text-xs text-zinc-500">
                                  {new Date(comment.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                  })}
                                </span>

                                {/* Reaction Button with Picker */}
                                <div className="relative">
                                  <button
                                    onClick={() => setShowReactionPicker(showReactionPicker === comment.id ? null : comment.id)}
                                    className={cn(
                                      "text-xs font-semibold transition-colors",
                                      commentReactions[comment.id]
                                        ? REACTIONS.find(r => r.type === commentReactions[comment.id])?.color || 'text-blue-500'
                                        : "text-zinc-400 hover:text-zinc-200"
                                    )}
                                  >
                                    {commentReactions[comment.id]
                                      ? REACTIONS.find(r => r.type === commentReactions[comment.id])?.emoji + ' ' + REACTIONS.find(r => r.type === commentReactions[comment.id])?.label
                                      : 'Like'}
                                  </button>

                                  {/* Reaction Picker Popup */}
                                  <AnimatePresence>
                                    {showReactionPicker === comment.id && (
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute bottom-full left-0 mb-2 bg-zinc-800 rounded-full px-2 py-1.5 shadow-xl border border-zinc-700 flex gap-1 z-50"
                                      >
                                        {REACTIONS.map((reaction) => (
                                          <button
                                            key={reaction.type}
                                            onClick={() => handleReaction(comment.id, reaction.type)}
                                            className="text-xl hover:scale-125 transition-transform p-1"
                                            title={reaction.label}
                                          >
                                            {reaction.emoji}
                                          </button>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* Reply Button */}
                                <button
                                  onClick={() => handleReply(comment.id)}
                                  className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                                >
                                  Reply
                                </button>
                              </div>

                              {/* Reply Input */}
                              <AnimatePresence>
                                {replyingTo === comment.id && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-3 ml-2 flex gap-2"
                                  >
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                                      Y
                                    </div>
                                    <div className="flex-1 flex gap-2">
                                      <input
                                        ref={replyInputRef}
                                        type="text"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            submitReply(comment.id);
                                          }
                                          if (e.key === 'Escape') {
                                            setReplyingTo(null);
                                            setReplyText('');
                                          }
                                        }}
                                        placeholder={`Reply to ${comment.user?.name || 'Anonymous'}...`}
                                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-full px-4 py-2 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                      />
                                      <button
                                        onClick={() => submitReply(comment.id)}
                                        disabled={!replyText.trim()}
                                        className={cn(
                                          "p-2 rounded-full transition-colors shrink-0",
                                          replyText.trim()
                                            ? "bg-blue-500 text-white hover:bg-blue-600"
                                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                        )}
                                      >
                                        <Send className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* Nested Replies (if any) */}
                              {comment.replies && comment.replies.length > 0 && (
                                <div className="mt-3 ml-2 space-y-2 border-l-2 border-zinc-700 pl-3">
                                  {comment.replies.map((reply: any) => (
                                    <div key={reply.id} className="flex gap-2">
                                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                                        {reply.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                      </div>
                                      <div className="flex-1">
                                        <div className="bg-zinc-800 rounded-2xl px-3 py-2 inline-block">
                                          <span className="text-white text-xs font-semibold">{reply.user?.name || 'Anonymous'}</span>
                                          <p className="text-zinc-300 text-xs">{reply.content}</p>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 ml-1">
                                          <span className="text-xs text-zinc-500">
                                            {new Date(reply.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                          </span>
                                          <button className="text-xs text-zinc-400 hover:text-zinc-200">Like</button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comment Input - Facebook Style */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-sm">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shrink-0 shadow-lg">
                      Y
                    </div>
                    <div className="flex-1 flex gap-2">
                      <input
                        ref={commentInputRef}
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmitComment();
                          }
                        }}
                        placeholder="Write a comment..."
                        disabled={submittingComment}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-full px-4 py-3 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50"
                      />
                      <button
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim() || submittingComment}
                        className={cn(
                          "p-3 rounded-full transition-all duration-200 shrink-0",
                          newComment.trim() && !submittingComment
                            ? "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/25"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        )}
                      >
                        {submittingComment ? (
                          <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
