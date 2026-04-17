'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, ImageIcon, Grid3X3, Search, Heart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Event, Photographer } from '@/lib/types';

interface ElegantTemplateProps {
  event: Event;
  photographer: Photographer;
}

export function ElegantLanding({ event, photographer }: ElegantTemplateProps) {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      {/* Decorative Top Border */}
      <div className="h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />

      {/* Hero Section */}
      <div className="relative min-h-screen">
        {/* Background Image with Dark Overlay */}
        <div className="absolute inset-0">
          <Image src={event.coverPhoto} alt={event.name} fill className="object-cover opacity-40" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d0d] via-transparent to-[#0d0d0d]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20">
          {/* Photographer Badge */}
          <div className="flex items-center gap-3 mb-12">
            <div className="h-px w-8 bg-[#d4af37]" />
            <div className="flex items-center gap-2 text-[#d4af37]">
              <Sparkles className="h-3 w-3" />
              <span className="text-xs tracking-[0.3em] uppercase">Captured by {photographer.name}</span>
              <Sparkles className="h-3 w-3" />
            </div>
            <div className="h-px w-8 bg-[#d4af37]" />
          </div>

          {/* Event Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-light text-center mb-8 tracking-wide">
            <span className="block text-[#d4af37] font-serif italic text-2xl md:text-3xl mb-4">The Gallery of</span>
            {event.name}
          </h1>

          {/* Event Details */}
          <div className="flex flex-wrap justify-center gap-8 text-white/60 text-sm mb-16">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#d4af37]" />
              {new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#d4af37]" />
              {event.location}
            </span>
            <span className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-[#d4af37]" />
              {event.totalPhotos} Photographs
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link href={`/event/${event.id}/gallery`}>
              <Button size="lg" className="bg-[#d4af37] text-[#0d0d0d] hover:bg-[#b8962f] rounded-none px-10 h-14 font-medium">
                <Grid3X3 className="h-5 w-5 mr-3" /> Enter Gallery
              </Button>
            </Link>
            <Link href={`/event/${event.id}/search`}>
              <Button size="lg" variant="outline" className="border-[#d4af37]/50 text-[#d4af37] hover:bg-[#d4af37]/10 rounded-none px-10 h-14">
                <Search className="h-5 w-5 mr-3" /> Find Photos
              </Button>
            </Link>
            <Link href={`/event/${event.id}/favorites`}>
              <Button size="lg" variant="outline" className="border-[#d4af37]/50 text-[#d4af37] hover:bg-[#d4af37]/10 rounded-none px-10 h-14">
                <Heart className="h-5 w-5 mr-3" /> Favorites
              </Button>
            </Link>
          </div>

          {/* Photographer Footer */}
          <div className="absolute bottom-8 left-0 right-0 text-center">
            <div className="flex items-center justify-center gap-3">
              <Image src={photographer.avatar} alt={photographer.name} width={36} height={36} className="rounded-full border border-[#d4af37]/50" />
              <span className="text-sm text-white/40">{photographer.instagram}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Bottom Border */}
      <div className="h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
    </div>
  );
}

export function ElegantGalleryHeader({ event }: { event: Event }) {
  return (
    <header className="sticky top-0 z-40 bg-[#0d0d0d]/95 backdrop-blur border-b border-[#d4af37]/20">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-light text-white">{event.name}</h1>
            <p className="text-sm text-[#d4af37]/70">{event.totalPhotos} photographs</p>
          </div>
        </div>
      </div>
    </header>
  );
}

