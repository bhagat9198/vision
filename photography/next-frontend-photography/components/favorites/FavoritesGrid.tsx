'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Heart, Check, ImageOff } from 'lucide-react';
import { Photo } from '@/lib/types';
import { cn } from '@/lib/utils';

interface FavoritesGridProps {
  photos: Photo[];
  eventId: string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function FavoritesGrid({
  photos,
  eventId,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
}: FavoritesGridProps) {
  const [localSelected, setLocalSelected] = useState<string[]>(selectedIds);

  const toggleSelection = (photoId: string) => {
    const newSelection = localSelected.includes(photoId)
      ? localSelected.filter((id) => id !== photoId)
      : [...localSelected, photoId];
    setLocalSelected(newSelection);
    onSelectionChange?.(newSelection);
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-16">
        <ImageOff className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
        <p className="text-muted-foreground">
          Photos you like will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
      {photos.map((photo) => {
        const isSelected = localSelected.includes(photo.id);
        
        return (
          <div key={photo.id} className="relative group">
            {selectable ? (
              <button
                onClick={() => toggleSelection(photo.id)}
                className={cn(
                  'relative aspect-square w-full rounded-lg overflow-hidden bg-muted transition-all',
                  isSelected && 'ring-2 ring-primary ring-offset-2'
                )}
              >
                <Image
                  src={photo.thumbnail}
                  alt={`Favorite photo ${photo.id}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                />
                {/* Selection Checkbox */}
                <div
                  className={cn(
                    'absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'border-white bg-black/20 group-hover:bg-black/40'
                  )}
                >
                  {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                </div>
              </button>
            ) : (
              <Link
                href={`/event/${eventId}/photo/${photo.id}`}
                className="relative aspect-square block rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all"
              >
                <Image
                  src={photo.thumbnail}
                  alt={`Favorite photo ${photo.id}`}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                />
                {/* Favorite Badge */}
                <div className="absolute top-2 right-2 bg-rose-500 text-white rounded-full p-1">
                  <Heart className="h-3 w-3 fill-current" />
                </div>
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

