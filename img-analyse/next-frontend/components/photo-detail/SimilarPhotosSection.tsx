'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, User, Camera, Palette, Shirt } from 'lucide-react';
import { Photo } from '@/lib/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface SimilarPhotosSectionProps {
  photos: Photo[];
  reasons: Map<string, string>;
  eventId: string;
}

const reasonIcons = {
  face: User,
  scene: Camera,
  color: Palette,
  clothing: Shirt,
};

const reasonLabels = {
  face: 'Same person',
  scene: 'Similar scene',
  color: 'Similar colors',
  clothing: 'Similar outfit',
};

export function SimilarPhotosSection({ photos, reasons, eventId }: SimilarPhotosSectionProps) {
  if (photos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">AI Similar Photos</h3>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-4">
          {photos.map((photo) => {
            const reason = reasons.get(photo.id) || 'scene';
            const Icon = reasonIcons[reason as keyof typeof reasonIcons];
            const label = reasonLabels[reason as keyof typeof reasonLabels];
            
            return (
              <Link
                key={photo.id}
                href={`/event/${eventId}/photo/${photo.id}`}
                className="group shrink-0"
              >
                <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={photo.thumbnail}
                    alt={`Similar photo ${photo.id}`}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="160px"
                  />
                  
                  {/* Reason Badge */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex items-center gap-1 bg-black/70 rounded-full px-2 py-1 text-white text-xs">
                      <Icon className="h-3 w-3" />
                      <span>{label}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

