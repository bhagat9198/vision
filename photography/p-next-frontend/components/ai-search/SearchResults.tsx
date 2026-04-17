'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ImageOff, Sparkles } from 'lucide-react';
import { Photo, SearchMode } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface SearchResultsProps {
  photos: Photo[];
  query: string;
  mode: SearchMode;
  eventId: string;
  onClear: () => void;
}

const modeLabels = {
  face: 'Face Recognition',
  color: 'Color & Clothing',
  prompt: 'AI Prompt',
};

export function SearchResults({ photos, query, mode, eventId, onClear }: SearchResultsProps) {
  if (photos.length === 0) {
    return (
      <div className="text-center py-16">
        <ImageOff className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No photos found</h3>
        <p className="text-muted-foreground mb-6">
          We couldn&apos;t find any photos matching &quot;{query}&quot;
        </p>
        <Button variant="outline" onClick={onClear}>
          Try a different search
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">
              {photos.length} photos found
            </h3>
            <p className="text-sm text-muted-foreground">
              {modeLabels[mode]}: &quot;{query}&quot;
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear results
        </Button>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
        {photos.map((photo) => (
          <Link
            key={photo.id}
            href={`/event/${eventId}/photo/${photo.id}`}
            className="group relative aspect-square rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all"
          >
            <Image
              src={photo.thumbnail}
              alt={`Search result ${photo.id}`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            />
            
            {/* AI Match Badge */}
            <div className="absolute top-2 right-2">
              <div className="bg-primary/90 text-primary-foreground rounded-full p-1">
                <Sparkles className="h-3 w-3" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

