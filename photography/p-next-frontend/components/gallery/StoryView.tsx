'use client';

import { Heart, MessageCircle, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Photo } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback } from 'react';

// Check if URL is a video
const isVideoUrl = (url: string) => {
  return url?.match(/\.(mp4|mov|webm|avi|mkv)$/i) || url?.includes('/videos/');
};

interface StoryViewProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
}

export function StoryView({ photos, onPhotoClick }: StoryViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
    setProgress(0);
  }, [photos.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    setProgress(0);
  }, [photos.length]);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, goToNext]);

  const currentPhoto = photos[currentIndex];

  if (!currentPhoto) return null;

  return (
    <div className="relative h-[calc(100vh-200px)] min-h-[500px] max-h-[800px] bg-black rounded-xl overflow-hidden">
      {/* Progress Bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-3">
        {photos.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Main Image */}
      <div
        className="relative w-full h-full cursor-pointer"
        onClick={() => onPhotoClick(currentPhoto, currentIndex)}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {isVideoUrl(currentPhoto.url) ? (
          <video
            src={currentPhoto.url}
            poster={currentPhoto.thumbnail}
            className="absolute inset-0 w-full h-full object-contain"
            controls
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentPhoto.url}
            alt=""
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}
      </div>

      {/* Gradient Overlays */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

      {/* Navigation Buttons */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
        onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
      >
        <ChevronLeft className="h-8 w-8" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
        onClick={(e) => { e.stopPropagation(); goToNext(); }}
      >
        <ChevronRight className="h-8 w-8" />
      </Button>

      {/* Photo Info */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-white">
            <span className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              {currentPhoto.likes}
            </span>
            <span className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {currentPhoto.comments}
            </span>
          </div>
          <div className="text-white/70 text-sm">
            {currentIndex + 1} / {photos.length}
          </div>
        </div>
      </div>

      {/* Touch Areas for Mobile */}
      <div
        className="absolute left-0 top-0 w-1/3 h-full z-10 md:hidden"
        onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
      />
      <div
        className="absolute right-0 top-0 w-1/3 h-full z-10 md:hidden"
        onClick={(e) => { e.stopPropagation(); goToNext(); }}
      />
    </div>
  );
}

