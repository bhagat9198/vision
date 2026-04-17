'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Heart, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FolderList, FavoritesGrid, FavoritesActions } from '@/components/favorites';
import {
  getEventById,
  getFavoriteFoldersByEventId,
  getFavoritePhotosByFolderId,
  getAllFavoritePhotos,
  mockFavoritePhotos,
} from '@/lib/mock-data';
import { getTemplateStyles } from '@/lib/template-styles';
import { cn } from '@/lib/utils';

export default function FavoritesPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const event = getEventById(eventId);
  const folders = getFavoriteFoldersByEventId(eventId);
  const allFavorites = getAllFavoritePhotos(eventId);
  const unfolderedCount = mockFavoritePhotos.filter(
    (f) => f.eventId === eventId && f.folderId === null
  ).length;

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  const styles = getTemplateStyles(event.template);

  // Get photos based on selected folder
  const getDisplayPhotos = () => {
    if (selectedFolderId === null) {
      return allFavorites;
    }
    if (selectedFolderId === 'unfoldered') {
      return getFavoritePhotosByFolderId(null, eventId);
    }
    return getFavoritePhotosByFolderId(selectedFolderId, eventId);
  };

  const displayPhotos = getDisplayPhotos();
  const currentFolder = selectedFolderId ? folders.find((f) => f.id === selectedFolderId) : null;

  const handleDownload = () => {
    const photos = selectMode && selectedPhotoIds.length > 0
      ? displayPhotos.filter((p) => selectedPhotoIds.includes(p.id))
      : displayPhotos;
    console.log('Downloading', photos.length, 'photos');
  };

  const handleShare = () => {
    console.log('Sharing favorites');
  };

  const handleSelectAll = () => {
    setSelectedPhotoIds(displayPhotos.map((p) => p.id));
  };

  return (
    <div className={cn('min-h-screen', styles.pageBg)}>
      {/* Header */}
      <header className={cn('sticky top-0 z-40', styles.headerBg)}>
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/event/${eventId}`)} className={styles.buttonGhost}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn('md:hidden', styles.buttonGhost)}
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
              <div>
                <h1 className={cn('font-semibold', styles.textPrimary)}>My Favorites</h1>
                <p className={cn('text-sm', styles.textMuted)}>{event.name}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar - Folders */}
          <aside
            className={cn(
              showSidebar ? 'block' : 'hidden',
              'md:block w-64 shrink-0 fixed md:static inset-0 z-30 p-4 md:p-0 pt-20 md:pt-0',
              styles.pageBg
            )}
          >
            {showSidebar && (
              <div
                className="fixed inset-0 bg-black/50 md:hidden -z-10"
                onClick={() => setShowSidebar(false)}
              />
            )}
            <FolderList
              folders={folders}
              selectedFolderId={selectedFolderId}
              onFolderSelect={(id) => {
                setSelectedFolderId(id);
                setShowSidebar(false);
                setSelectMode(false);
                setSelectedPhotoIds([]);
              }}
              allPhotosCount={allFavorites.length}
              unfolderedCount={unfolderedCount}
            />
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 space-y-6">
            {/* Folder Title */}
            <div>
              <h2 className={cn('text-xl font-semibold', styles.textPrimary)}>
                {selectedFolderId === null && 'All Favorites'}
                {selectedFolderId === 'unfoldered' && 'Unsorted'}
                {currentFolder && currentFolder.name}
              </h2>
              <p className={cn('text-sm mt-1', styles.textMuted)}>
                {displayPhotos.length} photos
              </p>
            </div>

            {/* Actions */}
            <FavoritesActions
              totalPhotos={displayPhotos.length}
              selectedCount={selectedPhotoIds.length}
              downloadAllowed={displayPhotos.some((p) => p.downloadable)}
              selectMode={selectMode}
              onToggleSelectMode={() => {
                setSelectMode(!selectMode);
                setSelectedPhotoIds([]);
              }}
              onSelectAll={handleSelectAll}
              onClearSelection={() => setSelectedPhotoIds([])}
              onDownload={handleDownload}
              onShare={handleShare}
            />

            {/* Photos Grid */}
            <FavoritesGrid
              photos={displayPhotos}
              eventId={eventId}
              selectable={selectMode}
              selectedIds={selectedPhotoIds}
              onSelectionChange={setSelectedPhotoIds}
            />
          </main>
        </div>
      </div>
    </div>
  );
}

