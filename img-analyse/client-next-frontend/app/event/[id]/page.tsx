'use client';

import { useParams } from 'next/navigation';
import { Camera, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ModernLanding, ClassicLanding, MinimalLanding, ElegantLanding } from '@/components/templates';
import { useState, useEffect } from 'react';
import { Event as EventType, Photographer as PhotographerType, GalleryTemplate } from '@/lib/types';

const API_URL = 'http://localhost:4000/api/v1';

interface ApiEvent {
  id: string;
  displayId: number;
  name: string;
  description?: string;
  coverPhoto?: string;
  date: string;
  location?: string;
  status: string;
  template?: GalleryTemplate;
  isPasswordProtected: boolean;
  requiresPassword: boolean;
  instructions?: string;
  _count?: { photos: number; albums: number };
  photographer: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
    website?: string;
    instagram?: string;
  };
}

export default function EventLandingPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventType | null>(null);
  const [photographer, setPhotographer] = useState<PhotographerType | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/events/public/${eventId}`);
        const data = await res.json();
        if (data.success) {
          const apiEvent: ApiEvent = data.data;
          // Transform API event to match the Event interface
          const transformedEvent: EventType = {
            id: apiEvent.id,
            displayId: apiEvent.displayId,
            name: apiEvent.name,
            photographerId: apiEvent.photographer.id,
            coverPhoto: apiEvent.coverPhoto || '/placeholder-event.jpg',
            date: apiEvent.date,
            location: apiEvent.location || '',
            isPasswordProtected: apiEvent.isPasswordProtected,
            password: null,
            instructions: apiEvent.instructions || null,
            totalPhotos: apiEvent._count?.photos || 0,
            status: (apiEvent.status?.toLowerCase() || 'draft') as 'draft' | 'published' | 'archived',
            template: apiEvent.template,
          };
          const transformedPhotographer: PhotographerType = {
            id: apiEvent.photographer.id,
            displayId: 0,
            name: apiEvent.photographer.name,
            avatar: apiEvent.photographer.avatar || '/placeholder-avatar.jpg',
            bio: apiEvent.photographer.bio || '',
            website: apiEvent.photographer.website || '',
            instagram: apiEvent.photographer.instagram || '',
          };
          setEvent(transformedEvent);
          setPhotographer(transformedPhotographer);
        }
      } catch (err) {
        console.error('Failed to fetch event:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!event || !photographer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md mx-4">
          <CardContent className="text-center py-12">
            <Camera className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Event Not Found</h1>
            <p className="text-muted-foreground">
              The event you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/events/${eventId}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success && data.data.valid) {
        setIsAuthenticated(true);
        setError('');
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch {
      setError('Failed to verify password. Please try again.');
    }
  };

  const showPasswordPrompt = event.isPasswordProtected && !isAuthenticated;

  // Render template-based landing page
  const renderTemplateLanding = () => {
    const template = event.template || 'modern';

    switch (template) {
      case 'classic':
        return <ClassicLanding event={event} photographer={photographer} />;
      case 'minimal':
        return <MinimalLanding event={event} photographer={photographer} />;
      case 'elegant':
        return <ElegantLanding event={event} photographer={photographer} />;
      case 'modern':
      default:
        return <ModernLanding event={event} photographer={photographer} />;
    }
  };

  // Password protection overlay
  if (showPasswordPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md mx-4 w-full">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Protected Gallery</h2>
              <p className="font-medium">{event.name}</p>
              {event.instructions && (
                <p className="text-muted-foreground text-sm mt-2">{event.instructions}</p>
              )}
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button type="submit" className="w-full" size="lg">
                Access Gallery
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return renderTemplateLanding();
}

