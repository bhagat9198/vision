'use client';

import { use, useState, useEffect } from 'react';
import { Camera, Lock, AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { GalleryContent } from '@/components/public-event/gallery-content';
import { LandingContent } from '@/components/public-event/landing-content';
import { Event } from '@/components/public-event/types';

export default function PublicEventPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = use(params);

  // Check if the last segment is a sub-route like "gallery", "favorites", etc.
  const subRoutes = ['gallery', 'favorites', 'downloads', 'search'];
  const lastSegment = slug[slug.length - 1];
  const isSubRoute = subRoutes.includes(lastSegment);

  // If it's a sub-route, the actual slug is everything except the last segment
  const eventSlugParts = isSubRoute ? slug.slice(0, -1) : slug;
  const fullSlug = eventSlugParts.join('/');
  const currentSubRoute = isSubRoute ? lastSegment : null;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/v1/events/public/slug/${fullSlug}`);
        const data = await res.json();
        if (data.success) {
          setEvent(data.data);

          // Check if current user is the owner (photographer)
          const token = localStorage.getItem('photographerToken');
          if (token && data.data.photographerId) {
            try {
              const meRes = await fetch('http://localhost:4000/api/v1/photographers/me', {
                headers: { Authorization: `Bearer ${token}` },
              });
              const meData = await meRes.json();
              if (meData.success && meData.data?.id === data.data.photographerId) {
                setIsOwner(true);
              }
            } catch {
              // Not logged in or error - that's fine
            }
          }
        } else {
          setError(data.error || 'Event not found');
        }
      } catch {
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [fullSlug]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:4000/api/v1/events/${event?.id}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success && data.data.valid) {
        setIsAuthenticated(true);
        setPasswordError('');
      } else {
        setPasswordError('Incorrect password. Please try again.');
      }
    } catch {
      setPasswordError('Failed to verify password');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Card className="max-w-md mx-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <CardContent className="text-center py-12">
            <Camera className="mx-auto h-16 w-16 text-zinc-400 mb-4" />
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Event Not Found</h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              The event you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Draft event message - but allow owner to preview
  if (event.status === 'DRAFT' && !isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Card className="max-w-md mx-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <CardContent className="text-center py-12">
            <AlertTriangle className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Coming Soon</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mb-4">
              This gallery is not yet published. Please check back later.
            </p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Contact the photographer for more information.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password protection
  if (event.requiresPassword && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Card className="max-w-md mx-4 w-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <CardContent className="pt-8 pb-6">
            <div className="text-center mb-6">
              <Lock className="mx-auto h-12 w-12 text-amber-500 mb-4" />
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">Protected Gallery</h2>
              <p className="font-medium text-zinc-700 dark:text-zinc-300">{event.name}</p>
              {event.instructions && (
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">{event.instructions}</p>
              )}
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
              {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
              <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                Access Gallery
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If we're on the gallery sub-route, render the gallery
  if (currentSubRoute === 'gallery') {
    return <GalleryContent event={event} isOwnerPreview={isOwner && event.status === 'DRAFT'} />;
  }

  // Otherwise render the template landing page
  return <LandingContent event={event} isOwnerPreview={isOwner && event.status === 'DRAFT'} />;
}

