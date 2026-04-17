'use client';

import { Play } from 'lucide-react';
import { Photo } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion, Variants } from 'framer-motion';

// Check if URL is a video
const isVideoUrl = (url: string) => {
  return url?.match(/\.(mp4|mov|webm|avi|mkv)$/i) || url?.includes('/videos/');
};

import { PhotoActions } from './photo-actions';

interface MasonryViewProps {
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
      staggerChildren: 0.08,
    },
  },
};

const columnVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20,
    },
  },
};

export function MasonryView({ photos, onPhotoClick, onLike, onComment, onFavorite, onShare, isLiked, isFavorited }: MasonryViewProps) {
  const getColumns = (columnCount: number) => {
    const columns: Photo[][] = Array.from({ length: columnCount }, () => []);
    photos.forEach((photo, index) => {
      columns[index % columnCount].push(photo);
    });
    return columns;
  };

  return (
    <>
      {/* Mobile: 2 columns */}
      <motion.div
        className="flex gap-2 md:hidden"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {getColumns(2).map((column, colIndex) => (
          <motion.div key={colIndex} className="flex-1 flex flex-col gap-2" variants={columnVariants}>
            {column.map((photo) => (
              <MasonryItem
                key={photo.id}
                photo={photo}
                index={photos.findIndex((p) => p.id === photo.id)}
                onPhotoClick={onPhotoClick}
                onLike={onLike}
                onComment={onComment}
                onFavorite={onFavorite}
                onShare={onShare}
                isLiked={isLiked}
                isFavorited={isFavorited}
              />
            ))}
          </motion.div>
        ))}
      </motion.div>

      {/* Tablet: 3 columns */}
      <motion.div
        className="hidden md:flex lg:hidden gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {getColumns(3).map((column, colIndex) => (
          <motion.div key={colIndex} className="flex-1 flex flex-col gap-3" variants={columnVariants}>
            {column.map((photo) => (
              <MasonryItem
                key={photo.id}
                photo={photo}
                index={photos.findIndex((p) => p.id === photo.id)}
                onPhotoClick={onPhotoClick}
                onLike={onLike}
                onComment={onComment}
                onFavorite={onFavorite}
                onShare={onShare}
                isLiked={isLiked}
                isFavorited={isFavorited}
              />
            ))}
          </motion.div>
        ))}
      </motion.div>

      {/* Desktop: 4 columns */}
      <motion.div
        className="hidden lg:flex gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {getColumns(4).map((column, colIndex) => (
          <motion.div key={colIndex} className="flex-1 flex flex-col gap-3" variants={columnVariants}>
            {column.map((photo) => (
              <MasonryItem
                key={photo.id}
                photo={photo}
                index={photos.findIndex((p) => p.id === photo.id)}
                onPhotoClick={onPhotoClick}
                onLike={onLike}
                onComment={onComment}
                onFavorite={onFavorite}
                onShare={onShare}
                isLiked={isLiked}
                isFavorited={isFavorited}
              />
            ))}
          </motion.div>
        ))}
      </motion.div>
    </>
  );
}

interface MasonryItemProps {
  photo: Photo;
  index: number;
  onPhotoClick: (photo: Photo, index: number) => void;
  onLike: (photo: Photo) => void;
  onComment: (photo: Photo) => void;
  onFavorite: (photo: Photo) => void;
  onShare: (photo: Photo) => void;
  isLiked?: (photoId: string) => boolean;
  isFavorited?: (photoId: string) => boolean;
}

function MasonryItem({ photo, index, onPhotoClick, onLike, onComment, onFavorite, onShare, isLiked, isFavorited }: MasonryItemProps) {
  const aspectClass = photo.aspectRatio === 'portrait'
    ? 'aspect-[3/4]'
    : photo.aspectRatio === 'landscape'
      ? 'aspect-[4/3]'
      : 'aspect-square';

  const isVideo = isVideoUrl(photo.url);
  const liked = isLiked?.(photo.id) ?? false;
  const favorited = isFavorited?.(photo.id) ?? false;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, zIndex: 10 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative group cursor-pointer overflow-hidden rounded-lg bg-muted',
        aspectClass,
        'hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-shadow duration-200'
      )}
      onClick={() => onPhotoClick(photo, index)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumbnail}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
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
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
