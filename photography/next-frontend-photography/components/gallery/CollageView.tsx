'use client';

import { Heart, MessageCircle, Play } from 'lucide-react';
import { Photo } from '@/lib/types';
import { useMemo } from 'react';
import { motion } from 'framer-motion';

// Check if URL is a video
const isVideoUrl = (url: string) => {
  return url?.match(/\.(mp4|mov|webm|avi|mkv)$/i) || url?.includes('/videos/');
};

interface CollageViewProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
}

// Generate random-ish but consistent positions based on index
function getPhotoStyle(index: number) {
  const row = Math.floor(index / 3);
  const col = index % 3;

  const baseTop = row * 30 + (index % 2) * 5;
  const baseLeft = col * 32 + (index % 3) * 2;

  const rotations = [-6, 4, -3, 5, -4, 3, -5, 4, -2, 6];
  const rotate = rotations[index % rotations.length];

  return {
    top: `${Math.min(baseTop, 70)}%`,
    left: `${Math.min(baseLeft, 65)}%`,
    width: '35%',
    rotate,
    zIndex: (index % 5) + 1,
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const photoVariants = {
  hidden: (rotate: number) => ({
    opacity: 0,
    scale: 0.5,
    rotate: rotate - 20,
    y: 100,
  }),
  visible: (rotate: number) => ({
    opacity: 1,
    scale: 1,
    rotate,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 15,
    },
  }),
};

export function CollageView({ photos, onPhotoClick }: CollageViewProps) {
  const photoStyles = useMemo(() => {
    return photos.map((_, index) => getPhotoStyle(index));
  }, [photos.length]);

  return (
    <motion.div
      className="relative min-h-[800px] md:min-h-[1000px] bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-900 dark:to-stone-800 rounded-2xl p-8 overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Background texture */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      {/* Scattered Photos */}
      {photos.map((photo, index) => {
        const style = photoStyles[index];

        return (
          <motion.div
            key={photo.id}
            custom={style.rotate}
            variants={photoVariants}
            whileHover={{ scale: 1.15, zIndex: 50, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}
            whileTap={{ scale: 1.1 }}
            className="absolute cursor-pointer"
            style={{
              top: style.top,
              left: style.left,
              width: style.width,
              zIndex: style.zIndex,
            }}
            onClick={() => onPhotoClick(photo, index)}
          >
            {/* Photo with Polaroid-style frame */}
            <motion.div
              className="bg-white dark:bg-stone-800 p-2 pb-8 rounded shadow-xl"
              whileHover={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)' }}
            >
              <div className="relative aspect-square overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumbnail}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Video indicator */}
                {isVideoUrl(photo.url) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="h-4 w-4 text-black fill-black ml-0.5" />
                    </div>
                  </div>
                )}
              </div>

              {/* Polaroid bottom with engagement */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" /> {photo.likes}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" /> {photo.comments}
                </span>
              </div>

              {/* Tape decoration - random position */}
              {index % 3 === 0 && (
                <motion.div
                  className="absolute -top-2 left-1/4 w-12 h-4 bg-amber-200/80 dark:bg-amber-600/40 rotate-12 shadow-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                />
              )}
              {index % 3 === 1 && (
                <motion.div
                  className="absolute -top-2 right-1/4 w-12 h-4 bg-sky-200/80 dark:bg-sky-600/40 -rotate-12 shadow-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                />
              )}
              {index % 3 === 2 && (
                <motion.div
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-4 bg-pink-200/80 dark:bg-pink-600/40 shadow-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                />
              )}
            </motion.div>
          </motion.div>
        );
      })}

      {/* Decorative elements */}
      <motion.div
        className="absolute bottom-4 right-4 text-muted-foreground/50 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {photos.length} memories
      </motion.div>
    </motion.div>
  );
}

