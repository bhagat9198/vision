'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Grid3X3, LayoutGrid, Film, Newspaper, GalleryHorizontalEnd, Layers, ChevronDown, Loader2, Eye } from 'lucide-react';
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
import { AuthModal } from '@/components/auth/auth-modal';
import { cn } from '@/lib/utils';
import { usePhotoInteractions } from '@/lib/hooks/use-photo-interactions';

const API_URL = 'http://localhost:4000/api/v1';

import { Event } from './types';

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

interface GalleryContentProps {
  event: Event;
  isOwnerPreview?: boolean;
}

const ITEMS_PER_PAGE = 20;

export function GalleryContent({ event, isOwnerPreview = false }: GalleryContentProps) {
  const router = useRouter();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Photo interactions hook
  const { isLiked, isFavorited, toggleLike, toggleFavorite } = usePhotoInteractions();

  // Auth check helper
  const checkAuth = () => {
    // Check for either client token or photographer token
    const token = localStorage.getItem('authToken') || localStorage.getItem('photographerToken');
    if (!token) {
      setIsAuthModalOpen(true);
      return false;
    }
    return true;
  };

  const handleLike = (photo: Photo) => {
    if (!checkAuth()) return;
    toggleLike(photo.id, event.id, photo.thumbnail, photo.url);
    // Popup effect is in PhotoActions component
  };

  const handleComment = (photo: Photo) => {
    // Navigate to photo detail page for comments
    router.push(`/event/${event.id}/photo/${photo.id}`);
  };

  const handleFavorite = (photo: Photo) => {
    if (!checkAuth()) return;
    toggleFavorite(photo.id, event.id, photo.thumbnail, photo.url);
    // Popup effect is in PhotoActions component
  };

  const handleShare = (photo: Photo) => {
    const photoUrl = `${window.location.origin}/event/${event.id}/photo/${photo.id}`;
    if (navigator.share) {
      navigator.share({
        title: 'Check out this photo!',
        text: 'I found this amazing photo on PhotoShare.',
        url: photoUrl,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(photoUrl);
      // Popup effect is in PhotoActions component
    }
  };

  // Transform API photo to Photo interface
  const transformPhoto = useCallback((p: ApiPhoto): Photo => ({
    id: p.id,
    displayId: p.displayId,
    albumId: p.albumId,
    eventId: p.eventId || event.id,
    url: p.url,
    thumbnail: p.thumbnail || p.url,
    likes: p._count?.likes || 0,
    comments: p._count?.comments || 0,
    aspectRatio: getAspectRatio(p.width, p.height),
    downloadable: true,
  }), [event.id]);

  // Fetch photos with pagination
  const fetchPhotos = useCallback(async (pageNum: number, albumId: string | null, reset = false) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });
      if (albumId) {
        params.append('albumId', albumId);
      }

      const res = await fetch(`${API_URL}/photos/event/${event.id}?${params}`);
      const data = await res.json();

      if (data.success) {
        const transformedPhotos = (data.data?.photos || data.data || []).map(transformPhoto);
        const total = data.data?.total ?? transformedPhotos.length;

        if (reset) {
          setPhotos(transformedPhotos);
        } else {
          setPhotos(prev => [...prev, ...transformedPhotos]);
        }

        setTotalPhotos(total);
        setHasMore(transformedPhotos.length === ITEMS_PER_PAGE && photos.length + transformedPhotos.length < total);
      }
    } catch (err) {
      console.error('Failed to fetch photos:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [event.id, transformPhoto, photos.length]);

  // Initial load - fetch albums and first page of photos
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        // Fetch albums
        const albumsRes = await fetch(`${API_URL}/albums/event/${event.id}`);
        const albumsData = await albumsRes.json();
        if (albumsData.success && albumsData.data) {
          setAlbums(albumsData.data);
        }
        // Fetch first page of photos
        await fetchPhotos(1, null, true);
      } catch (err) {
        console.error('Failed to fetch gallery data:', err);
        setLoading(false);
      }
    };
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  // Reset and fetch when album changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchPhotos(1, selectedAlbum, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlbum]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPhotos(nextPage, selectedAlbum, false);
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, selectedAlbum, fetchPhotos]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // User Menu Component
  const UserMenu = () => {
    const [user, setUser] = useState<{ email?: string; phone?: string; name?: string } | null>(null);

    useEffect(() => {
      const storedUser = localStorage.getItem('authUser');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error("Failed to parse auth user", e);
        }
      }
    }, []);

    const handleLogout = () => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      localStorage.removeItem('photographerToken'); // Clear legacy/photographer token if relevant
      window.location.reload();
    };

    if (!user) {
      return (
        <Button variant="ghost" className={cn("text-sm", styles.buttonGhost)} onClick={() => setIsAuthModalOpen(true)}>
          Login
        </Button>
      );
    }

    const displayName = user.name || user.email || user.phone || 'User';
    const initials = displayName.slice(0, 2).toUpperCase();

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full bg-amber-500 text-white hover:bg-amber-600">
            {initials}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="font-medium cursor-default">
            {displayName}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer">
            My Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout} className="text-red-500 cursor-pointer">
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const styles = getTemplateStyles(event.template as GalleryTemplate | undefined);

  // Photos are now fetched from API with albumId filter, no client-side filtering needed
  const displayPhotos = photos;

  const handlePhotoClick = (_photo: Photo, index: number) => {
    setFullscreenIndex(index);
  };

  const handleCloseFullscreen = () => {
    setFullscreenIndex(null);
  };



  return (
    <div className={cn('min-h-screen', styles.pageBg)}>
      {/* Owner Preview Banner */}
      {isOwnerPreview && (
        <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
          <Eye className="h-4 w-4" />
          <span>Preview Mode - This gallery is not published yet. Only you can see this.</span>
        </div>
      )}
      {/* Header */}
      <header className={cn('sticky top-0 z-40', styles.headerBg)}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Back & Title */}
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className={styles.buttonGhost}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className={cn('font-semibold truncate', styles.textPrimary)}>{event.name}</h1>
                <p className={cn('text-sm', styles.textMuted)}>{totalPhotos} media</p>
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

            {/* User Menu */}
            <UserMenu />
          </div>

          {/* Album Filter */}
          {albums.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button
                size="sm"
                variant={selectedAlbum === null ? 'default' : 'outline'}
                onClick={() => setSelectedAlbum(null)}
                className="shrink-0"
              >
                All Media
              </Button>
              {albums.map((album) => (
                <Button
                  key={album.id}
                  size="sm"
                  variant={selectedAlbum === album.id ? 'default' : 'outline'}
                  onClick={() => setSelectedAlbum(album.id)}
                  className="shrink-0"
                >
                  {album.name} ({album._count?.photos || 0})
                </Button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Gallery Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {viewMode === 'grid' && (
          <GridView
            photos={displayPhotos}
            onPhotoClick={handlePhotoClick}
            onLike={handleLike}
            onComment={handleComment}
            onFavorite={handleFavorite}
            onShare={handleShare}
            isLiked={isLiked}
            isFavorited={isFavorited}
          />
        )}
        {viewMode === 'masonry' && (
          <MasonryView
            photos={displayPhotos}
            onPhotoClick={handlePhotoClick}
            onLike={handleLike}
            onComment={handleComment}
            onFavorite={handleFavorite}
            onShare={handleShare}
            isLiked={isLiked}
            isFavorited={isFavorited}
          />
        )}
        {viewMode === 'filmstrip' && <FilmstripView photos={displayPhotos} onPhotoClick={handlePhotoClick} />}
        {viewMode === 'magazine' && <MagazineView photos={displayPhotos} onPhotoClick={handlePhotoClick} />}
        {viewMode === 'carousel' && <CarouselView photos={displayPhotos} onPhotoClick={handlePhotoClick} />}
        {viewMode === 'collage' && <CollageView photos={displayPhotos} onPhotoClick={handlePhotoClick} />}
        {viewMode === 'story' && <StoryView photos={displayPhotos} onPhotoClick={handlePhotoClick} />}

        {/* Infinite scroll loader */}
        <div ref={loaderRef} className="flex justify-center py-8">
          {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-amber-500" />}
          {!hasMore && displayPhotos.length > 0 && (
            <p className={cn('text-sm', styles.textMuted)}>You&apos;ve reached the end ✨</p>
          )}
        </div>
      </main>

      {/* Fullscreen Viewer */}
      <FullscreenViewer
        photos={displayPhotos}
        currentIndex={fullscreenIndex ?? 0}
        isOpen={fullscreenIndex !== null}
        onClose={handleCloseFullscreen}
        onIndexChange={setFullscreenIndex}
        eventId={event.id}
        onLike={handleLike}
        onComment={handleComment}
        onFavorite={handleFavorite}
        onShare={handleShare}
        isLiked={isLiked}
        isFavorited={isFavorited}
      />

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}

