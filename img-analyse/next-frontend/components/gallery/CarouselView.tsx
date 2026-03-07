'use client';

import { Heart, MessageCircle, ChevronLeft, ChevronRight, Maximize2, Play } from 'lucide-react';
import { Photo } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Check if URL is a video
const isVideoUrl = (url: string) => {
  return url?.match(/\.(mp4|mov|webm|avi|mkv)$/i) || url?.includes('/videos/');
};

interface CarouselViewProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
}

export function CarouselView({ photos, onPhotoClick }: CarouselViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const getVisibleIndices = () => {
    const prev2 = (currentIndex - 2 + photos.length) % photos.length;
    const prev1 = (currentIndex - 1 + photos.length) % photos.length;
    const next1 = (currentIndex + 1) % photos.length;
    const next2 = (currentIndex + 2) % photos.length;
    return [prev2, prev1, currentIndex, next1, next2];
  };

  const goNext = () => setCurrentIndex((prev) => (prev + 1) % photos.length);
  const goPrev = () => setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);

  const visibleIndices = getVisibleIndices();
  const currentPhoto = photos[currentIndex];

  if (!currentPhoto) return null;

  return (
    <motion.div
      className="relative py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* 3D Carousel Container */}
      <div className="relative h-[500px] md:h-[600px] flex items-center justify-center perspective-[1200px]">
        <AnimatePresence mode="popLayout">
          {visibleIndices.map((photoIndex, position) => {
            const photo = photos[photoIndex];
            const offset = position - 2;
            const isCenter = offset === 0;
            const absOffset = Math.abs(offset);

            const translateX = offset * 200;
            const translateZ = isCenter ? 0 : -200 - absOffset * 100;
            const rotateY = offset * -15;
            const scale = isCenter ? 1 : 0.7 - absOffset * 0.1;
            const opacity = isCenter ? 1 : 0.5 - absOffset * 0.15;
            const zIndex = 10 - absOffset;

            return (
              <motion.div
                key={`${photoIndex}-${position}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  x: translateX,
                  z: translateZ,
                  rotateY,
                  scale,
                  opacity,
                  zIndex,
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                }}
                whileHover={isCenter ? { scale: 1.05 } : {}}
                className={cn(
                  'absolute cursor-pointer',
                  isCenter && 'z-20'
                )}
                style={{ transformStyle: 'preserve-3d' }}
                onClick={() => isCenter ? onPhotoClick(photo, photoIndex) : setCurrentIndex(photoIndex)}
              >
                <motion.div
                  className={cn(
                    'relative w-[300px] md:w-[400px] aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl',
                    isCenter && 'ring-4 ring-white/30'
                  )}
                  whileHover={isCenter ? { boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' } : {}}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumbnail}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Video indicator */}
                  {isVideoUrl(photo.url) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                        <Play className="h-6 w-6 text-black fill-black ml-0.5" />
                      </div>
                    </div>
                  )}
                  {isCenter && (
                    <>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      />
                      <motion.div
                        className="absolute top-4 right-4"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Maximize2 className="h-5 w-5 text-white/80" />
                      </motion.div>
                      <motion.div
                        className="absolute bottom-4 left-4 right-4 text-white"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1 text-sm">
                            <Heart className="h-4 w-4" /> {photo.likes}
                          </span>
                          <span className="flex items-center gap-1 text-sm">
                            <MessageCircle className="h-4 w-4" /> {photo.comments}
                          </span>
                        </div>
                      </motion.div>
                    </>
                  )}
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <motion.div
        className="flex items-center justify-center gap-4 mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Button variant="outline" size="icon" onClick={goPrev} className="rounded-full">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          {photos.slice(0, Math.min(photos.length, 10)).map((_, index) => (
            <motion.button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'h-2 rounded-full transition-colors',
                index === currentIndex ? 'bg-primary' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
              animate={{ width: index === currentIndex ? 24 : 8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            />
          ))}
          {photos.length > 10 && <span className="text-muted-foreground text-sm">+{photos.length - 10}</span>}
        </div>
        <Button variant="outline" size="icon" onClick={goNext} className="rounded-full">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </motion.div>

      {/* Counter */}
      <motion.p
        className="text-center text-muted-foreground mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {currentIndex + 1} of {photos.length}
      </motion.p>
    </motion.div>
  );
}

