'use client';

import { Play } from 'lucide-react';
import { Photo } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

import { PhotoActions } from './photo-actions';

interface GridViewProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  onLike: (photo: Photo) => void;
  onComment: (photo: Photo) => void;
  onFavorite: (photo: Photo) => void;
  onShare: (photo: Photo) => void;
  isLiked?: (photoId: string) => boolean;
  isFavorited?: (photoId: string) => boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

// Check if URL is a video
const isVideoUrl = (url: string) => {
  return url?.match(/\.(mp4|mov|webm|avi|mkv)$/i) || url?.includes('/videos/');
};

export function GridView({ photos, onPhotoClick, onLike, onComment, onFavorite, onShare, isLiked, isFavorited }: GridViewProps) {
  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {photos.map((photo, index) => {
        const isVideo = isVideoUrl(photo.url);
        const liked = isLiked?.(photo.id) ?? false;
        const favorited = isFavorited?.(photo.id) ?? false;
        return (
          <motion.div
            key={photo.id}
            variants={itemVariants}
            whileHover={{ scale: 1.03, zIndex: 10 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'relative aspect-square group cursor-pointer overflow-hidden rounded-lg bg-muted',
              'hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-shadow duration-200'
            )}
            onClick={() => onPhotoClick(photo, index)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.thumbnail}
              alt=""
              className="w-full h-full object-cover"
            />

            {/* Video indicator */}
            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="h-5 w-5 text-black fill-black ml-0.5" />
                </div>
              </div>
            )}

            {/* Hover Overlay - Always visible on mobile/tablet, hover on desktop */}
            <motion.div
              className="absolute inset-0 bg-black/0 flex items-end opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200"
              whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
            >
              <motion.div
                className="w-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-full p-3 flex justify-end items-center">
                  <div className="z-20 relative">
                    <PhotoActions
                      isLiked={liked}
                      isFavorited={favorited}
                      likeCount={photo.likes}
                      commentCount={photo.comments}
                      onLike={(e) => {
                        e.stopPropagation();
                        onLike(photo);
                      }}
                      onComment={(e) => {
                        e.stopPropagation();
                        onComment(photo);
                      }}
                      onFavorite={(e) => {
                        e.stopPropagation();
                        onFavorite(photo);
                      }}
                      onShare={(e) => {
                        e.stopPropagation();
                        onShare(photo);
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

