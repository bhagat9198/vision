'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, ImageIcon, ArrowRight } from 'lucide-react';
import { Event, Photographer } from '@/lib/types';

interface MinimalTemplateProps {
  event: Event;
  photographer: Photographer;
}

export function MinimalLanding({ event, photographer }: MinimalTemplateProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 p-6">
        <p className="text-xs tracking-[0.3em] uppercase text-gray-400">{photographer.name}</p>
      </nav>

      {/* Split Layout */}
      <div className="min-h-screen grid lg:grid-cols-2">
        {/* Left - Image */}
        <div className="relative h-[50vh] lg:h-screen">
          <Image src={event.coverPhoto} alt={event.name} fill className="object-cover" priority />
        </div>

        {/* Right - Content */}
        <div className="flex items-center justify-center p-8 lg:p-16">
          <div className="max-w-md">
            <p className="text-xs tracking-[0.2em] uppercase text-gray-400 mb-6">Gallery</p>
            <h1 className="text-3xl lg:text-5xl font-extralight text-gray-900 mb-8 leading-tight">
              {event.name}
            </h1>

            <div className="space-y-3 text-gray-500 text-sm mb-12">
              <p className="flex items-center gap-3">
                <Calendar className="h-4 w-4" />
                {new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="flex items-center gap-3">
                <MapPin className="h-4 w-4" />
                {event.location}
              </p>
              <p className="flex items-center gap-3">
                <ImageIcon className="h-4 w-4" />
                {event.totalPhotos} photos
              </p>
            </div>

            <div className="space-y-4">
              <Link href={`/event/${event.id}/gallery`} className="block group">
                <div className="flex items-center justify-between py-4 border-t border-gray-200 hover:border-gray-900 transition-colors">
                  <span className="text-sm font-medium">View Gallery</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Link href={`/event/${event.id}/search`} className="block group">
                <div className="flex items-center justify-between py-4 border-t border-gray-200 hover:border-gray-900 transition-colors">
                  <span className="text-sm font-medium">Find Your Photos</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Link href={`/event/${event.id}/favorites`} className="block group">
                <div className="flex items-center justify-between py-4 border-t border-b border-gray-200 hover:border-gray-900 transition-colors">
                  <span className="text-sm font-medium">Favorites</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>

            <div className="mt-16 pt-8 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <Image src={photographer.avatar} alt={photographer.name} width={40} height={40} className="rounded-full grayscale" />
                <div>
                  <p className="text-sm font-medium">{photographer.name}</p>
                  <p className="text-xs text-gray-400">{photographer.instagram}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MinimalGalleryHeader({ event }: { event: Event }) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extralight tracking-wide">{event.name}</h1>
            <p className="text-xs text-gray-400 mt-1">{event.totalPhotos} photos</p>
          </div>
        </div>
      </div>
    </header>
  );
}

