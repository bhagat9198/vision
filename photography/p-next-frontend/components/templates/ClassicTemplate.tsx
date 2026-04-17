'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, ImageIcon, Grid3X3, Search, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Event, Photographer } from '@/lib/types';

interface ClassicTemplateProps {
  event: Event;
  photographer: Photographer;
}

export function ClassicLanding({ event, photographer }: ClassicTemplateProps) {
  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      {/* Ornate Header */}
      <header className="bg-[#1a1a2e] text-white py-6">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-[#d4af37] tracking-[0.4em] uppercase text-xs mb-2">Photography by</p>
          <p className="text-xl font-light">{photographer.name}</p>
        </div>
      </header>

      {/* Hero with Frame */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-white p-4 shadow-lg">
          <div className="border-4 border-[#d4af37]/30 p-2">
            <div className="relative aspect-[16/9]">
              <Image src={event.coverPhoto} alt={event.name} fill className="object-cover" priority />
            </div>
          </div>
        </div>

        {/* Event Title */}
        <div className="text-center mt-12 mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-16 bg-[#d4af37]" />
            <p className="text-[#d4af37] tracking-[0.3em] uppercase text-xs">The Gallery</p>
            <div className="h-px w-16 bg-[#d4af37]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-[#1a1a2e] mb-4">{event.name}</h1>
          <div className="flex flex-wrap justify-center gap-6 text-[#1a1a2e]/60 text-sm">
            <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {event.location}</span>
            <span className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> {event.totalPhotos} Photographs</span>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <Link href={`/event/${event.id}/gallery`}>
            <Card className="bg-white hover:shadow-lg transition-shadow border-2 border-transparent hover:border-[#d4af37]/50 group">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-[#1a1a2e] flex items-center justify-center mx-auto mb-4 group-hover:bg-[#d4af37] transition-colors">
                  <Grid3X3 className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-serif text-[#1a1a2e] mb-2">View Gallery</h3>
                <p className="text-sm text-[#1a1a2e]/60">Browse all photographs</p>
              </CardContent>
            </Card>
          </Link>
          <Link href={`/event/${event.id}/search`}>
            <Card className="bg-white hover:shadow-lg transition-shadow border-2 border-transparent hover:border-[#d4af37]/50 group">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-[#1a1a2e] flex items-center justify-center mx-auto mb-4 group-hover:bg-[#d4af37] transition-colors">
                  <Search className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-serif text-[#1a1a2e] mb-2">Find Photos</h3>
                <p className="text-sm text-[#1a1a2e]/60">AI-powered search</p>
              </CardContent>
            </Card>
          </Link>
          <Link href={`/event/${event.id}/favorites`}>
            <Card className="bg-white hover:shadow-lg transition-shadow border-2 border-transparent hover:border-[#d4af37]/50 group">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-[#1a1a2e] flex items-center justify-center mx-auto mb-4 group-hover:bg-[#d4af37] transition-colors">
                  <Heart className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-serif text-[#1a1a2e] mb-2">Favorites</h3>
                <p className="text-sm text-[#1a1a2e]/60">Your saved photos</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#1a1a2e] text-white py-8 mt-12">
        <div className="text-center">
          <p className="text-[#d4af37] text-sm">{photographer.instagram}</p>
        </div>
      </footer>
    </div>
  );
}

export function ClassicGalleryHeader({ event }: { event: Event }) {
  return (
    <header className="sticky top-0 z-40 bg-[#1a1a2e] text-white border-b border-[#d4af37]/30">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-serif">{event.name}</h1>
            <p className="text-sm text-white/60">{event.totalPhotos} photographs</p>
          </div>
        </div>
      </div>
    </header>
  );
}

