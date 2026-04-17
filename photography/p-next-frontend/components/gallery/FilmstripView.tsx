'use client';

import { Heart, MessageCircle, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Photo } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Check if URL is a video
const isVideoUrl = (url: string) => {
  return url?.match(/\.(mp4|mov|webm|avi|mkv)$/i) || url?.includes('/videos/');
};

interface FilmstripViewProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
}

export function FilmstripView({ photos, onPhotoClick }: FilmstripViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const filmstripRef = useRef<HTMLDivElement>(null);

  const currentPhoto = photos[currentIndex];

  // Auto-play slideshow
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isPlaying, photos.length]);

  // Scroll filmstrip to keep current thumb visible
  useEffect(() => {
    if (filmstripRef.current) {
      const thumb = filmstripRef.current.children[currentIndex] as HTMLElement;
      if (thumb) {
        thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex]);

  const goTo = (index: number) => setCurrentIndex(index);
  const goNext = () => setCurrentIndex((prev) => (prev + 1) % photos.length);
  const goPrev = () => setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);

  if (!currentPhoto) return null;

  return (
    <div className="space-y-4">
      {/* Main Display - Cinema Style */}
      <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl">
        {/* Film Sprocket Holes Decoration */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-zinc-900 flex flex-col justify-around items-center z-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-4 h-6 bg-black rounded-sm" />
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-zinc-900 flex flex-col justify-around items-center z-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-4 h-6 bg-black rounded-sm" />
          ))}
        </div>

        {/* Main Image */}
        <div
          className="relative aspect-[16/9] mx-8 cursor-pointer"
          onClick={() => onPhotoClick(currentPhoto, currentIndex)}
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

          {/* Vignette Effect */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-0 left-8 right-8 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-white">
              <Button variant="ghost" size="icon" onClick={goPrev} className="text-white hover:bg-white/20">
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)} className="text-white hover:bg-white/20">
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={goNext} className="text-white hover:bg-white/20">
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>
            <div className="flex items-center gap-4 text-white text-sm">
              <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {currentPhoto.likes}</span>
              <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {currentPhoto.comments}</span>
              <span className="text-white/60 font-mono">{String(currentIndex + 1).padStart(3, '0')} / {String(photos.length).padStart(3, '0')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filmstrip Thumbnails */}
      <div className="relative bg-zinc-900 rounded-xl p-3 overflow-hidden">
        {/* Gradient Edges */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-zinc-900 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-zinc-900 to-transparent z-10 pointer-events-none" />

        {/* Scrollable Filmstrip */}
        <div ref={filmstripRef} className="flex gap-2 overflow-x-auto scrollbar-hide py-1 px-8">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              onClick={() => goTo(index)}
              className={cn(
                'relative shrink-0 w-24 h-16 rounded cursor-pointer overflow-hidden transition-all duration-200',
                index === currentIndex
                  ? 'ring-2 ring-white scale-110 z-10'
                  : 'opacity-60 hover:opacity-100'
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" />
              {/* Film frame number */}
              <div className="absolute bottom-0 right-0 bg-black/80 text-white text-[10px] px-1 font-mono">
                {String(index + 1).padStart(2, '0')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

