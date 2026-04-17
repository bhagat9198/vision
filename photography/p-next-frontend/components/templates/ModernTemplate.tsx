'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, ImageIcon, Grid3X3, Search, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Event, Photographer } from '@/lib/types';

interface ModernTemplateProps {
  event: Event;
  photographer: Photographer;
}

export function ModernLanding({ event, photographer }: ModernTemplateProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Full-screen Hero */}
      <div className="relative h-screen w-full">
        <Image src={event.coverPhoto} alt={event.name} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
          <div className="max-w-5xl mx-auto">
            <p className="text-white/70 uppercase tracking-[0.3em] text-sm mb-4">Gallery</p>
            <h1 className="text-4xl md:text-7xl font-light text-white mb-6 tracking-tight">
              {event.name}
            </h1>
            
            <div className="flex items-center gap-4 mb-8">
              <Image src={photographer.avatar} alt={photographer.name} width={48} height={48} className="rounded-full border-2 border-white/50" />
              <div>
                <p className="text-white font-medium">{photographer.name}</p>
                <p className="text-white/60 text-sm">{photographer.instagram}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 text-white/70 text-sm mb-12">
              <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {event.location}</span>
              <span className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> {event.totalPhotos} Photos</span>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link href={`/event/${event.id}/gallery`}>
                <Button size="lg" className="bg-white text-black hover:bg-white/90 rounded-none px-8 h-14">
                  <Grid3X3 className="h-5 w-5 mr-2" /> View Gallery
                </Button>
              </Link>
              <Link href={`/event/${event.id}/search`}>
                <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/10 rounded-none px-8 h-14">
                  <Search className="h-5 w-5 mr-2" /> Find Photos
                </Button>
              </Link>
              <Link href={`/event/${event.id}/favorites`}>
                <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/10 rounded-none px-8 h-14">
                  <Heart className="h-5 w-5 mr-2" /> Favorites
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModernGalleryHeader({ event }: { event: Event }) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-light tracking-tight">{event.name}</h1>
            <p className="text-sm text-gray-500">{event.totalPhotos} photos</p>
          </div>
        </div>
      </div>
    </header>
  );
}

