'use client';

import { Folder, FolderHeart, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FavoriteFolder } from '@/lib/types';
import { cn } from '@/lib/utils';

interface FolderListProps {
  folders: FavoriteFolder[];
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  allPhotosCount: number;
  unfolderedCount: number;
  onCreateFolder?: () => void;
}

export function FolderList({
  folders,
  selectedFolderId,
  onFolderSelect,
  allPhotosCount,
  unfolderedCount,
  onCreateFolder,
}: FolderListProps) {
  return (
    <div className="space-y-2">
      {/* All Favorites */}
      <button
        onClick={() => onFolderSelect(null)}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left',
          'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary',
          selectedFolderId === null && 'bg-primary/10 ring-2 ring-primary'
        )}
      >
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
          <FolderHeart className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">All Favorites</p>
          <p className="text-sm text-muted-foreground">{allPhotosCount} photos</p>
        </div>
      </button>

      {/* Folders */}
      {folders.map((folder) => (
        <button
          key={folder.id}
          onClick={() => onFolderSelect(folder.id)}
          className={cn(
            'w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left',
            'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary',
            selectedFolderId === folder.id && 'bg-primary/10 ring-2 ring-primary'
          )}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: folder.color + '20' }}
          >
            <Folder className="h-5 w-5" style={{ color: folder.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{folder.name}</p>
            <p className="text-sm text-muted-foreground">{folder.photoIds.length} photos</p>
          </div>
        </button>
      ))}

      {/* Unfoldered */}
      {unfolderedCount > 0 && (
        <button
          onClick={() => onFolderSelect('unfoldered')}
          className={cn(
            'w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left',
            'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary',
            selectedFolderId === 'unfoldered' && 'bg-primary/10 ring-2 ring-primary'
          )}
        >
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <Folder className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">Unsorted</p>
            <p className="text-sm text-muted-foreground">{unfolderedCount} photos</p>
          </div>
        </button>
      )}

      {/* Create Folder Button */}
      {onCreateFolder && (
        <Button variant="outline" className="w-full mt-4 gap-2" onClick={onCreateFolder}>
          <Plus className="h-4 w-4" />
          Create Folder
        </Button>
      )}
    </div>
  );
}

