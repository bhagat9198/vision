'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, ImageIcon, Grid3X3, Eye, Camera, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GalleryTemplate } from '@/lib/types';

const API_URL = 'http://localhost:4000/api/v1';

import { Event } from './types';

interface LandingContentProps {
  event: Event;
  isOwnerPreview?: boolean;
}

export function LandingContent({ event, isOwnerPreview = false }: LandingContentProps) {
  const [totalMedia, setTotalMedia] = useState(event._count?.photos || 0);

  useEffect(() => {
    // Fetch photo count if not available
    if (!event._count?.photos) {
      fetch(`${API_URL}/photos/event/${event.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setTotalMedia(data.data.length);
          }
        })
        .catch(() => { });
    }
  }, [event.id, event._count?.photos]);

  const coverImage = event.coverPhoto
    ? (event.coverPhoto.startsWith('http') ? event.coverPhoto : `http://localhost:4000${event.coverPhoto}`)
    : '/placeholder-event.jpg';

  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Owner Preview Banner */}
      {isOwnerPreview && (
        <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
          <Eye className="h-4 w-4" />
          <span>Preview Mode - This gallery is not published yet. Only you can see this.</span>
        </div>
      )}

      {/* Full-screen Hero */}
      <div className="relative min-h-screen w-full flex items-end">
        {/* Background Image */}
        {event.coverPhoto ? (
          <img
            src={coverImage}
            alt={event.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
            <Camera className="h-24 w-24 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Content */}
        <div className="relative w-full p-8 md:p-16 pb-16">
          <div className="max-w-5xl mx-auto">
            <p className="text-white/60 uppercase tracking-[0.3em] text-sm mb-4">Gallery</p>
            <h1 className="text-4xl md:text-7xl font-light text-white mb-6 tracking-tight">
              {event.name}
            </h1>

            {/* Photographer Info */}
            {event.photographer && (
              <div className="flex items-center gap-4 mb-8">
                {event.photographer.avatar ? (
                  <img
                    src={event.photographer.avatar.startsWith('http') ? event.photographer.avatar : `http://localhost:4000${event.photographer.avatar}`}
                    alt={event.photographer.name}
                    className="w-12 h-12 rounded-full border-2 border-white/50 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full border-2 border-white/50 bg-zinc-800 flex items-center justify-center">
                    <User className="h-6 w-6 text-zinc-500" />
                  </div>
                )}
                <div>
                  <p className="text-white font-medium">{event.photographer.name}</p>
                  <p className="text-white/60 text-sm">Photographer</p>
                </div>
              </div>
            )}

            {/* Event Details */}
            <div className="flex flex-wrap gap-6 text-white/70 text-sm mb-12">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> {formattedDate}
              </span>
              {event.location && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {event.location}
                </span>
              )}
              <span className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> {totalMedia} Media
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-4">
              <Link href={`/${event.slug}/gallery`}>
                <Button size="lg" className="bg-white text-black hover:bg-white/90 rounded-none px-8 h-14">
                  <Grid3X3 className="h-5 w-5 mr-2" /> View Gallery
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

