'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check, Trash2, RotateCw, Download, Lock, FolderInput } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Photo } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PhotoGridProps {
  photos: Photo[];
  eventId: string;
  selectionMode: boolean;
  selectedIds: string[];
  onSelectPhoto: (photoId: string) => void;
  onSelectAll: () => void;
}

export function PhotoGrid({ photos, eventId, selectionMode, selectedIds, onSelectPhoto, onSelectAll }: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">No photos in this folder</p>
        <p className="text-sm text-muted-foreground mt-1">Upload photos or move photos here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectionMode && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onSelectAll}>
            {selectedIds.length === photos.length ? 'Deselect All' : 'Select All'}
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} selected
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {photos.map((photo) => {
          const isSelected = selectedIds.includes(photo.id);
          return (
            <div
              key={photo.id}
              className={cn(
                'group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer',
                isSelected && 'ring-2 ring-primary'
              )}
              onClick={() => selectionMode ? onSelectPhoto(photo.id) : undefined}
            >
              {selectionMode ? (
                <>
                  <Image src={photo.thumbnailUrl} alt="" fill className="object-cover" />
                  <div className={cn(
                    'absolute inset-0 transition-colors',
                    isSelected ? 'bg-primary/20' : 'group-hover:bg-black/20'
                  )} />
                  <div className="absolute top-2 left-2">
                    <Checkbox checked={isSelected} className="bg-background" />
                  </div>
                </>
              ) : (
                <Link href={`/photographer/events/${eventId}/photo/${photo.id}`}>
                  <Image src={photo.thumbnailUrl} alt="" fill className="object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface BulkActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
  onRotate: () => void;
  onDownload: () => void;
  onMarkPrivate: () => void;
  onMoveToFolder: () => void;
  onCancel: () => void;
}

export function BulkActionsBar({ selectedCount, onDelete, onRotate, onDownload, onMarkPrivate, onMoveToFolder, onCancel }: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-xl shadow-lg p-3 flex items-center gap-2">
      <span className="text-sm font-medium px-2">{selectedCount} selected</span>
      <div className="h-6 w-px bg-border" />
      <Button variant="ghost" size="sm" onClick={onMoveToFolder} className="gap-2">
        <FolderInput className="h-4 w-4" /> Move
      </Button>
      <Button variant="ghost" size="sm" onClick={onRotate} className="gap-2">
        <RotateCw className="h-4 w-4" /> Rotate
      </Button>
      <Button variant="ghost" size="sm" onClick={onDownload} className="gap-2">
        <Download className="h-4 w-4" /> Download
      </Button>
      <Button variant="ghost" size="sm" onClick={onMarkPrivate} className="gap-2">
        <Lock className="h-4 w-4" /> Private
      </Button>
      <Button variant="ghost" size="sm" onClick={onDelete} className="gap-2 text-destructive hover:text-destructive">
        <Trash2 className="h-4 w-4" /> Delete
      </Button>
      <div className="h-6 w-px bg-border" />
      <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
    </div>
  );
}

