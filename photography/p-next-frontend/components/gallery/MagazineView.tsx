'use client';

import { Heart, MessageCircle, ArrowUpRight, Play } from 'lucide-react';
import { Photo } from '@/lib/types';
import { cn } from '@/lib/utils';

// Check if URL is a video
const isVideoUrl = (url: string) => {
  return url?.match(/\.(mp4|mov|webm|avi|mkv)$/i) || url?.includes('/videos/');
};

interface MagazineViewProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
}

// Magazine layout patterns - each pattern defines how many photos and their sizes
const patterns = [
  // Pattern 1: 1 large + 2 small stacked
  { layout: 'hero-stack', count: 3 },
  // Pattern 2: 2 equal medium
  { layout: 'two-equal', count: 2 },
  // Pattern 3: 3 in a row
  { layout: 'three-row', count: 3 },
  // Pattern 4: 1 wide panoramic
  { layout: 'panoramic', count: 1 },
  // Pattern 5: 4 grid
  { layout: 'quad', count: 4 },
];

export function MagazineView({ photos, onPhotoClick }: MagazineViewProps) {
  // Split photos into sections based on patterns
  const sections: { pattern: typeof patterns[0]; photos: { photo: Photo; globalIndex: number }[] }[] = [];
  let photoIndex = 0;

  while (photoIndex < photos.length) {
    const patternIdx = sections.length % patterns.length;
    const pattern = patterns[patternIdx];
    const sectionPhotos: { photo: Photo; globalIndex: number }[] = [];

    for (let i = 0; i < pattern.count && photoIndex < photos.length; i++) {
      sectionPhotos.push({ photo: photos[photoIndex], globalIndex: photoIndex });
      photoIndex++;
    }

    if (sectionPhotos.length > 0) {
      sections.push({ pattern, photos: sectionPhotos });
    }
  }

  const PhotoCard = ({ photo, globalIndex, className, aspectClass = 'aspect-[4/3]' }: {
    photo: Photo; globalIndex: number; className?: string; aspectClass?: string
  }) => {
    const isVideo = isVideoUrl(photo.url);
    return (
      <div
        className={cn('relative group cursor-pointer overflow-hidden rounded-xl bg-muted', className)}
        onClick={() => onPhotoClick(photo, globalIndex)}
      >
        <div className={cn('relative w-full', aspectClass)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        </div>
        {/* Video indicator */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="h-6 w-6 text-black fill-black ml-0.5" />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {photo.likes}</span>
              <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {photo.comments}</span>
            </div>
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {sections.map((section, sectionIdx) => {
        const { pattern, photos: sectionPhotos } = section;

        if (pattern.layout === 'hero-stack' && sectionPhotos.length >= 2) {
          return (
            <div key={sectionIdx} className="grid md:grid-cols-2 gap-4">
              <PhotoCard photo={sectionPhotos[0].photo} globalIndex={sectionPhotos[0].globalIndex} aspectClass="aspect-square md:aspect-[3/4]" className="md:row-span-2" />
              <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                {sectionPhotos.slice(1).map((p, i) => (
                  <PhotoCard key={i} photo={p.photo} globalIndex={p.globalIndex} aspectClass="aspect-square md:aspect-[16/9]" />
                ))}
              </div>
            </div>
          );
        }

        if (pattern.layout === 'two-equal') {
          return (
            <div key={sectionIdx} className="grid md:grid-cols-2 gap-4">
              {sectionPhotos.map((p, i) => (
                <PhotoCard key={i} photo={p.photo} globalIndex={p.globalIndex} aspectClass="aspect-[4/3]" />
              ))}
            </div>
          );
        }

        if (pattern.layout === 'three-row') {
          return (
            <div key={sectionIdx} className="grid grid-cols-3 gap-4">
              {sectionPhotos.map((p, i) => (
                <PhotoCard key={i} photo={p.photo} globalIndex={p.globalIndex} aspectClass="aspect-square" />
              ))}
            </div>
          );
        }

        if (pattern.layout === 'panoramic') {
          return (
            <div key={sectionIdx}>
              <PhotoCard photo={sectionPhotos[0].photo} globalIndex={sectionPhotos[0].globalIndex} aspectClass="aspect-[21/9]" />
            </div>
          );
        }

        if (pattern.layout === 'quad') {
          return (
            <div key={sectionIdx} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {sectionPhotos.map((p, i) => (
                <PhotoCard key={i} photo={p.photo} globalIndex={p.globalIndex} aspectClass="aspect-square" />
              ))}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

