'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, Grid3X3, LayoutGrid, Film, Newspaper, GalleryHorizontalEnd, Layers, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GridView,
  MasonryView,
  StoryView,
  FilmstripView,
  MagazineView,
  CarouselView,
  CollageView,
  FullscreenViewer
} from '@/components/gallery';
import { getTemplateStyles } from '@/lib/template-styles';
import { Photo, GalleryTemplate } from '@/lib/types';
import { cn } from '@/lib/utils';

const API_URL = 'http://localhost:4000/api/v1';

interface Event {
  id: string;
  displayId: number;
  name: string;
  date: string;
  status: string;
  template?: GalleryTemplate;
}

interface Album {
  id: string;
  displayId: number;
  name: string;
  _count?: { photos: number };
}

interface ApiPhoto {
  id: string;
  displayId: number;
  albumId: string | null;
  eventId: string;
  url: string;
  thumbnail: string;
  originalName: string;
  width?: number;
  height?: number;
  metadata?: { isVideo?: boolean; mimeType?: string } | null;
  _count?: { likes: number; comments: number };
}

type ViewMode = 'grid' | 'masonry' | 'filmstrip' | 'magazine' | 'carousel' | 'collage' | 'story';

const viewModes = [
  { id: 'grid' as ViewMode, label: 'Grid', icon: Grid3X3, description: 'Classic grid layout' },
  { id: 'masonry' as ViewMode, label: 'Masonry', icon: LayoutGrid, description: 'Pinterest-style layout' },
  { id: 'filmstrip' as ViewMode, label: 'Cinema', icon: Film, description: 'Film reel experience' },
  { id: 'magazine' as ViewMode, label: 'Magazine', icon: Newspaper, description: 'Editorial style' },
  { id: 'carousel' as ViewMode, label: 'Spotlight', icon: GalleryHorizontalEnd, description: '3D carousel view' },
  { id: 'collage' as ViewMode, label: 'Scrapbook', icon: Layers, description: 'Artistic collage' },
  { id: 'story' as ViewMode, label: 'Stories', icon: Film, description: 'Instagram-style' },
];

// Helper to determine aspect ratio from dimensions
function getAspectRatio(width?: number, height?: number): 'portrait' | 'landscape' | 'square' {
  if (!width || !height) return 'square';
  const ratio = width / height;
  if (ratio > 1.2) return 'landscape';
  if (ratio < 0.8) return 'portrait';
  return 'square';
}

export default function GalleryPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch event, photos, and albums in parallel (public endpoints)
        const [eventRes, photosRes, albumsRes] = await Promise.all([
          fetch(`${API_URL}/events/public/${eventId}`),
          fetch(`${API_URL}/photos/event/${eventId}`),
          fetch(`${API_URL}/albums/event/${eventId}`),
        ]);

        const eventData = await eventRes.json();
        const photosData = await photosRes.json();
        const albumsData = await albumsRes.json();

        if (eventData.success) {
          setEvent(eventData.data);
        }

        if (photosData.success && photosData.data) {
          // Transform API photos to match the Photo interface
          const transformedPhotos: Photo[] = photosData.data.map((p: ApiPhoto) => ({
            id: p.id,
            displayId: p.displayId,
            albumId: p.albumId,
            eventId: p.eventId || eventId,
            url: p.url,
            thumbnail: p.thumbnail || p.url,
            likes: p._count?.likes || 0,
            comments: p._count?.comments || 0,
            aspectRatio: getAspectRatio(p.width, p.height),
            downloadable: true,
          }));
          setPhotos(transformedPhotos);
        }

        if (albumsData.success && albumsData.data) {
          // Transform API albums to match Album interface
          const transformedAlbums: Album[] = albumsData.data.map((a: { id: string; displayId: number; eventId: string; name: string; coverPhoto?: string; _count?: { photos: number } }) => ({
            id: a.id,
            displayId: a.displayId,
            eventId: a.eventId,
            name: a.name,
            coverPhoto: a.coverPhoto || '',
            photoCount: a._count?.photos || 0,
          }));
          setAlbums(transformedAlbums);
        }
      } catch (err) {
        console.error('Failed to fetch gallery data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  const styles = getTemplateStyles(event.template);

  const filteredPhotos = selectedAlbum
    ? photos.filter(p => p.albumId === selectedAlbum)
    : photos;

  const handlePhotoClick = (photo: Photo, index: number) => {
    setFullscreenIndex(index);
  };

  const handleCloseFullscreen = () => {
    setFullscreenIndex(null);
  };

  return (
    <div className={cn('min-h-screen', styles.pageBg)}>
      {/* Header */}
      <header className={cn('sticky top-0 z-40', styles.headerBg)}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Back & Title */}
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => router.push(`/event/${eventId}`)} className={styles.buttonGhost}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className={cn('font-semibold truncate', styles.textPrimary)}>{event.name}</h1>
                <p className={cn('text-sm', styles.textMuted)}>{filteredPhotos.length} media</p>
              </div>
            </div>

            {/* View Mode Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={cn('gap-2', styles.buttonOutline)}>
                  {(() => {
                    const current = viewModes.find(v => v.id === viewMode);
                    const Icon = current?.icon || Grid3X3;
                    return (
                      <>
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{current?.label}</span>
                        <ChevronDown className="h-4 w-4" />
                      </>
                    );
                  })()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {viewModes.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <DropdownMenuItem
                      key={mode.id}
                      onClick={() => setViewMode(mode.id)}
                      className={cn('gap-3 cursor-pointer', viewMode === mode.id && 'bg-accent')}
                    >
                      <Icon className="h-4 w-4" />
                      <div className="flex-1">
                        <div className="font-medium">{mode.label}</div>
                        <div className="text-xs text-muted-foreground">{mode.description}</div>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Album Filter */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              size="sm"
              onClick={() => setSelectedAlbum(null)}
              className={cn('shrink-0', selectedAlbum === null ? styles.buttonPrimary : styles.buttonOutline)}
            >
              All Media
            </Button>
            {albums.map((album) => (
              <Button
                key={album.id}
                size="sm"
                onClick={() => setSelectedAlbum(album.id)}
                className={cn('shrink-0', selectedAlbum === album.id ? styles.buttonPrimary : styles.buttonOutline)}
              >
                {album.name}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {/* Gallery Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {(() => {
          // Handlers for all views
          const handlers = {
            onPhotoClick: handlePhotoClick,
            onLike: (photo: Photo) => {
              console.log('Like', photo.id);
              // Need api call here or context
            },
            onComment: (photo: Photo) => {
              const eId = event?.displayId || eventId;
              router.push(`/event/${eId}/photo/${photo.displayId}`);
            },
            onFavorite: (photo: Photo) => {
              console.log('Favorite', photo.id);
            },
            onShare: (photo: Photo) => {
              console.log('Share', photo.id);
            },
            // Since we don't have the interaction hooks here in GalleryPage yet (only in PhotoDetail), 
            // we pass dummy or basic implementations. 
            // Ideally GalleryPage should use usePhotoInteractions hook too.
          };

          // We need to pass these to all views.
          // However, GridView requires specific props.
          const commonProps = {
            photos: filteredPhotos,
            ...handlers
          };

          if (viewMode === 'grid') return <GridView {...commonProps} />;
          if (viewMode === 'masonry') return <MasonryView {...commonProps} />;
          if (viewMode === 'filmstrip') return <FilmstripView {...commonProps} />;
          if (viewMode === 'magazine') return <MagazineView {...commonProps} />;
          if (viewMode === 'carousel') return <CarouselView {...commonProps} />;
          if (viewMode === 'collage') return <CollageView {...commonProps} />;
          if (viewMode === 'story') return <StoryView {...commonProps} />;
          return null;
        })()}
      </main>

      {/* Fullscreen Viewer */}
      <FullscreenViewer
        photos={filteredPhotos}
        currentIndex={fullscreenIndex ?? 0}
        isOpen={fullscreenIndex !== null}
        onClose={handleCloseFullscreen}
        onIndexChange={setFullscreenIndex}
        eventId={event?.displayId?.toString() || eventId}
      />
    </div>
  );
}

